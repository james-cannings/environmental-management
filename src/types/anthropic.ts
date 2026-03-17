/**
 * Anthropic API type definitions for Claude integration.
 */

export interface AnthropicMessageRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

export interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Supplier summary prepared for the AI supplier recommendation prompt. */
export interface SupplierSummaryForAI {
  supplier: string;
  transaction_count: number;
  total_spend: number;
  exp_types?: string;
  mcc_descriptions?: string;
  sample_narratives: string[];
  cognos_descriptions?: string;
}

/** Transaction data prepared for the AI per-transaction categorisation prompt. */
export interface TransactionForAI {
  transaction_id: string;
  supplier: string;
  narrative: string;
  amount: number;
  cognos_description?: string;
  transaction_sub_type?: string;
  transaction_date: string;
  description?: string;
  exp_type?: string;
  category?: string;
  mcc_description?: string;
}

/** AI supplier recommendation response (from JSON parsing). */
export interface AISupplierRecommendation {
  supplier: string;
  recommendation: 'MAP' | 'OUT_OF_SCOPE' | 'MIXED_USE' | 'DO_NOT_MAP';
  suggested_category: string;
  suggested_subcategory: string;
  suggested_activity: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

/** AI transaction categorisation response (from JSON parsing). */
export interface AITransactionCategorisation {
  transaction_id: string;
  log_category: string;
  log_subcategory: string;
  business_activity: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

/** Result of parsing an AI response (may include errors). */
export interface AIParseResult<T> {
  results: T[];
  errors: string[];
  wasTruncated: boolean;
}
