# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What Axiomer is (read this first)

Axiomer is **a simple tool for building argument trees inside
[Obsidian](https://obsidian.md)** — not an app you build or run. There is **no
code product**: the "tool" is a set of note conventions plus two Obsidian
community plugins (**Breadcrumbs** + **Juggl**). A person takes a question, breaks
it into positions and arguments, and keeps asking "why?" until every chain bottoms
out at a **bedrock value**, **principle**, or **epistemic limit**.

Two principles that override any instinct to "build an app":

1. **Obsidian is the tool.** The deliverable is the vault + the conventions + good
   docs/tutorial. Do **not** reintroduce a web app, build system, or framework
   unless the user explicitly asks for one. (An earlier React prototype lived
   here and was deliberately removed — don't bring it back by reflex.)
2. **It's a base layer for a human to think with — not an AI that thinks for
   them.** The person does the reasoning. AI help is a *future, optional* add-on
   only (see `docs/FUTURE.md`); never make the core tool depend on AI, and never
   have AI silently edit someone's graph.

## Repo structure

```
README.md                 ← top-level intro + pointers
CLAUDE.md                 ← this file
obsidian-vault/           ← THE TOOL: open this folder as an Obsidian vault
  README.md               ← quick setup for the vault
  Nodes/*.md              ← one note per node (the worked example lives here)
docs/
  TUTORIAL.md             ← step-by-step: install, set up plugins, build a tree
  CONCEPTS.md             ← the model: node types, relationships, grounding, convergence
  FUTURE.md               ← optional/later ideas (AI assist, viewer) — NOT core
```

There is no `package.json`, no build, no test runner, no CI. If you find yourself
wanting any of those, stop and re-read principle #1.

## The model (authoritative summary)

The full reference is `docs/CONCEPTS.md`; keep it and this section in sync. Every
node is one Markdown note. Frontmatter encodes everything:

- `type:` — the node type.
- **The relationship is the property name**, with a `[[wikilink]]` value pointing
  at the connected note. A note may carry several relationships.

```markdown
---
type: argument-support
argues-for: "[[Yes, pull the lever]]"
grounds-in: "[[Minimize total suffering]]"
---
Saving more lives is better.
```

### Node types (21)

`question`, `position`, `argument-support`, `argument-attack`,
`evidence-empirical`, `evidence-anecdotal`, `assumption`, `definition`, `caveat`,
`clarification`, `counter-argument`, `objection`, `rebuttal`, `analogy`,
`thought-experiment`, `related-concept`, `logical-fallacy`, `value`, `principle`,
`epistemic-limit`, `premise`.

- **Terminal** (`value`, `principle`, `epistemic-limit`): the bottom of a chain;
  no outgoing relationships, nothing hangs below them.
- **`premise`**: a root you build **forward** from (reverse authoring); its
  children connect via `entails`.
- `question` and `premise` are the two kinds of **root**.

### Relationships and direction (the one real gotcha)

Direction is **semantic**. Most relationships point **child → parent** ("up",
toward the question); three point **parent → child** ("down", toward
foundations). Getting this right is what makes the graph lay out top-down.

- **Up** (child→parent): `answers`, `argues-for`, `argues-against`, `supports`,
  `objects-to`, `rebuts`, `illustrates`, `connects-to`
- **Down** (parent→child): `raises`, `grounds-in`, `entails`

This Up/Down split is exactly what gets configured in **Breadcrumbs** (Tutorial,
Part 3). If a value node renders at the **top** of the graph, its `grounds-in` was
registered as Up instead of Down.

### Grounding & convergence (the two ideas that matter)

- **Grounding** = every chain under a question reaches a terminal foundation. A
  chain that dead-ends at an argument is **ungrounded** (a loose end). Obsidian
  doesn't compute a badge — the value is that you can *see* the gaps in the graph.
- **Convergence** = different chains `grounds-in` the **same** value note (shown
  as multiple incoming links to one node). **Reuse existing values; don't write
  near-duplicates.** This is the soul of the product — protect it in docs and in
  the example vault.
- A **value clash** = one question whose chains bottom out at two *different*
  values (the Trolley example does this on purpose).

## Working in this repo

- **Most tasks are documentation/vault edits**, not engineering. Keep the writing
  simple, concrete, and centred on the human-driven Obsidian workflow.
- **Keep the four doc files consistent with each other**: the node-type list, the
  relationship/Up-Down table, and the example vault are one source of truth split
  across `CONCEPTS.md`, `TUTORIAL.md`, `obsidian-vault/README.md`, and this file.
  Change them together.
- **The example vault must stay valid**: every `[[wikilink]]` must resolve to a
  real note; terminals carry no outgoing links; directions follow the table
  above. The example is how a newcomer learns the conventions — keep it clean and
  illustrative (it intentionally shows grounding, a value clash, a premise chain,
  and convergence on a shared value).
- If you add/rename a node type or relationship, update **all** of: `CONCEPTS.md`,
  the Breadcrumbs Up/Down lists in `TUTORIAL.md` and `obsidian-vault/README.md`,
  and this file.
- Don't add AI or automation into the core flow. Optional helpers belong in
  `docs/FUTURE.md` and, if ever built, as a clearly separate layer.

## Git & branching conventions

- The default branch is `main`. Do **not** push directly to `main`.
- The GitHub repository is `disguide/axiomer`. Use the GitHub MCP tools for PR and
  issue operations (no `gh` CLI in this environment).
- Open **draft** pull requests against `main`.
- Commit only coherent units; write clear, imperative commit messages.
