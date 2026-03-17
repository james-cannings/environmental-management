/**
 * POST /api/upload — Handle file upload with pipeline type and agency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pipelineType = formData.get('pipelineType') as string | null;
    const agencyId = formData.get('agencyId') as string | null;
    const financialYear = formData.get('financialYear') as string | null;
    const quarters = formData.get('quarters') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!pipelineType) {
      return NextResponse.json({ error: 'No pipeline type provided' }, { status: 400 });
    }
    if (!agencyId) {
      return NextResponse.json({ error: 'No agency selected' }, { status: 400 });
    }

    const validTypes = ['cognos', 'credit_card', 'travelperk', 'corporate_traveller'];
    if (!validTypes.includes(pipelineType)) {
      return NextResponse.json({ error: `Invalid pipeline type: ${pipelineType}` }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Save file to disk
    const ext = path.extname(file.name).toLowerCase();
    const fileType = ext === '.csv' ? 'csv' : 'xlsx';
    const timestamp = Date.now();
    const storedFilename = `${timestamp}-${file.name}`;
    const storedPath = path.join(UPLOAD_DIR, storedFilename);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(storedPath, Buffer.from(arrayBuffer));

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        agencyId,
        originalFilename: file.name,
        storedPath,
        fileType,
        pipelineType,
        status: 'uploaded',
      },
    });

    return NextResponse.json({
      id: upload.id,
      originalFilename: upload.originalFilename,
      pipelineType: upload.pipelineType,
      rowCount: upload.rowCount,
      status: upload.status,
      financialYear: financialYear ?? undefined,
      quarters: quarters ? quarters.split(',') : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
