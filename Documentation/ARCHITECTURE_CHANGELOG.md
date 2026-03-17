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
