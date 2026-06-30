# Axiomer — The AI Agent Layer

How AI works in Axiomer. The model is **a coding agent in an editor, but the
"codebase" is your argument graph.** You summon it; it operates on the graph
through a defined tool set; it hands back **a proposed change you review and accept
or reject.** It never edits silently, never runs in the background, and the app is
fully usable with it switched off.

> This is the product-level design. The lower-level API contract (request/response
> shapes, model choice, the MCP server, the judge rubric) is in
> [`reference/AGENT_TODO.md`](reference/AGENT_TODO.md). Keep the two in sync; this
> doc is the authority on *behaviour and flow*, that one on *wire format*.

## Non-negotiables

1. **On-demand only.** The agent acts when the user invokes it. No background
   editing, no auto-fire, no polling.
2. **Propose, never mutate.** Every agent action returns a **ChangeSet** (a list
   of proposed operations). Nothing touches the real graph until the user
   approves. This is the same accept/reject discipline a coding agent uses for a
   diff.
3. **The human-built graph is the source of truth.** The agent reads it and
   suggests; the person decides.
4. **Frugal by default.** Send the relevant **subtree**, not the whole graph.
   Cheap model (Claude Haiku) for high-volume work (ingestion, dedup); deep model
   (Claude Opus) only for judging or when the user opts in.
5. **Convergence first.** Whenever the agent would create a `value`/`principle`/
   `epistemic-limit`, it must first check for an existing one to link instead
   (see `find_similar_values`). Duplicate terminals are the failure mode the agent
   exists to prevent at scale.

## The flow: invoke → propose → review → apply

```
 user picks a focus + an intent
   (a node/subtree, or pasted text;  "break this down" / "find duplicates" / …)
        │
        ▼
 server builds context  ──►  Claude runs with graph-tools  ──►  emits a ChangeSet
   (focus subtree + the                                          (proposed ops only)
    candidate values for dedup)                                        │
        ▼                                                              ▼
 client renders the ChangeSet as a reviewable diff  ◄──────────────────┘
   (added nodes, new links, merges, edits — highlighted on the graph)
        │
        ▼
 user: Accept all │ cherry-pick │ edit a proposal │ Reject
        │
        ▼
 accepted ops applied via the pure graph mutations (graph.ts / io.ts)
```

## Capabilities (what "organise when I need it" means)

Each is an intent the user invokes; each returns a ChangeSet.

| Intent | What the agent does | Key tools used |
|--------|---------------------|----------------|
| **Break down text** | Turn pasted prose / an article / a transcript into typed nodes + edges, attached under a chosen question. | `breakdown_text`, `find_similar_values`, `propose_node`, `propose_link` |
| **Find & merge duplicates** | Scan for near-duplicate values and propose merges into one canonical node (protects convergence). | `find_similar_values`, `propose_merge` |
| **Fill gaps** | Suggest the deeper "why", a missing objection, or the value a chain should ground in. | `get_grounding_gaps`, `propose_node`, `propose_link` |
| **Restructure** | Re-parent / re-label a messy branch into a clean top-down shape. | `get_subtree`, `propose_restructure` |
| **Judge** | Flag unsupported premises, likely fallacies, and is/ought smuggling; rate strength. (Read-only — produces annotations, not graph edits, unless the user asks to act on them.) | `get_subtree`, `get_acceptability` |

## The agent's tool set (its "API" over the graph)

Split into **read** tools (safe, no proposal) and **propose** tools (emit ChangeSet
operations — they never mutate directly). All are thin wrappers over the pure
engine in `client/src/lib/graph.ts`, so the agent's view matches the app's exactly.

**Read**
- `get_subtree(nodeId)` — the focus node with ancestors to the root and all
  descendants to terminals (the unit of context sent to the model).
- `get_node(id)`, `get_roots()`, `get_children(id)`
- `find_similar_values(text | nodeId)` — ranked existing terminals, via the
  engine's `similarity` / `findSimilarTerminals`. **The convergence guard.**
- `get_grounding_gaps(questionId)` — chains that don't reach a terminal.
- `get_value_clashes()` — questions bottoming out at differing values.
- `get_acceptability()` — Dung-style defeat status per node.

**Propose** (each appends to the ChangeSet)
- `propose_node({ type, content, relationships })`
- `propose_link({ from, to, relationship })`
- `propose_edit({ nodeId, content })`
- `propose_merge({ from: [ids], into })` — fold duplicate terminals into one,
  re-pointing incoming `grounds-in` edges; provenance preserved.
- `propose_restructure({ ops: [...] })` — batched re-parent/relabel.

## The ChangeSet (the review unit)

```ts
type ChangeOp =
  | { kind: "add-node"; tempId: string; type: NodeType; content: string }
  | { kind: "add-edge"; from: NodeId | TempId; to: NodeId | TempId; rel: EdgeType }
  | { kind: "edit-node"; nodeId: NodeId; content: string }
  | { kind: "merge"; from: NodeId[]; into: NodeId }     // dedup
  | { kind: "remove-edge"; from: NodeId; to: NodeId; rel: EdgeType };

type ChangeSet = {
  intent: string;            // what the user asked for
  rationale: string;         // one short paragraph: what the agent did and why
  ops: ChangeOp[];           // proposed, not applied
  warnings?: string[];       // e.g. "couldn't ground chain X — left a gap"
};
```

Each op is individually selectable in the diff UI (cherry-pick / edit / reject).
Applying an accepted ChangeSet = mapping ops onto the existing pure mutations
(`addNode`, link helpers, merge) — the agent introduces **no** new way to change
the graph, only a new way to *propose* changes.

## Architecture

- **Client:** an agent panel / command bar (open on demand) → builds the focus
  context via the read tools → posts to the server → renders the returned
  ChangeSet as a graph diff with accept/reject.
- **Server:** one function (per `reference/AGENT_TODO.md`'s `/api/assist`-style
  contract) that holds the API key, validates input, runs Claude with the tool
  definitions and prompt-caching, and returns a typed ChangeSet. CORS-locked,
  rate-limited; the key is never in the client.
- **Models:** Haiku default; Opus for judging or on explicit "go deeper."
- **Engine:** unchanged and pure — the agent is a layer *around* `graph.ts`, never
  inside it.

## Build order

1. **Read tools + `get_subtree` context slice** (pure; testable without any LLM).
2. **ChangeSet type + a manual "apply ChangeSet" path** + the diff/review UI —
   prove the accept/reject loop with hand-written ChangeSets, no AI yet.
3. **Server function + `breakdown_text`** — the first real agent intent, and the
   highest-value one for volume.
4. **`find_similar_values` + `propose_merge`** — the convergence guard.
5. Gaps, restructure, judge — once the loop is solid.

Steps 1–2 contain no LLM and no secrets, so they're the safe, cheap place to
start and they de-risk everything after.
