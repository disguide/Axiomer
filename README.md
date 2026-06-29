# Axiomer

**A simple tool for building argument trees in Obsidian.**

Axiomer is not an app you install — it's a **way of organising thinking inside
[Obsidian](https://obsidian.md)** using a small set of conventions and two
community plugins. You take a question, break it into positions and arguments,
and keep asking "why?" until every chain bottoms out at a **bedrock value**,
**principle**, or **epistemic limit**. The result is a top-down, labelled
knowledge graph you build and explore yourself.

It's deliberately a **base layer for a person to think with** — *not* an AI that
thinks for you. You do the reasoning; Obsidian just holds the structure and draws
the graph. (AI help may come later as an optional add-on — see
[`docs/FUTURE.md`](docs/FUTURE.md) — but the tool works completely without it.)

## What you get

- **Each idea is a note.** A question, a position, an argument, a piece of
  evidence, a value — each is one Markdown note.
- **Each connection is a labelled link** in the note's frontmatter (`answers`,
  `argues-for`, `grounds-in`, `raises`, …), so the relationships are explicit.
- **A top-down graph** of the whole argument, drawn automatically by the Juggl +
  Breadcrumbs plugins.
- **Convergence**: different questions can ground out in the *same* value note,
  which reveals where unrelated debates actually share — or clash over — the same
  underlying value.

## Get started

1. Read the **[Tutorial](docs/TUTORIAL.md)** — install Obsidian, open the example
   vault, set up the two plugins, and build your first question (~15 min).
2. Skim the **[Concepts](docs/CONCEPTS.md)** — the node types, the labelled
   relationships, and what "grounding" and "convergence" mean.

## What's in this repo

```
obsidian-vault/      ← the example vault — open THIS folder in Obsidian
docs/TUTORIAL.md     ← step-by-step setup + your first argument tree
docs/CONCEPTS.md     ← the model: node types, relationships, grounding, convergence
docs/FUTURE.md       ← optional ideas (AI assist, a public viewer) — not core
CLAUDE.md            ← guidance for AI assistants working in this repo
```

The `obsidian-vault/` folder is a ready-to-open Obsidian vault containing a
worked example (the Trolley Problem and "Why is the sky blue?") so you can see
the conventions in action before building your own.
