/**
 * GET /api/processing/[id] — Get processing run detail with steps and transactions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const run = await prisma.processingRun.findUnique({
      where: { id },
      include: {
        upload: { select: { originalFilename: true, pipelineType: true } },
        agency: { select: { name: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Processing run not found' }, { status: 404 });
    }

    // Fetch transaction summary counts by status
    const transactions = await prisma.transaction.groupBy({
      by: ['pipelineStatus'],
      where: { runId: id },
      _count: true,
    });

    const transactionSummary = Object.fromEntries(
      transactions.map(t => [t.pipelineStatus, t._count]),
    );

    return NextResponse.json({ ...run, transactionSummary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
