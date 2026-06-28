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

## In-depth simulation: "Should AI train on copyrighted data?"

`Nodes/AI training debate/` is a **larger, deeper** tree (18 nodes) built to
stress every feature at once. Start from **`Should AI train on copyrighted
data`** and explore:

- **Depth** — the permissive side goes question → position → argument →
  *raises* `Does open AI access reduce suffering` → position → argument → value,
  six levels down before it grounds.
- **Defeat / acceptability** — `Training is transformative fair use` is
  *objected to* by `Precedent doesnt cover commercial scale`, but the objection
  is itself *rebutted* by `Commercial use can still be fair use` — so the
  argument is **revived (defended)**. By contrast, `Unlicensed training destroys
  livelihoods` is objected to by `Income drop has many causes` with **no
  rebuttal**, so that attack stays **defeated**. (Juggl shows the structure; the
  *labels* defended/defeated are computed only in the real app.)
- **Convergence** — `Access to AI tools reduces harm` grounds in
  **`Minimize total suffering`**, the *same* value the Trolley chain and the
  `Suffering matters` premise already reach. That node now has **three** incoming
  `grounds-in`/chains — convergence across unrelated topics.
- **Value clash** — the root bottoms out at four distinct foundations:
  `Free flow of knowledge` + `Minimize total suffering` (yes) vs.
  `Respect creators autonomy` + `Fairness to creators` (no). That spread *is* the
  disagreement.

## How to author your own simulation

One note = one node. The recipe:

1. **Make a note per node** (anywhere in the vault; `[[links]]` resolve by
   filename, so keep filenames unique).
2. **Frontmatter `type:`** — one of the Axiomer node types (`question`,
   `position`, `argument-support`, `argument-attack`, `evidence-empirical`,
   `objection`, `rebuttal`, `analogy`, `assumption`, `value`, `principle`,
   `epistemic-limit`, `premise`, …).
3. **Add a typed-link property named after the relationship**, pointing at the
   note it connects to. Use the *semantic* direction (who relates to whom), not
   the visual top/bottom:
   - `answers: "[[Question]]"` on a position
   - `argues-for:` / `argues-against:` on an argument → its position
   - `supports:` on evidence → the claim it backs
   - `objects-to:` on an objection → the argument; `rebuts:` on a rebuttal → the
     objection
   - `raises: "[[Deeper question]]"` to drill down instead of grounding
   - `grounds-in: "[[Value]]"` to bottom out (terminal types take no children)
   - `entails:` on a premise → what it leads to
4. **Reuse, don't duplicate** — to converge, point a new `grounds-in` at an
   *existing* value note (that's the whole game). To make a clash, let one
   question's chains ground in *different* values.
5. **Register direction once in Breadcrumbs** (Up vs Down list above) so the
   layout flows top-down, then open in **Juggl → Hierarchy (Dagre)** with edge
   labels on.

> Reminder: this vault shows *structure and feel* only. Grounding, defeat
> labels, dedup, and clash detection are computed by the real app
> (`../client`), not by Obsidian.

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
