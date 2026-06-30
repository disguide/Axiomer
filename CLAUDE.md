# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What Axiomer is (read this first)

Axiomer is **an "IDE for your thinking"**: an app for building **argument
graphs**. A person takes a question, breaks it into positions and arguments, and
keeps asking "why?" until every chain bottoms out at a **bedrock value**,
**principle**, or **epistemic limit**. Different questions ground out at the same
values — surfacing **convergence** and **clashes**.

Two principles that shape every decision:

1. **The human-built graph is the source of truth.** The person does the
   reasoning. The app holds the structure and makes it visible (grounding gaps,
   convergence, clashes).
2. **AI is an on-demand, review-gated agent — never autonomous.** Like a coding
   agent in an editor: the user *invokes* it ("break this text down," "find
   duplicate values," "restructure this branch," "what's missing here?"), it
   operates on the graph through a defined tool set, and **every change is a
   proposal the user accepts or rejects.** It never edits silently, never runs in
   the background, and the tool is fully usable with it switched off. See
   `docs/AGENT.md`.

> History note: an earlier phase shipped this as a React app; a later phase tried
> to reduce it to an Obsidian vault; we then recovered the app as the real
> product. The `obsidian-vault/` and `docs/TUTORIAL.md` are now a **conceptual
> reference + seed data**, not the deliverable. Don't act on stale "Obsidian is
> the tool / don't build an app" framing if you find it anywhere — the app is the
> product.

## Stack

- **App:** React 19 + TypeScript + Vite + Tailwind. Graph view uses React Flow
  (`@xyflow/react`) + dagre, lazy-loaded.
- **Engine:** `client/src/lib/graph.ts` is **pure** (no React/DOM/network) — the
  single source of truth for grounding, convergence/similarity, and defeat
  analysis. Read from it; don't move logic into components.
- **Planned:** Supabase (Postgres) for persistent storage and a "single-user now,
  public later" auth path; a Claude-powered agent layer (Haiku for cheap
  high-volume work like ingestion/dedup, Opus for judging) behind a server
  function — keys never in the client. See `docs/reference/ARCHITECTURE.md` and
  `docs/reference/AGENT_TODO.md`.

There is real tooling now: `npm install`, `npm run dev`, `npm test` (vitest),
`npm run typecheck`, `npm run build`. Keep CI-equivalent checks green:
`npm run typecheck && npm test && npm run build`.

## The model (authoritative summary)

Full reference: `docs/CONCEPTS.md`. The data model lives in
`client/src/lib/types.ts` and `meta.ts`; keep all three in sync.

### Node types (21)

`question`, `position`, `argument-support`, `argument-attack`,
`evidence-empirical`, `evidence-anecdotal`, `assumption`, `definition`, `caveat`,
`clarification`, `counter-argument`, `objection`, `rebuttal`, `analogy`,
`thought-experiment`, `related-concept`, `logical-fallacy`, `value`, `principle`,
`epistemic-limit`, `premise`.

- **Terminal** (`value`, `principle`, `epistemic-limit`): the bottom of a chain;
  nothing hangs below them.
- **`premise`**: a root you build **forward** from (reverse authoring), via
  `entails`. `question` and `premise` are the two kinds of root.

### Relationships and direction

Direction is **semantic**. Most relationships point **child → parent** ("up",
toward the question); three point **parent → child** ("down", toward
foundations). This is what makes the graph lay out top-down.

- **Up** (child→parent): `answers`, `argues-for`, `argues-against`, `supports`,
  `objects-to`, `rebuts`, `illustrates`, `connects-to`
- **Down** (parent→child): `raises`, `grounds-in`, `entails`

### Grounding & convergence (the two ideas that matter)

- **Grounding** = every chain under a question reaches a terminal foundation. A
  chain that dead-ends at an argument is **ungrounded** (a loose end).
- **Convergence** = different chains `grounds-in` the **same** value note.
  **Reuse existing values; don't duplicate.** Protecting convergence at volume is
  a central job of the AI agent (the dedup/"link to existing" helper).
- A **value clash** = one question whose chains bottom out at two *different*
  values (the Trolley seed does this on purpose).

## Working in this repo

- **Keep `graph.ts` pure and fully tested.** New pure logic goes there with
  Vitest coverage. Network/LLM code lives in a server function + a thin client
  wrapper, never in `graph.ts`.
- **The AI agent only ever proposes.** Any agent capability must produce a
  reviewable change (add/edit/merge/restructure) the user approves — never a
  silent mutation, never automatic. Capabilities are specced in `docs/AGENT.md`.
- **Keep the model in sync** across `types.ts`, `meta.ts`, `CONCEPTS.md`, and this
  file when adding/renaming a node type or relationship.
- **Doc layers:** `PHILOSOPHY.md` = *why*; `CONCEPTS.md` = *what* (the model);
  `AGENT.md` = the agent layer; `docs/reference/` = recovered architecture/roadmap
  specs (technical detail, may lag the current framing — treat as reference, not
  gospel). The `obsidian-vault/` is an illustrative model reference + seed source.

## Git & branching conventions

- Default branch is `main`. Do **not** push directly to `main`.
- Repo is `disguide/axiomer`. Use the GitHub MCP tools for PR/issue operations
  (no `gh` CLI here).
- Open **draft** pull requests against `main`; commit coherent units with clear,
  imperative messages.
