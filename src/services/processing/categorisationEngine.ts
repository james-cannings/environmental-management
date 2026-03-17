/**
 * Shared categorisation engine used by Cognos and Credit Card pipelines.
 *
 * Each function takes an array of PipelineTransactions and returns the same
 * array with Pipeline_Status/Step/Reason updated. The cascade order is:
 *   1. Agency-specific exclusions
 *   2. Exclude zero amounts
 *   3. Exclude accounting entries (Cognos only)
 *   4. Supplier mapping
 *   5. MCC categorisation (Credit Card only)
 *   6. AI supplier recommendations + per-transaction categorisation
 */

import type { PipelineTransaction } from '@/types/transaction';
import type { ActivityEntry, SupplierMapping, MccRule } from '@/types/config';
import { EXACT_EXCLUSIONS, PARTIAL_EXCLUSIONS } from '@/config/exclusionPatterns';
import { isInternalSupplier } from '@/config/internalPatterns';
import { ACTIVITY_ALIASES } from '@/config/constants';

/** Apply agency-specific supplier exclusions. */
export function applyAgencyExclusions(
  transactions: PipelineTransaction[],
  fullExclusions: Map<string, string>,
  conditionalExclusions: Array<{ supplier: string; keywords: string[]; reason: string }>,
): { excluded: number; details: Record<string, number> } {
  const now = new Date().toISOString();
  let excluded = 0;
  const details: Record<string, number> = {};

  for (const txn of transactions) {
    if (txn.pipelineStatus !== 'active') continue;

    const supplierUpper = txn.supplierCompany.toUpperCase();

    // Full exclusion
    const fullReason = fullExclusions.get(supplierUpper);
    if (fullReason) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'agency_exclusion';
      txn.pipelineReason = `Agency exclusion: ${txn.supplierCompany} — ${fullReason}`;
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      excluded++;
      details[txn.supplierCompany] = (details[txn.supplierCompany] ?? 0) + 1;
      continue;
    }

    // Conditional exclusion
    const narrativeLower = txn.narrative.toLowerCase();
    for (const rule of conditionalExclusions) {
      if (supplierUpper !== rule.supplier.toUpperCase()) continue;
      const matched = rule.keywords.some(kw => narrativeLower.includes(kw));
      if (matched) {
        txn.pipelineStatus = 'excluded';
        txn.pipelineStep = 'agency_conditional_exclusion';
        txn.pipelineReason = `Conditional exclusion: ${txn.supplierCompany} — narrative matched keywords — ${rule.reason}`;
        txn.pipelineTimestamp = now;
        txn.logCategory = 'Out of scope';
        txn.logSubcategory = 'Out of scope';
        txn.businessActivity = 'Out of scope';
        excluded++;
        details[txn.supplierCompany] = (details[txn.supplierCompany] ?? 0) + 1;
        break;
      }
    }
  }

  return { excluded, details };
}

/** Exclude zero-amount transactions. */
export function excludeZeroAmounts(
  transactions: PipelineTransaction[],
): number {
  const now = new Date().toISOString();
  let count = 0;

  for (const txn of transactions) {
    if (txn.pipelineStatus !== 'active') continue;
    if (txn.amount === 0) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'zero_amount';
      txn.pipelineReason = 'Zero amount — no spend to report';
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      count++;
    }
  }

  return count;
}

/** Exclude accounting entries based on Cognos Description patterns and Transaction Sub Type. */
export function excludeAccountingEntries(
  transactions: PipelineTransaction[],
): Record<string, number> {
  const now = new Date().toISOString();
  const counts: Record<string, number> = {};

  for (const txn of transactions) {
    if (txn.pipelineStatus !== 'active') continue;

    // Check 1: Adjustments by Transaction Sub Type
    if (txn.transactionSubType === 'Adjustment') {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'adjustment';
      txn.pipelineReason = 'Adjustment — internal reclassification, not new spend';
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      counts['adjustments'] = (counts['adjustments'] ?? 0) + 1;
      continue;
    }

    // Check 2: Cognos Description exact match
    const cognosLower = (txn.cognosDescription ?? '').trim().toLowerCase();
    if (!cognosLower) continue;

    const exactMatch = EXACT_EXCLUSIONS.find(e => cognosLower === e.pattern);
    if (exactMatch) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'accounting_exclusion';
      txn.pipelineReason = exactMatch.reason;
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      counts['accounting'] = (counts['accounting'] ?? 0) + 1;
      continue;
    }

    // Check 3: Cognos Description partial match
    const partialMatch = PARTIAL_EXCLUSIONS.find(p => cognosLower.includes(p.pattern));
    if (partialMatch) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'accounting_exclusion';
      txn.pipelineReason = `${partialMatch.reason}: "${txn.cognosDescription}"`;
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      counts['intercompany'] = (counts['intercompany'] ?? 0) + 1;
      continue;
    }

    // Check 4: Test/dummy transactions
    if (/\bfake\b/i.test(txn.narrative)) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'test_transaction';
      txn.pipelineReason = 'Test/dummy transaction — narrative contains "Fake"';
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      counts['test'] = (counts['test'] ?? 0) + 1;
    }
  }

  return counts;
}

/** Apply supplier mapping to active transactions. */
export function applySupplierMapping(
  transactions: PipelineTransaction[],
  supplierMap: Map<string, SupplierMapping>,
  activityLookup: Map<string, ActivityEntry>,
): { mapped: number; unmapped: number; internalFlagged: number } {
  const now = new Date().toISOString();
  let mapped = 0;
  let unmapped = 0;
  let internalFlagged = 0;

  for (const txn of transactions) {
    if (txn.pipelineStatus !== 'active') continue;

    const supplierUpper = txn.supplierCompany.toUpperCase();
    const mapping = supplierMap.get(supplierUpper);

    if (mapping) {
      if (mapping.businessActivity.toUpperCase() === 'OUT OF SCOPE') {
        txn.pipelineStatus = 'excluded';
        txn.pipelineStep = 'supplier_mapping';
        txn.pipelineReason = `Supplier mapping: ${txn.supplierCompany} → Out of scope`;
        txn.logCategory = 'Out of scope';
        txn.logSubcategory = 'Out of scope';
        txn.businessActivity = 'Out of scope';
      } else {
        const activityKey = resolveActivityKey(mapping.businessActivity);
        const activity = activityLookup.get(activityKey);

        txn.pipelineStatus = 'categorised';
        txn.pipelineStep = 'supplier_mapping';
        txn.pipelineReason = `Supplier mapping: ${mapping.businessActivity}`;
        txn.logCategory = activity?.categoryName ?? '';
        txn.logSubcategory = activity?.subcategoryName ?? '';
        txn.businessActivity = mapping.businessActivity;
        txn.cozeroCategoryId = activity?.categoryId;
        txn.cozeroSubcategoryId = activity?.subcategoryId;
        txn.cozeroActivityId = activity?.activityId;
        txn.cozeroSupplierId = mapping.cozeroSupplierId;
      }
      txn.pipelineTimestamp = now;
      mapped++;
    } else if (isInternalSupplier(txn.supplierCompany)) {
      txn.pipelineStatus = 'excluded';
      txn.pipelineStep = 'internal_supplier';
      txn.pipelineReason = 'Internal MSQ group entity — inter-company transaction excluded';
      txn.pipelineTimestamp = now;
      txn.logCategory = 'Out of scope';
      txn.logSubcategory = 'Out of scope';
      txn.businessActivity = 'Out of scope';
      internalFlagged++;
    } else {
      unmapped++;
    }
  }

  return { mapped, unmapped, internalFlagged };
}

/** Apply MCC-based categorisation rules (credit card pipeline only). */
export function applyMccRules(
  transactions: PipelineTransaction[],
  mccRules: MccRule[],
  supplierRules: MccRule[],
): number {
  const now = new Date().toISOString();
  let categorised = 0;

  for (const txn of transactions) {
    if (txn.pipelineStatus !== 'active') continue;

    const supplierUpper = (txn.supplierCompany ?? '').toUpperCase();
    const mccLower = (txn.mccDescription ?? '').toLowerCase();

    // Check supplier rules first
    let matched = false;
    for (const rule of supplierRules) {
      if (supplierUpper.includes(rule.pattern.toUpperCase())) {
        applyMccRule(txn, rule, now);
        categorised++;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check MCC rules
    for (const rule of mccRules) {
      if (mccLower.includes(rule.pattern)) {
        applyMccRule(txn, rule, now);
        categorised++;
        break;
      }
    }
  }

  return categorised;
}

function applyMccRule(txn: PipelineTransaction, rule: MccRule, now: string): void {
  if (rule.businessActivity === 'Out of scope') {
    txn.pipelineStatus = 'excluded';
  } else {
    txn.pipelineStatus = 'categorised';
    txn.logCategory = rule.logCategory;
    txn.logSubcategory = rule.logSubcategory;
    txn.businessActivity = rule.businessActivity;
  }
  txn.pipelineStep = 'mcc_categorisation';
  txn.pipelineReason = rule.pipelineReason;
  txn.pipelineTimestamp = now;
}

/** Resolve an activity name with alias support. */
function resolveActivityKey(activityName: string): string {
  const upper = activityName.toUpperCase();
  const aliasKey = Object.keys(ACTIVITY_ALIASES).find(k => k.toUpperCase() === upper);
  if (aliasKey) {
    return ACTIVITY_ALIASES[aliasKey].toUpperCase();
  }
  return upper;
}

/** Count transactions by pipeline status. */
export function countByStatus(
  transactions: PipelineTransaction[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const txn of transactions) {
    counts[txn.pipelineStatus] = (counts[txn.pipelineStatus] ?? 0) + 1;
  }
  return counts;
}

/** Get active (uncategorised, unexcluded) transactions. */
export function getActiveTransactions(
  transactions: PipelineTransaction[],
): PipelineTransaction[] {
  return transactions.filter(t => t.pipelineStatus === 'active');
}
