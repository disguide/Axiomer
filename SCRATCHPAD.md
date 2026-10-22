# Axiomer Revival — Ground Truth Scratchpad

## 1. Intake
- **Exact Goal:** Revive Axiomer (`C:\Users\arthu\Projects R1\Axiomer`), assess codebase health across v1 (legacy editor) and v2 (Atlas persistent workspace), repair blockers, and align on next operational priorities.
- **Hard Restrictions:**
  - Zero flattery, zero validation theater openers.
  - 1-question cap per response.
  - Do not mutate v2 persistence or impose v1's 10-node ontology on v2.
  - Keep pure graph algorithms decoupled from presentation.
  - All changes must pass `typecheck`, `test`, and `build`.
- **Key Criteria:**
  - [x] Codebase health verified (`typecheck`, 365 tests, production build passing).
  - [x] Broken imports/syntax in `server/transfers.ts` and test assertions resolved.
  - [ ] Development server and local runtime operational.
  - [ ] Target direction for revival established with Arthur.

## 2. Current State Assessment
- **Location:** `C:\Users\arthu\Projects R1\Axiomer`
- **Branch:** `codex/axiomer-rebuild`
- **Architecture Dual-State:**
  - **v1 Legacy:** `/legacy` and `/editor/*`, 10-node ontology, 5 foundation types, pure graph engine, client-side localStorage / public static JSON.
  - **v2 Atlas:** `/` (default route), SQLite-backed persistent workspace, statements & sources, connection semantics, project/folder hierarchy, agent proposals via MCP / API.
- **Verification Status:**
  - `npm run typecheck`: PASS (0 diagnostics)
  - `npm test`: PASS (38/38 suites, 365/365 tests)
  - `npm run build`: PASS (Vite client + Node/esbuild server worker)
