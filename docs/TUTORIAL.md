# Axiomer — Tutorial

Build your first argument tree in Obsidian, end to end. About 15 minutes. No
coding, no account, no AI.

By the end you'll have Obsidian set up, the example vault open and drawing a
graph, and you'll have added your own question that grounds out at a value.

> New to the ideas? You can do this tutorial cold — but the one-page
> [Concepts](CONCEPTS.md) explains the node types and relationships you'll be
> using.

---

## Part 1 — Open the example vault

1. Install [Obsidian](https://obsidian.md) (free; macOS / Windows / Linux).
2. Get this repo onto your computer (download the ZIP from GitHub, or
   `git clone`).
3. In Obsidian: **Open folder as vault** → choose the **`obsidian-vault`** folder
   inside this repo.

You'll see ~20 notes under `Nodes/`. Each one is a single node — open
`Should you pull the lever.md` and look at its frontmatter and a few of the notes
it links to.

## Part 2 — Install the two plugins

Axiomer needs two community plugins:

- **Breadcrumbs** — reads your labelled links and imposes a top-down hierarchy.
- **Juggl** — draws the interactive, labelled graph.

To install:

1. **Settings → Community plugins** → turn **off** Restricted Mode (this lets you
   install community plugins; it's a normal step).
2. **Browse** → search **Breadcrumbs** → Install → Enable.
3. **Browse** → search **Juggl** → Install → Enable.

## Part 3 — Tell Breadcrumbs about the relationships

Breadcrumbs needs to know which link names mean "go up" (toward the question) and
which mean "go down" (toward the foundations). This is what makes the layout flow
top-down instead of tangling.

In **Settings → Breadcrumbs → Edge fields / hierarchy**, register these property
names by direction:

- **Up** (child → parent): `answers`, `argues-for`, `argues-against`, `supports`,
  `objects-to`, `rebuts`, `illustrates`, `connects-to`
- **Down** (parent → child): `raises`, `grounds-in`, `entails`

(These are exactly the frontmatter property names used in every note. The full
table with meanings is in [Concepts](CONCEPTS.md#relationships-the-labelled-links).)

## Part 4 — Draw the graph

1. Command palette (`Ctrl/Cmd-P`) → **Juggl: Open Juggl**. (Or right-click a note
   → *Open in Juggl*.)
2. In Juggl's settings/toolbar, set the **layout to Hierarchy (Dagre)** — that
   gives the top-down tree.
3. Turn on **edge labels** so you can see the relationship types on the
   connections.

You should now see questions at the top flowing down to values at the bottom.

### What to look at

- Start at **`Should you pull the lever`** and follow it down. Notice it reaches
  **two different values** — that's a **value clash** (the real disagreement).
- Find **`Minimize total suffering`**: it has **two incoming `grounds-in`**
  links — one from the Trolley chain, one from the "Suffering matters" premise
  chain. That single shared node *is* **convergence**.
- Right-click a node in Juggl → **Pin** to hold it in place while you drag others.

## Part 5 — Add your own question

Now build a small tree of your own. Create each node as a new note in `Nodes/`.

**1. The question.** New note → name it for your question, e.g.
`Should voting be mandatory`:

```markdown
---
type: question
---

Should voting be mandatory?
```

**2. A position** answering it:

```markdown
---
type: position
answers: "[[Should voting be mandatory]]"
---

Yes — mandatory voting makes results more representative.
```

**3. A support argument** backing the position:

```markdown
---
type: argument-support
argues-for: "[[Yes mandatory voting]]"
---

Turnout would jump, so outcomes reflect the whole population, not just the
motivated few.
```

**4. Ground it in a value.** Ask "why does that matter?" until you hit bedrock.
Here it rests on a value about fair representation. **Before creating a new
value, search the vault for an existing one to reuse** — that's how convergence
happens. If none fits, create it:

```markdown
---
type: value
---

Political power should reflect everyone equally.
```

…and point the argument at it by adding a `grounds-in` line:

```markdown
---
type: argument-support
argues-for: "[[Yes mandatory voting]]"
grounds-in: "[[Political power should reflect everyone equally]]"
---
```

**5. Re-open Juggl.** Your new chain appears, flowing from the question down to
the value. If your value matches one another question already uses, link to that
existing note instead — and watch the two questions converge on it.

### Check your grounding

Walk each chain from the question down. Every chain should end at a `value`,
`principle`, or `epistemic-limit`. Any chain that just stops at an argument is
**ungrounded** — a loose end. Either keep asking "why?" until it reaches a
foundation, or `raises` a deeper question and ground *that*. (The full rule is in
[Concepts → Grounding](CONCEPTS.md#grounding).)

## You're set

That's the whole tool: notes for nodes, labelled links for relationships, Juggl +
Breadcrumbs to draw and navigate. Keep adding questions; reuse values; let the
graph show you where your thinking converges and clashes.

## Troubleshooting

- **Graph is a tangle / not top-down** → check the Breadcrumbs Up/Down config
  (Part 3) and set Juggl's layout to **Hierarchy (Dagre)** (Part 4).
- **A value node sits at the top instead of the bottom** → its incoming
  `grounds-in` is registered as **Up** instead of **Down**. Fix it in Breadcrumbs.
- **A link doesn't show as an edge** → the property value must be a real
  `[[wikilink]]` and the target note must exist (matching its filename).
- **Prefer placing nodes by hand?** Obsidian's core **Canvas** lets you lay out
  notes and draw labelled arrows manually — good for sketching one picture, but
  it won't auto-layout from the links the way Juggl does.
