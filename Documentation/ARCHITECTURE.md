# MSQ Sustainability Data Manager — Architecture Guide

**Version:** 2.0
**Date:** 17 March 2026
**Stack:** Next.js 15 + TypeScript + React 19 + Prisma (SQLite) + Tailwind CSS
**Purpose:** Sustainability data upload, transformation, and push to Cozero for MSQ Partners agencies

---

## Related Documentation Files

| File | Purpose | When to read |
|------|---------|--------------|
| `Documentation/ARCHITECTURE.md` | **This file.** Project structure, component hierarchy, state management, database schema, API integration boundaries, architectural rules, quick-reference table. | Every brief. |
| `Documentation/ARCHITECTURE_CHANGELOG.md` | Version history. | Not required for implementation. Reference only. |
| `Documentation/PROJECT_INSTRUCTIONS_TEMPLATE.md` | Claude Project system prompt for planning conversations. | Not used by Claude Code. |
| `Documentation/CODE_REVIEW_TEMPLATE.md` | Independent code review template. | Review sessions only. |

---

## §1 — Application Overview

MSQ Partners is a group of 20 marketing agencies. Each agency must report Scope 3 sustainability data (financial transactions, travel, purchased goods/services) to a central sustainability platform called Cozero. The current process uses a set of n8n automation workflows to ingest spreadsheets, transform the data, and push it to the Cozero REST API.

This application replaces those n8n workflows with a purpose-built web interface. Staff upload data through the browser. The application validates, transforms, categorises and maps that data — replicating the logic from the n8n workflows — and pushes the results to Cozero via its REST API. Some transformation steps use the Anthropic API (Claude Sonnet 4.6) for LLM-assisted supplier recommendation and per-transaction categorisation.

**Four data pipelines:**
- **Cognos** — Financial transactions from IBM Cognos (XLSX). Multi-agency, multi-quarter. AI-assisted categorisation.
- **Credit Card** — Barclaycard statements for MSQ DX UK (XLSX). MCC-based + AI-assisted categorisation.
- **TravelPerk** — Travel bookings for MSQ DX UK and MSQ Partners Central (CSV). Rule-based, no AI.
- **Corporate Traveller** — Travel bookings for Smarts UK and Smarts Netherlands (XLSX). Rule-based, no AI.

**Users:** Agency sustainability contacts and administrators at MSQ Partners.
**Deployment:** Runs locally as a web application.

---

## §2 — Repository Structure

```
sustainability-app/
├── prisma/
│   ├── schema.prisma              ← Database schema (15 models)
│   ├── migrations/                ← Prisma migration history
│   └── seed.ts                    ← Seed: 20 agencies, 37 activities, 3 calc methods, 4 units, 25 territories
├── src/
│   ├── app/                       ← Next.js App Router pages and layouts
│   │   ├── layout.tsx             ← Root layout: HTML shell, Poppins font, AppShell
│   │   ├── globals.css            ← Global styles, MSQ colour palette
│   │   ├── page.tsx               ← Dashboard: summary cards, recent runs table
│   │   ├── upload/
│   │   │   └── page.tsx           ← Upload: pipeline type, agency, file drop, process trigger
│   │   ├── processing/
│   │   │   └── page.tsx           ← Processing runs list with status/counts
│   │   ├── processing/[id]/
│   │   │   └── page.tsx           ← Run detail: step progress, transaction summary
│   │   ├── suppliers/
│   │   │   └── page.tsx           ← Supplier management: search, sync with Cozero
│   │   ├── history/
│   │   │   └── page.tsx           ← Cozero push history table
│   │   ├── agencies/
│   │   │   └── page.tsx           ← Agency config: inline edit Cozero IDs
│   │   ├── settings/
│   │   │   └── page.tsx           ← Config viewer: activities, methods, units, territories
│   │   └── api/
│   │       ├── upload/
│   │       │   └── route.ts       ← POST: file upload with pipeline type
│   │       ├── processing/
│   │       │   ├── route.ts       ← GET: list runs; POST: trigger processing
│   │       │   └── [id]/
│   │       │       └── route.ts   ← GET: run detail with steps and transaction summary
│   │       ├── push/
│   │       │   └── route.ts       ← GET: push history; POST: push to Cozero (3-step)
│   │       ├── agencies/
│   │       │   └── route.ts       ← GET: list; POST: update Cozero IDs
│   │       ├── suppliers/
│   │       │   ├── route.ts       ← GET: search; POST: upsert supplier mapping
│   │       │   └── sync/
│   │       │       └── route.ts   ← POST: sync suppliers with Cozero
│   │       └── config/
│   │           ├── route.ts       ← GET: all config data (activities, methods, units, territories)
│   │           └── import/
│   │               └── route.ts   ← POST: import supplier mappings from CSV
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       ← Sidebar + header + main content area
│   │   │   ├── Sidebar.tsx        ← MSQ Blue sidebar with 8 nav links
│   │   │   └── Header.tsx         ← Top bar with page title
│   │   └── shared/
│   │       ├── StatusBadge.tsx    ← Status badge (14 states, colour-coded)
│   │       ├── DataTable.tsx      ← Generic sortable, searchable, paginated table
│   │       ├── ConfirmDialog.tsx  ← Confirmation modal
│   │       └── LoadingSpinner.tsx ← Loading indicator (sm/md/lg)
│   ├── services/
│   │   ├── cozero.ts             ← Cozero REST API: auth, log CRUD, supplier CRUD, search
│   │   ├── anthropic.ts          ← Anthropic API: supplier + transaction categorisation prompts
│   │   ├── processing.ts         ← Top-level orchestrator: route to pipeline, manage run lifecycle
│   │   └── processing/
│   │       ├── categorisationEngine.ts ← Shared: exclusions, zero amounts, supplier mapping, MCC
│   │       ├── cognosPipeline.ts       ← 9-step Cognos pipeline
│   │       ├── creditCardPipeline.ts   ← 6-step Credit Card pipeline
│   │       ├── travelPerkPipeline.ts   ← 3-step TravelPerk pipeline
│   │       └── corporateTravellerPipeline.ts ← 3-step Corporate Traveller pipeline
│   ├── lib/
│   │   ├── db.ts                  ← Prisma client singleton
│   │   ├── fileParser.ts          ← XLSX/CSV parsing, date conversion, getString/getNumber
│   │   ├── validators.ts          ← Column validation for all 4 pipeline types
│   │   ├── transformers.ts        ← Transaction builders, Cozero payload assembly
│   │   └── aiResponseParser.ts    ← Three-tier JSON parser (clean, extract, regex)
│   ├── types/
│   │   ├── transaction.ts         ← PipelineTransaction, TravelPayload, SupplierRecommendation
│   │   ├── processing.ts         ← PipelineResult, step constants (COGNOS_STEPS, etc.)
│   │   ├── cozero.ts             ← Cozero API request/response types (snake_case for API)
│   │   ├── anthropic.ts          ← Anthropic API types, AI parse result
│   │   ├── upload.ts             ← Upload request/response types
│   │   └── config.ts             ← ActivityEntry, MccRule, ExclusionPattern, CompanyMapping
│   └── config/
│       ├── constants.ts           ← API URLs, model, batch sizes, Cozero IDs, aliases
│       ├── activityTypes.ts       ← 37 activity taxonomy entries + buildActivityLookup()
│       ├── mccRules.ts            ← 43 MCC rules + CC supplier rules
│       ├── exclusionPatterns.ts   ← 26 exact + 3 partial Cognos exclusions
│       ├── internalPatterns.ts    ← 18 MSQ group entity patterns + isInternalSupplier()
│       ├── territoryMap.ts        ← 25 country → Cozero territory ID mappings
│       └── companyMapping.ts      ← Travel company→agency mappings, service type constants
├── public/
│   └── msq-logo.svg              ← MSQ wordmark
├── uploads/                       ← Uploaded file storage (gitignored)
├── .env.local                     ← API keys and configuration (gitignored)
├── .env.example                   ← Template for required environment variables
├── next.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md                      ← Claude Code session instructions
└── Documentation/
    ├── ARCHITECTURE.md            ← This file
    ├── ARCHITECTURE_CHANGELOG.md
    ├── PROJECT_INSTRUCTIONS_TEMPLATE.md
    └── CODE_REVIEW_TEMPLATE.md
```

---

## §3 — Page / Route Map

### Pages (App Router)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Summary cards, recent processing runs table |
| `/upload` | Upload | Pipeline type selection, agency dropdown, FY/quarter (Cognos), drag-drop file, trigger processing |
| `/processing` | Processing Runs | All runs with pipeline, agency, row counts, status |
| `/processing/[id]` | Run Detail | Step-by-step progress, input/output counts, metadata, transaction summary |
| `/suppliers` | Suppliers | Searchable supplier table, Cozero sync button |
| `/history` | Push History | Cozero push log: transaction ID, log ID, status, errors |
| `/agencies` | Agencies | Agency list with inline edit for Cozero Location/BU/Territory IDs |
| `/settings` | Settings | Tabbed config viewer: activities, calculation methods, units, territories |

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/upload` | Accept file upload (FormData), store to disk, create Upload record |
| `GET` | `/api/processing` | List runs, filterable by pipelineType and status |
| `POST` | `/api/processing` | Trigger processing: routes to correct pipeline orchestrator |
| `GET` | `/api/processing/[id]` | Run detail with steps (ordered) and transaction summary by status |
| `GET` | `/api/push` | List push history, filterable by runId |
| `POST` | `/api/push` | Push ready transactions to Cozero (3-step: create log, update, create entry) |
| `GET` | `/api/agencies` | List all agencies with upload/run/exclusion counts |
| `POST` | `/api/agencies` | Update agency Cozero IDs and config |
| `GET` | `/api/suppliers` | Search suppliers, paginated |
| `POST` | `/api/suppliers` | Upsert supplier mapping (name + businessActivity) |
| `POST` | `/api/suppliers/sync` | Sync local suppliers with Cozero (match by name, optionally create missing) |
| `GET` | `/api/config` | Return all config: activities, calcMethods, units, territories |
| `POST` | `/api/config/import` | Import supplier mappings from CSV file |

---

## §4 — Component Hierarchy

### Layout

```
RootLayout (Poppins font, globals.css)
└── AppShell
    ├── Sidebar (MSQ Blue, 8 nav links)
    ├── Header
    └── {page content}
```

### Dashboard (`/`)
```
DashboardPage (client component)
├── SummaryCard[] (Processing Runs, Completed, Upload, Push History)
└── Recent Runs Table (inline)
```

### Upload (`/upload`)
```
UploadPage (client component)
├── Pipeline Type Select
├── Agency Select
├── FY/Quarter Selectors (Cognos only)
├── File Dropzone (drag-drop + browse)
└── Upload & Process Button → redirects to /processing/[id]
```

### Processing Detail (`/processing/[id]`)
```
RunDetailPage (client component)
├── StatCard[] (Input, Excluded, Categorised, Remaining)
├── StepCard[] (numbered steps with input→output counts, metadata, status)
└── Transaction Summary (counts by pipelineStatus)
```

### Suppliers (`/suppliers`)
```
SuppliersPage (client component)
├── Sync with Cozero Button
└── DataTable (searchable: name, businessActivity)
```

---

## §5 — State Management

- **Database (Prisma/SQLite):** All persistent state — agencies, uploads, runs, steps, transactions, push history, suppliers, config.
- **Client state (`useState`):** Ephemeral UI: form inputs, loading states, drag-drop hover, edit modes.
- **No global client-side store.** Data flow is request→process→store→display.

---

## §6 — Database Schema

15 models across 3 categories. See `prisma/schema.prisma` for the full definition.

### Core Processing Models
- **Agency** — 20 MSQ agencies with Cozero location/BU/territory IDs, country, dbNames (JSON)
- **Upload** — Uploaded files with pipeline type, stored path, status
- **ProcessingRun** — Pipeline execution with FY, quarter, row counts, status
- **ProcessingStep** — Individual step: name, order, input/output counts, metadata (JSON)
- **Transaction** — Individual processed transaction with full source data, categorisation result, Cozero IDs, readyToUpload flag
- **CozeroPush** — Cozero API call log: endpoint, request/response, cozeroLogId, status

### Configuration Models
- **Supplier** — Mapped suppliers: name (unique), businessActivity, cozeroSupplierId
- **UnmappedSupplier** — Multi-category suppliers needing only cozeroSupplierId
- **ActivityTaxonomy** — 37 valid category/subcategory/activity combinations with Cozero IDs
- **AgencyExclusion** — Per-agency supplier exclusions (full or conditional with narrativeContains)
- **CalculationMethod** — 3 methods: spend (45), employee-distance (40), nights (4)
- **Unit** — 4 units: GBP (40), mile (14), km (16), room night (628)
- **TerritoryMapping** — 25 country codes → Cozero territory IDs

---

## §7 — External Integrations

### Cozero API (`src/services/cozero.ts`)

**Base URL:** `https://api.cozero.io/v1`
**Organization ID:** 5137

Functions:
- `authenticate()` — POST /v1/auth/token, caches token with expiry
- `createLog(payload)` — POST /v1/log (Step 1: category_id)
- `updateLog(logId, payload)` — PUT /v1/log/{id} (Step 2: dates, location, BU)
- `createLogEntry(logId, payload)` — POST /v1/log/{id}/log-entry (Step 3: subcategory, activity, method, unit, value, territory)
- `listSuppliers(page, pageSize)` — GET /v1/supplier with pagination
- `createSupplier(name)` — POST /v1/supplier
- `fetchAllSuppliers()` — Paginated fetch all
- `searchLogEntries(params, body)` — POST /v1/log/log-entries/search (duplicate checking)

### Anthropic API (`src/services/anthropic.ts`)

**Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6-20250514`)
**Batch size:** 150 transactions per API call

Functions:
- `categoriseSuppliers(suppliers, agencyName)` — Supplier-level MAP/OUT_OF_SCOPE/MIXED_USE/DO_NOT_MAP
- `categoriseTransactions(transactions, pipelineType, batchSize)` — Per-transaction categorisation
- `buildSupplierSystemPrompt(agencyName)` — Full taxonomy, OOS rules, recommendation types
- `buildTransactionSystemPrompt(pipelineType)` — Full taxonomy, 7 categorisation rules, Cognos vs CC field guides

### Processing Pipeline (`src/services/processing.ts` + `src/services/processing/`)

Top-level `runProcessingPipeline()` routes to:
- **Cognos** (9 steps): parse → filter agency/quarter → agency exclusions → zero amounts → accounting entries → supplier mapping → AI supplier recommendations → AI transaction categorisation → assemble payloads
- **Credit Card** (6 steps): parse → MCC categorisation → supplier mapping → AI supplier recommendations → AI transaction categorisation → assemble payloads
- **TravelPerk** (3 steps): parse CSV → build payloads (flights/hotels/trains) → duplicate check
- **Corporate Traveller** (3 steps): parse XLSX → build payloads (flights/rail, km units) → duplicate check

Shared engine (`categorisationEngine.ts`): exclusions, zero amounts, accounting entries, supplier mapping, MCC rules.

---

## §8 — Key Architectural Rules

### API Service Boundaries
1. **All Cozero API calls through `src/services/cozero.ts`.**
2. **All Anthropic API calls through `src/services/anthropic.ts`.**
3. **All database access through Prisma via `src/lib/db.ts`.** No raw SQL.

### Credentials and Configuration
4. **Never hardcode API credentials.** All secrets from `.env.local`.
5. **Never commit `.env.local`.**

### Data Flow
6. **Pages must not call external APIs directly.** Pages → API routes → services → lib.
7. **Service modules must not import from components or pages.**
8. **Pure transformation logic belongs in `src/lib/`.** Config constants in `src/config/`.

### TypeScript Standards
9. **No `any` casts.** Use `unknown` and narrow.
10. **Explicit return types** on all exported functions.
11. **Interface definitions** for all payloads crossing module boundaries.

### Documentation
12. **Update ARCHITECTURE.md** after every task. Append to ARCHITECTURE_CHANGELOG.md.
13. **Read current version from disk** and increment by one patch version.

### Git
14. **Do not push to git.** Confirm changed files. Neil handles git.

---

## §9 — Quick Reference

| Path | Purpose |
|------|---------|
| `src/services/cozero.ts` | **All** Cozero API communication |
| `src/services/anthropic.ts` | **All** Anthropic API communication (with full prompt templates) |
| `src/services/processing.ts` | Top-level pipeline orchestrator |
| `src/services/processing/` | 4 pipeline orchestrators + shared categorisation engine |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/fileParser.ts` | XLSX/CSV parsing, date conversion |
| `src/lib/validators.ts` | Column validation for all 4 pipelines |
| `src/lib/transformers.ts` | Transaction builders, Cozero payload assembly |
| `src/lib/aiResponseParser.ts` | Three-tier AI response JSON parser |
| `src/config/` | All configuration constants (MCC rules, exclusions, territories, mappings) |
| `src/types/` | All TypeScript type definitions |
| `prisma/schema.prisma` | Database schema (15 models) |
| `prisma/seed.ts` | Seed: 20 agencies, 37 activities, calc methods, units, territories |
| `.env.local` | API keys and secrets (gitignored) |
| `CLAUDE.md` | Claude Code session rules |
