# Axiomer — Philosophy

Why Axiomer is built the way it is. The [Concepts](CONCEPTS.md) doc tells you
*what* the pieces are; this one tells you *why they're worth the discipline*. If
you only ever read the tutorial you can still use the tool — but the rules there
(ground every chain, don't duplicate values, separate the empirical from the
normative) all come from the stance below.

## The problem Axiomer is for

Most disagreement is conducted at the surface, where it can't be resolved. People
trade conclusions ("we should / shouldn't do X") and stack reasons sideways,
never reaching the thing the disagreement is actually about. You can argue for
hours and not discover that you agree on every fact and differ on a single value
— or agree on every value and differ on one empirical guess.

Axiomer's wager is that **a disagreement you can't resolve at the surface often
dissolves once you trace it to its foundations.** So the tool's whole job is to
make you keep tracing until you get there, and to make the foundation visible
when you do.

## The core stance: justification has to stop — so name where

Take any claim and ask "why?". The answer is another claim, which invites another
"why?". This is the classic regress, and there are only three ways it can end:

1. it goes on forever (no real justification),
2. it loops back on itself (circular), or
3. it stops at something you don't justify further.

Axiomer commits to the third — **bounded foundationalism** — and adds one
demand: when a chain stops, you must **say what kind of stopping point it is.**
There are exactly three honest ways for a chain to bottom out:

- **`value`** — a normative bedrock. Something you *hold*, not something you
  derive. "Suffering is bad" isn't proved; it's avowed. You can trace down to it,
  not past it.
- **`principle`** — a foundational rule you choose to treat as axiomatic within
  this discussion (e.g. "treat like cases alike"). Not bedrock-in-the-universe,
  but bedrock *here*, declared.
- **`epistemic-limit`** — the current edge of evidence. The chain is empirical
  and bottoms out at "this is the best current science / we don't yet know."

The point isn't that these are unquestionable — values shift, principles get
revised, knowledge advances. The point is **honesty about where you stopped.** An
argument that trails off into "...because obviously" is hiding its foundation. An
argument that ends at a named value, principle, or limit is *finished*: you can
see exactly what it rests on, and so can anyone who disagrees.

This is why an ungrounded chain in Axiomer is **not wrong, just unfinished.** The
tool never tells you your values are mistaken. It only tells you that you haven't
yet said what they are.

## Keep *is* and *ought* on separate chains (Hume's guillotine)

You cannot derive an "ought" from an "is" alone. "People suffer" (a fact) doesn't
by itself entail "we should reduce suffering" (a value) — that step needs a value
premise smuggled in. Axiomer makes the smuggling visible by giving the two kinds
of chain *different terminals*:

- **Empirical / "is" chains** bottom out at an **`epistemic-limit`**.
- **Normative / "ought" chains** bottom out at a **`value`** or **`principle`**.

If a chain that started as "we ought to…" tries to bottom out at an
epistemic-limit, something is missing: the value that turns the fact into a
reason. Conversely, a factual question shouldn't terminate at a value. Tagging
every branch as you build it — *am I arguing about what's true, or about what
matters?* — is the single most clarifying habit in the method below.

## Disagreement is a diagnosis, not a verdict

Once two lines of reasoning reach bedrock, the *shape* at the bottom tells you
what kind of disagreement you have:

- **They reach different empirical foundations** → it's a **factual** dispute.
  In principle resolvable: gather evidence, push the epistemic-limit.
- **They reach the same value but disagree on the facts between here and there**
  → again factual, and you now know exactly which fact to test.
- **They reach genuinely different values** → a **value clash.** No amount of
  evidence settles it; the honest outcome is to locate the clash precisely and
  own it. (Axiomer's Trolley example does this on purpose: the two answers bottom
  out at "minimize suffering" vs. "never use a person merely as a means.")

This is the real product. A value clash isn't a failure of the map — it's the
map succeeding. You went from "we just disagree" to "we disagree about *this one
value*, and agree on everything else." That is as far as reasoning can take a
disagreement, and most arguments never get there.

## Convergence: a shared map of the few values we actually use

People appeal to surprisingly few bedrock values. The discipline of grounding new
arguments into **existing** value notes — rather than writing a fresh
near-duplicate every time — turns a pile of separate argument trees into one map
where you can see those few values and everything that rests on them.

This is why "reuse, don't duplicate" is a principle and not a style preference.
Every duplicate value is a missed convergence: two questions that *would* have
been shown to share a foundation now look unrelated. Protecting convergence is
protecting the one thing the map is for.

## The human reasons; the tool only holds the structure

Axiomer externalizes reasoning so you can **see** it — the gaps, the leaps, the
place two chains meet. It does not do the reasoning *for* you. This is why the AI
agent, though a core part of the product, is strictly **on-demand and
review-gated**: you invoke it, it *proposes*, you accept or reject
([`AGENT.md`](AGENT.md)). An argument map is only worth anything if the
commitments in it are *yours*. A graph an AI filled in by itself is a graph nobody
actually believes. The agent does the heavy lifting on volume — breaking down
text, spotting duplicate values, surfacing gaps — but the judgement about what
enters the graph stays with you. The tool's value is the thinking it forces you to
do, not the artifact it leaves behind.

## How the stance becomes a method

Every rule for building a good tree falls out of the above:

1. **Start from one sharp, answerable question.** Vague questions can't be
   grounded because their chains never know where they're headed.
2. **Name the positions before arguing.** List the candidate answers first, so
   arguments attach to a clear claim instead of drifting.
3. **One reason per argument.** If a note contains two reasons, it's two nodes.
   Atomic arguments are what let a chain be traced and a gap be seen.
4. **Each "why?" must climb a level of abstraction.** A good child isn't a
   restatement of its parent; it's the more general thing the parent depends on.
   If you can't go more abstract, you may be at bedrock.
5. **Tag every branch: empirical or normative?** Decide what kind of claim you're
   on, and hold it to the matching terminal (limit vs. value/principle). This is
   Hume's guillotine, applied as you go.
6. **Stop only at a foundation you can name.** You're done with a chain when you
   can say *which* it is: a value you simply hold, a principle you're taking as
   axiomatic, or the edge of the evidence. If you can't name it, the chain isn't
   finished — keep asking why.
7. **Reuse values; search before you create.** Before adding a value, look for an
   existing one that already says it, and link to that. Convergence is built one
   reused value at a time.
8. **Treat a clash as success.** When a question bottoms out at two different
   values, you've found the real disagreement. Mark it; don't paper over it.

The [Tutorial](TUTORIAL.md) puts these to work on a concrete example.

## What Axiomer is *not* claiming

- **Not that foundations are absolute.** Values and principles are revisable; the
  claim is only that reasoning must rest on *some* named commitment, and honesty
  means declaring it.
- **Not that every disagreement reduces to values.** Many reduce to facts — and
  showing *that* is just as valuable as finding a value clash.
- **Not that the map settles anything by itself.** It clarifies what's at stake
  and where the real disagreement lives. The judgement stays yours.
