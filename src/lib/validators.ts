/**
 * Data validation functions for each pipeline's input format.
 */

import type { ParsedRow } from './fileParser';

/** Validation result. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Required Cognos columns. */
const COGNOS_REQUIRED = [
  'Narrative',
  'Supplier Company',
  'Amount',
  'DB Name',
  'Transaction Sub Type',
];

/** Required credit card columns (from the "Auto Coding Format" tab). */
const CREDIT_CARD_REQUIRED = [
  'LOOKUP REFERENCE',
  'Value',
  'MCC Description',
];

/** Required TravelPerk columns. */
const TRAVELPERK_REQUIRED = [
  'Service',
  'Company',
  'Cost per traveler (GBP)',
  'Start date',
  'End date',
];

/** Required Corporate Traveller columns (from ATT004 sheet). */
const CORPORATE_TRAVELLER_REQUIRED = [
  'Details of Service',
  'Account Name',
  'kms',
  'Date of Travel',
];

/** Validate that required columns exist in the parsed rows. */
function validateColumns(
  rows: ParsedRow[],
  requiredColumns: string[],
  pipelineName: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push(`${pipelineName}: No data rows found`);
    return { valid: false, errors, warnings };
  }

  const sampleRow = rows[0];
  const availableColumns = Object.keys(sampleRow);

  for (const col of requiredColumns) {
    if (!availableColumns.includes(col)) {
      errors.push(`${pipelineName}: Required column "${col}" not found. Available: ${availableColumns.join(', ')}`);
    }
  }

  if (rows.length < 2) {
    warnings.push(`${pipelineName}: Only ${rows.length} data row(s) found — expected more`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate Cognos export data. */
export function validateCognosData(rows: ParsedRow[]): ValidationResult {
  return validateColumns(rows, COGNOS_REQUIRED, 'Cognos');
}

/** Validate credit card export data. */
export function validateCreditCardData(rows: ParsedRow[]): ValidationResult {
  return validateColumns(rows, CREDIT_CARD_REQUIRED, 'Credit Card');
}

/** Validate TravelPerk CSV data. */
export function validateTravelPerkData(rows: ParsedRow[]): ValidationResult {
  return validateColumns(rows, TRAVELPERK_REQUIRED, 'TravelPerk');
}

/** Validate Corporate Traveller XLSX data. */
export function validateCorporateTravellerData(rows: ParsedRow[]): ValidationResult {
  return validateColumns(rows, CORPORATE_TRAVELLER_REQUIRED, 'Corporate Traveller');
}

/**
 * Verify row count integrity: input must equal the sum of all output groups.
 * Returns an error message if counts don't match, or null if OK.
 */
export function validateRowCounts(
  inputCount: number,
  ...outputCounts: number[]
): string | null {
  const totalOutput = outputCounts.reduce((sum, n) => sum + n, 0);
  if (inputCount !== totalOutput) {
    return `Row count mismatch: input=${inputCount}, sum of outputs=${totalOutput} (${outputCounts.join(' + ')})`;
  }
  return null;
}
