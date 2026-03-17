/**
 * Cognos Description exclusion patterns (node 9 logic).
 *
 * These patterns exclude transactions that are not real purchases:
 * double-entry bookkeeping entries, tax placeholders, intercompany transfers,
 * compensation, non-purchase accruals, cash movements, prepayments, etc.
 *
 * Applied universally — agencies without these patterns are unaffected.
 */

import type { ExclusionPattern } from '@/types/config';

/**
 * Exact match exclusions on Cognos Description (case-insensitive).
 * Each entry maps to a reason and exclusion category for reporting.
 */
export const EXACT_EXCLUSIONS: ExclusionPattern[] = [
  // Payable/creditor entries (double-entry bookkeeping)
  { pattern: 'accounts payable', matchType: 'exact', reason: 'Accounts Payable — payment side of double-entry bookkeeping, not a purchase' },
  { pattern: 'msq s&e accounts payable', matchType: 'exact', reason: 'MSQ S&E Accounts Payable — payment side of double-entry bookkeeping' },
  { pattern: 'purchase ledger control account', matchType: 'exact', reason: 'Purchase Ledger Control Account — creditor entry, not a purchase' },
  { pattern: 'uk purchase ledger', matchType: 'exact', reason: 'UK Purchase Ledger — creditor entry, not a purchase' },
  { pattern: 'accrued a/p', matchType: 'exact', reason: 'Accrued A/P — accrued payable, not a purchase' },
  { pattern: 'trade debtors', matchType: 'exact', reason: 'Trade Debtors — creditor control account, not a purchase (Freemavens)' },

  // Tax placeholders
  { pattern: 'accrued state sales tax - ny', matchType: 'exact', reason: 'Accrued State Sales Tax — tax placeholder, not a purchase' },
  { pattern: 'msq s&e - accrued state sales tax - ny', matchType: 'exact', reason: 'MSQ S&E Accrued State Sales Tax — tax placeholder' },

  // Compensation & benefits
  { pattern: 'salaries - employees', matchType: 'exact', reason: 'Salaries — compensation, out of scope' },
  { pattern: 'health benefits', matchType: 'exact', reason: 'Health Benefits — employee benefits, out of scope' },
  { pattern: 'wages & salaries - payroll', matchType: 'exact', reason: 'Wages & Salaries — compensation, out of scope' },
  { pattern: 'wages & salaries - payroll m3l', matchType: 'exact', reason: 'Wages & Salaries (M3L) — compensation, out of scope' },

  // Non-purchase accrual types
  { pattern: 'accruals for bonuses', matchType: 'exact', reason: 'Accruals for Bonuses — compensation, out of scope' },
  { pattern: 'accrued income', matchType: 'exact', reason: 'Accrued Income — revenue, not expenditure' },

  // Cash movements
  { pattern: 'cash- hsbc operating', matchType: 'exact', reason: 'Cash movement — bank transfer, not a purchase' },
  { pattern: 'cash at bank', matchType: 'exact', reason: 'Cash at Bank — bank balance entry, not a purchase' },
  { pattern: 'sundry debtors', matchType: 'exact', reason: 'Sundry Debtors — accounting entry, not a purchase' },

  // Prepayments
  { pattern: 'prepaid rent', matchType: 'exact', reason: 'Prepaid Rent — rent prepayment, out of scope (building rent)' },
  { pattern: 'prepaid insurance', matchType: 'exact', reason: 'Prepaid Insurance — insurance prepayment entry' },
  { pattern: 'prepayments', matchType: 'exact', reason: 'Prepayment — advance payment accounting entry' },

  // Property assets & deposits
  { pattern: 'rent deposit paid', matchType: 'exact', reason: 'Rent Deposit — refundable financial deposit, not rent spend' },
  { pattern: 'long leaseholds - cost', matchType: 'exact', reason: 'Long Leasehold — property asset capitalisation, not operational spend' },

  // Exceptional & other
  { pattern: 'exceptional items', matchType: 'exact', reason: 'Exceptional Items — non-recurring accounting entry' },
  { pattern: 'donations', matchType: 'exact', reason: 'Donations — charitable contribution, out of scope' },

  // Audit (typically nets to zero in double-entry)
  { pattern: 'audit & tax fees', matchType: 'exact', reason: 'Audit & Tax Fees — professional fees that net to zero in double-entry' },
];

/**
 * Partial/substring match exclusions on Cognos Description (case-insensitive).
 * Checked after exact matches.
 */
export const PARTIAL_EXCLUSIONS: ExclusionPattern[] = [
  { pattern: 'intraco', matchType: 'contains', reason: 'Intercompany transaction — internal group transfer' },
  { pattern: 'interco', matchType: 'contains', reason: 'Intercompany transaction — internal group transfer' },
  { pattern: 'mmt recharges', matchType: 'contains', reason: 'Intercompany recharge — internal group transfer' },
];
