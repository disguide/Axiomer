# Building the Axiomer graph with an AI agent

This file tells a terminal agent (Claude Code, or any coding agent) how to
build the **argument tree** in this repo directly — safely, with the same
guardrails the app enforces. If you are such an agent, read this, then
`docs/TAXONOMY.md` (the labeling rules), then work.

## What the graph is

The shared argument graph is one file: **`client/public/graph.json`**
(`{ nodes: [...], edges: [...] }`). Node/edge types, statuses, and facets are
defined in `client/src/lib/types.ts`; every definition, labeling test, and
boundary case is in `docs/TAXONOMY.md`. **Do not invent types** — only the 30
node types and 18 edge types exist.

## The golden rule: go through the CLI, not the raw JSON

A CLI wraps the **exact validation the app uses** (`lib/proposals.ts` +
`lib/io.ts`): the attachment matrix (what may attach to what), the terminal
rule (nothing under value/principle/epistemic-limit), status guards, and
referential integrity. Hand-editing the JSON bypasses all of it and usually
produces a graph that fails CI. Use these instead:

```bash
npm run graph:validate            # strict check of client/public/graph.json
npm run graph:doctor              # print the organize worklist (what to fix)
npm run graph:apply  -- ops.json  # apply a batch of ops (see schema below)
npm run graph:add    -- --parent <id> --type <type> --content "…" [--edge <e>] [--kind <k>]
```

Add `--dry-run` to any mutating command to preview without writing. Point at a
different file with `--graph <path>` (e.g. a draft export).

## The workflow

1. **Read the current graph.** `cat client/public/graph.json` — note the ids
   you will attach to. `npm run graph:doctor` shows what needs work
   (ungrounded chains, unanswered attacks, duplicate bedrock).
2. **Read the rules.** `docs/TAXONOMY.md §5` is the labeling procedure;
   §7 is the attachment matrix; §2 defines every type. Terminals require the
   bedrock test: only stop at value/principle/epistemic-limit when a sincere
   "why?" can no longer be answered.
3. **Write ops** to a JSON file (schema below). One claim per node.
   **Reuse bedrock** — prefer `link-value` to an existing terminal over
   creating a near-duplicate (check the `getTerminals` list first).
4. **Dry-run, then apply.** `npm run graph:apply -- ops.json --dry-run`,
   read the per-op results, fix anything rejected, then apply for real.
5. **Verify.** `npm run graph:validate && npm test` (the test suite includes
   a canonical-graph gate). Both must pass.
6. **Open a PR** on a branch off `main`, as a draft. See `CONTRIBUTING.md`.

## Ops schema (`graph:apply`)

A JSON array of ops, or a `{ "summary": "...", "ops": [...] }` envelope
(identical to what the in-app AI agents emit). Every op is validated against
the live graph at apply time; invalid ops are skipped with a printed reason,
never written.

```jsonc
[
  // Add a node under an existing parent. edgeType only for real overrides
  // (e.g. "undercuts" to attack an inference instead of the claim).
  {"op": "add-node", "parentId": "<id>", "type": "<nodeType>", "content": "…",
   "edgeType": "undercuts", "contentKind": "normative"},

  // Ground an argument/position in an EXISTING terminal (convergence — no dup).
  {"op": "link-value", "argumentId": "<id>", "valueId": "<terminalId>"},

  // Fold a duplicate terminal into the canonical one.
  {"op": "merge-terminals", "keepId": "<id>", "dropId": "<id>"},

  // Lifecycle: retract/refute/invalidate (the node stays as a ghost).
  {"op": "set-status", "nodeId": "<id>", "status": "retracted", "reason": "…"},

  // Declare two claims incompatible (drives clash detection).
  {"op": "add-contradiction", "aId": "<id>", "bId": "<id>"}
]
```

## Rules that will get your ops rejected (so don't)

- Attaching a type where the matrix forbids it (e.g. a `value` under a
  `question`). `graph:doctor` and the app's Legend show valid children.
- Anything under a terminal (value/principle/epistemic-limit).
- Inventing bedrock to "finish" a chain — leave it OPEN instead.
- Referencing an id that isn't in the graph.
- Duplicating a value that already exists — link to it.

## Non-negotiables (from CLAUDE.md)

- `lib/graph.ts`, `lib/commitment.ts`, `lib/organize.ts`, `lib/proposals.ts`
  are **pure** — no React/DOM/network. Don't move logic into them or out.
- Changing the taxonomy/statuses is a docs-first process (growth policy in
  `docs/TAXONOMY.md §8`), not something to do inline while authoring content.
