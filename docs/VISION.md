# Axiomer — Vision (four sections, one substrate)

Axiomer is **an IDE for your mind**. Four pieces, built as lenses on one shared
graph (`@axiomer/core`) so they're never separate apps to "merge":

1. **Axiomer (vs Brain)** — the reasoning lens.
2. **AI Agent** — the on-demand, review-gated assistant.
3. **Status Window & Skills** — the gamified life lens.
4. **Agent Prompt** — the actual instructions the agent runs on.

Everything below is the same shape: **typed nodes + typed directed edges +
per-node `data`** (see `packages/core`). Each section defines its own vocabulary
on top.

---

## 1 · Axiomer (vs Brain) — the reasoning lens

**What:** take a question, break it into positions and arguments, and keep asking
"why?" until every chain bottoms out at a **value**, **principle**, or
**epistemic limit**. Different questions ground out at the same values — surfacing
**convergence** and **clashes**. This is "you vs your own brain": you externalize
the reasoning so you can see its gaps.

**Model:** node types (`question`, `position`, `argument-*`, `evidence-*`,
`value`/`principle`/`epistemic-limit`, `premise`, …) and labelled, directed
relationships (`answers`, `grounds-in`, `raises`, `entails`, …). Full reference in
[`CONCEPTS.md`](CONCEPTS.md); the *why* in [`PHILOSOPHY.md`](PHILOSOPHY.md).

**Core ideas:** *grounding* (every chain reaches a terminal) and *convergence*
(reuse one value, don't duplicate). A *value clash* = one question reaching two
different values.

**Status / build:** the engine exists (recovered, tested) in
`client/src/lib/graph.ts` and is being ported onto `@axiomer/core` as this lens.
Node-type + relationship vocabulary and the grounding/convergence/defeat logic
live in this lens; generic graph ops live in core.

---

## 2 · AI Agent — the on-demand assistant

**What:** a coding-agent-style helper whose "codebase" is your graph. You
**invoke** it; it operates through a defined tool set; it returns a **ChangeSet**
you review and accept or reject. Never silent, never automatic, fully optional.

**Non-negotiables:** propose-never-mutate · on-demand only · convergence-first
(always check for an existing value before creating one) · frugal (send the
subtree, cheap model by default) · the human-built graph is the source of truth.

**Capabilities (each is an invoked intent → a ChangeSet):** break down text into
nodes · find & merge duplicate values · fill grounding gaps · restructure a
branch · judge quality/fallacies/is-ought.

**Tools over the graph:** read (`get_subtree`, `find_similar_values`,
`get_grounding_gaps`, `get_value_clashes`, …) and propose (`propose_node`,
`propose_link`, `propose_merge`, `propose_restructure`) — thin wrappers over
`@axiomer/core`, so the agent's view matches the app exactly.

**Full design:** [`AGENT.md`](AGENT.md). The actual prompt it runs is Section 4.
The agent generalizes across lenses — "break this down into nodes" works for
skills as well as arguments.

---

## 3 · Status Window & Skills — the gamified life lens

**What:** turn the same graph machinery on *yourself*. A **skill tree** of
everything you're learning/doing, and a **status window** that reads out your
"character sheet" from it.

**Skills:**
- Nodes: `skill` (and groupings like `domain`). Edges: `prerequisite-of`
  (skill → skill it unlocks). It's a DAG — the same structure as a reasoning
  chain, different vocabulary.
- Per-node `data`: `xp`, `level`, `unlocked`, `progress`. Unlock logic = "all
  prerequisites met" (a core `predecessors`/`hasPath` query).
- The agent's "break down" capability populates subtrees: feed a domain → it
  proposes a skill subtree → you approve. (Don't author "everything" by hand;
  grow it.)

**Status window:**
- A **derived dashboard**, not a new data store — it aggregates over the graph:
  total XP, level, stats (e.g. STR/VIT/INT mapped from skill domains), counts of
  grounded questions, recent activity.
- Computed by pure functions over `@axiomer/core` (so it's testable and always in
  sync). Think "Solo-Leveling status panel," generated from your real graph.

**Prior art to borrow (free/OSS):** Habitica (XP/level mechanics),
Project-Skill-Tree (real-life skill gamification), `beautiful-skill-tree` /
`interactive-skill-tree-builder` (React + ReactFlow components — same stack as
ours). No polished free "status window" exists — that's the opening.

**Status / build:** not started. New `skill` node types + a tree view + a derived
status computation. The skill DAG and the convergence/merge primitive both come
free from core.

---

## 4 · Agent Prompt — what the agent actually runs

The system prompt the AI Agent (Section 2) executes. It's intentionally strict:
the agent fills a known structure and always proposes. This is a **first draft**
to iterate on; keep it in sync with [`AGENT.md`](AGENT.md) and the core model.

```
You are the Axiomer Agent. You operate on a single user's knowledge graph — a
graph of typed NODES connected by typed, directed EDGES. Depending on the lens,
nodes are arguments (question / position / argument / value / principle /
epistemic-limit / premise) or skills (skill / domain), and edges are labelled
relationships (answers, argues-for, grounds-in, raises, entails, prerequisite-of,
…).

YOUR ROLE
You assist the user on demand. You NEVER edit the graph directly. Every action you
take is returned as a ChangeSet — a list of proposed operations the user reviews
and accepts or rejects. You are a tool the user can ignore; the human-built graph
is the source of truth, and the reasoning is theirs, not yours.

HARD RULES
1. Propose, never mutate. Output only a ChangeSet; apply nothing.
2. Convergence first. Before proposing any new value / principle / epistemic-limit
   (or any skill), call find_similar_values / search and, if a match exists,
   propose linking or merging to the EXISTING node instead of creating a new one.
   Duplicate foundations are the main thing you exist to prevent.
3. Respect the model. Use only valid node types and relationships, with correct
   direction. Empirical chains bottom out at epistemic-limit; normative chains at
   value/principle (never smuggle an "ought" from an "is").
4. Stay in scope. Only touch the focus node and its subtree you were given. If you
   can't complete a chain (e.g. no clear foundation), leave it and report it in
   `warnings` rather than inventing one.
5. Be frugal and concrete. One reason per argument node; short, specific labels;
   no filler. Reasoning is the user's job — you structure, surface, and connect.

INPUT
- intent: what the user asked (e.g. "break down this text", "find duplicate
  values", "what's missing under this question?", "restructure this branch").
- focus: the node/subtree in scope (and any pasted text for breakdown).
- candidates: existing values/skills to reuse (for convergence checks).

TOOLS
- Read: get_subtree, get_node, find_similar_values, get_grounding_gaps,
  get_value_clashes, get_acceptability.
- Propose (append to the ChangeSet, never apply): propose_node, propose_link,
  propose_edit, propose_merge, propose_restructure.

OUTPUT — a single ChangeSet:
{
  "intent": "<echo of the request>",
  "rationale": "<one short paragraph: what you did and why>",
  "ops": [ <add-node | add-edge | edit-node | merge | remove-edge> ... ],
  "warnings": [ "<gaps you left, assumptions, anything the user should check>" ]
}

Prefer fewer, higher-quality proposals. When unsure, propose less and explain in
the rationale/warnings. Default to reusing what already exists.
```

**Operational notes:** Haiku for high-volume intents (breakdown, dedup), Opus for
judging or on explicit "go deeper." Prompt-cache this system prompt + the static
model description; send only the focus subtree + reuse candidates. Wire format and
the `ChangeSet` type are in [`AGENT.md`](AGENT.md) and
[`reference/AGENT_TODO.md`](reference/AGENT_TODO.md).

---

## How the four fit

```
                 ┌───────────────── @axiomer/core ─────────────────┐
                 │  typed nodes + typed edges + data + pure ops      │
                 └───────────────────────────────────────────────────┘
                      ▲                ▲                 ▲
        ┌─────────────┘     ┌──────────┘      ┌──────────┘
   1. Reasoning lens    3a. Skills lens   3b. Status (derived view)
        ▲                     ▲                 ▲
        └───────── 2. AI Agent (proposes ChangeSets over any lens) ─────────┘
                              runs on → 4. Agent Prompt
```

One graph, several lenses, one agent, one prompt. Build order: finish the
reasoning lens on core → skills lens → status view → wire the agent (read tools +
ChangeSet review first, then the prompt + server).
