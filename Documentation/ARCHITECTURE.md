# MSQ Sustainability Data Manager — Architecture Guide

**Version:** 1.2
**Date:** 17 March 2026
**Stack:** Next.js 15 + TypeScript + React 19 + Prisma (SQLite) + Tailwind CSS
**Purpose:** Sustainability data upload, transformation, and push to Cozero for MSQ Partners agencies

> **Note:** The foundational scaffold has been implemented (Brief 01). The file map below reflects both implemented structure and planned future modules. Service modules (`src/services/`), API routes (`src/api/`), and feature components will be built in subsequent briefs.

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

MSQ Partners is a group of marketing agencies. Each agency must report sustainability data (energy consumption, financial spend, travel, waste, etc.) to a central sustainability platform called Cozero. The current process uses a set of n8n automation workflows to ingest spreadsheets, transform the data, and push it to the Cozero REST API.

This application replaces those n8n workflows with a purpose-built web interface. Staff at each MSQ agency upload data through the browser. The application validates, transforms, and maps that data — replicating and improving the logic currently handled by n8n — and pushes the results to Cozero via its REST API. Some transformation steps use the Anthropic API for LLM-assisted data extraction and categorisation.

**Users:** Agency sustainability contacts and administrators at MSQ Partners.  
**Deployment:** Runs locally as a web application. No cloud deployment infrastructure at this stage.

---

## §2 — Repository Structure

```
sustainability-app/
├── prisma/
│   ├── schema.prisma              ← Database schema definition
│   ├── migrations/                ← Prisma migration history
│   └── seed.ts                    ← Seed script: default agencies, activity types
├── src/
│   ├── app/                       ← Next.js App Router pages and layouts
│   │   ├── layout.tsx             ← Root layout: HTML shell, global providers, nav
│   │   ├── page.tsx               ← Dashboard / home page
│   │   ├── upload/
│   │   │   └── page.tsx           ← Data upload page
│   │   ├── processing/
│   │   │   └── page.tsx           ← Processing runs list and status
│   │   ├── processing/[id]/
│   │   │   └── page.tsx           ← Individual processing run detail
│   │   ├── history/
│   │   │   └── page.tsx           ← Cozero push history and logs
│   │   ├── agencies/
│   │   │   └── page.tsx           ← Agency configuration and management
│   │   └── settings/
│   │       └── page.tsx           ← Application settings (API keys, defaults)
│   ├── api/                       ← Next.js API routes (Route Handlers)
│   │   ├── upload/
│   │   │   └── route.ts           ← POST: receive file upload, validate, store
│   │   ├── processing/
│   │   │   ├── route.ts           ← POST: trigger processing run; GET: list runs
│   │   │   └── [id]/
│   │   │       └── route.ts       ← GET: run status/detail; POST: retry failed steps
│   │   ├── push/
│   │   │   └── route.ts           ← POST: push processed data to Cozero
│   │   ├── agencies/
│   │   │   └── route.ts           ← CRUD operations for agency configuration
│   │   └── settings/
│   │       └── route.ts           ← GET/PUT application settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       ← Sidebar navigation + main content area
│   │   │   ├── Sidebar.tsx        ← Navigation sidebar with route links
│   │   │   └── Header.tsx         ← Top bar: app title, status indicators
│   │   ├── upload/
│   │   │   ├── FileDropzone.tsx   ← Drag-and-drop file upload area
│   │   │   ├── FilePreview.tsx    ← Preview of uploaded file contents (table)
│   │   │   ├── ColumnMapper.tsx   ← Map spreadsheet columns to expected fields
│   │   │   └── UploadHistory.tsx  ← Recent uploads list for current agency
│   │   ├── processing/
│   │   │   ├── RunCard.tsx        ← Summary card for a processing run
│   │   │   ├── RunDetail.tsx      ← Step-by-step detail of a processing run
│   │   │   ├── StepStatus.tsx     ← Status indicator for an individual step
│   │   │   └── RunActions.tsx     ← Retry / cancel / push actions for a run
│   │   ├── agencies/
│   │   │   ├── AgencyList.tsx     ← List of configured agencies
│   │   │   ├── AgencyForm.tsx     ← Add/edit agency configuration
│   │   │   └── AgencyCard.tsx     ← Summary card for an agency
│   │   ├── history/
│   │   │   ├── PushLog.tsx        ← Cozero push history table
│   │   │   └── PushDetail.tsx     ← Detail view of a single push (request/response)
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx   ← Key metrics: recent uploads, pending runs, push status
│   │   │   └── RecentActivity.tsx ← Timeline of recent activity across agencies
│   │   └── shared/
│   │       ├── StatusBadge.tsx    ← Reusable status badge (pending/processing/success/error)
│   │       ├── DataTable.tsx      ← Reusable sortable/filterable table
│   │       ├── ConfirmDialog.tsx  ← Reusable confirmation modal
│   │       └── LoadingSpinner.tsx ← Consistent loading indicator
│   ├── services/
│   │   ├── cozero.ts             ← All Cozero REST API calls (single module)
│   │   ├── anthropic.ts          ← All Anthropic API calls (single module)
│   │   └── processing.ts         ← Data transformation pipeline orchestration
│   ├── lib/
│   │   ├── db.ts                  ← Prisma client singleton
│   │   ├── validators.ts          ← Zod schemas for upload validation
│   │   ├── transformers.ts        ← Pure data transformation functions
│   │   ├── columnMapping.ts       ← Spreadsheet column detection and mapping logic
│   │   └── fileParser.ts          ← Parse uploaded files (XLSX, CSV) into structured data
│   ├── types/
│   │   ├── upload.ts              ← Upload-related type definitions
│   │   ├── processing.ts          ← Processing run and step types
│   │   ├── cozero.ts              ← Cozero API request/response types
│   │   ├── agency.ts              ← Agency configuration types
│   │   └── anthropic.ts           ← Anthropic API request/response types
│   └── config/
│       ├── activityTypes.ts       ← Cozero activity type definitions and mappings
│       └── constants.ts           ← Application-wide constants
├── public/                        ← Static assets
├── uploads/                       ← Uploaded file storage (gitignored)
├── .env.local                     ← API keys and configuration (gitignored)
├── .env.example                   ← Template for required environment variables
├── next.config.ts                 ← Next.js configuration
├── tailwind.config.ts             ← Tailwind CSS configuration
├── tsconfig.json                  ← TypeScript configuration
├── package.json
├── CLAUDE.md                      ← Claude Code session instructions
└── Documentation/
    ├── ARCHITECTURE.md            ← This file
    ├── ARCHITECTURE_CHANGELOG.md  ← Version history
    ├── PROJECT_INSTRUCTIONS_TEMPLATE.md  ← Claude Project system prompt
    └── CODE_REVIEW_TEMPLATE.md    ← Code review template
```

---

## §3 — Page / Route Map

### Pages (App Router)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Summary metrics, recent activity, quick-action links |
| `/upload` | Upload | File upload, preview, column mapping, agency selection |
| `/processing` | Processing Runs | List of all processing runs with status filters |
| `/processing/[id]` | Run Detail | Step-by-step view of a single processing run |
| `/history` | Push History | Log of all Cozero API pushes with status and detail |
| `/agencies` | Agencies | Agency configuration: add, edit, view agency settings |
| `/settings` | Settings | Application settings: API key configuration, defaults |

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/upload` | Accept file upload, validate format, parse contents, store metadata in DB |
| `GET` | `/api/processing` | List processing runs, filterable by status and agency |
| `POST` | `/api/processing` | Trigger a new processing run for an uploaded dataset |
| `GET` | `/api/processing/[id]` | Get detailed status of a processing run including all steps |
| `POST` | `/api/processing/[id]` | Retry failed steps in a processing run |
| `POST` | `/api/push` | Push processed data to Cozero API |
| `GET` | `/api/agencies` | List all configured agencies |
| `POST` | `/api/agencies` | Create or update agency configuration |
| `GET` | `/api/settings` | Retrieve application settings |
| `PUT` | `/api/settings` | Update application settings |

---

## §4 — Component Hierarchy

### Layout

```
RootLayout
└── AppShell
    ├── Sidebar (navigation)
    ├── Header (title, status)
    └── {page content}
```

### Dashboard (`/`)

```
DashboardPage
├── SummaryCards (uploads count, pending runs, recent pushes)
└── RecentActivity (timeline)
```

### Upload (`/upload`)

```
UploadPage
├── FileDropzone
├── FilePreview (table preview of parsed data)
├── ColumnMapper (map columns to Cozero fields)
└── UploadHistory (recent uploads for selected agency)
```

### Processing (`/processing`)

```
ProcessingPage
└── RunCard[] (list of processing runs)
    └── StatusBadge

ProcessingDetailPage (`/processing/[id]`)
├── RunDetail
│   └── StepStatus[] (per-step status indicators)
└── RunActions (retry / push)
```

### History (`/history`)

```
HistoryPage
├── PushLog (table of all pushes)
└── PushDetail (expandable detail: request payload, response, errors)
```

### Agencies (`/agencies`)

```
AgenciesPage
├── AgencyList
│   └── AgencyCard[]
└── AgencyForm (add/edit modal or panel)
```

---

## §5 — State Management

This application uses **server-side state as the primary source of truth**, consistent with Next.js App Router conventions:

- **Database (Prisma/SQLite):** All persistent state — agencies, uploads, processing runs, push history. API routes read from and write to the database.
- **Server Components:** Pages fetch data directly from the database via Prisma. No client-side data fetching for initial page loads where possible.
- **Client state (`useState`):** Used only for genuinely ephemeral UI concerns: form inputs before submission, modal open/close, drag-and-drop hover state, file preview selection.
- **URL state:** Filters and pagination on list pages should be reflected in URL search params so that page refreshes preserve context.

**No global client-side store (e.g. Zustand, Redux) is planned.** The application's data flow is request→process→store→display, not real-time reactive. If a future requirement demands real-time updates (e.g. live processing progress via WebSocket), introduce a minimal client store at that point — do not pre-build one.

**Data revalidation:** After mutations (upload, trigger processing, push), use Next.js `revalidatePath()` or `router.refresh()` to refresh the displayed data from the server.

---

## §6 — Database Schema

The Prisma schema covers five core entities. All timestamps use UTC.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Agency {
  id              String   @id @default(cuid())
  name            String   @unique
  cozeroEntityId  String?              // Cozero's identifier for this agency
  contactEmail    String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  uploads         Upload[]
  processingRuns  ProcessingRun[]
}

model Upload {
  id              String   @id @default(cuid())
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])
  originalFilename String
  storedPath      String               // Path to uploaded file on disk
  fileType        String               // "xlsx", "csv", etc.
  rowCount        Int?                 // Row count after parsing
  status          String   @default("uploaded")  // uploaded | parsed | processing | processed | error
  errorMessage    String?
  uploadedAt      DateTime @default(now())
  parsedData      String?              // JSON: parsed spreadsheet content (structured)

  processingRuns  ProcessingRun[]
}

model ProcessingRun {
  id              String   @id @default(cuid())
  uploadId        String
  upload          Upload   @relation(fields: [uploadId], references: [id])
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])
  status          String   @default("pending")   // pending | running | completed | failed | cancelled
  startedAt       DateTime?
  completedAt     DateTime?
  errorMessage    String?
  createdAt       DateTime @default(now())

  steps           ProcessingStep[]
  cozeroePushes   CozeroPush[]
}

model ProcessingStep {
  id              String   @id @default(cuid())
  runId           String
  run             ProcessingRun @relation(fields: [runId], references: [id])
  stepName        String               // e.g. "validate", "transform", "llm_categorise", "map_to_cozero"
  stepOrder       Int
  status          String   @default("pending")   // pending | running | completed | failed | skipped
  inputData       String?              // JSON: input to this step
  outputData      String?              // JSON: output from this step
  errorMessage    String?
  startedAt       DateTime?
  completedAt     DateTime?
}

model CozeroPush {
  id              String   @id @default(cuid())
  runId           String
  run             ProcessingRun @relation(fields: [runId], references: [id])
  cozeroEndpoint  String               // Which Cozero API endpoint was called
  requestPayload  String               // JSON: what was sent
  responseStatus  Int?                 // HTTP status code
  responseBody    String?              // JSON: what came back
  status          String   @default("pending")   // pending | sent | success | failed
  errorMessage    String?
  pushedAt        DateTime?
  createdAt       DateTime @default(now())
}
```

**Design notes:**

- `parsedData`, `inputData`, `outputData`, `requestPayload`, and `responseBody` are stored as JSON strings in SQLite. This avoids a separate document store while keeping full audit trail of what was processed and sent.
- `ProcessingStep` models the multi-step transformation pipeline. Each step records its input and output so that failed runs can be debugged and retried from the point of failure.
- `CozeroPush` is a separate entity from `ProcessingRun` because a single run may produce multiple API calls to Cozero (one per activity type, or one per reporting period), and pushes may be retried independently.

---

## §7 — External Integrations

### Cozero API (`src/services/cozero.ts`)

All communication with the Cozero REST API is handled through this single service module. No other file in the application may call the Cozero API directly.

**Responsibilities:**
- Authenticate with the Cozero API (API key or OAuth token — to be confirmed during implementation)
- Push activity data to Cozero
- Handle rate limiting, retries, and error responses
- Map internal data structures to Cozero's expected payload format

**Boundaries:**
- The service receives fully transformed, Cozero-ready data. It does not perform any business logic or data transformation.
- All Cozero API types are defined in `src/types/cozero.ts`.
- API credentials are read from environment variables — never hardcoded.
- Every API call is logged to the `CozeroPush` table via Prisma before and after execution.

### Anthropic API (`src/services/anthropic.ts`)

All communication with the Anthropic API is handled through this single service module. No other file in the application may call the Anthropic API directly.

**Responsibilities:**
- Send data transformation prompts to the Anthropic API
- Parse structured responses from the LLM
- Handle rate limiting, retries, and error responses

**Use cases (anticipated):**
- Categorising ambiguous line items into Cozero activity types
- Extracting structured data from inconsistently formatted spreadsheets
- Normalising unit descriptions (e.g. "kilowatt hours", "kWh", "kwh" → standard unit)

**Boundaries:**
- The service receives raw or partially transformed data and returns structured output. It does not write to the database or call the Cozero API.
- All Anthropic API types are defined in `src/types/anthropic.ts`.
- API credentials are read from environment variables — never hardcoded.
- Every LLM call should be logged (step-level in `ProcessingStep`) for auditability and debugging.

### Processing Pipeline (`src/services/processing.ts`)

The processing pipeline orchestrates the transformation of uploaded data into Cozero-ready payloads. It calls the Anthropic and Cozero services but does not contain any direct API logic itself.

**Typical pipeline:**
1. **Validate** — check that parsed data has required columns and data types
2. **Transform** — normalise units, clean values, apply business rules
3. **LLM Categorise** — call `anthropic.ts` to categorise ambiguous items
4. **Map to Cozero** — convert to Cozero's expected payload structure
5. **Push** — call `cozero.ts` to send data

Each step is recorded as a `ProcessingStep` in the database.

---

## §8 — Key Architectural Rules

These rules must be followed throughout the build. They exist to prevent architectural drift and maintain clear boundaries.

### API Service Boundaries

1. **All Cozero API calls must go through `src/services/cozero.ts`.** No component, page, API route, or other module may import or use a Cozero HTTP client directly.
2. **All Anthropic API calls must go through `src/services/anthropic.ts`.** No component, page, API route, or other module may import or use the Anthropic SDK directly.
3. **All database access must go through Prisma via `src/lib/db.ts`.** No raw SQL. No alternative database clients.

### Credentials and Configuration

4. **Never hardcode API credentials or keys.** All secrets must be read from environment variables defined in `.env.local`. The `.env.example` file documents required variables without values.
5. **Never commit `.env.local` to version control.** It must be listed in `.gitignore`.

### Data Flow

6. **Components and pages must not call external APIs directly.** All external communication goes through API routes, which call service modules.
7. **Service modules must not import from components or pages.** Dependencies flow downward: pages → API routes → services → lib.
8. **Pure transformation logic belongs in `src/lib/`.** Service modules orchestrate; `lib` functions transform.

### TypeScript Standards

9. **No `any` casts.** Use `unknown` and narrow explicitly.
10. **Explicit return types** on all exported functions and API route handlers.
11. **Interface definitions** for all API request/response payloads, service function parameters, and database query results that cross module boundaries.

### Documentation

12. **At the end of every task,** update `Documentation/ARCHITECTURE.md` to reflect any changes to the file map, routes, components, schema, or service boundaries. Append a changelog entry to `Documentation/ARCHITECTURE_CHANGELOG.md`. Do not replace existing changelog content.
13. **Read the current version number from the file on disk** and increment by one patch version. Do not guess or assume the current version.

### Git

14. **Do not push to git.** When a task is complete, confirm which files were changed and their locations. Neil handles all git operations manually.

---

## §9 — Quick Reference

| Path | Purpose |
|------|---------|
| `src/services/cozero.ts` | **All** Cozero API communication |
| `src/services/anthropic.ts` | **All** Anthropic API communication |
| `src/services/processing.ts` | Processing pipeline orchestration |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/validators.ts` | Zod validation schemas |
| `src/lib/transformers.ts` | Pure data transformation functions |
| `src/lib/fileParser.ts` | Spreadsheet/CSV parsing |
| `src/lib/columnMapping.ts` | Column detection and mapping |
| `src/types/` | All TypeScript type definitions |
| `src/config/activityTypes.ts` | Cozero activity type definitions |
| `prisma/schema.prisma` | Database schema |
| `.env.local` | API keys and secrets (gitignored) |
| `.env.example` | Required environment variable template |
| `CLAUDE.md` | Claude Code session rules |
| `Documentation/ARCHITECTURE.md` | This file |
| `Documentation/ARCHITECTURE_CHANGELOG.md` | Version history |
