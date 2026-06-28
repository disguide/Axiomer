# Graph semantics

What the structure *means*. These are the concepts that make Axiomer more than a note graph. Read [DATA_MODEL.md](DATA_MODEL.md) first.

## Grounding

**Grounding** answers: "does this argument reach bedrock?" A chain is grounded when it bottoms out at a terminal node (`value`, `principle`, or `epistemic-limit`). A question is **fully grounded** when *every* path down from it reaches a terminal; it is **open** when some path dead-ends at a node with no foundation.

The recursive definition:

- A **terminal** (`value`/`principle`/`epistemic-limit`) is grounded by definition — it *is* the foundation.
- An **argument** is grounded iff it either:
  - has a `grounds-in` edge to a terminal, **or**
  - `raises` a child question that is itself fully grounded.
- A **position** is grounded iff it either:
  - has a `grounds-in` edge directly to a terminal (allowed — see below), **or**
  - has ≥1 supporting/attacking argument and **every** such argument is grounded.
- A **question** is fully grounded iff it has ≥1 answering position and **every** such position is fully grounded.
- Anything else (an argument with neither a ground nor a grounded raised question) is **not** grounded → its question is **open**.

### Positions may ground directly

Normally a position is grounded *through* its arguments. But a position is allowed to carry `grounds-in` itself, short-circuiting straight to a terminal. The Sky Blue seed does exactly this: the position "Because of Rayleigh scattering" grounds directly in the epistemic limit "Best current scientific theory". Treat a direct position-level `grounds-in` as a valid full grounding.

### Why "open" matters

Open is not failure — it's a to-do. An open question marks exactly where the argument hasn't yet been traced to its foundation. The product's purpose is to push every chain down to bedrock, so surfacing open chains is a feature.

## Convergence

**Convergence** is the heart of Axiomer. It happens when **two or more distinct chains ground in the same terminal node.**

In the seed, the value `Minimize total suffering` is reached by two completely different chains:
1. The **Trolley** question → "Yes, pull the lever" → "Saving more lives is better" → "Why does saving lives matter" → "Because minimizing suffering is the goal" → "Suffering is bad" → **grounds-in** → `Minimize total suffering`.
2. The **refugees premise** → "Suffering matters" (premise) → entails "Helping refugees is right" → "Helping refugees reduces suffering" → **grounds-in** → `Minimize total suffering`.

One shared value node, two incoming `grounds-in` edges from unrelated topics. That shared node *is* convergence made literal — it shows that a debate about trolleys and a stance on refugees rest on the same foundation.

**This is why reusing terminals is mandatory.** If the second chain had created its own "Reduce suffering" value instead of linking to the existing `Minimize total suffering`, the convergence would be invisible — two look-alike nodes instead of one shared one. See the reuse section in [AUTHORING.md](AUTHORING.md).

## Value clash

A **value clash** is the inverse: a **single question** whose chains bottom out at **different** terminals. That divergence is the real disagreement, stripped of surface argument.

The Trolley question is a clash. Its two positions ground in two different values:
- "Yes, pull the lever" → … → `Minimize total suffering`
- "No, dont pull the lever" → "Using people as means is wrong" → `Never use a person merely as a means`

The dispute over pulling the lever isn't really about lives and levers — it's a clash between *minimize suffering* and *never use a person as a means*. Axiomer's job is to push arguments down until the clash is visible at the level of values, where it actually lives.

## Premises (reverse authoring)

Most authoring is top-down: start from a `question`, add positions, arguments, ground out. A **premise** is the opposite entry point — a foundational assumption you build *forward* from.

- A premise is a tree **root**, created like a question but representing a starting commitment rather than an open question.
- It is **not terminal** — you build *downward* from it.
- Everything directly under a premise is connected with the `entails` edge (`premise → derived node`, a Down edge).
- A premise tree uses all the normal machinery below it, so it bottoms out at the same shared terminals — which feeds straight into convergence.

There is no separate "reverse mode." A premise is just another kind of root. In the seed, "Suffering matters" is a premise that `entails` "Helping refugees is right", whose chain then converges on `Minimize total suffering` alongside the Trolley chain.

## Acceptability (defeat analysis)

Grounding asks "does this reach bedrock?". **Acceptability** asks a different, orthogonal question: "does this argument *survive its attacks*?" Without it, objections and rebuttals are decorative.

Acceptability runs over the **attack relation** — the edges from attacking-type nodes (`argument-attack`, `objection`, `rebuttal`, `counter-argument`, `logical-fallacy`) to what they attack. Using Dung-style grounded semantics, every node gets a label:

- **defended** — every attacker of this node is itself defeated (or it has no attackers).
- **defeated** — at least one attacker of this node is defended.
- **contested** — only arises in degenerate cyclic cases; normal authoring won't produce it.

The key dynamic: a **rebuttal that defeats an objection revives** the argument the objection had defeated. Defence propagates up the attack chain.

Because attacks run child→parent over a tree, the attack graph is acyclic and the labelling is total — every node ends up defended or defeated.

**Acceptability is independent of grounding on purpose.** A chain can be fully grounded yet defeated (it reaches bedrock but loses to a standing objection), or open yet undefeated. Combining them — counting only undefeated chains toward grounding — is a deliberate future step, not current behaviour.

### Doing this in Obsidian

Grounding, convergence, clash, and acceptability are **conceptual properties of the graph**, not features computed by an app (the app that used to compute them was removed). In the vault you observe them by:

- **Reading the structure** in Juggl's Hierarchy layout — convergence shows as a node with multiple incoming `grounds-in` edges; a clash shows as one question whose subtrees end at different terminals.
- **Querying with Dataview** — e.g. list all `value` nodes and count inbound `grounds-in` links to find convergent values, or list questions whose descendant terminals differ to find clashes.
- If automated computation is ever wanted again, it would be a Dataview/Templater script or a small build step over the frontmatter — not a return to the React app.
