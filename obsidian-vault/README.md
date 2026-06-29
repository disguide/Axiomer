# Axiomer — example vault

**This folder is the Axiomer tool.** Open it in [Obsidian](https://obsidian.md)
(*Open folder as vault*) and it becomes a working argument-tree knowledge graph.
It ships with a worked example so you can see the conventions before building
your own.

> Full setup is in **[`../docs/TUTORIAL.md`](../docs/TUTORIAL.md)**; the model is
> in **[`../docs/CONCEPTS.md`](../docs/CONCEPTS.md)**. This file is the quick
> version.

## What's in here

`Nodes/` contains ~20 notes making up two complete examples plus a premise chain:

- **Should you pull the lever?** (the Trolley Problem) — reaches **two different
  values**, i.e. a **value clash**.
- **Why is the sky blue?** — fully grounds out at an **epistemic limit**.
- A **premise** ("Suffering matters") built **forward** into a chain that grounds
  in the **same** value the Trolley chain uses — i.e. **convergence**.

Each note is one node; its `type` and its labelled links (in frontmatter) define
the graph.

## Setup (5 minutes)

1. **Open this `obsidian-vault` folder as a vault** in Obsidian.
2. **Settings → Community plugins** → turn off Restricted Mode → **Browse** and
   install + enable:
   - **Breadcrumbs** (hierarchy / direction)
   - **Juggl** (the interactive graph view)
3. **Breadcrumbs → Edge fields / hierarchy** — register the relationship fields
   by direction:
   - **Up** (child → parent): `answers`, `argues-for`, `argues-against`,
     `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to`
   - **Down** (parent → child): `raises`, `grounds-in`, `entails`
4. Command palette → **Juggl: Open Juggl**. Set layout to **Hierarchy (Dagre)**
   and turn on **edge labels**.
5. **Pin** nodes: right-click a node in Juggl → *Pin*.

## What to look at first

- Start from **`Should you pull the lever`** and follow it down to the two
  values — note they're **different** (the clash).
- Find **`Minimize total suffering`**: it has **two incoming `grounds-in`** edges
  — one from the Trolley chain, one from the **`Suffering matters`** premise
  chain. That single shared node *is* convergence.
- Try pinning the value band and dragging the questions around.

## How the encoding works

Each note is a node. Its frontmatter carries:

- `type:` — the Axiomer node type (`question`, `position`, `argument-support`,
  `value`, `premise`, …).
- A **typed link named after the relationship**, pointing at the connected note —
  e.g. a position has `answers: "[[Some question]]"`, an argument has
  `grounds-in: "[[Some value]]"`. Juggl renders these as **labelled edges**;
  Breadcrumbs uses them (per the Up/Down config) to impose the **top-down
  hierarchy**.

Most relations run child→parent (Up); `raises` / `grounds-in` / `entails` run
parent→child (Down). See [`../docs/CONCEPTS.md`](../docs/CONCEPTS.md) for the full
table and the reasoning.

## Make it your own

Copy a note in `Nodes/`, change its `type` and links, and re-open Juggl. Or start
fresh: the [Tutorial](../docs/TUTORIAL.md) walks through adding your own question
from scratch. **Reuse existing values rather than writing near-duplicates** — that
reuse is what makes the graph converge.
