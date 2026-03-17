# ARCHITECTURE Changelog

> This file contains the version history for the MSQ Sustainability Data Manager architecture.
> It is not required reading for implementation briefs. Reference only.
> Claude Code: do not read this file unless explicitly instructed to do so.

---

## v1.0 — 17 March 2026

Initial architecture documentation. Planned structure for MSQ sustainability data management application. Covers: application overview, repository structure, page/route map, component hierarchy, state management approach, Prisma database schema (Agency, Upload, ProcessingRun, ProcessingStep, CozeroPush), external integration boundaries (Cozero API service, Anthropic API service, processing pipeline), architectural rules, and quick-reference table.

This version describes intended structure, not implemented structure.

---

## v1.1 — 17 March 2026

**Brief 01: Project Scaffold and Database — Initial scaffold implemented.**

- Initialised Next.js 15.5.13 project with React 19, TypeScript, Tailwind CSS v4, and Prisma 6
- Created Prisma schema (`prisma/schema.prisma`) matching §6 exactly — five models: Agency, Upload, ProcessingRun, ProcessingStep, CozeroPush
- Ran initial Prisma migration (`prisma/migrations/20260317150115_init/`)
- Created seed script (`prisma/seed.ts`) with three default agencies: The Brandtech Group, MSQ Partners, Stack
- Created Prisma client singleton (`src/lib/db.ts`)
- Created AppShell layout components: `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx` in `src/components/layout/`
- Created root layout (`src/app/layout.tsx`) rendering the AppShell with sidebar navigation
- Created page stubs for all seven routes: `/`, `/upload`, `/processing`, `/processing/[id]`, `/history`, `/agencies`, `/settings`
- Created type definition shells: `src/types/upload.ts`, `processing.ts`, `cozero.ts`, `agency.ts`, `anthropic.ts`
- Created `src/config/constants.ts` placeholder
- Created `.env.example` and `.env.local` with DATABASE_URL, COZERO_API_BASE_URL, COZERO_API_KEY, ANTHROPIC_API_KEY
- Created `.gitignore` covering `.env.local`, `uploads/`, `node_modules/`, `.next/`, SQLite database files
- Updated §2 note in ARCHITECTURE.md to reflect implemented state
- No changes to file map structure — scaffold matches planned architecture exactly

---

## v1.2 — 17 March 2026

**MSQ brand styling applied to application shell.**

- Switched font from Geist to Poppins (Light 300, Regular 400, SemiBold 600, Bold 700) per MSQ brand guidelines
- Updated `globals.css` with full MSQ colour palette as Tailwind CSS custom tokens: MSQ Blue `#0000EB`, Off-White `#ECECE7`, and all secondary palette colours
- Restyled `Sidebar.tsx`: MSQ Blue (`#0000EB`) background, white MSQ logo, white/translucent navigation links, "Home to Joined-up Thinking" tagline at footer
- Restyled `Header.tsx`: Off-White background, uppercase tracking label
- Restyled `AppShell.tsx`: Off-White background for main content area
- Updated all page stub headings to use Poppins SemiBold with black text
- Added `public/msq-logo.svg` as the MSQ wordmark asset
- No structural or schema changes

---

## v2.0 — 17 March 2026

**Full foundation build — all four data pipelines, service modules, API routes, and UI implemented.**

### Database Schema (expanded from 5 to 15 models)
- Expanded `Agency` model: added `country`, `cozeroLocationId`, `cozeroBusinessUnitId`, `cozeroTerritoryId`, `dbNames` (JSON)
- Expanded `Upload` model: added `pipelineType` field
- Expanded `ProcessingRun` model: added `pipelineType`, `financialYear`, `quarter`, row count fields
- Expanded `ProcessingStep` model: added `inputCount`, `outputCount`, `metadata` (JSON)
- Added `Transaction` model: full source data preservation, categorisation results, Cozero IDs, readyToUpload flag
- Expanded `CozeroPush` model: added `transactionId`, `cozeroLogId`
- Added 7 configuration models: `Supplier`, `UnmappedSupplier`, `ActivityTaxonomy`, `AgencyExclusion`, `CalculationMethod`, `Unit`, `TerritoryMapping`
- Ran Prisma migration for all schema changes

### Type Definitions (6 files)
- `src/types/transaction.ts` — PipelineTransaction, TravelPayload, SupplierRecommendation, AITransactionResult, ProcessingRunSummary
- `src/types/processing.ts` — PipelineResult, COGNOS_STEPS, CREDIT_CARD_STEPS, TRAVEL_STEPS
- `src/types/cozero.ts` — Full Cozero API types (auth, log CRUD, supplier, search) with snake_case for API compatibility
- `src/types/anthropic.ts` — Anthropic message types, AI categorisation types, AIParseResult
- `src/types/upload.ts` — UploadRequest, UploadResponse
- `src/types/config.ts` — ActivityEntry, MccRule, ExclusionPattern, CompanyMapping, and more

### Configuration Constants (7 files)
- `src/config/constants.ts` — API URLs, model ID, batch sizes, Cozero IDs, activity aliases
- `src/config/activityTypes.ts` — 37 activity taxonomy entries with Cozero IDs + buildActivityLookup()
- `src/config/mccRules.ts` — 43 MCC description rules + credit card supplier rules
- `src/config/exclusionPatterns.ts` — 26 exact + 3 partial Cognos Description exclusion patterns
- `src/config/internalPatterns.ts` — 18 MSQ group entity patterns + isInternalSupplier()
- `src/config/territoryMap.ts` — 25 country code → Cozero territory ID mappings
- `src/config/companyMapping.ts` — TravelPerk + Corporate Traveller company→agency mappings, service type constants

### Core Library Modules (4 files)
- `src/lib/fileParser.ts` — parseXlsx(), parseCsv(), excelDateToISO(), ddmmyyyyToISO(), parseCSVLine(), getString(), getNumber()
- `src/lib/validators.ts` — Column validation for Cognos, Credit Card, TravelPerk, Corporate Traveller
- `src/lib/transformers.ts` — buildCognosTransaction(), buildCreditCardTransaction(), assembleCozeroPayload()
- `src/lib/aiResponseParser.ts` — Three-tier JSON parser: clean array, extract from prose, regex individual objects

### Seed Script
- Rewrote `prisma/seed.ts`: 20 agencies with dbNames, 37 activity taxonomy entries, 3 calculation methods, 4 units, 25 territory mappings

### Service Modules (7 files)
- `src/services/cozero.ts` — authenticate() with token caching, createLog(), updateLog(), createLogEntry(), listSuppliers(), createSupplier(), fetchAllSuppliers(), searchLogEntries(), clearAuthCache()
- `src/services/anthropic.ts` — Complete prompt templates for supplier and transaction categorisation, categoriseSuppliers(), categoriseTransactions() with batching, buildSupplierSystemPrompt(), buildTransactionSystemPrompt() with Cognos and Credit Card field guides
- `src/services/processing.ts` — runProcessingPipeline() routing + recordStep() helper
- `src/services/processing/categorisationEngine.ts` — applyAgencyExclusions(), excludeZeroAmounts(), excludeAccountingEntries(), applySupplierMapping(), applyMccRules()
- `src/services/processing/cognosPipeline.ts` — 9-step pipeline with full categorisation cascade
- `src/services/processing/creditCardPipeline.ts` — 6-step pipeline with MCC rules
- `src/services/processing/travelPerkPipeline.ts` — 3-step pipeline (flights/hotels/trains, miles)
- `src/services/processing/corporateTravellerPipeline.ts` — 3-step pipeline (flights/rail, km)

### API Routes (9 route files)
- `src/app/api/upload/route.ts` — POST file upload with pipeline type and agency
- `src/app/api/processing/route.ts` — GET list runs, POST trigger processing
- `src/app/api/processing/[id]/route.ts` — GET run detail with steps and transaction summary
- `src/app/api/push/route.ts` — GET push history, POST 3-step Cozero push
- `src/app/api/agencies/route.ts` — GET list, POST update Cozero IDs
- `src/app/api/suppliers/route.ts` — GET search, POST upsert supplier
- `src/app/api/suppliers/sync/route.ts` — POST sync with Cozero
- `src/app/api/config/route.ts` — GET all config data
- `src/app/api/config/import/route.ts` — POST import suppliers from CSV

### Shared UI Components (4 files)
- `src/components/shared/StatusBadge.tsx` — 14 status states, colour-coded
- `src/components/shared/DataTable.tsx` — Generic sortable, searchable, paginated table
- `src/components/shared/ConfirmDialog.tsx` — Confirmation modal
- `src/components/shared/LoadingSpinner.tsx` — sm/md/lg sizes

### Page Implementations (8 pages, all upgraded from stubs)
- `/` Dashboard — summary cards, recent runs table
- `/upload` — pipeline type select, agency dropdown, FY/quarter (Cognos), drag-drop file zone, upload & process button
- `/processing` — runs list with pipeline, agency, row counts, status columns
- `/processing/[id]` — stat cards, numbered step progress cards with metadata, transaction summary
- `/suppliers` — searchable DataTable, Cozero sync button (new page + route)
- `/history` — push history table with transaction ID, Cozero log ID, status, errors
- `/agencies` — inline edit for Cozero Location/BU/Territory IDs
- `/settings` — tabbed config viewer (activities, methods, units, territories)

### Navigation
- Added "Suppliers" link to sidebar navigation between "Processing" and "Push History"

### Build verification
- `npx next build` passes cleanly — 19 routes, all compile without errors
