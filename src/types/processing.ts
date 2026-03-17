/**
 * Processing run and step type definitions.
 */

import type { PipelineType } from './transaction';

/** Options for triggering a processing run. */
export interface ProcessingOptions {
  uploadId: string;
  pipelineType: PipelineType;
  agencyId: string;
  financialYear?: string;
  quarters?: string[];
}

/** Step name constants for each pipeline. */
export const COGNOS_STEPS = [
  'parse_excel',
  'filter_agency_quarter',
  'agency_exclusions',
  'exclude_zero_amounts',
  'exclude_accounting_entries',
  'supplier_mapping',
  'ai_supplier_recommendations',
  'ai_transaction_categorisation',
  'assemble_cozero_payload',
] as const;

export const CREDIT_CARD_STEPS = [
  'parse_excel',
  'mcc_categorisation',
  'supplier_mapping',
  'ai_supplier_recommendations',
  'ai_transaction_categorisation',
  'assemble_cozero_payload',
] as const;

export const TRAVEL_STEPS = [
  'parse_file',
  'build_payloads',
  'duplicate_check',
] as const;

export type CognosStep = typeof COGNOS_STEPS[number];
export type CreditCardStep = typeof CREDIT_CARD_STEPS[number];
export type TravelStep = typeof TRAVEL_STEPS[number];

/** Result returned from a pipeline execution. */
export interface PipelineResult {
  runId: string;
  pipelineType: PipelineType;
  status: 'completed' | 'failed';
  summary: {
    inputRows: number;
    excludedRows: number;
    categorisedRows: number;
    remainingRows: number;
    supplierRecommendations?: number;
    duplicatesSkipped?: number;
  };
  errors: string[];
}
