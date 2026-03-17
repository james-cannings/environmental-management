/**
 * Hotel country code → Cozero territory_id mapping.
 *
 * Used by travel pipelines to set country-specific emission factors
 * for hotel stays. ISO 2-letter country codes.
 */

export const TERRITORY_MAP: Record<string, number> = {
  GB: 240,
  US: 241,
  DE: 83,
  NL: 160,
  ES: 212,
  SE: 218,
  IN: 103,
  IE: 108,
  FR: 79,
  AU: 14,
  JP: 114,
  DK: 61,
  CN: 46,
  SG: 205,
  MY: 146,
  KH: 36,
  VN: 249,
  AE: 236,
  ID: 102,
  TH: 227,
  HK: 97,
  MO: 140,
  PH: 178,
  PT: 182,
  NG: 163,
};

/** Look up a Cozero territory ID from an ISO country code. Returns undefined if unmapped. */
export function getTerritoryId(countryCode: string): number | undefined {
  return TERRITORY_MAP[countryCode.toUpperCase()];
}
