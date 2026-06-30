# Axiomer — Agent Build Plan (AI Judge, Hint Assistant, Agent-Legible)

A self-contained, parallelizable task list. It captures everything researched
for the next phase: an **AI judge**, an **on-demand hint assistant**, and making
Axiomer **legible to AI agents** — plus the remaining depth items.

It is written so you can **fan out across multiple agents**: each task below
has a goal, the files it touches, an approach, acceptance criteria, and explicit
dependencies. Hand one workstream (or one task) to one agent.

---

## How to use this with multiple agents

- **One branch + one draft PR per task** (`claude/<task-id>`), opened against
  `main`. CI (`typecheck + test + build`) must pass before merge.
- **Respect dependencies.** Tasks marked `depends:` need the listed task merged
  first. Tasks with `parallel-safe: yes` touch disjoint files and can run at the
  same time.
- **Keep `client/src/lib/graph.ts` pure** (no React/DOM/network). All new pure
  logic goes there with Vitest coverage. Network/LLM code lives in a serverless
  function and a thin client wrapper — never in `graph.ts`.
- **Update `CLAUDE.md`** in the same PR whenever you add a type, edge, util,
  component, or convention.
- **Shared contracts** (request/response shapes, env vars) are pinned in
  §"Shared contracts" so front-end and back-end agents agree without coordinating.

Dependency overview:

```
W1 Backend foundation ──┬─> W2 AI Judge ──> W5 Gradual strength (consumes judge weights, optional)
                        └─> W3 Hint assistant
W4 Agent legibility (MCP + llms.txt)  — independent of W1 for read-only; richer with W1
W5 Gradual strength — standalone (pure); optionally consumes W2
W6 Loose ends / polish — all independent, parallel-safe
```

If you want the cheapest visible win first and zero backend risk, start with
**W5** and **W6** (pure / no secrets). The AI features (W1–W3) need a backend +
a Claude API key.

---

## Shared contracts (read before W1–W3)

**Env / secrets** (set in the serverless platform, never committed):
- `ANTHROPIC_API_KEY` — Claude API key.
- `AXIOMER_JUDGE_MODEL` = `claude-opus-4-8` (deep judgments).
- `AXIOMER_HINT_MODEL` = `claude-haiku-4-5-20251001` (cheap default hints).

**Models:** latest Claude — Opus 4.8 for judging / deep asks, Haiku 4.5 for
hints. Never hardcode older model ids.

**Endpoint:** a single function with an `action` discriminator keeps it one
deploy.

```ts
// POST /api/assist
type AssistRequest = {
  action: "judge" | "hint";
  // The relevant SUBTREE only (never the whole graph) — token frugality.
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  focusNodeId: string;          // node being judged / asked about
  hintKind?:                    // only for action: "hint"
    | "next-why" | "weakest-assumption" | "likely-value" | "strongest-objection";
  escalate?: boolean;           // hint: use Opus instead of Haiku (user opted in)
};

type JudgeResult = {
  nodeId: string;
  strength: number;             // 0..1 content strength
  evidenceQuality: number;      // 0..1
  rationale: string;            // one short paragraph
  flags: ("unsupported" | "likely-fallacy" | "ambiguous-term" | "circular")[];
};

type HintResult = {
  nodeId: string;
  hint: string;                 // ONE sentence
  suggestion?: { type: NodeType; content: string }; // optional draftable node
};

type AssistResponse =
  | { action: "judge"; result: JudgeResult }
  | { action: "hint"; result: HintResult };
```

**Frugality rules (apply to every LLM call):**
- User-triggered only — never automatic, never polled.
- Send the **subtree**, not the graph.
- **Prompt-cache** the system rubric + static context.
- Cap `max_tokens` low (hints ≤ 80 tokens; judge ≤ 300).
- Haiku by default; Opus only when `escalate` or `action: "judge"`.

---

## W1 — Backend foundation (unblocks AI features)

> Bends the "no backend in V1" rule. Required for W2 and W3.

### T1.1 — Serverless `assist` function (Supabase Edge Function)
- **Goal:** one deployed function implementing `POST /api/assist` per the
  contract, calling Claude with the `ANTHROPIC_API_KEY`.
- **Files:** `supabase/functions/assist/index.ts` (Deno), `supabase/config.toml`.
- **Approach:** validate body → branch on `action` → build prompt (rubric from
  W2 / hint template from W3) → call Claude with prompt caching → return typed
  JSON. CORS for the app origin. Rate-limit per IP.
- **Acceptance:** `curl` with a sample subgraph returns a well-formed
  `AssistResponse`; bad input → 400; secret never logged.
- **depends:** none. **parallel-safe:** yes (new dir).

### T1.2 — Client API wrapper + config
- **Goal:** typed `assist(req): Promise<AssistResponse>` the UI can call;
  feature-flag so the app runs unchanged when no endpoint is configured.
- **Files:** `client/src/lib/assist.ts`, `.env.example` (`VITE_ASSIST_URL`),
  `client/src/lib/subgraph.ts` (pure: extract the subtree for a node).
- **Approach:** `subgraph.ts` reuses `getDescendantIds` + `getAncestors` to slice
  the relevant nodes/edges. `assist.ts` posts to `VITE_ASSIST_URL`; if unset,
  expose `isAssistEnabled = false` so buttons hide.
- **Acceptance:** Vitest covers `subgraph.ts`; `assist.ts` typechecks; app builds
  and behaves identically with the flag off.
- **depends:** none for the wrapper; live calls need T1.1. **parallel-safe:** yes.

---

## W2 — AI Judge (content layer; complements the formal acceptability engine)

> The Dung engine judges *structure* (does it survive attacks). The AI judge
> scores *content* (credible? fallacious? how strong?). Hybrid neuro-symbolic.

### T2.1 — Judge rubric + prompt (G-Eval style)
- **Goal:** a rubric-as-judge prompt that returns `JudgeResult`.
- **Files:** `supabase/functions/assist/rubric.ts` (or inline), docstring rubric.
- **Approach:** copy the **G-Eval method** (chain-of-thought + explicit rubric),
  weight design borrowed from AIDebator (evidence quality ~40%, bonus for
  addressing counter-nodes, penalty for unaddressed attacker children). Feed the
  node + its children/attackers from the subgraph. Force JSON output.
- **Acceptance:** given a strong evidence-backed argument → high `strength`;
  given an unsupported claim → low + `unsupported` flag; given a known fallacy →
  `likely-fallacy`. Document 3–5 golden cases.
- **depends:** T1.1. **parallel-safe:** yes.

### T2.2 — Judge UI (per-node, on demand)
- **Goal:** a "Judge ⚖️" action on `NodeCard` that calls `assist({action:"judge"})`
  and shows `strength` (bar), `evidenceQuality`, `rationale`, and `flags`.
- **Files:** `client/src/components/NodeCard.tsx`,
  `client/src/components/JudgeResult.tsx`, wire through `TreeView`/`Home`.
- **Approach:** button visible only when `isAssistEnabled`. Loading + error
  states. Cache results in component state keyed by node id (re-judge button).
- **Acceptance:** clicking Judge on a seed argument renders a result; no result
  is fetched automatically; works with flag off (button hidden).
- **depends:** T1.2, T2.1. **parallel-safe:** with T3.2 (different buttons, same
  file — coordinate or split NodeCard actions into a sub-component first).

### T2.3 — Calibration harness (optional, recommended)
- **Goal:** confidence the judge tracks human judgment.
- **Files:** `docs/judge-calibration.md`, a small fixture set.
- **Approach:** sample items inspired by the *Debatable Intelligence* benchmark;
  record judge vs expected; note agreement.
- **depends:** T2.1. **parallel-safe:** yes.

---

## W3 — On-demand Hint Assistant ("pay for hints, not answers")

> Pattern: LLM Shepherding (2026) — short hints, not full answers. Frugal,
> user-triggered, cheap model by default.

### T3.1 — Hint templates
- **Goal:** prompt templates for each `hintKind` returning one-sentence `hint`
  (+ optional draftable `suggestion`).
- **Files:** `supabase/functions/assist/hints.ts`.
- **Approach:** `next-why` (the deeper question to raise), `weakest-assumption`,
  `likely-value` (candidate bedrock to ground in — cross-check existing values
  for convergence), `strongest-objection`. Haiku default; Opus if `escalate`.
- **Acceptance:** each kind returns ≤ 1 sentence; `likely-value` prefers an
  existing value when similar (feeds convergence).
- **depends:** T1.1. **parallel-safe:** yes.

### T3.2 — Hint UI ("Hint 💡" / "Ask the agent")
- **Goal:** a per-node hint button with a small menu of `hintKind`s; an
  "go deeper (Opus)" toggle sets `escalate`.
- **Files:** `client/src/components/NodeCard.tsx` (or shared actions
  sub-component), `client/src/components/HintPopover.tsx`.
- **Approach:** never auto-fire. Show the one-line hint; if `suggestion`, offer
  "add this node" (reuse `addNode`) or "link instead" (reuse dedup/link).
- **Acceptance:** hint only on click; default uses Haiku; deeper toggle uses
  Opus; suggestion can be inserted; flag-off hides the button.
- **depends:** T1.2, T3.1. **parallel-safe:** coordinate with T2.2 on NodeCard.

---

## W4 — Agent-legible Axiomer (MCP + llms.txt)

> Let agents read/query/propose against the graph without scraping the UI.
> "MCP = USB-C for AI."

### T4.1 — MCP server over `graph.ts`
- **Goal:** an MCP server exposing the pure graph utilities as tools.
- **Files:** `mcp/axiomer-server/` (its own package), `mcp/README.md`.
- **Approach:** thin wrapper. Tools: `get_graph`, `get_children`, `get_roots`,
  `get_grounding_gaps`, `get_acceptability`, `get_value_clashes`,
  `find_similar_terminals`, `propose_node` (returns a node to add, doesn't
  mutate). Import the **same** `graph.ts` (extract to a shared module if needed)
  so behavior matches the app exactly. Keep tool descriptions crisp (an agent
  must one-shot them).
- **Acceptance:** an MCP client lists the tools and can walk the seed graph and
  report its grounding gaps and clashes.
- **depends:** none (read-only over a graph JSON). Richer once W1 stores a shared
  graph. **parallel-safe:** yes (new dir).

### T4.2 — `llms.txt` + agent map
- **Goal:** a front door for agents.
- **Files:** `client/public/llms.txt`, link it from `README`/`CLAUDE.md`.
- **Approach:** curated pointers to `CLAUDE.md`, the data model, the MCP server,
  and key files. Keep it short.
- **Acceptance:** `llms.txt` served at site root; lists the high-value resources.
- **depends:** none. **parallel-safe:** yes.

---

## W5 — Gradual / weighted strength (pure; standalone)

> The next rung after binary acceptability. Pure `graph.ts`, no backend.

### T5.1 — Gradual strength model
- **Goal:** `getStrength(graph): Map<id, number>` (0..1) — an argument's strength
  rises with support and falls with **surviving** attackers; aggregate to score
  positions/questions.
- **Files:** `client/src/lib/graph.ts`, `client/src/lib/graph.test.ts`.
- **Approach:** a weighted gradual-semantics iteration over the same attack
  relation `getAcceptability` uses; converge to a fixpoint. If W2 exists, seed
  base weights from `JudgeResult.strength`; otherwise default base = 1.
- **Acceptance:** unattacked argument ≈ 1; an undefeated attacker lowers it; a
  defeated attacker doesn't; deterministic + tested.
- **depends:** none (optionally T2.1 for base weights). **parallel-safe:** yes.

### T5.2 — Strength UI
- **Goal:** a subtle strength bar on argument/position cards; sort positions by
  strength in a question.
- **Files:** `NodeCard.tsx`, `TreeView.tsx`.
- **Acceptance:** bars reflect `getStrength`; presentational only.
- **depends:** T5.1. **parallel-safe:** coordinate on NodeCard.

---

## W6 — Loose ends / polish (all independent, parallel-safe)

### T6.1 — Acceptability in the Map view
- Show DEFEATED styling (dim/strike/red ring) on `GraphMap` nodes, mirroring the
  tree. **Files:** `GraphMap.tsx`. Reuse `getAcceptability`.

### T6.2 — Combine acceptability with grounding (opt-in)
- Add a mode where **only undefeated** chains count toward `FULLY GROUNDED`.
  Keep the current behavior as default; gate behind a toggle. **Files:**
  `graph.ts` (+ tests), `Home.tsx`. This is a real semantic choice — document it.

### T6.3 — Export / import JSON
- Download the graph and load one back (bridge out of localStorage; backup/
  sharing). **Files:** `Home.tsx`, small `lib/io.ts`. Validate on import.

### T6.4 — Map view acceptability/strength legend + mobile pass
- Legend entries for DEFEATED/strength; verify the tree's guide rails and Map
  controls are usable on phones.

---

## Suggested first wave (parallel)

| Agent | Task(s) | Why |
|-------|---------|-----|
| A | T1.1 + T1.2 | Unblocks all AI work; isolated new files |
| B | T5.1 (+T5.2) | Pure depth win, no secrets, no deps |
| C | T4.1 + T4.2 | Agent legibility; new dirs, parallel-safe |
| D | T6.1 + T6.3 | Visible polish; independent |

Second wave (after A merges): T2.1→T2.2, T3.1→T3.2, T2.3.

---

## Definition of done (whole phase)

- Judge and Hint work **only on user action**, default to Haiku, escalate to
  Opus on request, send subtrees, and degrade cleanly when no endpoint is set.
- The MCP server exposes the graph faithfully (same results as the app).
- `graph.ts` stays pure and fully tested; CI green on every PR.
- `CLAUDE.md` + `llms.txt` describe every new capability.
