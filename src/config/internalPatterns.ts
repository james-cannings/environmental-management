/**
 * Internal MSQ group entity name patterns.
 *
 * Used as a safety net during supplier mapping — any unmapped supplier
 * whose name matches one of these patterns is automatically excluded
 * as an inter-company transaction.
 *
 * Case-insensitive substring matching.
 */

export const INTERNAL_PATTERNS: string[] = [
  'msq',
  'mbastack',
  'stein ias',
  'stack',
  'twentysix',
  'elmwood',
  'freemavens',
  'mmt digital',
  'msq dx',
  'smarts',
  'the gate',
  'udg',
  'walk-in',
  'brave spark',
  'marvel bidco',
  'ensco',
  'm3 labs',
  'miri',
];

/** Check if a supplier name matches any internal MSQ group entity pattern. */
export function isInternalSupplier(supplierName: string): boolean {
  const lower = supplierName.toLowerCase();
  return INTERNAL_PATTERNS.some(pattern => lower.includes(pattern));
}
