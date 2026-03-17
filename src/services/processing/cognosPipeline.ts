/**
 * Cognos spend data pipeline orchestrator.
 *
 * Steps:
 *   1. Parse Excel
 *   2. Filter by agency and quarter
 *   3. Agency-specific exclusions
 *   4. Exclude zero amounts
 *   5. Exclude accounting entries
 *   6. Supplier mapping
 *   7. AI supplier recommendations
 *   8. AI per-transaction categorisation
 *   9. Assemble Cozero payloads
 */

import { prisma } from '@/lib/db';
import { parseXlsx } from '@/lib/fileParser';
import { buildCognosTransaction } from '@/lib/transformers';
import { validateCognosData } from '@/lib/validators';
import type { PipelineResult } from '@/types/processing';
import type { PipelineTransaction } from '@/types/transaction';
import type { SupplierMapping, ActivityEntry } from '@/types/config';
import type { SupplierSummaryForAI, TransactionForAI } from '@/types/anthropic';
import { recordStep } from '../processing';
import type { ProcessingInput } from '../processing';
import {
  applyAgencyExclusions,
  excludeZeroAmounts,
  excludeAccountingEntries,
  applySupplierMapping,
  countByStatus,
  getActiveTransactions,
} from './categorisationEngine';
import { categoriseSuppliers, categoriseTransactions } from '../anthropic';
import { buildActivityLookup } from '@/config/activityTypes';
import * as fs from 'fs';

export async function runCognosPipeline(
  runId: string,
  input: ProcessingInput,
): Promise<PipelineResult> {
  const errors: string[] = [];
  let stepOrder = 0;

  // ── Step 1: Parse Excel ────────────────────────────────
  const upload = await prisma.upload.findUniqueOrThrow({
    where: { id: input.uploadId },
  });

  const fileBuffer = fs.readFileSync(upload.storedPath);
  const rows = parseXlsx(fileBuffer);

  const validation = validateCognosData(rows);
  if (!validation.valid) {
    await recordStep(runId, 'parse_excel', ++stepOrder, 'failed', 0, 0, undefined, validation.errors.join('; '));
    return makeResult(runId, input.pipelineType, 'failed', 0, 0, 0, 0, validation.errors);
  }

  await recordStep(runId, 'parse_excel', ++stepOrder, 'completed', rows.length, rows.length);

  // ── Step 2: Build transactions and filter ──────────────
  const fy = input.financialYear ?? 'FY26';
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: input.agencyId } });

  // Parse DB names for agency matching
  const dbNames: string[] = agency.dbNames ? JSON.parse(agency.dbNames) : [agency.name];
  const dbNameSet = new Set(dbNames.map(n => n.toUpperCase()));

  const transactions: PipelineTransaction[] = [];
  let idx = 0;

  for (const row of rows) {
    const dbName = String(row['DB Name'] ?? '').trim();
    if (!dbNameSet.has(dbName.toUpperCase())) continue;

    // Quarter filtering
    if (input.quarters && input.quarters.length > 0) {
      const txnDate = String(row['Transaction Date'] ?? '');
      const quarter = getQuarter(txnDate);
      if (quarter && !input.quarters.includes(quarter)) continue;
    }

    const txn = buildCognosTransaction(row, idx, fy);
    txn.agency = agency.name;
    transactions.push(txn);
    idx++;
  }

  await recordStep(runId, 'filter_agency_quarter', ++stepOrder, 'completed', rows.length, transactions.length,
    { agency: agency.name, dbNames, quarters: input.quarters });

  if (transactions.length === 0) {
    errors.push('No transactions matched the selected agency and quarter');
    return makeResult(runId, input.pipelineType, 'completed', 0, 0, 0, 0, errors);
  }

  // ── Step 3: Agency-specific exclusions ─────────────────
  const exclusionRules = await prisma.agencyExclusion.findMany({
    where: { agencyId: input.agencyId },
  });

  const fullExclusions = new Map<string, string>();
  const conditionalExclusions: Array<{ supplier: string; keywords: string[]; reason: string }> = [];

  for (const rule of exclusionRules) {
    if (!rule.narrativeContains) {
      fullExclusions.set(rule.supplierName.toUpperCase(), rule.reason ?? 'Agency-specific exclusion');
    } else {
      const keywords = rule.narrativeContains.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      conditionalExclusions.push({ supplier: rule.supplierName, keywords, reason: rule.reason ?? 'Conditional exclusion' });
    }
  }

  const agencyExcResult = applyAgencyExclusions(transactions, fullExclusions, conditionalExclusions);
  await recordStep(runId, 'agency_exclusions', ++stepOrder, 'completed', transactions.length, transactions.length,
    { excluded: agencyExcResult.excluded });

  // ── Step 4: Exclude zero amounts ───────────────────────
  const zeroCount = excludeZeroAmounts(transactions);
  await recordStep(runId, 'exclude_zero_amounts', ++stepOrder, 'completed', transactions.length, transactions.length,
    { zeroExcluded: zeroCount });

  // ── Step 5: Exclude accounting entries ──────────────────
  const accountingCounts = excludeAccountingEntries(transactions);
  await recordStep(runId, 'exclude_accounting_entries', ++stepOrder, 'completed', transactions.length, transactions.length,
    accountingCounts);

  // ── Step 6: Supplier mapping ───────────────────────────
  const suppliers = await prisma.supplier.findMany();
  const supplierMap = new Map<string, SupplierMapping>();
  for (const s of suppliers) {
    supplierMap.set(s.name.toUpperCase(), {
      name: s.name,
      businessActivity: s.businessActivity,
      cozeroSupplierId: s.cozeroSupplierId ?? undefined,
    });
  }

  const activities = await prisma.activityTaxonomy.findMany();
  const activityEntries: ActivityEntry[] = activities.map(a => ({
    categoryName: a.categoryName,
    categoryId: a.categoryId,
    subcategoryName: a.subcategoryName,
    subcategoryId: a.subcategoryId,
    activityName: a.activityName,
    activityId: a.activityId,
  }));
  const activityLookup = buildActivityLookup(activityEntries);

  const mappingResult = applySupplierMapping(transactions, supplierMap, activityLookup);
  await recordStep(runId, 'supplier_mapping', ++stepOrder, 'completed', transactions.length, transactions.length,
    { mapped: mappingResult.mapped, unmapped: mappingResult.unmapped, internalFlagged: mappingResult.internalFlagged });

  // ── Step 7: AI supplier recommendations ────────────────
  const active = getActiveTransactions(transactions);
  const unmappedSupplierSummaries = buildSupplierSummaries(active);

  let supplierRecommendations = 0;
  if (unmappedSupplierSummaries.length > 0) {
    try {
      const aiResult = await categoriseSuppliers(unmappedSupplierSummaries, agency.name);
      supplierRecommendations = aiResult.results.length;
      if (aiResult.errors.length > 0) errors.push(...aiResult.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`AI supplier recommendations failed: ${msg}`);
    }
  }
  await recordStep(runId, 'ai_supplier_recommendations', ++stepOrder, 'completed',
    unmappedSupplierSummaries.length, supplierRecommendations);

  // ── Step 8: AI per-transaction categorisation ──────────
  const stillActive = getActiveTransactions(transactions);
  if (stillActive.length > 0) {
    try {
      const txnsForAI: TransactionForAI[] = stillActive.map(t => ({
        transaction_id: t.transactionId,
        supplier: t.supplierCompany,
        narrative: t.narrative,
        amount: t.amount,
        cognos_description: t.cognosDescription,
        transaction_sub_type: t.transactionSubType,
        transaction_date: t.transactionDate,
      }));

      const aiResult = await categoriseTransactions(txnsForAI, 'cognos');

      // Apply AI results back to transactions
      const aiMap = new Map(aiResult.results.map(r => [r.transaction_id, r]));
      const now = new Date().toISOString();

      for (const txn of stillActive) {
        const aiRes = aiMap.get(txn.transactionId);
        if (aiRes && aiRes.log_category !== 'unknown') {
          txn.pipelineStatus = 'categorised';
          txn.pipelineStep = 'ai_categorisation';
          txn.pipelineReason = aiRes.reasoning;
          txn.logCategory = aiRes.log_category;
          txn.logSubcategory = aiRes.log_subcategory;
          txn.businessActivity = aiRes.business_activity;
          txn.confidence = aiRes.confidence as 'HIGH' | 'MEDIUM' | 'LOW';
          txn.aiReasoning = aiRes.reasoning;
          txn.pipelineTimestamp = now;

          // Resolve Cozero IDs
          const actEntry = activityLookup.get(aiRes.business_activity.toUpperCase());
          if (actEntry) {
            txn.cozeroCategoryId = actEntry.categoryId;
            txn.cozeroSubcategoryId = actEntry.subcategoryId;
            txn.cozeroActivityId = actEntry.activityId;
          }
        }
      }

      if (aiResult.errors.length > 0) errors.push(...aiResult.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`AI transaction categorisation failed: ${msg}`);
    }
  }
  await recordStep(runId, 'ai_transaction_categorisation', ++stepOrder, 'completed',
    stillActive.length, stillActive.length);

  // ── Step 9: Assemble Cozero payloads ───────────────────
  await recordStep(runId, 'assemble_cozero_payload', ++stepOrder, 'completed',
    transactions.length, transactions.length);

  // ── Store transactions in DB ───────────────────────────
  await storeTransactions(runId, transactions);

  // ── Return summary ─────────────────────────────────────
  const counts = countByStatus(transactions);
  return makeResult(
    runId,
    input.pipelineType,
    'completed',
    transactions.length,
    counts['excluded'] ?? 0,
    counts['categorised'] ?? 0,
    counts['active'] ?? 0,
    errors,
    supplierRecommendations,
  );
}

function buildSupplierSummaries(transactions: PipelineTransaction[]): SupplierSummaryForAI[] {
  const grouped = new Map<string, PipelineTransaction[]>();
  for (const txn of transactions) {
    const key = txn.supplierCompany;
    const arr = grouped.get(key) ?? [];
    arr.push(txn);
    grouped.set(key, arr);
  }

  return Array.from(grouped.entries()).map(([supplier, txns]) => ({
    supplier,
    transaction_count: txns.length,
    total_spend: txns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    sample_narratives: txns.slice(0, 5).map(t => t.narrative),
    cognos_descriptions: [...new Set(txns.map(t => t.cognosDescription).filter(Boolean))].join(', '),
  }));
}

async function storeTransactions(runId: string, transactions: PipelineTransaction[]): Promise<void> {
  for (const txn of transactions) {
    await prisma.transaction.create({
      data: {
        runId,
        transactionId: txn.transactionId,
        pipelineType: txn.pipelineType,
        agency: txn.agency,
        supplierCompany: txn.supplierCompany,
        narrative: txn.narrative,
        amount: txn.amount,
        currency: txn.currency,
        transactionDate: txn.transactionDate,
        cognosDescription: txn.cognosDescription,
        transactionSubType: txn.transactionSubType,
        dbName: txn.dbName,
        pipelineStatus: txn.pipelineStatus,
        pipelineStep: txn.pipelineStep,
        pipelineReason: txn.pipelineReason,
        logCategory: txn.logCategory,
        logSubcategory: txn.logSubcategory,
        businessActivity: txn.businessActivity,
        confidence: txn.confidence,
        aiReasoning: txn.aiReasoning,
        cozeroCategoryId: txn.cozeroCategoryId,
        cozeroSubcategoryId: txn.cozeroSubcategoryId,
        cozeroActivityId: txn.cozeroActivityId,
        cozeroSupplierId: txn.cozeroSupplierId,
      },
    });
  }
}

function getQuarter(dateStr: string): string | null {
  if (!dateStr) return null;
  const month = parseInt(dateStr.substring(5, 7), 10);
  if (isNaN(month)) return null;
  // MSQ FY starts in March
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4'; // Dec, Jan, Feb
}

function makeResult(
  runId: string,
  pipelineType: string,
  status: 'completed' | 'failed',
  input: number,
  excluded: number,
  categorised: number,
  remaining: number,
  errs: string[],
  supplierRecommendations?: number,
): PipelineResult {
  return {
    runId,
    pipelineType: pipelineType as PipelineResult['pipelineType'],
    status,
    summary: {
      inputRows: input,
      excludedRows: excluded,
      categorisedRows: categorised,
      remainingRows: remaining,
      supplierRecommendations,
    },
    errors: errs,
  };
}
