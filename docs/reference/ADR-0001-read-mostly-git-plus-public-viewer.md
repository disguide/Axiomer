# ADR 0001 — Read-mostly: Git canonical + public read-only viewer

- **Status:** Accepted
- **Date:** 2026-06-21
- **Supersedes/refines:** the heavier multi-user phases in `ROADMAP.md` (live
  collaboration is deferred, not removed).

## Context

The end goal is a shared, wiki-style argument tree that "everyone can access."
But two facts shape the real usage:

1. **Contribution is high-effort and rare.** Tracing arguments to bedrock values
   is expert intellectual work; only a small, motivated group will author.
2. **Most people will only view.** Reading the graph is the common case (as with
   most wikis).

A naïve "one shared live vault everyone edits" (file-sync, shared password)
corrupts under concurrent edits, has no identity/review, and invites vandalism.
Full real-time multi-user infrastructure (DB, auth, CRDTs, conflict resolution)
is large and premature for a write-light system.

## Decision

**Decouple the two surfaces and keep the store in Git.**

- **Canonical graph = `data/graph.json` in the Git repo** (the `Graph` shape).
- **Editing (the few):** edit in the Axiomer app locally → **Export** → **Pull
  Request** → maintainer review → merge. Git provides history, attribution,
  revert, and propose-and-review for free; no DB or auth server.
- **Viewing (the many):** on merge, **CI builds the app in read-only mode** and
  deploys a **static site** to a CDN. Public, no account, read-only.
- **Defer** any real-time backend/DB until contribution volume demands it.
- **Fund via donations**, not membership; never paywall access.

## Consequences

**Positive**
- Near-zero cost; reads scale via CDN; writes are simple.
- No database or auth system to build or operate initially.
- The **viewer is the product** (what 95% experience) → effort concentrates on
  the Map/visualization (`DESIGN_BRIEF.md`), which is the right place.
- Plain JSON-in-Git is portable and imports cleanly into a future backend.
- `client/src/lib/graph.ts` stays the pure source of truth, untouched by the
  storage/hosting choice.

**Negative / accepted trade-offs**
- Editing has friction (local app + Export + PR). Acceptable: editors are few and
  motivated; high barrier is consistent with quality.
- Git-as-store caps at high write volume / graph-wide queries. Revisit with a
  backend (`ROADMAP.md` Phase 1) only if/when that ceiling is hit.
- No in-browser editing by default. Mitigation if needed: Decap CMS "open
  authoring" (browser PRs) as an add-on, same Git canonical.

## Alternatives considered

- **Build on Obsidian (shared vault):** good *feel*, but single-user/local-first;
  a shared live vault corrupts and a Git-backed vault still has no public web
  view. Kept only as a prototype (`obsidian-vault/`).
- **Semantic MediaWiki:** inherits full wiki governance and browser editing, but
  page-centric — the node-graph UX, computation, and feel would all be custom
  extensions on an old stack.
- **Decap/Tina Git CMS (browser PRs):** strong; retained as an optional editing
  front-end on top of the same Git canonical.
- **Full custom app + database (real-time):** the eventual end-state if scale
  demands it; deferred as premature for a read-mostly system.

## Follow-ups

See `ARCHITECTURE.md` → "What to build to reach this": `io.ts` (export/import),
`data/graph.json`, read-only mode + `dataSource.ts`, `deploy.yml` + host, donation
footer; plus the viewer polish in `DESIGN_BRIEF.md`.
