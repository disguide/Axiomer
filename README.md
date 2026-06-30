# Axiomer

**An IDE for your thinking.** Axiomer is a tool for building **argument graphs**:
you take a question, break it into positions and arguments, and keep asking
"why?" until every chain bottoms out at a **bedrock value**, **principle**, or
**epistemic limit**. As the graph grows, different questions ground out at the
*same* values — revealing where your thinking **converges**, and where it
**clashes**.

It works like a code editor with an agent — but the "codebase" is your reasoning:

- **You build and own the graph.** It's the source of truth.
- **An on-demand AI agent helps when you ask it to** — break a pile of text into
  argument nodes, find duplicate values to merge, restructure a messy branch,
  surface gaps. Every change it makes is a **proposal you review and accept or
  reject.** It never edits silently, and you can ignore it entirely and still
  have the full tool.

The principle behind it: **you do the reasoning; the agent assists.** A graph an
AI filled in by itself is a graph nobody actually believes. See
[`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the full stance.

## Status

Early build, **single-user first, designed to open up to others later**. The pure
graph engine and a working graph view (including click-to-highlight a branch from
a question down to its foundations) exist today; the database and the AI agent
layer are the active work. The roadmap and architecture live in
[`docs/reference/`](docs/reference/).

## How it works (in brief)

- **Nodes** are typed: `question`, `position`, `argument-support`/`-attack`,
  `evidence-*`, `value`/`principle`/`epistemic-limit` (the terminal foundations),
  `premise`, and more.
- **Edges are labelled relationships** (`answers`, `argues-for`, `grounds-in`,
  `raises`, `entails`, …) with a direction, so the graph lays out top-down.
- **Grounding** = every chain under a question reaches a terminal foundation.
- **Convergence** = different chains ground in the *same* value (reuse, don't
  duplicate) — the core payoff, and what the AI agent helps protect at volume.

The model is documented in [`docs/CONCEPTS.md`](docs/CONCEPTS.md); the *why* in
[`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md).

## Getting started (development)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # graph-engine tests (vitest)
npm run typecheck
```

Seed data (a Trolley-Problem tree and "Why is the sky blue?") loads on first run,
so there's always something to explore.

## Repo structure

```
client/                  ← the app (React + TypeScript)
  src/lib/graph.ts        ← the pure graph engine (grounding, convergence, defeat)
  src/lib/types.ts        ← node + edge types (the data model)
  src/components/         ← the views (graph map, tree, node cards, …)
docs/
  PHILOSOPHY.md           ← the stance: why ground, is/ought, clash, the method
  CONCEPTS.md             ← the model: node types, relationships, grounding, convergence
  AGENT.md                ← the AI agent layer: its graph-tools and the review flow
  FUTURE.md               ← later: multi-user/public, scale
  reference/              ← recovered planning specs (architecture, roadmap, AI contract)
obsidian-vault/          ← a conceptual reference + seed example (NOT the product)
CLAUDE.md                ← guidance for AI assistants working in this repo
```

> **About `obsidian-vault/` and `docs/TUTORIAL.md`:** an earlier direction tried
> to deliver Axiomer purely as an Obsidian vault. That's now kept only as a
> **conceptual reference and source of seed data** — the real tool is the app
> here. The vault is a faithful, hand-built illustration of the same model.
