/**
 * Core transaction types used across all pipelines.
 * These represent the normalised shape of a transaction as it flows
 * through the categorisation pipeline.
 */

export type PipelineType = 'cognos' | 'credit_card' | 'travelperk' | 'corporate_traveller';

export type PipelineStatus = 'active' | 'excluded' | 'categorised' | 'pending_review';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** A single transaction flowing through the categorisation pipeline. */
export interface PipelineTransaction {
  transactionId: string;
  pipelineType: PipelineType;

  // Source data (preserved exactly as uploaded)
  agency: string;
  supplierCompany: string;
  narrative: string;
  amount: number;
  currency: string;
  transactionDate: string; // ISO YYYY-MM-DD

  // Cognos-specific
  cognosDescription?: string;
  transactionSubType?: string;
  dbName?: string;

  // Credit card-specific
  mccDescription?: string;
  expType?: string;
  description?: string;
  cardholder?: string;
  originalValue?: string;
  originalCurrency?: string;

  // Travel-specific
  service?: string;
  value?: number;
  valueUnit?: string;
  hotelCountry?: string;
  startDate?: string;
  endDate?: string;

  // Pipeline tracking
  pipelineStatus: PipelineStatus;
  pipelineStep: string;
  pipelineReason: string;
  pipelineTimestamp: string;

  // Categorisation output
  logCategory: string;
  logSubcategory: string;
  businessActivity: string;
  confidence?: ConfidenceLevel;
  aiReasoning?: string;

  // Cozero IDs (populated during assembly)
  cozeroCategoryId?: number;
  cozeroSubcategoryId?: number;
  cozeroActivityId?: number;
  cozeroSupplierId?: number;
}

/** Travel payload ready for Cozero (from travel pipelines). */
export interface TravelPayload {
  outputType: 'cozero_payload';
  transactionId: string;
  agency: string;
  service: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  valueUnit: string;
  costGbp: number;
  hotelCountry?: string;

  categoryId: number;
  subcategoryId: number;
  activityDataSourceId: number;
  calculationMethodId: number;
  unitId: number;
  inputKey: string;
  locationId: number;
  businessUnitId: number;
  territoryId?: number;
  periodStart: string;
  periodEnd: string;
  dataQuality: string;
}

/** Result of a supplier recommendation from AI. */
export interface SupplierRecommendation {
  supplier: string;
  recommendation: 'MAP' | 'OUT_OF_SCOPE' | 'MIXED_USE' | 'DO_NOT_MAP';
  suggestedCategory: string;
  suggestedSubcategory: string;
  suggestedActivity: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  transactionCount: number;
  totalSpend: number;
}

/** Result of a per-transaction AI categorisation. */
export interface AITransactionResult {
  transaction_id: string;
  log_category: string;
  log_subcategory: string;
  business_activity: string;
  confidence: string;
  reasoning: string;
}

/** Summary of a processing run. */
export interface ProcessingRunSummary {
  inputRows: number;
  excludedRows: number;
  supplierMappedRows: number;
  mccCategorisedRows: number;
  aiCategorisedRows: number;
  remainingRows: number;
  supplierRecommendations: number;
}
