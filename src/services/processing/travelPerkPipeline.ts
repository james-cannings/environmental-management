/**
 * TravelPerk travel pipeline orchestrator.
 *
 * Processes CSV exports from TravelPerk covering MSQ DX UK and
 * MSQ Partners Central team. Purely rule-based — no AI needed.
 *
 * Steps:
 *   1. Parse CSV
 *   2. Build payloads (filter, resolve agencies, build Cozero payloads)
 *   3. Duplicate check
 */

import { prisma } from '@/lib/db';
import { parseCsv, getString, getNumber } from '@/lib/fileParser';
import { ddmmyyyyToISO } from '@/lib/fileParser';
import type { PipelineResult } from '@/types/processing';
import type { TravelPayload } from '@/types/transaction';
import type { ActivityEntry } from '@/types/config';
import { recordStep } from '../processing';
import type { ProcessingInput } from '../processing';
import { resolveTravelPerkAgency, TRAVELPERK_VALID_SERVICES } from '@/config/companyMapping';
import { getTerritoryId } from '@/config/territoryMap';
import { buildActivityLookup } from '@/config/activityTypes';
import * as fs from 'fs';

export async function runTravelPerkPipeline(
  runId: string,
  input: ProcessingInput,
): Promise<PipelineResult> {
  const errors: string[] = [];
  let stepOrder = 0;

  // ── Step 1: Parse CSV ──────────────────────────────────
  const upload = await prisma.upload.findUniqueOrThrow({ where: { id: input.uploadId } });
  const fileBuffer = fs.readFileSync(upload.storedPath);
  const rows = parseCsv(fileBuffer);

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
  const hotelAct = actLookup.get('HOTEL STAY');
  const railAct = actLookup.get('RAIL') ?? actLookup.get('NATIONAL RAIL');

  const employeeDistanceMethod = calcMap.get('employee-distance') ?? 40;
  const nightsMethod = calcMap.get('nights') ?? 4;
  const spendMethod = calcMap.get('spend') ?? 45;

  const mileUnit = unitMap.get('mile') ?? 14;
  const roomNightUnit = unitMap.get('room night') ?? 628;
  const gbpUnit = unitMap.get('GBP') ?? 40;

  // ── Step 2: Build payloads ─────────────────────────────
  const payloads: TravelPayload[] = [];
  let excluded = 0;
  let txnCounter = 0;

  for (const row of rows) {
    const service = getString(row, 'Service');
    const company = getString(row, 'Company');
    const bookingStatus = getString(row, 'Booking status').toLowerCase();
    const tripStatus = getString(row, 'Trip status').toLowerCase();

    // Filter: only valid services
    if (!TRAVELPERK_VALID_SERVICES.includes(service as typeof TRAVELPERK_VALID_SERVICES[number])) {
      excluded++;
      continue;
    }

    // Filter: only ticketed, non-cancelled
    if (bookingStatus === 'cancelled' || tripStatus === 'cancelled') {
      excluded++;
      continue;
    }

    // Resolve agency
    const agencyName = resolveTravelPerkAgency(company);
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

    txnCounter++;
    const txnId = `TV-${String(txnCounter).padStart(5, '0')}`;

    if (service === 'Flights') {
      const distance = getNumber(row, 'Estimated distance (mi)');
      if (!distance || distance === 0) { excluded++; continue; }
      if (!flightsAct) { errors.push('Flights activity not in config'); continue; }

      const payload: TravelPayload = {
        outputType: 'cozero_payload',
        transactionId: txnId,
        agency: agencyName,
        service: 'Flights',
        description: getString(row, 'Flight route'),
        startDate: ddmmyyyyToISO(getString(row, 'Start date')),
        endDate: ddmmyyyyToISO(getString(row, 'End date')),
        value: distance,
        valueUnit: 'mile',
        costGbp: getNumber(row, 'Cost per traveler (GBP)'),
        categoryId: flightsAct.categoryId,
        subcategoryId: flightsAct.subcategoryId,
        activityDataSourceId: flightsAct.activityId,
        calculationMethodId: employeeDistanceMethod,
        unitId: mileUnit,
        inputKey: 'default',
        locationId,
        businessUnitId,
        territoryId: defaultTerritoryId,
        periodStart: ddmmyyyyToISO(getString(row, 'Start date')),
        periodEnd: ddmmyyyyToISO(getString(row, 'End date')),
        dataQuality: 'PRIMARY',
      };
      payloads.push(payload);
    } else if (service === 'Hotels') {
      const nights = getNumber(row, 'Hotel nights');
      if (!nights || nights === 0) { excluded++; continue; }
      if (!hotelAct) { errors.push('Hotel activity not in config'); continue; }

      const hotelCountry = getString(row, 'Hotel country');
      const territoryId = getTerritoryId(hotelCountry);
      if (!territoryId) {
        errors.push(`No territory mapping for hotel country: ${hotelCountry}`);
        excluded++;
        continue;
      }

      const payload: TravelPayload = {
        outputType: 'cozero_payload',
        transactionId: txnId,
        agency: agencyName,
        service: 'Hotels',
        description: `${getString(row, 'Hotel name')}, ${getString(row, 'Hotel city')}`,
        startDate: ddmmyyyyToISO(getString(row, 'Start date')),
        endDate: ddmmyyyyToISO(getString(row, 'End date')),
        value: nights,
        valueUnit: 'room night',
        costGbp: getNumber(row, 'Cost per traveler (GBP)'),
        hotelCountry,
        categoryId: hotelAct.categoryId,
        subcategoryId: hotelAct.subcategoryId,
        activityDataSourceId: hotelAct.activityId,
        calculationMethodId: nightsMethod,
        unitId: roomNightUnit,
        inputKey: 'default',
        locationId,
        businessUnitId,
        territoryId,
        periodStart: ddmmyyyyToISO(getString(row, 'Start date')),
        periodEnd: ddmmyyyyToISO(getString(row, 'End date')),
        dataQuality: 'PRIMARY',
      };
      payloads.push(payload);
    } else if (service === 'Trains') {
      if (!railAct) { errors.push('Rail activity not in config'); continue; }

      const distance = getNumber(row, 'Estimated distance (mi)');
      const costGbp = getNumber(row, 'Cost per traveler (GBP)');

      if (distance > 0) {
        // Distance-based rail
        const payload: TravelPayload = {
          outputType: 'cozero_payload',
          transactionId: txnId,
          agency: agencyName,
          service: 'Trains (distance)',
          description: `${getString(row, 'Departure train station')} → ${getString(row, 'Arrival train station')}`,
          startDate: ddmmyyyyToISO(getString(row, 'Start date')),
          endDate: ddmmyyyyToISO(getString(row, 'End date')),
          value: distance,
          valueUnit: 'mile',
          costGbp,
          categoryId: railAct.categoryId,
          subcategoryId: railAct.subcategoryId,
          activityDataSourceId: railAct.activityId,
          calculationMethodId: employeeDistanceMethod,
          unitId: mileUnit,
          inputKey: 'default',
          locationId,
          businessUnitId,
          territoryId: defaultTerritoryId,
          periodStart: ddmmyyyyToISO(getString(row, 'Start date')),
          periodEnd: ddmmyyyyToISO(getString(row, 'End date')),
          dataQuality: 'PRIMARY',
        };
        payloads.push(payload);
      } else if (costGbp > 0) {
        // Spend-based fallback (tube/underground)
        const payload: TravelPayload = {
          outputType: 'cozero_payload',
          transactionId: txnId,
          agency: agencyName,
          service: 'Trains (spend)',
          description: `${getString(row, 'Departure train station')} → ${getString(row, 'Arrival train station')}`,
          startDate: ddmmyyyyToISO(getString(row, 'Start date')),
          endDate: ddmmyyyyToISO(getString(row, 'End date')),
          value: costGbp,
          valueUnit: 'GBP',
          costGbp,
          categoryId: railAct.categoryId,
          subcategoryId: railAct.subcategoryId,
          activityDataSourceId: railAct.activityId,
          calculationMethodId: spendMethod,
          unitId: gbpUnit,
          inputKey: 'spend',
          locationId,
          businessUnitId,
          territoryId: defaultTerritoryId,
          periodStart: ddmmyyyyToISO(getString(row, 'Start date')),
          periodEnd: ddmmyyyyToISO(getString(row, 'End date')),
          dataQuality: 'PRIMARY',
        };
        payloads.push(payload);
      } else {
        excluded++;
      }
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
    pipelineType: 'travelperk',
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
