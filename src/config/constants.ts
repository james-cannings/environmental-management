/**
 * Application-wide constants.
 */

/** Cozero API base URL. */
export const COZERO_API_BASE = 'https://api.cozero.io/v1';

/** Cozero organization ID. */
export const COZERO_ORGANIZATION_ID = 5137;

/** Anthropic API base URL. */
export const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

/** Anthropic model used for categorisation. */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6-20250514';

/** Maximum tokens for AI per-transaction categorisation batches. */
export const AI_TRANSACTION_MAX_TOKENS = 24_000;

/** Maximum tokens for AI supplier recommendations. */
export const AI_SUPPLIER_MAX_TOKENS = 24_000;

/** Batch size for per-transaction AI categorisation. */
export const AI_BATCH_SIZE = 150;

/** Cozero supplier list page size. */
export const COZERO_SUPPLIER_PAGE_SIZE = 100;

/** Spend-based calculation method ID (Cognos + Credit Card). */
export const CALC_METHOD_SPEND = 45;

/** GBP unit ID for spend-based calculations. */
export const UNIT_GBP = 40;

/** Default data quality value. */
export const DEFAULT_DATA_QUALITY = 'PRIMARY';

/** Financial year prefix. */
export const FY_PREFIX = 'FY';

/** Upload file storage directory (relative to project root). */
export const UPLOAD_DIR = 'uploads';

/** Maximum upload file size in bytes (50 MB). */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/** Allowed file types for upload. */
export const ALLOWED_FILE_TYPES = ['.xlsx', '.csv'] as const;

/** Pipeline types. */
export const PIPELINE_TYPES = ['cognos', 'credit_card', 'travelperk', 'corporate_traveller'] as const;

/** Activity name aliases — maps commonly used short names to canonical Cozero names. */
export const ACTIVITY_ALIASES: Record<string, string> = {
  'Travel agency': 'Travel agency services',
  'Insurance': 'Insurance services',
};
