/**
 * GET /api/agencies — List all agencies.
 * POST /api/agencies — Update an agency (Cozero IDs, contact info).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const agencies = await prisma.agency.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { uploads: true, processingRuns: true, exclusions: true },
        },
      },
    });
    return NextResponse.json(agencies);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      id: string;
      cozeroLocationId?: number | null;
      cozeroBusinessUnitId?: number | null;
      cozeroTerritoryId?: number | null;
      contactEmail?: string | null;
      isActive?: boolean;
    };

    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'Agency id is required' }, { status: 400 });
    }

    const agency = await prisma.agency.update({
      where: { id },
      data,
    });

    return NextResponse.json(agency);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
