/**
 * Configuration types for activity taxonomy, supplier mapping,
 * MCC rules, calculation methods, units, and territory mapping.
 */

/** Activity taxonomy entry (category → subcategory → activity with Cozero IDs). */
export interface ActivityEntry {
  categoryName: string;
  categoryId: number;
  subcategoryName: string;
  subcategoryId: number;
  activityName: string;
  activityId: number;
}

/** Lookup map keyed by activity name → Cozero IDs. */
export type ActivityLookup = Map<string, ActivityEntry>;

/** Mapped supplier with a known business activity. */
export interface SupplierMapping {
  name: string;
  businessActivity: string;
  cozeroSupplierId?: number;
}

/** Lookup of supplier name (lowercase) → Cozero supplier ID. */
export type SupplierIdLookup = Map<string, number>;

/** MCC description rule for credit card categorisation. */
export interface MccRule {
  pattern: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  logCategory: string;
  logSubcategory: string;
  businessActivity: string;
  pipelineReason: string;
}

/** Cognos Description exclusion pattern (node 9 logic). */
export interface ExclusionPattern {
  pattern: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  reason: string;
}

/** Calculation method configuration. */
export interface CalcMethodConfig {
  key: string;
  cozeroId: number;
  label: string;
}

/** Unit configuration. */
export interface UnitConfig {
  key: string;
  cozeroId: number;
  label: string;
}

/** Territory mapping entry. */
export interface TerritoryEntry {
  countryCode: string;
  cozeroId: number;
  countryName: string;
}

/** Company-to-agency mapping for travel data. */
export interface CompanyMapping {
  companyName: string;
  agencyName: string;
  service: 'travelperk' | 'corporate_traveller';
}
