# Axiomer — Future (later, not now)

What's deliberately deferred. The **AI agent is no longer "future/optional"** —
it's a core part of the product (an on-demand, review-gated assistant); its design
lives in [AGENT.md](AGENT.md), not here. This page is for things genuinely past
the current single-user build.

> Order of operations: get the single-user app + the review-gated agent good
> first, *then* open up. Nothing here should compromise the rule that the
> human-built graph is the source of truth and the agent only proposes.

## Multi-user & public ("public later")

The app is built single-user first but meant to open up:

- **Accounts & a shared canonical graph** — move storage to the planned Supabase
  backend; one canonical graph many people can read.
- **Propose-and-review collaboration** — contributions land as reviewed
  changesets (the same accept/reject flow the AI agent already uses, applied to
  people). History, attribution, revert.
- **Read-mostly publishing** — a fast public read view for the many people who
  only browse. (See `docs/reference/ARCHITECTURE.md` and `ADR-0001`.)

## Scale & ingestion at volume

- **Web pulling** — gather arguments from online sources and let the agent
  structure them into the graph (always review-gated).
- **Overview / "brain" mode** — a navigable big-picture view for thousands of
  nodes (dots sized by importance, labels on focus), distinct from the detail
  view. Design sketch in `docs/reference/DESIGN_BRIEF.md`.
- **Search & "link to existing" everywhere**, scaled to thousands of nodes — the
  human + agent defence against duplication at volume.

## Deeper analysis (nice-to-have)

- **Gradual/weighted strength** — beyond binary acceptability, score how strongly
  an argument survives its attackers (pure graph logic; spec in
  `docs/reference/AGENT_TODO.md`, W5).
- **Agent-legible API / MCP server** so external agents can read/propose against
  the graph (`docs/reference/AGENT_TODO.md`, W4).

## What stays true at every stage

- The human-built graph is the source of truth; the agent and any automation are
  layers around it, removable without breaking the tool.
- The AI only ever **proposes**; a human accepts.
- **Convergence is the soul** — every stage protects "reuse, don't duplicate."
