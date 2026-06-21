# Axiomer — Obsidian prototype vault

A throwaway **prototype of the *feel*** — not the product. Open this folder in
Obsidian to experience Axiomer's structure as a **top-down, labelled, pinnable
node graph** using the **Juggl** + **Breadcrumbs** plugins.

It reproduces the seed graph (Trolley Problem + "Why is the sky blue?") plus a
**premise** chain that converges on a shared value, so you can feel:
- typed, **labelled connections** (`answers`, `argues for`, `grounds in`, `raises`, `entails`);
- a **top-down direction** (questions at the top, bedrock values at the bottom);
- **pinning** nodes in place;
- **convergence** — "Minimize total suffering" is reached by two different chains;
- a **value clash** — the Trolley question bottoms out at two different values.

> ⚠️ This is the **look/feel only**. It does NOT compute grounding,
> acceptability/defeat, convergence, clashes, or dedup; it has no two-section
> value-band layout; and it's single-user. Those are exactly why the real product
> is built on React Flow + `graph.ts` (see `../docs/DESIGN_BRIEF.md` and
> `../docs/ROADMAP.md`). Use this to think, not to build on.

## Setup (5 minutes)

1. Install [Obsidian](https://obsidian.md). **Open this `obsidian-vault` folder
   as a vault** (Open folder as vault).
2. **Settings → Community plugins →** turn off Restricted Mode → **Browse** and
   install:
   - **Breadcrumbs** (hierarchy / direction)
   - **Juggl** (the interactive graph view)
   Enable both.
3. **Breadcrumbs → Edge fields / hierarchy** — register the relationship fields
   by direction so the layout flows top-down:
   - **Up** (child → parent): `answers`, `argues-for`, `argues-against`,
     `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to`
   - **Down** (parent → child): `raises`, `grounds-in`, `entails`
   (These are the YAML property names used in every note's frontmatter.)
4. Open the graph: command palette → **Juggl: Open Juggl** (or right-click a
   note → *Open in Juggl*). In Juggl's settings/toolbar set the **layout to
   Hierarchy (Dagre)** — that gives the top-down tree. Turn on **edge labels**
   to see the relationship types.
5. **Pin** nodes: right-click a node in Juggl → *Pin*. Pinned nodes stay put
   under any layout.

## What to look at

- Start from **`Should you pull the lever`** and follow it down to the two
  values — note they're **different** (the clash).
- Find **`Minimize total suffering`**: it has **two incoming `grounds-in`**
  edges — one from the Trolley chain, one from the **`Suffering matters`**
  premise chain. That single shared node *is* convergence.
- Try pinning the value band and dragging the questions around.

## How the encoding works

Each note is a node. Frontmatter carries:
- `type:` the Axiomer node type (question, position, argument-support, value, premise, …).
- A **typed link property named after the relationship**, pointing at the
  connected node — e.g. a position has `answers: "[[Some question]]"`, an
  argument has `grounds-in: "[[Some value]]"`. Juggl renders these as **labelled
  edges**; Breadcrumbs uses them (per the Up/Down config above) to impose the
  **top-down hierarchy**.

So the edge *direction* matches Axiomer's semantics: most relations run
child→parent (Up), while `raises` / `grounds-in` / `entails` run parent→child
(Down) — see `../CLAUDE.md` for why.

## Alternative: Obsidian Canvas (fully manual)

If you'd rather place nodes by hand with total control of position and labelled
arrows, Obsidian's core **Canvas** does that — but with no auto-layout from the
links. Good for sketching a specific picture; Juggl is better for "see the whole
graph, directional."
