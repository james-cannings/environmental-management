/**
 * POST /api/push — Push categorised data to Cozero.
 * GET /api/push — List push history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLog, updateLog, createLogEntry } from '@/services/cozero';
import type { CozeroCreateLogPayload, CozeroUpdateLogPayload, CozeroCreateLogEntryPayload } from '@/types/cozero';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const runId = searchParams.get('runId');

    const where = runId ? { runId } : {};

    const pushes = await prisma.cozeroPush.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        run: {
          select: {
            pipelineType: true,
            agency: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(pushes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      runId: string;
      transactionIds?: string[];
    };

    const { runId, transactionIds } = body;
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    // Get transactions ready to push
    const where: Record<string, unknown> = {
      runId,
      readyToUpload: true,
    };
    if (transactionIds && transactionIds.length > 0) {
      where.transactionId = { in: transactionIds };
    }

    const transactions = await prisma.transaction.findMany({ where });

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions ready to push' }, { status: 400 });
    }

    const results: { transactionId: string; status: string; cozeroLogId?: number; error?: string }[] = [];

    for (const txn of transactions) {
      const pushRecord = await prisma.cozeroPush.create({
        data: {
          runId,
          transactionId: txn.transactionId,
          cozeroEndpoint: '/log',
          requestPayload: JSON.stringify(txn),
          status: 'pending',
        },
      });

      try {
        // Step 1: Create log
        const logPayload: CozeroCreateLogPayload = {
          category_id: txn.cozeroCategoryId ?? 0,
        };
        const logResponse = await createLog(logPayload);

        // Step 2: Update log with dates and location
        const updatePayload: CozeroUpdateLogPayload = {
          startDate: txn.startDate ?? txn.transactionDate ?? '',
          endDate: txn.endDate ?? txn.transactionDate ?? '',
          location_id: txn.locationId ?? 0,
          business_unit_id: txn.businessUnitId ?? 0,
        };
        await updateLog(logResponse.id, updatePayload);

        // Step 3: Create log entry
        const inputKey = txn.inputKey ?? 'spend';
        const entryPayload: CozeroCreateLogEntryPayload = {
          subcategory_id: txn.cozeroSubcategoryId ?? 0,
          activity_data_source_id: txn.cozeroActivityId ?? 0,
          calculation_method_id: txn.calculationMethodId ?? 0,
          data_quality: txn.dataQuality ?? 'PRIMARY',
          territory_id: txn.territoryId ?? undefined,
          inputs: {
            [inputKey]: {
              value: txn.amount ?? txn.value ?? 0,
              unit_id: txn.unitId ?? 0,
            },
          },
        };
        await createLogEntry(logResponse.id, entryPayload);

        // Update push record
        await prisma.cozeroPush.update({
          where: { id: pushRecord.id },
          data: {
            status: 'success',
            cozeroLogId: logResponse.id,
            responseStatus: 200,
            pushedAt: new Date(),
          },
        });

        results.push({ transactionId: txn.transactionId, status: 'success', cozeroLogId: logResponse.id });
      } catch (pushErr) {
        const errMsg = pushErr instanceof Error ? pushErr.message : String(pushErr);
        await prisma.cozeroPush.update({
          where: { id: pushRecord.id },
          data: {
            status: 'failed',
            errorMessage: errMsg,
            pushedAt: new Date(),
          },
        });
        results.push({ transactionId: txn.transactionId, status: 'failed', error: errMsg });
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      total: results.length,
      succeeded,
      failed,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
