# CLAUDE.md — MSQ Sustainability Data Manager

This application manages sustainability data for MSQ Partners agencies — staff upload energy, spend, and activity data through a web interface, and the application transforms and pushes it to the Cozero sustainability platform via its REST API. It replaces a set of n8n automation workflows.

---

## Read First — Every Session

Before touching any code, read the following documentation in full:

- `Documentation/ARCHITECTURE.md` — canonical file map, component hierarchy, database schema, API service boundaries, architectural rules, quick-reference table

The local `Documentation/` folder is always more current than any external reference. Treat it as the single source of truth.

---

## Stack

- **Framework:** Next.js 15 + React 19 + TypeScript
- **Database:** SQLite via Prisma
- **Styling:** Tailwind CSS
- **External APIs:** Cozero REST API (data push), Anthropic API (LLM-assisted transformation)

---

## Layer Architecture

Dependencies must only flow downward — never upward.

```
Pages / UI Components (React)
        ↓
  API Routes (Next.js Route Handlers)
        ↓
  Service Modules (cozero.ts, anthropic.ts, processing.ts)
        ↓
  Lib (db.ts, transformers.ts, validators.ts, fileParser.ts)
        ↓
  Database (Prisma / SQLite)
```

---

## Non-Negotiable Rules

### API Service Boundaries

- **All Cozero API calls must go through `src/services/cozero.ts`.** No component, page, API route, or other module may call the Cozero API directly.
- **All Anthropic API calls must go through `src/services/anthropic.ts`.** No component, page, API route, or other module may call the Anthropic API directly.
- **All database access must go through Prisma via `src/lib/db.ts`.** No raw SQL.

### Never Do This

- **Never hardcode API credentials or keys.** All secrets come from environment variables (`.env.local`). No API keys, tokens, or secrets in source code — ever.
- **Never call the Cozero API or Anthropic API directly from a component or page.** All external API calls go through their dedicated service module, called from API routes — not from the client side.
- **Never modify the database schema without updating `Documentation/ARCHITECTURE.md`.** The schema in the architecture doc and the schema in `prisma/schema.prisma` must always match.
- **Never commit `.env.local` to version control.**

---

## TypeScript Standards

- **No `any` casts.** Use `unknown` and narrow explicitly.
- **Explicit return types** on all exported functions and API route handlers.
- **Interface definitions** for all payloads that cross module boundaries — API requests/responses, service function parameters, database query results.

---

## Component and Function Design

- **Single responsibility.** Each function does one thing. Each component renders one concern.
- **Functions ≤ ~50 lines.** If longer, extract.
- **No commented-out code** in the codebase. Delete it — git history preserves it.
- **No debug `console.log`** in component files or lib modules. Logging in API routes and service modules is acceptable where appropriate.

---

## Error Handling

- All `async/await` calls in API routes and service modules must be wrapped in `try/catch`.
- API routes must return consistent response structures on both success and failure — never bare booleans or implicit `undefined` on the error path.
- Errors must always be surfaced to the caller or UI — never silently swallowed.

---

## Documentation

After every task, update `Documentation/ARCHITECTURE.md` to reflect any changes to the file map, routes, components, schema, or service boundaries. Then append a changelog entry to `Documentation/ARCHITECTURE_CHANGELOG.md`. Do not replace existing changelog content.

Read the current version number from the file on disk and increment by one patch version. Do not guess or assume the current version.

---

## Git

Do not push to git. When a task is complete, confirm which files were changed and their locations. Neil handles all git operations manually.
