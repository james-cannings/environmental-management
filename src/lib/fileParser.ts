/**
 * File parsing utilities for XLSX and CSV files.
 */

import * as XLSX from 'xlsx';

/** A parsed row — string-keyed record of cell values. */
export type ParsedRow = Record<string, string | number | boolean | null>;

/** Parse an XLSX buffer into an array of row objects. */
export function parseXlsx(
  buffer: Buffer,
  sheetName?: string,
): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(
      sheetName
        ? `Sheet "${sheetName}" not found. Available: ${available}`
        : 'Workbook contains no sheets',
    );
  }

  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });
}

/** Parse a CSV buffer into an array of row objects. */
export function parseCsv(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const row: ParsedRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? null;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Convert an Excel serial date number to ISO date string (YYYY-MM-DD).
 * Excel epoch is 1899-12-30 (accounting for the leap year bug).
 */
export function excelDateToISO(serial: unknown): string {
  if (typeof serial !== 'number' || !isFinite(serial)) {
    return String(serial ?? '');
  }
  const epoch = new Date(1899, 11, 30); // Dec 30, 1899
  const date = new Date(epoch.getTime() + serial * 86_400_000);
  return date.toISOString().split('T')[0];
}

/**
 * Parse a DD/MM/YYYY date string to ISO (YYYY-MM-DD).
 * Returns the original string if parsing fails.
 */
export function ddmmyyyyToISO(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;

  const [dd, mm, yyyy] = parts;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return dateStr;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a single CSV line handling quoted fields.
 * Handles: escaped quotes (""), fields with commas, multiline within quotes.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Get a string value from a parsed row, returning empty string for null/undefined.
 */
export function getString(row: ParsedRow, key: string): string {
  const val = row[key];
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Get a numeric value from a parsed row, returning 0 for non-numeric values.
 */
export function getNumber(row: ParsedRow, key: string): number {
  const val = row[key];
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}
