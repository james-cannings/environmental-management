/**
 * Data transformation functions for building pipeline transactions
 * from raw parsed rows.
 */

import type { PipelineTransaction, TravelPayload } from '@/types/transaction';
import type { ActivityEntry } from '@/types/config';
import type { ParsedRow } from './fileParser';
import { getString, getNumber, excelDateToISO, ddmmyyyyToISO } from './fileParser';
import { CALC_METHOD_SPEND, UNIT_GBP, DEFAULT_DATA_QUALITY } from '@/config/constants';

/**
 * Transform a raw Cognos row into a PipelineTransaction.
 */
export function buildCognosTransaction(
  row: ParsedRow,
  index: number,
  financialYear: string,
): PipelineTransaction {
  const now = new Date().toISOString();
  const txnId = `${financialYear}-${String(index + 1).padStart(5, '0')}`;

  return {
    transactionId: txnId,
    pipelineType: 'cognos',
    agency: getString(row, 'Agency') || getString(row, 'DB Name'),
    supplierCompany: getString(row, 'Supplier Company'),
    narrative: getString(row, 'Narrative'),
    amount: getNumber(row, 'Amount'),
    currency: 'GBP',
    transactionDate: getString(row, 'Transaction Date'),
    cognosDescription: getString(row, 'Cognos Description'),
    transactionSubType: getString(row, 'Transaction Sub Type'),
    dbName: getString(row, 'DB Name'),
    pipelineStatus: 'active',
    pipelineStep: '',
    pipelineReason: '',
    pipelineTimestamp: now,
    logCategory: '',
    logSubcategory: '',
    businessActivity: '',
  };
}

/**
 * Transform a raw credit card row into a PipelineTransaction.
 * The columnMap maps real header names to JSON keys from the Extract output.
 */
export function buildCreditCardTransaction(
  row: ParsedRow,
  index: number,
  columnMap?: Record<string, string>,
): PipelineTransaction {
  const now = new Date().toISOString();
  const txnId = `CC-${String(index + 1).padStart(5, '0')}`;

  const get = (key: string): string => {
    if (columnMap && columnMap[key]) {
      return getString(row, columnMap[key]);
    }
    return getString(row, key);
  };

  const getNum = (key: string): number => {
    if (columnMap && columnMap[key]) {
      return getNumber(row, columnMap[key]);
    }
    return getNumber(row, key);
  };

  const supplier = get('LOOKUP REFERENCE') || get('Supplier');
  const description = get('Description');
  const mccDescription = get('MCC Description');

  // Build composite narrative for AI
  const narrativeParts = [supplier];
  if (description) narrativeParts.push(description);
  if (mccDescription && mccDescription !== '0') narrativeParts.push(`(MCC: ${mccDescription})`);

  return {
    transactionId: txnId,
    pipelineType: 'credit_card',
    agency: 'MSQ DX UK',
    supplierCompany: supplier,
    narrative: narrativeParts.join(' — '),
    amount: getNum('Value'),
    currency: 'GBP',
    transactionDate: get('Date'),
    description: description,
    expType: get('Exp Type'),
    mccDescription: mccDescription,
    cardholder: get('Cardholder'),
    originalValue: get('Original Value'),
    originalCurrency: get('Original Currency'),
    pipelineStatus: 'active',
    pipelineStep: '',
    pipelineReason: '',
    pipelineTimestamp: now,
    logCategory: '',
    logSubcategory: '',
    businessActivity: '',
  };
}

/**
 * Build a TravelPerk payload for a single travel row.
 */
export function buildTravelPerkPayload(
  row: ParsedRow,
  agencyName: string,
  locationId: number,
  businessUnitId: number,
  defaultTerritoryId: number,
  activityEntry: ActivityEntry,
  calculationMethodId: number,
  unitId: number,
  inputKey: string,
  value: number,
  territoryId?: number,
): TravelPayload {
  const service = getString(row, 'Service');
  const startDate = ddmmyyyyToISO(getString(row, 'Start date'));
  const endDate = ddmmyyyyToISO(getString(row, 'End date'));

  let description = '';
  if (service === 'Flights') {
    description = getString(row, 'Flight route');
  } else if (service === 'Hotels') {
    description = `${getString(row, 'Hotel name')}, ${getString(row, 'Hotel city')}`;
  } else if (service === 'Trains') {
    description = `${getString(row, 'Departure train station')} → ${getString(row, 'Arrival train station')}`;
  }

  return {
    outputType: 'cozero_payload',
    transactionId: '',
    agency: agencyName,
    service,
    description,
    startDate,
    endDate,
    value,
    valueUnit: inputKey,
    costGbp: getNumber(row, 'Cost per traveler (GBP)'),
    hotelCountry: getString(row, 'Hotel country'),
    categoryId: activityEntry.categoryId,
    subcategoryId: activityEntry.subcategoryId,
    activityDataSourceId: activityEntry.activityId,
    calculationMethodId,
    unitId,
    inputKey,
    locationId,
    businessUnitId,
    territoryId: territoryId ?? defaultTerritoryId,
    periodStart: startDate,
    periodEnd: endDate,
    dataQuality: DEFAULT_DATA_QUALITY,
  };
}

/**
 * Build a Corporate Traveller payload for a single travel row.
 */
export function buildCorporateTravellerPayload(
  row: ParsedRow,
  agencyName: string,
  locationId: number,
  businessUnitId: number,
  defaultTerritoryId: number,
  activityEntry: ActivityEntry,
  calculationMethodId: number,
  unitId: number,
  inputKey: string,
  value: number,
  territoryId?: number,
): TravelPayload {
  const detailsOfService = getString(row, 'Details of Service');
  const dateOfTravel = excelDateToISO(row['Date of Travel']);
  const returnDate = excelDateToISO(row['Return Date']) || dateOfTravel;

  const origin = getString(row, 'Origin Name') || getString(row, 'Origin');
  const destination = getString(row, 'Turn Around Point Name') || getString(row, 'Destination');
  const description = origin && destination ? `${origin} → ${destination}` : getString(row, 'Origin & Destination');

  return {
    outputType: 'cozero_payload',
    transactionId: '',
    agency: agencyName,
    service: detailsOfService,
    description,
    startDate: dateOfTravel,
    endDate: returnDate,
    value,
    valueUnit: inputKey,
    costGbp: getNumber(row, 'Product Net Value'),
    categoryId: activityEntry.categoryId,
    subcategoryId: activityEntry.subcategoryId,
    activityDataSourceId: activityEntry.activityId,
    calculationMethodId,
    unitId,
    inputKey,
    locationId,
    businessUnitId,
    territoryId: territoryId ?? defaultTerritoryId,
    periodStart: dateOfTravel,
    periodEnd: returnDate,
    dataQuality: DEFAULT_DATA_QUALITY,
  };
}

/**
 * Assemble a Cozero transaction payload from a categorised PipelineTransaction.
 */
export function assembleCozeroPayload(
  txn: PipelineTransaction,
  locationId: number,
  businessUnitId: number,
  territoryId: number,
  activityEntry: ActivityEntry | undefined,
  supplierId: number | undefined,
): Record<string, unknown> {
  const missingIds: string[] = [];
  if (!activityEntry) missingIds.push('activity');
  if (!supplierId) missingIds.push('supplier_id');

  const periodStart = txn.transactionDate;
  const periodEnd = txn.transactionDate;

  return {
    transactionId: txn.transactionId,
    supplierCompany: txn.supplierCompany,
    narrative: txn.narrative,
    amount: txn.amount,
    currency: txn.currency,
    transactionDate: txn.transactionDate,
    logCategory: txn.logCategory,
    logSubcategory: txn.logSubcategory,
    businessActivity: txn.businessActivity,
    pipelineStep: txn.pipelineStep,
    categoryId: activityEntry?.categoryId ?? null,
    locationId,
    periodStart,
    periodEnd,
    businessUnitId,
    territoryId,
    subcategoryId: activityEntry?.subcategoryId ?? null,
    activityDataSourceId: activityEntry?.activityId ?? null,
    calculationMethodId: CALC_METHOD_SPEND,
    dataQuality: DEFAULT_DATA_QUALITY,
    inputKey: 'spend',
    unitId: UNIT_GBP,
    value: Math.abs(txn.amount),
    supplierId: supplierId ?? null,
    tagIds: [],
    missingIds: missingIds.join(','),
    readyToUpload: missingIds.length === 0,
  };
}
