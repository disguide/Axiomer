# Contributing to Axiomer

There are two things you can contribute: **the graph** (arguments, questions,
values — the content) and **the app** (code). Most contributors come for the
graph, so that's first.

## Contributing to the graph

**The shared graph lives in this repository, as a file:**
[`client/public/graph.json`](client/public/graph.json). It changes only
through pull requests. That gives every change review, history, attribution,
and revert — GitHub is the backend.

### The easy path (no Git knowledge needed)

1. **Open the app** and build your changes locally — new questions, deeper
   arguments, groundings. Your work autosaves in your browser.
2. Go to the **Share** tab → **Export graph.json**.
3. Click **"Open the canonical file on GitHub"** (also in the Share tab) —
   or go directly to
   [`client/public/graph.json`](client/public/graph.json) and press the ✏️
   edit button. **GitHub automatically forks the repository for you** if you
   don't have write access.
4. **Paste** your exported JSON over the file's contents.
5. Choose *"Create a new branch and start a pull request"*. Open it as a
   **draft PR** while you polish; mark it *ready for review* when done.
6. CI validates your file automatically (see below). A maintainer reviews
   the diff and merges. On merge, the public read-only viewer redeploys with
   your changes.

### The Git / VS Code path

Fork → clone → open in VS Code → `npm install && npm run dev` → build your
changes in the app → Share tab → Export → save over
`client/public/graph.json` → commit → push → open a PR. VS Code's Source
Control panel (or the GitHub Pull Requests extension) handles the branch,
commit, and PR without leaving the editor.

### The AI-agent path (Claude Code, etc.)

You can have a terminal coding agent build the tree for you. It should go
through the graph CLI, which enforces the same rules as the app — never
hand-edit the JSON blind:

```bash
npm run graph:validate            # strict check of the canonical graph
npm run graph:doctor              # what needs work (ungrounded, duplicates, …)
npm run graph:apply -- ops.json   # apply a batch of validated ops (--dry-run to preview)
npm run graph:add   -- --parent <id> --type <type> --content "…"
```

Point an agent at **`AGENTS.md`** — it spells out the workflow, the ops
schema, and the labeling rules. Invalid moves (wrong parent, inventing
bedrock, dangling ids) are rejected with a reason and never written, so an
agent can iterate safely. Then open a PR as usual.

### What CI checks on every graph PR

Your PR fails with a readable error (instead of shipping a broken viewer) if
the file:

- isn't valid JSON, or doesn't match the schema (30 node types, 18 edge
  types, statuses/facets — see `docs/TAXONOMY.md`);
- has edges pointing at nodes that don't exist, duplicate ids, stranded
  islands not reachable from any root, or children under terminal nodes.

Exporting from the app guarantees all of this — hand-editing is possible but
the app is the safer editor.

### Ground rules for graph content

1. **Reuse bedrock; don't duplicate it.** Before adding a value/principle,
   link to an existing one (the app nudges you). Convergence is the product.
2. **Retract, don't delete.** Mark nodes `retracted`/`superseded` via the ⋯
   menu; history is part of the argument.
3. **One claim per node**, ≤ 2 sentences, neutral phrasing. Type definitions
   and boundary cases: `docs/TAXONOMY.md`.
4. **Keep PRs small and reviewable** — one question deepened, one duplicate
   merged, one objection answered. Like code.
5. **Steelman.** Attack the strongest version of a claim; label your
   objection honestly (rebut the claim vs undercut the inference).

## Contributing code

- `npm run typecheck && npm test && npm run build` must pass (CI runs all
  three on every PR).
- Read `CLAUDE.md` first — the data model, edge-direction semantics, and
  purity rules (`lib/graph.ts`, `lib/commitment.ts`, `lib/organize.ts`,
  `lib/proposals.ts` stay pure) are non-negotiable conventions.
- Taxonomy/status/commitment changes must go through the design docs
  (`docs/PHILOSOPHY.md`, `docs/TAXONOMY.md`, `docs/STATUS_AND_COMMITMENT.md`)
  and their growth policy — code and docs move together.
- Branch off `main`, open a **draft PR**, keep it small.

## Questions / discussion

Open a GitHub issue. For "is this the right node type?" questions, include
the parent node and your candidate text — the labeling procedure in
`docs/TAXONOMY.md §5` usually settles it.
