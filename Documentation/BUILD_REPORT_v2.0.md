# Build Report — v2.0 Full Foundation

**Date:** 17 March 2026
**Scope:** Full foundation build replacing ~5 n8n automation workflows
**Sessions:** 2 (continued across context window boundary)
**Build status:** Passes cleanly (`npx next build` — 19 routes, zero errors)

---

## What Was Built

This build implemented the complete data processing foundation for the MSQ Sustainability Data Manager. The application ingests financial and travel data from four source formats, applies a multi-stage categorisation pipeline (rule-based exclusions, supplier mapping, MCC matching, and AI-assisted categorisation), then pushes the results to the Cozero sustainability platform via its REST API.

All business logic was extracted from five existing n8n workflow JSON files and faithfully replicated in TypeScript, including prompt templates, exclusion rules, MCC matching tables, travel service configurations, and date-parsing edge cases.

---

## Build Inventory

### Total Files

| Layer | Files | Lines |
|-------|------:|------:|
| Database schema | 1 | 253 |
| Seed script | 1 | 181 |
| Type definitions | 7 | 542 |
| Configuration constants | 7 | 437 |
| Core library modules | 5 | 689 |
| Service modules | 8 | 2,124 |
| API routes | 9 | 627 |
| Page implementations | 8 | 1,113 |
| UI components (shared) | 4 | 248 |
| UI components (layout) | 3 | 101 |
| **Total** | **53** | **6,315** |

---

## Phase-by-Phase Summary

### Phase 1 — Database Schema Expansion

Expanded the Prisma schema from 5 models to 15 models. The original scaffold had Agency, Upload, ProcessingRun, ProcessingStep, and CozeroPush. This phase added:

- **Transaction** — Full source data preservation for every row processed. Stores original fields (supplier, narrative, amount, date, Cognos description, MCC description), categorisation results (category, subcategory, activity, confidence, AI reasoning), resolved Cozero IDs, and a `readyToUpload` flag.
- **Supplier** — Mapped suppliers with a 1:1 business activity. Replaces the Google Sheets supplier mapping tab.
- **UnmappedSupplier** — Multi-category suppliers that only need a Cozero supplier ID (no single activity mapping).
- **ActivityTaxonomy** — 37 valid category/subcategory/activity combinations with their Cozero platform IDs.
- **AgencyExclusion** — Per-agency supplier exclusions, supporting both full exclusion and conditional exclusion (with narrative keyword matching).
- **CalculationMethod** — 3 methods: spend, employee-distance, nights.
- **Unit** — 4 units: GBP, mile, km, room night.
- **TerritoryMapping** — 25 country codes mapped to Cozero territory IDs.

Existing models were also expanded: Agency gained Cozero location/BU/territory IDs and a `dbNames` JSON field for Cognos name resolution; Upload gained `pipelineType`; ProcessingRun gained row count tracking fields; ProcessingStep gained `inputCount`, `outputCount`, and `metadata`.

### Phase 2 — TypeScript Type Definitions

Created 6 type definition files (plus expanded 1 existing):

- **`transaction.ts`** (127 lines) — `PipelineTransaction` (the core data structure flowing through all pipelines), `TravelPayload`, `SupplierRecommendation`, `AITransactionResult`, `ProcessingRunSummary`. Pipeline transaction includes 30+ fields covering source data, categorisation state, and Cozero payload fields.
- **`processing.ts`** (62 lines) — `PipelineResult`, `PipelineStepResult`, and step name constants for all four pipelines (`COGNOS_STEPS`, `CREDIT_CARD_STEPS`, `TRAVEL_STEPS`).
- **`cozero.ts`** (142 lines) — Full Cozero API types using snake_case to match the API contract: auth tokens, log create/update payloads, log entry payloads, supplier types, search parameters. This was a key architectural decision — internal types use camelCase, but Cozero payload types use snake_case to avoid error-prone mapping at the boundary.
- **`anthropic.ts`** (87 lines) — Anthropic message request/response types, AI categorisation result types, `AIParseResult` for the three-tier parser.
- **`config.ts`** (72 lines) — `ActivityEntry`, `MccRule`, `ExclusionPattern`, `CompanyMapping`, `CalcMethodConfig`, `ServiceTypeConfig`.
- **`upload.ts`** (23 lines) — Upload request/response interfaces.

### Phase 3 — Configuration Constants

Migrated all configuration data from Google Sheets and n8n workflow hardcoded values into 7 TypeScript config files:

- **`constants.ts`** (57 lines) — Cozero API base URL, organisation ID (5137), Anthropic model ID (`claude-sonnet-4-6-20250514`), batch size (150), pipeline-specific Cozero IDs, activity name aliases for common variants.
- **`activityTypes.ts`** (67 lines) — Complete taxonomy of 37 activity entries with Cozero category/subcategory/activity IDs. Includes `buildActivityLookup()` function for name-based resolution.
- **`mccRules.ts`** (98 lines) — 43 MCC description matching rules extracted from the n8n "MCC Categorisation" code node. Each rule maps a lowercase substring match to a category/subcategory/activity triple. Also includes credit card supplier-level rules (e.g. "CARD FEE" maps to Financial services).
- **`exclusionPatterns.ts`** (70 lines) — 26 exact-match Cognos Description exclusions (payables, tax placeholders, compensation, cash movements, prepayments, property assets, donations, audit) and 3 partial-match patterns (intraco, interco, mmt recharges). Extracted from n8n Node 9.
- **`internalPatterns.ts`** (36 lines) — 18 MSQ group entity name patterns for inter-company transaction detection (msq, mbastack, stein ias, stack, twentysix, elmwood, freemavens, mmt digital, smarts, the gate, etc.). Includes `isInternalSupplier()` function.
- **`territoryMap.ts`** (39 lines) — 25 country codes mapped to Cozero territory IDs. Merged from the UK TravelPerk map (7 countries) and the Singapore Corporate Traveller map (24 countries), deduplicated.
- **`companyMapping.ts`** (70 lines) — TravelPerk company-to-agency mappings (MMT Ltd = MSQ DX UK, MSQ Partners Ltd = MSQ Partners Central team) and Corporate Traveller mappings (SMARTS (NI) LT = Smarts UK, MSQ PARTNERS EUROPE B.V. = Smarts Netherlands). Service type constants for both travel pipelines.

### Phase 4 — Core Library Modules

Built 4 utility modules in `src/lib/`:

- **`fileParser.ts`** (134 lines) — `parseXlsx()` for XLSX with optional sheet name targeting, `parseCsv()` with proper quote handling, `excelDateToISO()` for Excel serial number conversion (epoch: 30 Dec 1899), `ddmmyyyyToISO()` for UK date formats, plus `getString()` and `getNumber()` safe accessor functions.
- **`validators.ts`** (110 lines) — Column presence validation for all four pipeline types. Cognos requires 7 columns (DB Name, Supplier Company, Narrative, Amount, Transaction Date, Cognos Description, Transaction Sub Type). Credit Card requires 6 (MCC Description, ExpType, Description, Amount, Transaction Date, Cardholder). TravelPerk requires 6 CSV columns. Corporate Traveller validates the specific sheet name.
- **`transformers.ts`** (258 lines) — `buildCognosTransaction()` and `buildCreditCardTransaction()` extract and normalise source rows into `PipelineTransaction` objects. `assembleCozeroPayload()` resolves activity names to Cozero IDs using the taxonomy lookup table and constructs the final push payload.
- **`aiResponseParser.ts`** (187 lines) — Three-tier JSON parser for AI responses. Tier 1: attempt `JSON.parse()` on the full response (handles clean arrays). Tier 2: extract JSON array from surrounding prose using bracket matching. Tier 3: regex extraction of individual `{...}` objects and assembly into an array. Each tier has specific error recovery, and the parser reports which tier succeeded.

### Phase 5 — Seed Script

Rewrote `prisma/seed.ts` (181 lines) to populate all configuration tables:

- **20 agencies** with country, `dbNames` JSON for Cognos resolution (e.g. MSQ DX UK has `["MSQ DX - UK"]`, The Gate UK has `["The Gate Films Ltd","The Gate Films Limited","The Gate London Limited"]`)
- **37 activity taxonomy entries** with full Cozero IDs
- **3 calculation methods** (spend=45, employee-distance=40, nights=4)
- **4 units** (GBP=40, mile=14, km=16, room night=628)
- **25 territory mappings** (GB=240, US=241, DE=83, NL=160, SG=205, etc.)

Uses upsert operations so the seed is idempotent.

### Phase 6 — Cozero API Service

Implemented `src/services/cozero.ts` (230 lines):

- **`authenticate()`** — POST to `/v1/auth/token` with API key, caches the bearer token with expiry tracking, auto-refreshes when expired.
- **`createLog()`** — Step 1 of the 3-step push: creates a log with `category_id`.
- **`updateLog()`** — Step 2: updates the log with `startDate`, `endDate`, `location_id`, `business_unit_id`.
- **`createLogEntry()`** — Step 3: creates a log entry with `subcategory_id`, `activity_data_source_id`, `calculation_method_id`, `data_quality`, and `inputs` (a key-value map of `{value, unit_id}`).
- **`listSuppliers()` / `fetchAllSuppliers()`** — Paginated supplier retrieval.
- **`createSupplier()`** — Creates a supplier in Cozero.
- **`searchLogEntries()`** — POST to `/v1/log/log-entries/search` for duplicate checking.
- **`clearAuthCache()`** — For testing/rotation.

All functions include retry logic, consistent error handling, and typed request/response payloads.

### Phase 7 — Anthropic API Service

Implemented `src/services/anthropic.ts` (390 lines):

- **`buildSupplierSystemPrompt()`** — Complete supplier recommendation prompt extracted from the n8n "Prepare Prompt and Split" node. Includes the full emissions category taxonomy, out-of-scope definitions, disambiguation rules (person names vs companies, production companies vs advertising, insurance vs medical perks), and output schema (MAP/OUT_OF_SCOPE/MIXED_USE/DO_NOT_MAP).
- **`buildTransactionSystemPrompt()`** — Complete per-transaction categorisation prompt extracted from the n8n "Prepare Transaction Prompt" node. Includes all 7 categorisation rules (physical purchase test, food vs drink, entertainment vs education, advertising scope, delivery services, pattern matching, bundled expense hierarchy). Generates Cognos or Credit Card field guides based on pipeline type.
- **`categoriseSuppliers()`** — Sends supplier summaries to Claude, parses the response with the three-tier parser.
- **`categoriseTransactions()`** — Batches transactions into groups of 150, sends each batch, parses responses, merges results. Includes error recovery per batch.

The prompt templates are the largest single piece of extracted business logic — together they encode hundreds of categorisation rules, edge cases, and disambiguation patterns that were developed over months of real-world use in the n8n workflows.

### Phase 8 — Processing Engine

Built the shared categorisation engine and all four pipeline orchestrators:

**Shared Categorisation Engine** (`categorisationEngine.ts`, 306 lines):
- `applyAgencyExclusions()` — Loads agency-specific exclusion rules from the database. Supports full exclusion (all transactions from a supplier) and conditional exclusion (only when narrative contains specific keywords).
- `excludeZeroAmounts()` — Excludes transactions with zero amount.
- `excludeAccountingEntries()` — Applies the 26 exact-match and 3 partial-match Cognos Description exclusions, plus Transaction Sub Type = "Adjustment" check, plus "fake" narrative detection.
- `applySupplierMapping()` — Looks up each supplier in the database. Mapped suppliers get their category applied directly. Unmapped suppliers are checked against the 18 internal MSQ entity patterns. Remaining unmapped suppliers are collected for AI recommendation.
- `applyMccRules()` — Applies the 43 MCC description rules and credit card supplier rules. First match wins, using case-insensitive substring matching.

**Cognos Pipeline** (`cognosPipeline.ts`, 332 lines) — 9-step pipeline:
1. Parse XLSX and build transactions
2. Filter by agency (using `dbNames` matching) and quarter
3. Apply agency-specific exclusions
4. Exclude zero-amount transactions
5. Exclude accounting entries (adjustments, payables, tax, compensation, etc.)
6. Apply supplier mapping (database lookup + internal entity detection)
7. AI supplier recommendations (Claude Sonnet 4.6, batches of 150)
8. AI per-transaction categorisation (remaining uncategorised transactions)
9. Assemble Cozero payloads (resolve IDs, set readyToUpload flag)

**Credit Card Pipeline** (`creditCardPipeline.ts`, 259 lines) — 6-step pipeline:
1. Parse XLSX and build transactions
2. Apply MCC rules (43 description rules + supplier rules)
3. Apply supplier mapping
4. AI supplier recommendations
5. AI per-transaction categorisation
6. Assemble Cozero payloads

**TravelPerk Pipeline** (`travelPerkPipeline.ts`, 266 lines) — 3-step pipeline:
1. Parse CSV, map company names to agencies, filter valid services (Flights, Hotels, Trains), exclude cancelled bookings
2. Build Cozero payloads: flights use miles (unit_id=14) with employee-distance method, hotels use room nights (unit_id=628) with territory from country code, trains generate both distance-based and spend-based entries
3. Duplicate checking via Cozero log entry search

**Corporate Traveller Pipeline** (`corporateTravellerPipeline.ts`, 212 lines) — 3-step pipeline:
1. Parse XLSX from "ATT004 All Travel Types CO2 Onl" sheet, map account names to agencies (SMARTS (NI) LT = Smarts UK, MSQ PARTNERS EUROPE B.V. = Smarts Netherlands)
2. Build Cozero payloads: flights (5 service types) and rail (3 service types) use km (unit_id=16), rail territory resolved from Origin Country Code, Excel serial dates converted to ISO
3. Duplicate checking

### Phase 9 — API Routes

Created 9 route files providing 13 endpoints:

- **`/api/upload`** (POST) — Accepts FormData with file, pipelineType, agencyId, financialYear, quarters. Saves file to `uploads/` directory with timestamped filename, creates Upload record in database.
- **`/api/processing`** (GET/POST) — GET lists runs with agency and upload includes, filterable by pipeline type and status. POST triggers `runProcessingPipeline()` with the specified configuration.
- **`/api/processing/[id]`** (GET) — Returns full run detail including steps (ordered by stepOrder) and transaction summary grouped by pipelineStatus. Uses Next.js 15 async params pattern.
- **`/api/push`** (GET/POST) — GET lists push history filterable by runId. POST implements the 3-step Cozero push: create log (category_id) → update log (dates, location, BU) → create log entry (subcategory, activity, method, unit, value, territory). Records each API call in the CozeroPush table.
- **`/api/agencies`** (GET/POST) — GET lists agencies with relation counts. POST updates Cozero configuration IDs.
- **`/api/suppliers`** (GET/POST) — GET with search and pagination. POST upserts supplier mappings.
- **`/api/suppliers/sync`** (POST) — Fetches all suppliers from Cozero, matches by name to local records, optionally creates missing suppliers in Cozero.
- **`/api/config`** (GET) — Returns all configuration data (activities, calculation methods, units, territories).
- **`/api/config/import`** (POST) — Imports supplier mappings from a CSV file.

### Phase 10 — UI Components and Pages

**4 shared components:**

- **`StatusBadge`** — Renders a colour-coded pill for 14 different status values (completed/success = green, running/active = blue, failed/error = red, pending = grey, etc.).
- **`DataTable<T>`** — Generic sortable, searchable, paginated table. Accepts column definitions with custom render functions, configurable search keys, and page size. Used on Suppliers, History, and Processing pages.
- **`ConfirmDialog`** — Modal overlay with title, message, confirm/cancel actions. Variant support for destructive actions.
- **`LoadingSpinner`** — Three sizes (sm/md/lg) with optional label text.

**8 page implementations** (7 upgraded from stubs, 1 new):

- **Dashboard** (`/`) — 4 summary cards (Processing Runs, Completed, Uploads, Push History) with counts fetched from `/api/processing`. Recent runs table showing last 10 runs.
- **Upload** (`/upload`) — Pipeline type selector (Cognos, Credit Card, TravelPerk, Corporate Traveller), agency dropdown populated from `/api/agencies`, financial year and quarter selectors (shown only for Cognos), drag-and-drop file zone with browse fallback, Upload & Process button that chains upload → trigger processing → redirect to run detail.
- **Processing list** (`/processing`) — Note: this page remains as a stub (5 lines) and was not fully implemented in this build. The run list functionality is partially covered by the Dashboard's recent runs table.
- **Processing detail** (`/processing/[id]`) — Client component using `useParams()`. Displays 4 stat cards (Input Rows, Excluded, Categorised, Remaining), numbered step cards with input→output flow counts and parsed metadata, and a transaction summary table grouped by pipeline status.
- **Suppliers** (`/suppliers`) — New page and route (not in original scaffold). Searchable DataTable of supplier mappings with name and business activity columns. "Sync with Cozero" button triggers the supplier sync API.
- **Push History** (`/history`) — Table of all Cozero push records with transaction ID, pipeline type, agency, Cozero log ID, status badge, error message, and timestamp.
- **Agencies** (`/agencies`) — Agency table with inline editing for three Cozero IDs (Location, Business Unit, Territory). Save/cancel buttons appear per row when editing. Updates persisted via `/api/agencies` POST.
- **Settings** (`/settings`) — Tabbed configuration viewer with 4 tabs: Activities (37 taxonomy entries), Calculation Methods (3), Units (4), Territories (25). Data fetched from `/api/config`.

### Phase 11 — Build Verification

Ran `npx next build` and resolved three compilation issues:

1. **Cozero API snake_case mismatch** — The push route used camelCase field names (`categoryId`, `subcategoryId`) but the Cozero type definitions use snake_case (`category_id`, `subcategory_id`). Fixed by aligning all push route payloads to match the snake_case API types.
2. **DataTable generic constraint** — `T extends Record<string, unknown>` was too strict for interface types (which lack an index signature). Changed to `T extends object` with explicit casts for property access.
3. **Unused variable in AI response parser** — Removed an unused `wasTruncated` variable flagged by ESLint.

After fixes: build passes cleanly with 19 routes compiled.

### Phase 12 — Documentation

- **ARCHITECTURE.md** — Full rewrite from v1.2 to v2.0. Updated all 9 sections: application overview (4 pipelines), repository structure (53 source files), page/route map (8 pages + 13 API endpoints), component hierarchy, state management, database schema (15 models), external integrations (Cozero + Anthropic + Processing), architectural rules, and quick reference.
- **ARCHITECTURE_CHANGELOG.md** — Appended v2.0 entry with detailed breakdown of every change across all layers.

---

## Key Architectural Decisions

### 1. Snake_case Cozero types
The Cozero REST API uses snake_case field names. Rather than mapping between camelCase internal types and snake_case API types at every boundary, the Cozero type definitions (`src/types/cozero.ts`) use snake_case directly. This eliminates an entire class of field-name bugs at the cost of mixed naming conventions in the types layer.

### 2. Three-tier AI response parser
Claude responses are not always perfectly formatted JSON. The parser tries three strategies in order: (1) direct `JSON.parse()`, (2) bracket-matching extraction from surrounding prose, (3) regex extraction of individual JSON objects. This makes the AI integration robust against formatting variations without requiring retry loops.

### 3. Configuration in code, not database
MCC rules, exclusion patterns, and internal entity patterns are defined as TypeScript constants rather than database records. This keeps them type-safe, version-controlled, and fast to access. The database is used for data that changes at runtime (supplier mappings, agency exclusions imported from CSV, territory mappings that might expand).

### 4. Transaction as the universal data model
All four pipelines produce `PipelineTransaction` objects with a common set of fields. Pipeline-specific fields (e.g. `mccDescription` for credit card, `service` for travel) are optional. This allows the categorisation engine, payload assembly, and push logic to operate uniformly across pipeline types.

### 5. Step-level audit trail
Every pipeline records each processing step as a `ProcessingStep` row with input/output counts and JSON metadata. This provides a detailed audit trail for debugging and allows the UI to render step-by-step progress with exact counts.

---

## Known Gaps and Future Work

1. **Processing list page** (`/processing/page.tsx`) — Still a stub (5 lines). The run list functionality exists in the Dashboard but the dedicated page needs a full implementation with filtering and search.

2. **Travel duplicate checking** — Both travel pipelines have a placeholder step for Cozero log entry search-based duplicate detection. The search API call is implemented in `cozero.ts` but the comparison logic in the pipelines is marked as TODO.

3. **Agency Cozero IDs** — The seed script creates all 20 agencies but their `cozeroLocationId`, `cozeroBusinessUnitId`, and `cozeroTerritoryId` fields are null. These need to be populated from the Cozero platform (either manually via the Agencies page or via a config import).

4. **Supplier mapping import** — The `/api/config/import` endpoint exists for CSV import but no existing supplier mappings have been imported from the Google Sheets source. This is a data migration step.

5. **Agency exclusions data** — The `AgencyExclusion` model and the `applyAgencyExclusions()` engine function are implemented, but no exclusion rules have been seeded. These were previously stored in a Google Sheets tab and need to be imported.

6. **Singapore travel pipeline** — The n8n workflows include a separate Singapore travel pipeline (Corporate Traveller format with section-based agency detection, AI-calculated flight distances, and hotel night inference). This was not part of the v2.0 build scope but the extracted configuration is documented.

7. **Error handling UI** — API routes return structured error responses but the page components have minimal error display. A toast notification system or error boundary would improve the user experience.

8. **Authentication** — No user authentication. The application currently runs as a single-user local tool. If deployed to a shared server, authentication would be needed.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15 | Framework |
| react / react-dom | ^19 | UI |
| typescript | ^5 | Type safety |
| @prisma/client / prisma | ^6 | Database ORM |
| tailwindcss | ^4 | Styling |
| xlsx | ^0.18.5 | XLSX/CSV parsing |

No additional runtime dependencies were added beyond the initial scaffold. The Anthropic API is called via `fetch()` directly (no SDK dependency).
