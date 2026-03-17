/**
 * POST /api/suppliers/sync — Sync suppliers with Cozero.
 *
 * Fetches all suppliers from Cozero and matches them to local suppliers
 * by name. Creates missing suppliers in Cozero if requested.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAllSuppliers, createSupplier as createCozeroSupplier } from '@/services/cozero';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      createMissing?: boolean;
    };

    // Fetch all suppliers from Cozero
    const cozeroSuppliers = await fetchAllSuppliers();
    const cozeroMap = new Map(cozeroSuppliers.map(s => [s.name.toLowerCase(), s.id]));

    // Get all local suppliers
    const localSuppliers = await prisma.supplier.findMany();
    const localUnmapped = await prisma.unmappedSupplier.findMany();
    const allLocal = [...localSuppliers, ...localUnmapped];

    let matched = 0;
    let created = 0;
    let unmatched = 0;
    const errors: string[] = [];

    for (const supplier of allLocal) {
      const cozeroId = cozeroMap.get(supplier.name.toLowerCase());

      if (cozeroId) {
        // Match found — update local record
        if ('businessActivity' in supplier) {
          await prisma.supplier.update({
            where: { id: supplier.id },
            data: { cozeroSupplierId: cozeroId },
          });
        } else {
          await prisma.unmappedSupplier.update({
            where: { id: supplier.id },
            data: { cozeroSupplierId: cozeroId },
          });
        }
        matched++;
      } else if (body.createMissing) {
        // Create in Cozero
        try {
          const created_supplier = await createCozeroSupplier(supplier.name);
          if ('businessActivity' in supplier) {
            await prisma.supplier.update({
              where: { id: supplier.id },
              data: { cozeroSupplierId: created_supplier.id },
            });
          } else {
            await prisma.unmappedSupplier.update({
              where: { id: supplier.id },
              data: { cozeroSupplierId: created_supplier.id },
            });
          }
          created++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to create "${supplier.name}" in Cozero: ${msg}`);
        }
      } else {
        unmatched++;
      }
    }

    return NextResponse.json({
      totalLocal: allLocal.length,
      totalCozero: cozeroSuppliers.length,
      matched,
      created,
      unmatched,
      errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
