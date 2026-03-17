/**
 * Anthropic API service module.
 *
 * ALL Anthropic API calls go through this module.
 * Contains complete prompt templates for supplier recommendation
 * and per-transaction categorisation.
 */

import {
  ANTHROPIC_API_BASE,
  ANTHROPIC_MODEL,
  AI_SUPPLIER_MAX_TOKENS,
  AI_TRANSACTION_MAX_TOKENS,
  AI_BATCH_SIZE,
} from '@/config/constants';
import type {
  AnthropicMessageResponse,
  SupplierSummaryForAI,
  TransactionForAI,
  AISupplierRecommendation,
  AITransactionCategorisation,
  AIParseResult,
} from '@/types/anthropic';
import type { PipelineType } from '@/types/transaction';
import { parseAIResponse } from '@/lib/aiResponseParser';

// ── API Call ─────────────────────────────────────────────

/** Send a message to the Anthropic API. */
async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<AnthropicMessageResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  return (await response.json()) as AnthropicMessageResponse;
}

/** Extract text from an Anthropic response. */
function extractText(response: AnthropicMessageResponse): string {
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
}

// ── Supplier Recommendations ────────────────────────────

/** Build the system prompt for supplier-level AI analysis. */
export function buildSupplierSystemPrompt(agencyName: string): string {
  return `You are a Scope 3 greenhouse gas emissions categorisation specialist for ${agencyName}, an agency within the MSQ Partners group.

You are analysing suppliers from financial transaction data to recommend whether each supplier should be mapped to a single Cozero emissions category.

## VALID BUSINESS ACTIVITIES

Business travel:
- Flights, Hotel stay, Taxi, Rail, Bus, Ferry
- Average car - Petrol, Average car - Battery electric vehicle

Purchased goods:
- Food, Drink, Electrical items and IT, Furniture, Office materials
- Plants, flowers and seeds

Purchased services:
- Software, Telephone and Internet accounts and services
- Data processing and hosting, Employment services, Advertising
- Entertainment and events services, Education services
- Legal services, Insurance services, Facilities support services
- Couriers and messengers, Repair and installation
- Membership organisations, Management consulting, Financial services
- Accounting services, Central government administrative services
- Printing services, Rental services of equipment, Health services
- Travel agency services

Out of scope:
- Building rent, office lease, property service charges
- Utilities (electricity, gas, water) — Scope 1 and 2
- Car/vehicle leasing, parking, congestion charges
- Salary, wages, pension, bonus, national insurance
- Personal medical/dental treatments (osteopathy, physiotherapy, dermatology, eye tests, "CC Medical")
- Childcare vouchers, non-insurance employee benefits, WFH equipment
- Donations, carbon offsets, charitable contributions
- Gift cards, vouchers, per diem, travel allowances
- Flight change/amendment/seat selection/baggage fees (where separate travel data exists)
- Dummy/placeholder finance lines
- Internal transactions between MSQ group entities

## RECOMMENDATION TYPES

- MAP: Supplier consistently falls into one category. Suggest the category.
- OUT_OF_SCOPE: Supplier's transactions are out of scope for Scope 3.
- MIXED_USE: Supplier serves multiple categories (e.g. Amazon, supermarkets). Needs per-transaction categorisation.
- DO_NOT_MAP: Supplier is a person name (employee expense), credit card provider, or similar — needs per-transaction categorisation.

## KEY RULES

1. Physical purchase determines category, not business purpose
2. Food vs Drink: meals = Food, beverages only = Drink, both = Food
3. Entertainment = organised events only (venue hire, parties). Meals are NOT entertainment.
4. Conferences = Education services (not Entertainment)
5. Strategy workshops by external consultants = Management consulting (not Education)
6. Production crew (directors, DOPs, editors, animators) = Employment services
7. Equipment hire (cameras, lighting, edit suites) = Rental services of equipment
8. LinkedIn job posts = Advertising
9. EV charging = Average car - Battery electric vehicle
10. Petrol from supermarkets = Average car - Petrol

## RESPONSE FORMAT

Respond with ONLY a JSON array. No markdown, no explanation, no backticks.
The first character must be [

Each object:
{
  "supplier": "Exact supplier name",
  "recommendation": "MAP" | "OUT_OF_SCOPE" | "MIXED_USE" | "DO_NOT_MAP",
  "suggested_category": "category name or empty",
  "suggested_subcategory": "subcategory name or empty",
  "suggested_activity": "activity name or empty",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Brief explanation"
}`;
}

/** Build the user prompt for supplier-level analysis. */
export function buildSupplierUserPrompt(
  suppliers: SupplierSummaryForAI[],
): string {
  return `Analyse these ${suppliers.length} suppliers and recommend a mapping for each.

${JSON.stringify(suppliers, null, 2)}

Respond with ONLY a JSON array. The first character of your response MUST be [ — do not wrap in backticks, do not use markdown code fences, do not write any text before the JSON.`;
}

/** Run supplier recommendation analysis. */
export async function categoriseSuppliers(
  suppliers: SupplierSummaryForAI[],
  agencyName: string,
): Promise<AIParseResult<AISupplierRecommendation>> {
  const systemPrompt = buildSupplierSystemPrompt(agencyName);
  const userPrompt = buildSupplierUserPrompt(suppliers);

  const response = await callAnthropic(systemPrompt, userPrompt, AI_SUPPLIER_MAX_TOKENS);
  const text = extractText(response);

  return parseAIResponse<AISupplierRecommendation>(text);
}

// ── Per-Transaction Categorisation ──────────────────────

/** Build the system prompt for per-transaction categorisation. */
export function buildTransactionSystemPrompt(pipelineType: PipelineType): string {
  const fieldGuide = pipelineType === 'credit_card'
    ? CREDIT_CARD_FIELD_GUIDE
    : COGNOS_FIELD_GUIDE;

  return `You are a Scope 3 greenhouse gas emissions categorisation specialist. You categorise individual financial transactions into Cozero business activities for carbon emissions reporting.

## CATEGORY TAXONOMY

### Business travel
| Subcategory | Activity |
|---|---|
| Flight travel | Flights |
| Hotel stay | Hotel stay |
| Taxi travel | Taxi |
| Rail travel | Rail |
| Bus travel | Bus |
| Ferry travel | Ferry |
| Passenger car travel | Average car - Petrol |
| Passenger car travel | Average car - Battery electric vehicle |

### Purchased goods (Office goods)
| Subcategory | Activity |
|---|---|
| Office food | Food |
| Drink | Drink |
| Office equipment | Electrical items and IT |
| Office equipment | Furniture |
| Office materials | Office materials |
| Other office goods | Plants, flowers and seeds |

### Purchased services
| Subcategory | Activity |
|---|---|
| ICT services | Software |
| ICT services | Telephone and Internet accounts and services |
| Servers | Data processing and hosting |
| Professional services | Employment services |
| Professional services | Advertising |
| Professional services | Entertainment and events services |
| Professional services | Education services |
| Professional services | Legal services |
| Professional services | Insurance services |
| Professional services | Facilities support services |
| Professional services | Couriers and messengers |
| Professional services | Repair and installation |
| Professional services | Membership organisations |
| Professional services | Management consulting |
| Professional services | Financial services |
| Professional services | Accounting services |
| Professional services | Central government administrative services |
| Professional services | Printing services |
| Professional services | Rental services of equipment |
| Professional services | Health services |
| Professional services | Travel agency services |

## OUT OF SCOPE

These are NOT Scope 3 purchased goods or services:
- Building rent, office lease, property service charges
- Utilities (electricity, gas, water) — Scope 1 and 2
- Car/vehicle leasing (not same as petrol/charging)
- Parking and congestion charges
- Salary, wages, pension, bonus, national insurance
- Personal medical/dental treatments (osteopathy, physiotherapy, dermatology, eye tests, "CC Medical")
- Childcare vouchers, non-insurance employee benefits, WFH equipment contributions
- Donations, carbon offsets, charitable contributions
- Gift cards, vouchers, per diem, and travel allowances
- Flight change/amendment fees, seat selection fees, baggage fees (where agency has separate travel data)
- Dummy or placeholder lines in the finance system
- Internal transactions between MSQ group entities

## CATEGORISATION RULES

**Rule 1: Physical Purchase Principle.** The category is determined by what was physically purchased, not the business purpose. A lunch with a journalist = Food (not Advertising). A dinner with a client = Food (not Entertainment). Drinks with a contact = Drink (not Entertainment).

**Rule 2: Food vs Drink.** Meals, snacks, catering = Food. Beverages only (coffee, water, soft drinks, wine) = Drink. Both food and drink mentioned = Food (higher emission item).

**Rule 3: Entertainment vs Education vs Consulting.** Entertainment and events services = ONLY for organised events (venue hire, party bookings, awards ceremonies, team activity bookings). Conferences = ALWAYS Education services. Individual meals and drinks = NEVER Entertainment. Strategy/planning workshops by external consultants = Management consulting (delivers strategic output, not employee upskilling).

**Rule 4: Advertising.** Only genuinely ad-specific services: media buying, ad clearance, music licensing for commercials, PR retainers, ad distribution, LinkedIn job posts. Production crew (directors, DOPs, editors, animators, casting agents, voice-over artists) = Employment services. Equipment hire for shoots = Rental services of equipment.

**Rule 5: Delivery Services.** Royal Mail, UPS, FedEx, DHL, courier = Couriers and messengers. Deliveroo, UberEats, Just Eat = Food (food delivery, not courier service).

**Rule 6: Specific Patterns.**
- Printer/photocopier/water cooler rental = Rental services of equipment (NOT building rent)
- Business rates, council tax = Central government administrative services
- EV charging = Average car - Battery electric vehicle
- Petrol from supermarkets = Average car - Petrol
- City tax, tourist tax = Central government administrative services
- Skills Development Fund (SDL) = Central government administrative services
- DBS, security vetting = Employment services
- Bank charges, FX fees, annual card fees = Financial services
- Health insurance premiums = Insurance services
- "Dolly" or "Dolly Order" = Food (office pantry supplies, Elmwood UK)
- "Escape the Desk" (ETD) = categorise by what was bought (Food or Drink)
- TB* prefix (Elmwood China) = Entertainment and events services (team building)
- "Pure cafe" = Food

**Rule 7: Bundled/Mixed Expenses.** Where a single transaction covers multiple items, categorise by the highest-emission component: Flights > Hotel stay > Taxi > Rail > Entertainment and events > Food > Drink > Software > Office materials.

${fieldGuide}

## RESPONSE FORMAT

Respond with ONLY a JSON array. No markdown, no explanation, no backticks, no code fences.
The first character of your response MUST be [
Do NOT write any text before or after the JSON array.
Do NOT wrap in \`\`\`json or any formatting.

Each object:
{
  "transaction_id": "the Transaction_ID from the input",
  "log_category": "category name",
  "log_subcategory": "subcategory name",
  "business_activity": "activity name",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Brief explanation (1 sentence)"
}

Use EXACTLY the category, subcategory, and activity names from the taxonomy above.
If truly unable to categorise, use log_category: "unknown".`;
}

const COGNOS_FIELD_GUIDE = `## FIELD USAGE GUIDE (Cognos)

For each transaction you will see:
- **supplier**: Who was paid. Can be misleading for credit cards and employee reimbursements.
- **narrative**: Free-text description of the purchase. This is the most important field.
- **amount**: Transaction value in GBP.
- **cognos_description**: Finance system category code. Useful for some agencies but can be generic.
- **transaction_sub_type**: Invoice, Credit, or Adjustment.

**Priority order:** narrative > supplier context > cognos_description > amount for disambiguation.

**Employee reimbursements:** Supplier is a person name (e.g. "Z-John Smith"). The narrative is the ONLY useful signal.
**Credit card providers:** Supplier is a card company (e.g. "BOI Credit Cards - MichaelP"). Parse the narrative for the actual vendor.
**Pleo transactions:** Date-prefixed narrative (DDMMYY/VendorName). Extract the vendor name.
**Chinese narratives:** Categorise natively — 电话费 (phone), 下午茶 (snacks/tea), 水果 (fruit), 饮料 (beverages), 日用品 (daily necessities), 办公用品 (office supplies).`;

const CREDIT_CARD_FIELD_GUIDE = `## FIELD USAGE GUIDE (Credit Card)

For each transaction you will see:
- **supplier**: Merchant name from the card statement. Can be truncated or contain reference codes.
- **narrative**: Composite of supplier + description + MCC description.
- **amount**: Transaction value in GBP.
- **description**: Free-text from cardholder/finance. Only ~25% filled, but very specific when present.
- **exp_type**: Internal expense type (e.g. "Entertainment - Client"). Reflects business purpose, NOT what was purchased.
- **mcc_description**: Merchant Category Code description. Highly reliable indicator of merchant type.

**Priority order:** description (when present) > mcc_description > supplier context > exp_type (context only).

**CRITICAL: Exp Type traps.**
- "Entertainment - Client" usually means "expense incurred visiting a client" — typically Food or Drink, NOT Entertainment.
- "Office costs-Software" may be actual software, but check description/MCC first.
- NEVER use Exp Type as the primary categorisation signal.

**Amazon transactions:** Mixed-use merchant. Use description when available. Default to Office materials if no description.
**"Commercial Photography, Art and Graphics" MCC:** Usually design software (Canva, Shutterstock, iStock) = Software.
**Gift cards and vouchers:** Out of scope.
**Trophies and awards:** Entertainment and events services (awards ceremony supplies).`;

/** Build the user prompt for per-transaction categorisation. */
export function buildTransactionUserPrompt(
  transactions: TransactionForAI[],
): string {
  return `Categorise these ${transactions.length} transactions.

${JSON.stringify(transactions, null, 2)}

Respond with ONLY a JSON array. The first character of your response MUST be [ — do not wrap in backticks, do not use markdown code fences, do not write any text before the JSON.`;
}

/** Run per-transaction categorisation in batches. */
export async function categoriseTransactions(
  transactions: TransactionForAI[],
  pipelineType: PipelineType,
  batchSize: number = AI_BATCH_SIZE,
): Promise<AIParseResult<AITransactionCategorisation>> {
  const systemPrompt = buildTransactionSystemPrompt(pipelineType);
  const allResults: AITransactionCategorisation[] = [];
  const allErrors: string[] = [];
  let anyTruncated = false;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(transactions.length / batchSize);

    try {
      const userPrompt = buildTransactionUserPrompt(batch);
      const response = await callAnthropic(systemPrompt, userPrompt, AI_TRANSACTION_MAX_TOKENS);
      const text = extractText(response);

      const parsed = parseAIResponse<AITransactionCategorisation>(text);
      allResults.push(...parsed.results);

      if (parsed.wasTruncated) anyTruncated = true;
      if (parsed.errors.length > 0) {
        allErrors.push(...parsed.errors.map(e => `Batch ${batchNum}/${totalBatches}: ${e}`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      allErrors.push(`Batch ${batchNum}/${totalBatches} failed: ${msg}`);
    }
  }

  return {
    results: allResults,
    errors: allErrors,
    wasTruncated: anyTruncated,
  };
}
