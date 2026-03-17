/**
 * POST /api/config/import — Import supplier mappings from CSV.
 *
 * Accepts a CSV file with columns: supplier, businessActivity, source
 * and upserts into the Supplier table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseCsv, getString } from '@/lib/fileParser';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = parseCsv(buffer);

    if (importType === 'suppliers') {
      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        const name = getString(row, 'supplier') || getString(row, 'name');
        const businessActivity = getString(row, 'businessActivity') || getString(row, 'business_activity');

        if (!name || !businessActivity) {
          skipped++;
          continue;
        }

        await prisma.supplier.upsert({
          where: { name },
          update: { businessActivity, source: 'csv_import' },
          create: { name, businessActivity, source: 'csv_import' },
        });
        imported++;
      }

      return NextResponse.json({ imported, skipped, total: rows.length });
    }

    return NextResponse.json({ error: `Unknown import type: ${importType}` }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
