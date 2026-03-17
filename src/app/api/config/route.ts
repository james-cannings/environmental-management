/**
 * GET /api/config — Return all configuration data (activities, methods, units, territories).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const [activities, calcMethods, units, territories] = await Promise.all([
      prisma.activityTaxonomy.findMany({ orderBy: { categoryName: 'asc' } }),
      prisma.calculationMethod.findMany({ orderBy: { key: 'asc' } }),
      prisma.unit.findMany({ orderBy: { key: 'asc' } }),
      prisma.territoryMapping.findMany({ orderBy: { countryName: 'asc' } }),
    ]);

    return NextResponse.json({
      activities,
      calcMethods,
      units,
      territories,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
