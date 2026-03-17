/**
 * Cozero REST API type definitions.
 * API base: https://api.cozero.io/v1
 * Organization ID: 5137
 */

// ── Authentication ──────────────────────────────────────

export interface CozeroAuthRequest {
  apiKey: string;
  organizationId: number;
}

export interface CozeroAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ── Log Creation (three-step process) ───────────────────

export interface CozeroCreateLogPayload {
  category_id: number;
}

export interface CozeroCreateLogResponse {
  id: number;
  category?: { id: number; name: string };
}

export interface CozeroUpdateLogPayload {
  startDate: string;
  endDate: string;
  location_id: number;
  business_unit_id: number;
}

export interface CozeroCreateLogEntryPayload {
  subcategory_id: number;
  activity_data_source_id: number;
  calculation_method_id: number;
  data_quality: string;
  territory_id?: number;
  supplier_id?: number;
  tag_ids?: number[];
  inputs: {
    [key: string]: {
      value: number;
      unit_id: number;
    };
  };
}

// ── Suppliers ───────────────────────────────────────────

export interface CozeroSupplier {
  id: number;
  name: string;
  contact?: unknown[];
}

export interface CozeroCreateSupplierPayload {
  name: string;
  contact: unknown[];
}

export interface CozeroSupplierListResponse {
  data?: CozeroSupplier[];
  items?: CozeroSupplier[];
  total?: number;
}

// ── Log Entry Search (duplicate checking) ───────────────

export interface CozeroLogEntrySearchParams {
  selectedBusinessUnitId: number;
  startDate: string;
  endDate: string;
  sortingKey: string;
  sortingDirection: string;
  pageNumber: number;
  pageSize: number;
  useSnowflake: boolean;
}

export interface CozeroLogEntrySearchBody {
  subcategory: { in: number[] };
  location: { in: number[] };
  visibleColumns: string[];
}

export interface CozeroLogEntry {
  log?: {
    startDate?: string;
    endDate?: string;
  };
  subcategory?: { id: number };
  location?: { id: number };
  territory?: { id: number };
  inputs?: {
    input1Value?: number;
    inputMergedValue?: number;
  };
}

export interface CozeroLogEntrySearchResponse {
  data?: CozeroLogEntry[];
  total?: number;
}

// ── Assembled payload for internal use ──────────────────

export interface CozeroTransactionPayload {
  transactionId: string;
  supplierCompany: string;
  narrative?: string;
  amount: number;
  currency: string;
  transactionDate: string;
  logCategory: string;
  logSubcategory: string;
  businessActivity: string;
  pipelineStep: string;

  categoryId: number;
  locationId: number;
  periodStart: string;
  periodEnd: string;
  businessUnitId: number;
  territoryId: number;
  subcategoryId: number;
  activityDataSourceId: number;
  calculationMethodId: number;
  dataQuality: string;
  inputKey: string;
  unitId: number;
  value: number;
  supplierId?: number;
  tagIds: number[];
  missingIds: string;
  readyToUpload: boolean;
}
