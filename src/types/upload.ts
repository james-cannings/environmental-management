/**
 * Upload-related type definitions.
 */

import type { PipelineType } from './transaction';

/** Upload request shape from the client. */
export interface UploadRequest {
  file: File;
  pipelineType: PipelineType;
  agencyId: string;
  financialYear?: string;
  quarters?: string[];
}

/** Upload response returned by the API. */
export interface UploadResponse {
  id: string;
  originalFilename: string;
  pipelineType: PipelineType;
  rowCount: number | null;
  status: string;
}
