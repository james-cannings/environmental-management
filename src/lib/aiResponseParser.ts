/**
 * Three-tier AI response parser.
 *
 * Handles the various formats Claude may return:
 *   Tier 1: Clean JSON array (ideal case)
 *   Tier 2: JSON array embedded in prose (extract from markdown/text)
 *   Tier 3: Individual JSON objects via regex (last resort)
 *
 * Also handles truncated responses (max_tokens reached) and
 * markdown code fences.
 */

import type { AIParseResult } from '@/types/anthropic';

/**
 * Parse an AI response string into an array of typed objects.
 * Uses three-tier fallback strategy.
 */
export function parseAIResponse<T>(responseText: string): AIParseResult<T> {
  const errors: string[] = [];

  if (!responseText || !responseText.trim()) {
    return { results: [], errors: ['Empty AI response'], wasTruncated: false };
  }

  // Clean up markdown code fences
  let cleaned = responseText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```\s*$/i, '');
  cleaned = cleaned.trim();

  // Tier 1: Try parsing as a clean JSON array
  const tier1 = tryParseJsonArray<T>(cleaned);
  if (tier1) {
    return { results: tier1, errors: [], wasTruncated: false };
  }

  // Tier 2: Extract JSON array from prose response
  const tier2 = extractJsonArrayFromProse<T>(responseText);
  if (tier2.results.length > 0) {
    if (tier2.wasTruncated) {
      errors.push('Response appears truncated — partial results recovered');
    }
    return { results: tier2.results, errors, wasTruncated: tier2.wasTruncated };
  }

  // Tier 3: Extract individual JSON objects via regex
  const tier3 = extractIndividualObjects<T>(responseText);
  if (tier3.length > 0) {
    errors.push('Parsed via individual object extraction — response was not a clean JSON array');
    return { results: tier3, errors, wasTruncated: false };
  }

  // All tiers failed
  const preview = responseText.substring(0, 200);
  const isProse = /^[A-Z][a-z]/.test(responseText.trim());
  if (isProse) {
    errors.push(`AI returned prose instead of JSON. Preview: ${preview}`);
  } else {
    errors.push(`Could not parse AI response as JSON. Preview: ${preview}`);
  }

  return { results: [], errors, wasTruncated: false };
}

/** Tier 1: Try to parse the string as a JSON array directly. */
function tryParseJsonArray<T>(text: string): T[] | null {
  if (!text.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    // Try truncation recovery: find last complete object and close array
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace > 0) {
      try {
        const recovered = JSON.parse(text.substring(0, lastBrace + 1) + ']');
        if (Array.isArray(recovered)) return recovered as T[];
      } catch {
        // Fall through
      }
    }
  }

  return null;
}

/** Tier 2: Find a JSON array within a larger text response. */
function extractJsonArrayFromProse<T>(
  text: string,
): { results: T[]; wasTruncated: boolean } {
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');

  if (arrayStart < 0) {
    return { results: [], wasTruncated: false };
  }

  // If we found a closing bracket, try the full range
  if (arrayEnd > arrayStart) {
    try {
      const candidate = text.substring(arrayStart, arrayEnd + 1);
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return { results: parsed as T[], wasTruncated: false };
      }
    } catch {
      // Fall through to truncation recovery
    }
  }

  // Truncation recovery: find last complete object within the array
  const fromStart = text.substring(arrayStart);
  const lastBrace = fromStart.lastIndexOf('}');
  if (lastBrace > 0) {
    try {
      const recovered = JSON.parse(fromStart.substring(0, lastBrace + 1) + ']');
      if (Array.isArray(recovered)) {
        return { results: recovered as T[], wasTruncated: true };
      }
    } catch {
      // Fall through
    }
  }

  return { results: [], wasTruncated: false };
}

/** Tier 3: Extract individual JSON objects using regex. */
function extractIndividualObjects<T>(text: string): T[] {
  const results: T[] = [];
  // Match individual JSON objects (non-greedy)
  const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0]) as T;
      results.push(obj);
    } catch {
      // Skip malformed objects
    }
  }

  return results;
}

/**
 * Extract text content from an Anthropic API response body.
 * Handles the content block array format.
 */
export function extractTextFromAnthropicResponse(
  responseBody: Record<string, unknown>,
): string {
  const content = responseBody.content;
  if (!Array.isArray(content)) {
    if (typeof responseBody === 'string') return responseBody;
    return '';
  }

  const textParts: string[] = [];
  for (const block of content) {
    if (
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block &&
      typeof block.text === 'string'
    ) {
      textParts.push(block.text);
    }
  }

  return textParts.join('');
}

/**
 * Check if an Anthropic response was truncated (hit max_tokens).
 */
export function wasResponseTruncated(
  responseBody: Record<string, unknown>,
): boolean {
  return responseBody.stop_reason === 'max_tokens';
}
