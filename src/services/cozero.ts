/**
 * Cozero REST API service module.
 *
 * ALL Cozero API calls go through this module.
 * API base: https://api.cozero.io/v1
 * Organization ID: 5137
 */

import { COZERO_API_BASE, COZERO_ORGANIZATION_ID, COZERO_SUPPLIER_PAGE_SIZE } from '@/config/constants';
import type {
  CozeroAuthResponse,
  CozeroCreateLogPayload,
  CozeroCreateLogResponse,
  CozeroUpdateLogPayload,
  CozeroCreateLogEntryPayload,
  CozeroSupplier,
  CozeroSupplierListResponse,
  CozeroLogEntrySearchParams,
  CozeroLogEntrySearchBody,
  CozeroLogEntrySearchResponse,
} from '@/types/cozero';

// ── Auth Token Cache ────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/** Authenticate with the Cozero API and cache the token. */
export async function authenticate(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const apiKey = process.env.COZERO_API_KEY;
  if (!apiKey) {
    throw new Error('COZERO_API_KEY environment variable is not set');
  }

  const response = await fetch(`${COZERO_API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      organizationId: COZERO_ORGANIZATION_ID,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero auth failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as CozeroAuthResponse;
  cachedToken = data.accessToken;
  // Default to 55 minutes if no expiresIn
  const expiresInMs = (data.expiresIn ?? 3300) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs;

  return cachedToken;
}

/** Make an authenticated request to the Cozero API. */
async function cozeroFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await authenticate();
  const url = `${COZERO_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return response;
}

// ── Log Creation (three-step process) ───────────────────

/** Step 1: Create a log with a category. */
export async function createLog(
  payload: CozeroCreateLogPayload,
): Promise<CozeroCreateLogResponse> {
  const response = await cozeroFetch('/log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero createLog failed (${response.status}): ${body}`);
  }

  return (await response.json()) as CozeroCreateLogResponse;
}

/** Step 2: Update a log with dates, location, and business unit. */
export async function updateLog(
  logId: number,
  payload: CozeroUpdateLogPayload,
): Promise<void> {
  const response = await cozeroFetch(`/log/${logId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero updateLog ${logId} failed (${response.status}): ${body}`);
  }
}

/** Step 3: Create a log entry with spend/consumption data. */
export async function createLogEntry(
  logId: number,
  payload: CozeroCreateLogEntryPayload,
): Promise<Record<string, unknown>> {
  const response = await cozeroFetch(`/log/${logId}/log-entry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero createLogEntry for log ${logId} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

// ── Suppliers ───────────────────────────────────────────

/** List suppliers with pagination. */
export async function listSuppliers(
  page: number = 1,
  pageSize: number = COZERO_SUPPLIER_PAGE_SIZE,
): Promise<CozeroSupplierListResponse> {
  const response = await cozeroFetch(
    `/supplier?pageNumber=${page}&pageSize=${pageSize}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero listSuppliers failed (${response.status}): ${body}`);
  }

  return (await response.json()) as CozeroSupplierListResponse;
}

/** Create a new supplier in Cozero. */
export async function createSupplier(
  name: string,
): Promise<CozeroSupplier> {
  const response = await cozeroFetch('/supplier', {
    method: 'POST',
    body: JSON.stringify({ name, contact: [] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cozero createSupplier "${name}" failed (${response.status}): ${body}`);
  }

  return (await response.json()) as CozeroSupplier;
}

/** Fetch all suppliers from Cozero (handles pagination). */
export async function fetchAllSuppliers(): Promise<CozeroSupplier[]> {
  const allSuppliers: CozeroSupplier[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await listSuppliers(page, COZERO_SUPPLIER_PAGE_SIZE);
    const items = response.data ?? response.items ?? [];
    allSuppliers.push(...items);

    if (items.length < COZERO_SUPPLIER_PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allSuppliers;
}

// ── Log Entry Search (duplicate checking) ───────────────

/** Search existing log entries for duplicate checking. */
export async function searchLogEntries(
  params: CozeroLogEntrySearchParams,
  body: CozeroLogEntrySearchBody,
): Promise<CozeroLogEntrySearchResponse> {
  const queryParams = new URLSearchParams({
    selectedBusinessUnitId: String(params.selectedBusinessUnitId),
    startDate: params.startDate,
    endDate: params.endDate,
    sortingKey: params.sortingKey,
    sortingDirection: params.sortingDirection,
    pageNumber: String(params.pageNumber),
    pageSize: String(params.pageSize),
    useSnowflake: String(params.useSnowflake),
  });

  const response = await cozeroFetch(
    `/log/log-entries/search?${queryParams.toString()}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Cozero searchLogEntries failed (${response.status}): ${responseBody}`);
  }

  return (await response.json()) as CozeroLogEntrySearchResponse;
}

/** Clear the cached auth token (for testing or token refresh). */
export function clearAuthCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
