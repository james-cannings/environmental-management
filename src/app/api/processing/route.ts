/**
 * GET /api/processing — List processing runs.
 * POST /api/processing — Trigger a new processing run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runProcessingPipeline } from '@/services/processing';
import type { PipelineType } from '@/types/transaction';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineType = searchParams.get('pipelineType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const where: Record<string, string> = {};
    if (pipelineType) where.pipelineType = pipelineType;
    if (status) where.status = status;

    const runs = await prisma.processingRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        upload: { select: { originalFilename: true } },
        agency: { select: { name: true } },
        _count: { select: { steps: true } },
      },
    });

    return NextResponse.json(runs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      uploadId: string;
      pipelineType: string;
      agencyId: string;
      financialYear?: string;
      quarters?: string[];
    };

    const { uploadId, pipelineType, agencyId, financialYear, quarters } = body;

    if (!uploadId || !pipelineType || !agencyId) {
      return NextResponse.json(
        { error: 'uploadId, pipelineType, and agencyId are required' },
        { status: 400 },
      );
    }

    const result = await runProcessingPipeline({
      uploadId,
      pipelineType: pipelineType as PipelineType,
      agencyId,
      financialYear,
      quarters,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
