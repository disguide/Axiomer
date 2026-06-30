# Axiomer — Concepts

This is the model behind Axiomer. It's small on purpose. Every node has a
**`type`** and a set of **labelled relationships** to other nodes — that's the
whole model. The app implements it in `client/src/lib/types.ts` and `meta.ts`;
the `obsidian-vault/` reference expresses the *same* model as note frontmatter.
The examples below use the frontmatter form because it's the most compact way to
show the shape.

If you just want to get going, start with the [Tutorial](TUTORIAL.md) and come
back here when you want to understand the pieces. For *why* the model is shaped
this way — why chains must bottom out, why the three terminal types, why reuse
matters — see [Philosophy](PHILOSOPHY.md).

## The core idea

You explore a **question** by adding **positions** (candidate answers) and
**arguments** (reasons for or against a position). You keep asking "why does this
matter?" — drilling deeper — until every chain reaches a **foundation** you can't
or won't argue past: a **value**, a **principle**, or an **epistemic limit**.

A question is **grounded** when every one of its argument chains reaches such a
foundation. A chain that just stops in mid-air ("...because it's obvious") is
**ungrounded** — Axiomer is designed to make those gaps visible so you go finish
them.

## How a note encodes a node

Every note is one node. Its frontmatter sets the type and its connections:

```markdown
---
type: position
answers: "[[Should you pull the lever]]"
---

Yes — pulling the lever saves more lives.
```

- `type:` — what kind of node this is (see the table below).
- The **relationship is the property name**, and its value is a `[[wikilink]]` to
  the connected note. A note can carry several relationships at once (e.g. an
  argument that both `argues-for` a position and `raises` a deeper question).

## Node types

| Type | Meaning |
|------|---------|
| `question` | A question to explore. A **root** of a tree. |
| `position` | A candidate answer to a question. |
| `argument-support` | A reason a position is right. |
| `argument-attack` | A reason a position is wrong. |
| `evidence-empirical` | Data/observation backing a claim. |
| `evidence-anecdotal` | A specific example backing a claim. |
| `assumption` | Something taken as given by a claim. |
| `definition` | Fixing the meaning of a term. |
| `caveat` | A limit/condition on a claim. |
| `clarification` | A note that makes a claim clearer. |
| `counter-argument` | A standalone opposing argument. |
| `objection` | A specific challenge to an argument. |
| `rebuttal` | An answer to an objection. |
| `analogy` | An illustrative comparison. |
| `thought-experiment` | A hypothetical that illustrates a point. |
| `related-concept` | A loosely connected idea. |
| `logical-fallacy` | Flags a reasoning error in a claim. |
| **`value`** | **Terminal.** A bedrock value the chain rests on. |
| **`principle`** | **Terminal.** A foundational rule/principle. |
| **`epistemic-limit`** | **Terminal.** The edge of what we can know. |
| `premise` | A base assumption you build **forward** from (a root — see below). |

**Terminal nodes** (`value`, `principle`, `epistemic-limit`) are the bottom of a
chain. Nothing hangs below them — they're where reasoning *bottoms out*. Their
notes carry no outgoing relationship.

## Relationships (the labelled links)

The link name says what the connection *means*. Direction matters: most
relationships point from the **child up to its parent**, but three point from the
**parent down to its child**. Keeping that consistent is what lets the graph draw
correctly (and is exactly the Up/Down split you configure in Breadcrumbs — see
the Tutorial).

| Relationship | Put it on… | Pointing to… | Direction |
|--------------|-----------|--------------|-----------|
| `answers` | a position | the question it answers | up (child→parent) |
| `argues-for` | a support argument | the position it backs | up |
| `argues-against` | an attack argument | the position it undermines | up |
| `supports` | evidence | the claim it supports | up |
| `objects-to` | an objection | the argument it challenges | up |
| `rebuts` | a rebuttal | the objection it answers | up |
| `illustrates` | an analogy/thought-experiment | what it illustrates | up |
| `connects-to` | any note | a related note | sideways |
| `raises` | an argument | a deeper question it opens | **down (parent→child)** |
| `grounds-in` | an argument/position | the value/principle/limit it rests on | **down** |
| `entails` | a premise | what it leads to | **down** |

A worked rule of thumb: a chain reads top-to-bottom as
`question → position → argument → (raises a deeper question, or grounds-in a value)`.

## Grounding

Grounding is the quality bar. Informally:

- A **question** is grounded when it has at least one position and **every**
  position under it is grounded.
- A **position** is grounded when it has at least one argument and **every**
  argument under it is grounded (a position may also `grounds-in` a foundation
  directly).
- An **argument** is grounded when it either `grounds-in` a terminal foundation,
  **or** `raises` a deeper question that is itself grounded.
- Anything that does neither is **ungrounded** — a loose end to go finish.

Obsidian won't compute a grounded/open badge for you (that's a possible future
add-on, see [`docs/FUTURE.md`](FUTURE.md)). What it *does* give you is the
visible graph: you can see at a glance which chains reach a foundation and which
dangle.

## Convergence (the point of the whole thing)

Values are **shared**. When two different chains both `grounds-in` the *same*
value note, that note gets two incoming links — and in the graph you literally
see two separate arguments meeting at one foundation. That's **convergence**.

The discipline is: **reuse an existing value rather than writing a new
near-duplicate one.** Before creating "minimise suffering," search the vault for
an existing "Minimize total suffering" and link to it instead. The smaller and
more reused your set of values stays, the more the graph reveals what your
different questions actually share.

A **value clash** is the flip side: a single question whose chains bottom out at
two *different* values (in the example vault, the Trolley question reaches both
"Minimize total suffering" and "Never use a person merely as a means"). That
clash is the real disagreement, surfaced.

## Premises (building forward from a base)

Normal authoring is top-down: question → … → value. A **premise** is the reverse
entry point — a foundational assumption you build *forward* from. It's a root
(like a question), and everything directly under it is connected with `entails`.
A premise chain uses all the same machinery below it, so it can bottom out at the
same shared values — feeding straight into convergence.

In the example vault, the premise "Suffering matters" entails "Helping refugees
is right," whose supporting argument `grounds-in` the **same** "Minimize total
suffering" value the Trolley chain reaches — a premise-built chain and a
question-built chain meeting at one value.

## Why the model is this small

Because `type` + labelled links is all you need to express an argument graph —
and a small model is what lets both a human *and* an on-demand AI agent operate
on the graph reliably (the agent fills a known structure rather than free-forming;
see [AGENT.md](AGENT.md)). The same minimal model is what the
[`obsidian-vault/`](../obsidian-vault/README.md) reference can express in plain
note frontmatter without any code.
