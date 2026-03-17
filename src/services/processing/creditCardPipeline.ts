/**
 * Credit card pipeline orchestrator (MSQ DX UK Barclaycard).
 *
 * Steps:
 *   1. Parse Excel ("Auto Coding Format" tab)
 *   2. MCC categorisation
 *   3. Supplier mapping
 *   4. AI supplier recommendations
 *   5. AI per-transaction categorisation
 *   6. Assemble Cozero payloads
 */

import { prisma } from '@/lib/db';
import { parseXlsx, excelDateToISO, getString, getNumber } from '@/lib/fileParser';
import { buildCreditCardTransaction } from '@/lib/transformers';
import type { PipelineResult } from '@/types/processing';
import type { PipelineTransaction } from '@/types/transaction';
import type { SupplierMapping, ActivityEntry } from '@/types/config';
import type { SupplierSummaryForAI, TransactionForAI } from '@/types/anthropic';
import { recordStep } from '../processing';
import type { ProcessingInput } from '../processing';
import {
  applySupplierMapping,
  applyMccRules,
  countByStatus,
  getActiveTransactions,
} from './categorisationEngine';
import { MCC_RULES, CC_SUPPLIER_RULES } from '@/config/mccRules';
import { categoriseSuppliers, categoriseTransactions } from '../anthropic';
import { buildActivityLookup } from '@/config/activityTypes';
import * as fs from 'fs';

export async function runCreditCardPipeline(
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
  const rows = parseXlsx(fileBuffer, 'Auto Coding Format');

  await recordStep(runId, 'parse_excel', ++stepOrder, 'completed', rows.length, rows.length);

  // Build transactions
  const transactions: PipelineTransaction[] = [];
  let idx = 0;

  for (const row of rows) {
    const supplier = getString(row, 'LOOKUP REFERENCE') || getString(row, 'Supplier');
    if (!supplier || supplier === 'LOOKUP REFERENCE' || supplier === '0') continue;
    if (supplier.toUpperCase().includes('PAYMENT RECEIVED')) continue;

    const value = getNumber(row, 'Value');
    if (value === 0 && !getString(row, 'Description')) continue;

    // Convert Excel serial dates
    const dateRaw = row['Date'];
    if (typeof dateRaw === 'number') {
      row['Date'] = excelDateToISO(dateRaw);
    }

    const txn = buildCreditCardTransaction(row, idx);
    transactions.push(txn);
    idx++;
  }

  if (transactions.length === 0) {
    errors.push('No valid credit card transactions found after parsing');
    return makeResult(runId, 'credit_card', 'completed', 0, 0, 0, 0, errors);
  }

  // ── Step 2: MCC categorisation ─────────────────────────
  const mccCount = applyMccRules(transactions, MCC_RULES, CC_SUPPLIER_RULES);
  await recordStep(runId, 'mcc_categorisation', ++stepOrder, 'completed',
    transactions.length, transactions.length, { categorisedByMcc: mccCount });

  // ── Step 3: Supplier mapping ───────────────────────────
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
  await recordStep(runId, 'supplier_mapping', ++stepOrder, 'completed',
    transactions.length, transactions.length,
    { mapped: mappingResult.mapped, unmapped: mappingResult.unmapped, internalFlagged: mappingResult.internalFlagged });

  // ── Step 4: AI supplier recommendations ────────────────
  const active = getActiveTransactions(transactions);
  const unmappedSummaries = buildSupplierSummaries(active);

  let supplierRecommendations = 0;
  if (unmappedSummaries.length > 0) {
    try {
      const aiResult = await categoriseSuppliers(unmappedSummaries, 'MSQ DX UK');
      supplierRecommendations = aiResult.results.length;
      if (aiResult.errors.length > 0) errors.push(...aiResult.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`AI supplier recommendations failed: ${msg}`);
    }
  }
  await recordStep(runId, 'ai_supplier_recommendations', ++stepOrder, 'completed',
    unmappedSummaries.length, supplierRecommendations);

  // ── Step 5: AI per-transaction categorisation ──────────
  const stillActive = getActiveTransactions(transactions);
  if (stillActive.length > 0) {
    try {
      const txnsForAI: TransactionForAI[] = stillActive.map(t => ({
        transaction_id: t.transactionId,
        supplier: t.supplierCompany,
        narrative: t.narrative,
        amount: t.amount,
        description: t.description,
        exp_type: t.expType,
        mcc_description: t.mccDescription,
        transaction_date: t.transactionDate,
      }));

      const aiResult = await categoriseTransactions(txnsForAI, 'credit_card');
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

  // ── Step 6: Assemble Cozero payloads ───────────────────
  await recordStep(runId, 'assemble_cozero_payload', ++stepOrder, 'completed',
    transactions.length, transactions.length);

  // Store transactions
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
        mccDescription: txn.mccDescription,
        expType: txn.expType,
        description: txn.description,
        cardholder: txn.cardholder,
        originalValue: txn.originalValue,
        originalCurrency: txn.originalCurrency,
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

  const counts = countByStatus(transactions);
  return makeResult(runId, 'credit_card', 'completed',
    transactions.length, counts['excluded'] ?? 0, counts['categorised'] ?? 0, counts['active'] ?? 0,
    errors, supplierRecommendations);
}

function buildSupplierSummaries(transactions: PipelineTransaction[]): SupplierSummaryForAI[] {
  const grouped = new Map<string, PipelineTransaction[]>();
  for (const txn of transactions) {
    const arr = grouped.get(txn.supplierCompany) ?? [];
    arr.push(txn);
    grouped.set(txn.supplierCompany, arr);
  }

  return Array.from(grouped.entries()).map(([supplier, txns]) => ({
    supplier,
    transaction_count: txns.length,
    total_spend: txns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    mcc_descriptions: [...new Set(txns.map(t => t.mccDescription).filter(Boolean))].join(', '),
    exp_types: [...new Set(txns.map(t => t.expType).filter(Boolean))].join(', '),
    sample_narratives: txns.slice(0, 5).map(t => t.narrative),
  }));
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
    summary: { inputRows: input, excludedRows: excluded, categorisedRows: categorised, remainingRows: remaining, supplierRecommendations },
    errors: errs,
  };
}
