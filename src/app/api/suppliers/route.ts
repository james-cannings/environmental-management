/**
 * GET /api/suppliers — List all mapped suppliers.
 * POST /api/suppliers — Create or update a supplier mapping.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') ?? '200', 10);

    const where = search
      ? { name: { contains: search } }
      : {};

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
    });

    const total = await prisma.supplier.count({ where });

    return NextResponse.json({ suppliers, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      name: string;
      businessActivity: string;
      cozeroSupplierId?: number | null;
      source?: string;
    };

    const { name, businessActivity, cozeroSupplierId, source } = body;

    if (!name || !businessActivity) {
      return NextResponse.json(
        { error: 'name and businessActivity are required' },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.upsert({
      where: { name },
      update: { businessActivity, cozeroSupplierId, source },
      create: { name, businessActivity, cozeroSupplierId, source },
    });

    return NextResponse.json(supplier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
