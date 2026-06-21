# Axiomer — Phased Roadmap (single-player tool → shared argument wiki)

How we get from today's single-user reasoning tool to the end goal: a **shared,
mirrored argument tree that everyone can contribute to, wiki-style**, where
different questions converge on shared bedrock values — and where **AI agents
are an optional facilitation layer, not the core**.

> **Guiding premise:** the human-built graph is the product. AI agents (judge,
> info management, connection-building, research, idea proposals) only
> *facilitate*. You could remove every agent and the wiki still works with
> humans alone. No phase may make the product depend on AI.

## Locked decisions

- **Collaboration model: propose-and-review.** Contributions are *proposed
  changesets* reviewed before they merge into the canonical tree (PR/merge
  style), not direct live edits. Highest quality; the canonical tree only
  changes through accepted merges.
- **Access: closed/invite beta first.** Invited contributors only during beta;
  open up reads, then gated public contribution, later.
- **One canonical global graph** — the cumulative mega-tree — from the start.

## The through-line

Three problems, in order: **persist & share it → make collaboration safe &
governed → keep the shared graph coherent at scale.** AI comes last and stays
optional. The honest critical path is **Phases 1→4**.

---

## Phase 0 — Reasoning substrate ✅ (done)

The pure graph model (21 node types, edges), grounding, the **acceptability
engine** (attacks have consequences), convergence/Values, the Map, depth
metrics, and the value-dedup nudge. Local-only, single user.

**Why first:** this is the *quality* layer — the moat that makes the eventual
wiki produce rigor, not just opinions. Keep `client/src/lib/graph.ts` pure
through every later phase; it stays the single source of truth.

---

## Phase 1 — Persistence, identity & invite gating

**Goal:** the tree lives on a server, behind accounts, visible to invited beta
users.

- Backend (Supabase: Postgres + Auth). Model the graph as `nodes` / `edges`
  tables (not one JSON blob) so it scales and supports history/diffs.
- Accounts + **invite-only access** (beta allowlist / invite codes).
- One **canonical shared graph**, persisted server-side. `graph.ts` reads/writes
  the server but remains pure (a thin data layer adapts it).

**Exit criteria:** an invited user signs in on any device and sees the same
canonical tree; it persists; non-invited users are gated.

**Decisions to make:** invite mechanism (codes vs. manual allowlist); hosting.

---

## Phase 2 — Proposal & review workflow (the core collaboration mechanic)

**Goal:** "PRs for the argument tree." This is the heart of the propose-and-review
model.

- A **proposal** = a draft changeset (added/edited/deleted nodes & edges) a
  contributor builds against the canonical tree.
- **Diff view:** show exactly what a proposal changes (new nodes, re-grounded
  arguments, deletions) before it lands.
- **Review:** approve / request-changes / reject; on approval the changeset
  **merges into canonical**. The canonical tree never changes except via merge.
- Real-time sync on the canonical read view so everyone sees the mirror update
  as proposals land.

**Why this shape:** review-gating means concurrency is simple — contributors
work on independent proposals; only merges touch canonical, so conflicts are
rare and resolved at merge time (rebase/refresh a proposal against latest
canonical).

**Exit criteria:** a contributor drafts a change, a reviewer sees the diff and
approves, and it appears in the canonical mirror for everyone.

---

## Phase 3 — Wiki governance (history, attribution, trust)

**Goal:** the tree is defensible, traceable, and self-correcting.

- **History:** every merged changeset is a versioned, attributable record; the
  graph has a timeline.
- **Revert:** undo a merged changeset cleanly.
- **Discussion:** "talk" threads per node and per proposal.
- **Roles & trust:** contributor / reviewer / maintainer; trust levels that
  unlock lighter review for proven contributors.
- **Moderation:** flagging, soft-delete + restore, rate limits, abuse handling.

**Exit criteria:** any change is reversible and traceable to a person and a
reviewed proposal; contested nodes can be discussed.

---

## Phase 4 — Graph integrity & convergence at scale (the hard part)

**Goal:** 10,000 contributions still resolve to a coherent, navigable tree with
real convergence — not 4,000 near-duplicate "values." Most collaborative
knowledge-graph projects die here, so it gets its own phase.

- **Canonical node merging:** propose/merge duplicate values & questions; a
  dedup/merge queue; provenance preserved after merges. Reviewers (and later AI)
  catch duplicates at review time — the convergence core, enforced.
- **Search & "link to existing" everywhere**, scaled to thousands of nodes
  (this is how reuse beats duplication at scale).
- **Performance:** pagination, lazy-loading, search/focus-driven views so the
  Tree and Map handle a large graph.

**Exit criteria:** contributing rarely creates a duplicate; the graph stays
coherent and fast as it grows.

---

## Phase 5 — AI facilitation layer (optional, suggestion-only)

**Goal:** AI visibly speeds contribution and improves coherence — and you can
turn it all off and the wiki still works.

Everything here is **a suggestion a human accepts or rejects**, fitting the
propose-and-review model naturally (AI proposes changesets / pre-reviews; humans
approve):

- **Judge** — quality/strength scoring of arguments (complements the formal
  acceptability engine: structure vs. content).
- **Info management** — dedup/merge suggestions for the Phase-4 queue.
- **Connection-building** — suggest links to existing nodes (feeds convergence).
- **Research** — find evidence/sources for a claim.
- **Idea proposals / gap-filling** — next-why, missing objection, likely value.

**Detailed task list:** `docs/AGENT_TODO.md` specs this phase (judge via a
G-Eval rubric, the on-demand frugal hint assistant, and the **MCP server over
`graph.ts`** that also lets external agents read/propose against the tree).

**Exit criteria:** AI is demonstrably helpful yet fully removable; no core flow
requires it.

---

## Phase 6 — Open up & community

**Goal:** a self-sustaining community keeps the tree growing and honest.

- Transition closed beta → public read → gated public contribution.
- Reputation / contribution metrics.
- Public sharing/embeds; a read/query **API + MCP** for outside agents.
- Governance maturity; optionally literal **mirrors** (exportable/federated
  copies of the canonical tree).

**Exit criteria:** the community sustains quality and growth without the founding
team in the loop.

---

## Cross-cutting principles (hold across all phases)

1. **`graph.ts` stays the pure source of truth.** Persistence, collaboration,
   and AI are layers around it — never inside it.
2. **AI is additive and optional, always suggestion-based.** No phase may make
   the product depend on AI.
3. **Convergence is the soul.** Every phase protects "reuse, don't duplicate."
4. **Quality before scale.** The Phase-0 rigor (grounding + acceptability) is the
   moat; don't dilute it as editing opens up.

## How this relates to the task list

- `docs/AGENT_TODO.md` = the parallelizable, agent-ready *task* breakdown for the
  AI/judge/MCP work — i.e. **Phase 5** (plus the backend foundation it shares
  with Phases 1–2).
- This file = the higher-level *phase* arc the tasks serve.

## Immediate next step

Phase 1, Task 1: stand up the backend + auth + invite gating and move the
canonical graph off `localStorage`, keeping `graph.ts` pure behind a thin data
layer. Everything else depends on it.
