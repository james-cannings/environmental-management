/**
 * Top-level processing orchestration service.
 *
 * Routes to the correct pipeline based on type, manages ProcessingRun
 * lifecycle, and ensures row count integrity.
 */

import { prisma } from '@/lib/db';
import type { PipelineType } from '@/types/transaction';
import type { PipelineResult } from '@/types/processing';
import { runCognosPipeline } from './processing/cognosPipeline';
import { runCreditCardPipeline } from './processing/creditCardPipeline';
import { runTravelPerkPipeline } from './processing/travelPerkPipeline';
import { runCorporateTravellerPipeline } from './processing/corporateTravellerPipeline';

export interface ProcessingInput {
  uploadId: string;
  pipelineType: PipelineType;
  agencyId: string;
  financialYear?: string;
  quarters?: string[];
}

/** Run the full processing pipeline for an upload. */
export async function runProcessingPipeline(
  input: ProcessingInput,
): Promise<PipelineResult> {
  // Create the processing run record
  const run = await prisma.processingRun.create({
    data: {
      uploadId: input.uploadId,
      agencyId: input.agencyId,
      pipelineType: input.pipelineType,
      financialYear: input.financialYear,
      quarter: input.quarters?.join(','),
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    // Route to the correct pipeline
    let result: PipelineResult;

    switch (input.pipelineType) {
      case 'cognos':
        result = await runCognosPipeline(run.id, input);
        break;
      case 'credit_card':
        result = await runCreditCardPipeline(run.id, input);
        break;
      case 'travelperk':
        result = await runTravelPerkPipeline(run.id, input);
        break;
      case 'corporate_traveller':
        result = await runCorporateTravellerPipeline(run.id, input);
        break;
      default:
        throw new Error(`Unknown pipeline type: ${input.pipelineType}`);
    }

    // Update run status
    await prisma.processingRun.update({
      where: { id: run.id },
      data: {
        status: result.status,
        inputRowCount: result.summary.inputRows,
        excludedCount: result.summary.excludedRows,
        categorisedCount: result.summary.categorisedRows,
        remainingCount: result.summary.remainingRows,
        completedAt: new Date(),
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
      },
    });

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await prisma.processingRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: msg,
      },
    });

    return {
      runId: run.id,
      pipelineType: input.pipelineType,
      status: 'failed',
      summary: {
        inputRows: 0,
        excludedRows: 0,
        categorisedRows: 0,
        remainingRows: 0,
      },
      errors: [msg],
    };
  }
}

/** Record a processing step in the database. */
export async function recordStep(
  runId: string,
  stepName: string,
  stepOrder: number,
  status: 'completed' | 'failed' | 'skipped',
  inputCount: number,
  outputCount: number,
  metadata?: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> {
  await prisma.processingStep.create({
    data: {
      runId,
      stepName,
      stepOrder,
      status,
      inputCount,
      outputCount,
      metadata: metadata ? JSON.stringify(metadata) : null,
      errorMessage,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}
