# Axiomer — Philosophical Foundations

> **Status: implemented.** This document is the theoretical foundation for
> Taxonomy v2 (`docs/TAXONOMY.md`) and the status & commitment system
> (`docs/STATUS_AND_COMMITMENT.md`), both now live in `client/src/lib/`. This
> document explains **why** the design is what it is, so future work (human or
> AI) does not drift. When code and this document disagree, treat it as a bug
> in one of them and reconcile — do not silently fork.

## 1. What Axiomer is, philosophically

Axiomer operationalizes one old idea: **the regress of reasons must end
somewhere, and it matters where.**

Every "why?" asked of a claim demands a reason; every reason invites another
"why?". The classical **Agrippan trilemma** says this regress can only end
three ways: it stops at something foundational, it loops in a circle, or it
goes on forever. Axiomer's whole design is a commitment to the first horn —
**foundationalism, made explicit and inspectable**:

- A chain that stops at a **value** ends in something *chosen* — a fundamental
  preference that is not itself argued for.
- A chain that stops at a **principle** ends in a *rule accepted as given*.
- A chain that stops at an **epistemic limit** ends where knowledge itself
  gives out (in the spirit of Wittgenstein's "hinge propositions" — the points
  where "my spade is turned").

"Fully grounded" means: the regress was actually run to its end, on every
branch, with no hand-waving. The product's second commitment is that when many
questions are run to their ends, they **converge** on a small set of shared
foundations — and that most disagreement, traced honestly, is not about facts
or logic but about **which bedrock you stand on**. Axiomer exists to make that
visible.

## 2. The frameworks we build on (and what each contributes)

The taxonomy and semantics are not invented from scratch. Each piece is taken
from an established framework in argumentation theory, chosen because it earns
its place:

| Framework | What we take from it |
|---|---|
| **Toulmin's model of argument** (1958) | The anatomy of a single argument: *claim, data (evidence), warrant, backing, qualifier, rebuttal*. The crucial import is the **warrant** — the usually-unstated license that connects evidence to claim — and the **qualifier** — the strength/modality of the inference. |
| **Pollock's defeasible reasoning** ([SEP: Defeasible Reasoning](https://plato.stanford.edu/entries/reasoning-defeasible/)) | The distinction between **rebutting defeaters** (attack the conclusion: "not-C") and **undercutting defeaters** (attack the *inference*: "this evidence doesn't support C here, even if C might be true"). His example: "it looks red" supports "it is red" — until you learn the light is red. Red light doesn't show the object isn't red; it severs the *support*. V1 cannot express undercuts; v2 must. |
| **Walton's argumentation schemes** ([classification](https://journals.sagepub.com/doi/10.1080/19462166.2015.1123772), [schemes & defeasible inference](https://cgi.csc.liv.ac.uk/~floriana/CMNA/WaltonReed.pdf)) | ~60 recurring patterns of presumptive reasoning (argument from expert opinion, from example, from analogy, from consequence, slippery slope, …), each with **critical questions** — the standard ways that scheme fails. Critical questions become the AI reviewer's checklist and the human's prompt for the next child node. |
| **Dung's abstract argumentation + labelling semantics** | Already implemented (v1 acceptability): compute *defended / defeated / contested* from the attack structure alone. V2 keeps this untouched as the computed layer. |
| **Carneades proof standards** ([Gordon & Walton](https://script-ed.org/article/argument-invention-with-the-carneades-argumentation-system/)) | A question can declare **how much winning is required**: *scintilla of evidence < preponderance < clear-and-convincing < beyond reasonable doubt < dialectical validity*. This turns "is this question resolved?" from a binary into a declared standard — essential for the verdict system. |
| **Hamblin's commitment stores & Brandom's deontic scorekeeping** ([commitment in dialogue](https://link.springer.com/article/10.1007/s11168-006-9003-1), [commitment & entitlement](https://consequently.org/writing/acdei/)) | Asserting is *undertaking a commitment*: to the claim, to its consequences, and to defending it when challenged. A **commitment store** tracks what each party is on the hook for; **entitlement** is earned by actually having the reasons. This is the formal basis for "if you hold this position you must also hold this branch." |
| **AIF — Argument Interchange Format** ([spec](http://www.arg-tech.org/wp-content/uploads/2011/09/aif-spec.pdf)) | The ontology discipline: separate **information nodes** (claims) from **scheme nodes** (applications of inference/conflict/preference patterns). We keep Axiomer's simpler typed-edge model, but adopt AIF's core lesson: *the inference itself is a first-class thing that can be referenced and attacked*. |
| **IBIS** (Issue-Based Information Systems, Kunz & Rittel) | The skeletal loop Axiomer already has: *issue → position → argument*, recursing. |

## 3. The core design insight: three orthogonal axes

The felt problem — "21 node types is not enough to capture everything" — is
real, but the cure is not 200 node types. The v1 taxonomy conflates **three
independent questions** into a single label, and the fix is to separate them:

```
AXIS 1 — STRUCTURAL ROLE (the node TYPE)
  "What job does this node do in the reasoning?"
  asks · claims · gives a reason · licenses an inference · evidences ·
  attacks · defends · sharpens · explores · grounds
  → a closed set of ~30 types (TAXONOMY.md). Grows rarely.

AXIS 2 — CONTENT KIND (a FACET on the node)
  "What sort of statement is this?"
  empirical · normative · conceptual · metaphysical · logical/mathematical · practical
  → orthogonal to role: an objection can be empirical or conceptual;
    a position can be normative or descriptive.

AXIS 3 — EPISTEMIC STANDING (STATUS, mostly computed)
  "How does this node currently fare?"
  computed: grounded/ungrounded · defended/defeated
  asserted: active · retracted · refuted · invalid · superseded · merged
  → never baked into the type. A defeated argument is still an argument.
```

Without this separation you need types like
"contested-empirical-counter-objection" — combinatorial explosion, impossible
to label consistently. With it, each axis stays small, and **AI labeling
becomes three easy classifications instead of one impossible one.**

The same separation exists in the strength of *edges* (Toulmin's qualifier):
an inference can be **deductive** (cannot fail if premises hold), **strong**
(reliable but defeasible), **presumptive** (holds by default, invites critical
questions), or **speculative**. This lives on the edge, not the node — see
`TAXONOMY.md §5`.

### The is/ought firewall

Axis 2 is not decoration. It enforces **Hume's guillotine**: a purely
*empirical* chain of support cannot, by itself, establish a *normative*
conclusion. Every normative position must, somewhere in its grounding, pass
through a normative node (a value, a principle, or a normative criterion). A
chain that jumps from "is" to "ought" with no normative link is structurally
flaggable — one of the most common real-world reasoning failures, made
machine-checkable.

## 4. Gap analysis: what v1 cannot express

Measured against the frameworks above, v1's structural blind spots — each is
a *move a real philosopher makes* that currently has no home:

1. **The inference itself cannot be attacked** (no warrant, no undercut). V1
   objections can only attack nodes, i.e. conclusions — Pollock's rebutting
   defeaters. Undercutting ("your evidence doesn't support that here") is the
   *more common* serious move, and it is inexpressible. → `warrant` node +
   `undercuts` edge.
2. **Questions cannot be challenged, only answered.** "Have you stopped
   beating your wife?" deserves dissolution, not a position. Loaded and
   ill-posed questions must be attackable at their **presuppositions** —
   Wittgenstein's point that some questions are not to be answered but
   *dissolved*. → `presupposition` node + `presupposes` edge; a question whose
   presupposition is defeated is **dissolved**, a third resolution state
   besides grounded/open.
3. **No counter-example.** The single most decisive move against a universal
   claim ("all X are Y" — "here is an X that is not Y") has no type. Gettier
   cases gutted a 2,000-year-old definition of knowledge in three pages; the
   taxonomy must honor the move. → `counter-example` (and its constructive
   twin `example`).
4. **No concession.** Honest dialectic grants the opponent's good points
   without surrendering ("I concede the trolley numbers, but deny that
   numbers settle it"). Concession *scopes* disagreement — it marks what is
   NOT in dispute, which is half the value of mapping a debate. → `concession`.
5. **No forward consequences inside a question tree.** "If this position
   holds, then X follows" — the engine of reductio ad absurdum, slippery
   slope, and argument from consequences — only exists under premise roots.
   → `implication` node; `entails` edge generalized to any claim.
6. **No distinction.** The quintessential philosophical move — "it depends on
   what you mean by X; take the two senses separately" — currently has to
   masquerade as a clarification, losing the *branching* it implies. →
   `distinction`, which forks a question/position into disambiguated
   sub-branches.
7. **No criterion.** Evaluative questions ("is X good/just/art?") cannot be
   judged without a standard of judgment, and the standard is usually where
   the real fight is. → `criterion`, bridging a question and its evaluation,
   itself groundable and attackable.
8. **No synthesis.** A resolved question never states its conclusion in plain
   language (`DESIGN_BRIEF.md` problem #4). → `synthesis` node: the authored
   verdict, accountable to the computed statuses.
9. **No way to mark a node dead without deleting it.** Deletion destroys the
   record; a wiki needs *retracted / refuted / superseded* as visible states —
   a defeated argument that stays visible teaches more than one that vanishes.
   → the status system (`STATUS_AND_COMMITMENT.md §2`).
10. **No commitment propagation.** Nothing connects "you accept A" to "then
    you must accept B, or give up A." This is the Hamblin/Brandom machinery —
    and it is the feature that turns Axiomer from a *map* of arguments into an
    *instrument* that audits a person's actual stance. →
    `STATUS_AND_COMMITMENT.md §3`.
11. **No declared standard of proof.** "Is this question settled?" has no
    fixed threshold across all questions; a criminal-law-style question and a
    casual empirical one warrant different bars. → Carneades proof standards
    per question.

## 5. Design principles (hold these when extending anything)

1. **Types are structural roles, and only structural roles.** If a proposed
   new type is really a content kind (axis 2) or a standing (axis 3), it's a
   facet or a status, not a type. Test: *"could two nodes of this proposed
   type differ in role in the graph?"* If no, it's a type; if yes, split it.
2. **Attack the inference, not just the claim.** Every support relation in
   the graph must be attackable — that is what warrants and `undercuts` are
   for. A system where only conclusions can be attacked is half-blind.
3. **Nothing true is deleted; nothing dead is computed.** History is sacred
   (wiki), but dead nodes must not contaminate grounding, acceptability, or
   commitment. Status separates existence from force.
4. **Computed standing and asserted status never blur.** *Defeated* is
   mathematics (Dung); *refuted* is an editorial verdict; *retracted* is an
   author's act. Three different speech acts — three different mechanisms.
5. **Commitment is the user-facing payoff of rigor.** Grounding and
   acceptability are for the graph; commitment closure is for the *person* —
   "here is what you are actually signed up for, and here is where your
   commitments collide."
6. **The regress ends only at the three terminals.** No new node type may be
   terminal. If a chain "just stops" anywhere else, the question is OPEN.
   Bedrock is a privilege, not a convenience.
7. **Every extension must name its ancestry.** New types/edges/statuses cite
   the framework they come from (as the tables here do). If a proposed
   extension has no ancestry in argumentation theory, that is a red flag —
   most likely it is a rediscovery, a facet, or a mistake.

## 6. What this deliberately is not

- **Not a formal logic.** Axiomer does not check validity of natural-language
  inferences; humans (and AI assistants) judge those. The graph tracks the
  *structure* of reasons, not their truth.
- **Not a probability engine.** No Bayesian belief propagation, no numeric
  credences on nodes. Edge strength is a coarse modality (deductive → 
  speculative), not a number. (Numbers invite false precision and kill
  contribution; coarse modalities invite the right argument: "is this really
  deductive?")
- **Not a consensus machine.** Axiomer does not decide who is right. It
  computes what follows from what, what survives attack, and what a stance
  commits you to. The verdict on bedrock values is left exactly where it
  belongs: with the person.

## 7. Reading order for the full design

1. This file — why.
2. `docs/TAXONOMY.md` — the complete v2 node/edge taxonomy, facets, and the
   AI labeling procedure.
3. `docs/STATUS_AND_COMMITMENT.md` — node lifecycle (dead/denied/invalid…)
   and the commitment/entailment system.
4. `docs/SPECIFICATION.md` + `CLAUDE.md` — the implemented v1 the above
   extends.

## Sources

- [SEP — Defeasible Reasoning (Pollock: rebutting vs undercutting defeaters)](https://plato.stanford.edu/entries/reasoning-defeasible/)
- [Walton & Macagno — A classification system for argumentation schemes](https://journals.sagepub.com/doi/10.1080/19462166.2015.1123772)
- [Walton & Reed — Argumentation Schemes and Defeasible Inferences](https://cgi.csc.liv.ac.uk/~floriana/CMNA/WaltonReed.pdf)
- [The Argument Interchange Format (AIF) Specification](http://www.arg-tech.org/wp-content/uploads/2011/09/aif-spec.pdf)
- [Gordon & Walton — Argument Invention with the Carneades Argumentation System (proof standards)](https://script-ed.org/article/argument-invention-with-the-carneades-argumentation-system/)
- [Reasoning About Propositional Commitments in Dialogue (Hamblin commitment stores)](https://link.springer.com/article/10.1007/s11168-006-9003-1)
- [Restall — Assertion and Denial, Commitment and Entitlement (Brandom-style scorekeeping)](https://consequently.org/writing/acdei/)
