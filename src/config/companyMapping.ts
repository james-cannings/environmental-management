/**
 * Travel management company → MSQ agency mapping.
 *
 * Maps company names from travel data exports to MSQ agency names.
 * Each travel pipeline has its own company field name conventions.
 */

import type { CompanyMapping } from '@/types/config';

/** TravelPerk Company field → MSQ agency. */
export const TRAVELPERK_COMPANIES: CompanyMapping[] = [
  { companyName: 'MMT Ltd', agencyName: 'MSQ DX UK', service: 'travelperk' },
  { companyName: 'MSQ Partners Ltd', agencyName: 'MSQ Partners Central', service: 'travelperk' },
];

/** Corporate Traveller Account Name field → MSQ agency. */
export const CORPORATE_TRAVELLER_COMPANIES: CompanyMapping[] = [
  { companyName: 'SMARTS (NI) LT', agencyName: 'Smarts UK', service: 'corporate_traveller' },
  { companyName: 'MSQ PARTNERS EUROPE B.V.', agencyName: 'Smarts Netherlands', service: 'corporate_traveller' },
];

/** Resolve a TravelPerk company name to an MSQ agency name. */
export function resolveTravelPerkAgency(companyName: string): string | undefined {
  const match = TRAVELPERK_COMPANIES.find(
    c => c.companyName.toUpperCase() === companyName.trim().toUpperCase()
  );
  return match?.agencyName;
}

/** Resolve a Corporate Traveller account name to an MSQ agency name. */
export function resolveCorporateTravellerAgency(accountName: string): string | undefined {
  const match = CORPORATE_TRAVELLER_COMPANIES.find(
    c => c.companyName.toUpperCase() === accountName.trim().toUpperCase()
  );
  return match?.agencyName;
}

/**
 * TravelPerk service types that are processed.
 * All other service types (Premium Service, FlexiTravel, Subscription, refunds) are excluded.
 */
export const TRAVELPERK_VALID_SERVICES = ['Flights', 'Hotels', 'Trains'] as const;

/**
 * Corporate Traveller service types classified as flights.
 */
export const CT_FLIGHT_SERVICES = [
  'Domestic Air',
  'Domestic Low Cost Air',
  'European Air',
  'European Low Cost Air',
  'International Air',
] as const;

/**
 * Corporate Traveller service types classified as rail.
 */
export const CT_RAIL_SERVICES = [
  'Domestic Rail',
  'Domestic Rail - eTicket',
  'Domestic Rail - Ticket on Delivery',
] as const;

/**
 * Corporate Traveller service types that are excluded (ancillary fees).
 */
export const CT_EXCLUDED_SERVICES = [
  'Air Extras',
  'Airline Extra',
] as const;
