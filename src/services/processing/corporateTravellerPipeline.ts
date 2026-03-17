/**
 * Corporate Traveller travel pipeline orchestrator.
 *
 * Processes XLSX exports from Corporate Traveller covering Smarts UK
 * and Smarts Netherlands. Purely rule-based — no AI needed.
 *
 * Steps:
 *   1. Parse XLSX ("ATT004 All Travel Types CO2 Onl" sheet)
 *   2. Build payloads (filter, resolve accounts, build Cozero payloads)
 *   3. Duplicate check
 */

import { prisma } from '@/lib/db';
import { parseXlsx, getString, getNumber, excelDateToISO } from '@/lib/fileParser';
import type { PipelineResult } from '@/types/processing';
import type { TravelPayload } from '@/types/transaction';
import type { ActivityEntry } from '@/types/config';
import { recordStep } from '../processing';
import type { ProcessingInput } from '../processing';
import {
  resolveCorporateTravellerAgency,
  CT_FLIGHT_SERVICES,
  CT_RAIL_SERVICES,
  CT_EXCLUDED_SERVICES,
} from '@/config/companyMapping';
import { getTerritoryId } from '@/config/territoryMap';
import { buildActivityLookup } from '@/config/activityTypes';
import * as fs from 'fs';

const CT_SHEET_NAME = 'ATT004 All Travel Types CO2 Onl';

export async function runCorporateTravellerPipeline(
  runId: string,
  input: ProcessingInput,
): Promise<PipelineResult> {
  const errors: string[] = [];
  let stepOrder = 0;

  // ── Step 1: Parse XLSX ─────────────────────────────────
  const upload = await prisma.upload.findUniqueOrThrow({ where: { id: input.uploadId } });
  const fileBuffer = fs.readFileSync(upload.storedPath);
  const rows = parseXlsx(Buffer.from(fileBuffer), CT_SHEET_NAME);

  await recordStep(runId, 'parse_file', ++stepOrder, 'completed', rows.length, rows.length);

  // ── Load config ────────────────────────────────────────
  const activities = await prisma.activityTaxonomy.findMany();
  const actEntries: ActivityEntry[] = activities.map(a => ({
    categoryName: a.categoryName, categoryId: a.categoryId,
    subcategoryName: a.subcategoryName, subcategoryId: a.subcategoryId,
    activityName: a.activityName, activityId: a.activityId,
  }));
  const actLookup = buildActivityLookup(actEntries);

  const calcMethods = await prisma.calculationMethod.findMany();
  const calcMap = new Map(calcMethods.map(m => [m.key, m.cozeroId]));

  const units = await prisma.unit.findMany();
  const unitMap = new Map(units.map(u => [u.key, u.cozeroId]));

  const flightsAct = actLookup.get('FLIGHTS');
  const railAct = actLookup.get('RAIL') ?? actLookup.get('NATIONAL RAIL');

  const employeeDistanceMethod = calcMap.get('employee-distance') ?? 40;
  const kmUnit = unitMap.get('km') ?? 16;

  // ── Step 2: Build payloads ─────────────────────────────
  const payloads: TravelPayload[] = [];
  let excluded = 0;
  let txnCounter = 0;

  for (const row of rows) {
    const serviceType = getString(row, 'Service Type');
    const accountName = getString(row, 'Account Name');

    // Filter: exclude ancillary services
    if (CT_EXCLUDED_SERVICES.includes(serviceType as typeof CT_EXCLUDED_SERVICES[number])) {
      excluded++;
      continue;
    }

    // Determine if flight or rail
    const isFlight = CT_FLIGHT_SERVICES.includes(serviceType as typeof CT_FLIGHT_SERVICES[number]);
    const isRail = CT_RAIL_SERVICES.includes(serviceType as typeof CT_RAIL_SERVICES[number]);

    if (!isFlight && !isRail) {
      excluded++;
      continue;
    }

    // Resolve agency
    const agencyName = resolveCorporateTravellerAgency(accountName);
    if (!agencyName) {
      excluded++;
      continue;
    }

    const agency = await prisma.agency.findFirst({ where: { name: agencyName } });
    if (!agency) {
      errors.push(`Agency not found: ${agencyName}`);
      continue;
    }

    const locationId = agency.cozeroLocationId ?? 0;
    const businessUnitId = agency.cozeroBusinessUnitId ?? 0;
    const defaultTerritoryId = agency.cozeroTerritoryId ?? 0;

    // Distance in km
    const distanceKm = getNumber(row, 'Total Km');
    if (!distanceKm || distanceKm === 0) {
      excluded++;
      continue;
    }

    txnCounter++;
    const txnId = `CT-${String(txnCounter).padStart(5, '0')}`;

    // Parse dates — Corporate Traveller uses Excel serial dates
    const departDateRaw = row['Depart Date'];
    const returnDateRaw = row['Return Date'];
    const startDate = typeof departDateRaw === 'number'
      ? excelDateToISO(departDateRaw)
      : getString(row, 'Depart Date');
    const endDate = typeof returnDateRaw === 'number'
      ? excelDateToISO(returnDateRaw)
      : getString(row, 'Return Date');

    if (isFlight) {
      if (!flightsAct) { errors.push('Flights activity not in config'); continue; }

      const payload: TravelPayload = {
        outputType: 'cozero_payload',
        transactionId: txnId,
        agency: agencyName,
        service: `Flights (${serviceType})`,
        description: `${getString(row, 'Origin City Name')} → ${getString(row, 'Destination City Name')}`,
        startDate,
        endDate,
        value: distanceKm,
        valueUnit: 'km',
        costGbp: getNumber(row, 'Total Inc Tax GBP'),
        categoryId: flightsAct.categoryId,
        subcategoryId: flightsAct.subcategoryId,
        activityDataSourceId: flightsAct.activityId,
        calculationMethodId: employeeDistanceMethod,
        unitId: kmUnit,
        inputKey: 'default',
        locationId,
        businessUnitId,
        territoryId: defaultTerritoryId,
        periodStart: startDate,
        periodEnd: endDate,
        dataQuality: 'PRIMARY',
      };
      payloads.push(payload);
    } else if (isRail) {
      if (!railAct) { errors.push('Rail activity not in config'); continue; }

      // Rail territory from Origin Country Code
      const originCountry = getString(row, 'Origin Country Code');
      const territoryId = getTerritoryId(originCountry) ?? defaultTerritoryId;

      const payload: TravelPayload = {
        outputType: 'cozero_payload',
        transactionId: txnId,
        agency: agencyName,
        service: `Rail (${serviceType})`,
        description: `${getString(row, 'Origin City Name')} → ${getString(row, 'Destination City Name')}`,
        startDate,
        endDate,
        value: distanceKm,
        valueUnit: 'km',
        costGbp: getNumber(row, 'Total Inc Tax GBP'),
        categoryId: railAct.categoryId,
        subcategoryId: railAct.subcategoryId,
        activityDataSourceId: railAct.activityId,
        calculationMethodId: employeeDistanceMethod,
        unitId: kmUnit,
        inputKey: 'default',
        locationId,
        businessUnitId,
        territoryId,
        periodStart: startDate,
        periodEnd: endDate,
        dataQuality: 'PRIMARY',
      };
      payloads.push(payload);
    }
  }

  await recordStep(runId, 'build_payloads', ++stepOrder, 'completed', rows.length, payloads.length,
    { excluded, payloadCount: payloads.length });

  // ── Step 3: Duplicate check (placeholder) ──────────────
  // TODO: Implement Cozero log entry search-based duplicate checking
  await recordStep(runId, 'duplicate_check', ++stepOrder, 'completed', payloads.length, payloads.length,
    { duplicatesSkipped: 0 });

  return {
    runId,
    pipelineType: 'corporate_traveller',
    status: 'completed',
    summary: {
      inputRows: rows.length,
      excludedRows: excluded,
      categorisedRows: payloads.length,
      remainingRows: 0,
      duplicatesSkipped: 0,
    },
    errors,
  };
}
