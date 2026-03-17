/**
 * Agency configuration types.
 */

/** Agency with its Cozero platform IDs. */
export interface AgencyConfig {
  id: string;
  name: string;
  country: string;
  cozeroLocationId: number | null;
  cozeroBusinessUnitId: number | null;
  cozeroTerritoryId: number | null;
  dbNames: string[];
  isActive: boolean;
}

/** Agency exclusion rule for preventing double-counting. */
export interface ExclusionRule {
  agencyId: string;
  supplierName: string;
  narrativeContains: string | null;
  reason: string;
}

/** Currency configuration per country. */
export interface CurrencyConfig {
  currency: string;
  unitId: number;
}
