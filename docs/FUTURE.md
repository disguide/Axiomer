# Axiomer — Future ideas (optional, not core)

Axiomer's core is deliberately small: notes + labelled links in Obsidian, driven
by a person. **Everything on this page is optional and additive.** None of it is
required for the tool to work, and the first principle is that you could remove
all of it and still have the full base layer.

Keep this order: **make the human base layer excellent first, add helpers later.**

## AI as an optional helper (later)

The rule: **AI assists, it never thinks for you.** Any AI feature is a
suggestion you accept or reject — it never edits the graph on its own, and the
tool stays fully usable with it turned off. Candidate helpers, roughly in order
of usefulness:

- **Reuse finder** — when you write a new value, suggest existing values that
  already say the same thing, so you link instead of duplicate (protects
  convergence). This is the most valuable helper.
- **"Next why" prompts** — suggest the deeper question an argument could raise,
  or a likely foundation it might ground in.
- **Weak-spot hints** — point out an unsupported claim, a probable fallacy, or an
  argument with no grounding.
- **Quality notes** — a short, optional read on how strong an argument looks.

These would be on-demand only (you click for help), and would work on the
relevant subtree, not your whole vault.

## Tooling that stays human-first

- **Grounding check** — a small script that reads the vault and lists ungrounded
  chains and duplicate-looking values, so you can see loose ends without reading
  the graph by eye. Pure read-only; no AI needed.
- **A read-only web viewer** — publish a vault as a browseable graph for people
  who don't use Obsidian. A way to *share* a finished tree, not to build one.
- **Templates / hotkeys** — Obsidian Templater snippets for each node type to
  speed up authoring.

## What we are *not* doing

- No requirement on any backend, account, or AI to use the core tool.
- No automatic AI edits to your graph.
- No replacing the "you do the reasoning" model with "the AI decides."

If and when any of the above gets built, it lands as a clearly separate,
optional layer — and this repo's README and tutorial stay centred on the plain
Obsidian tool.
