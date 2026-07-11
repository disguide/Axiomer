# Axiomer — Taxonomy v2 (node types, edges, facets, and the AI labeling guide)

> **Status: design-stage.** This is the complete v2 taxonomy specification.
> V1 (implemented) has 21 node types and 11 edge types; v2 extends to **30
> node types** and **18 edge types**, plus **facets**. Types marked
> **[NEW]** are not yet in the code. Rationale for every addition:
> `docs/PHILOSOPHY.md`. Lifecycle status and commitment semantics:
> `docs/STATUS_AND_COMMITMENT.md`. Until implementation lands, the code in
> `client/src/lib/` is authoritative for v1 behavior.

This document has two jobs:

1. **Be the single dictionary** of every node type, edge type, and facet.
2. **Be the labeling manual** — precise enough that an AI (or a new human
   contributor) can classify any natural-language statement into exactly one
   type, reproducibly. Making nodes is easy; labeling them correctly is the
   discipline.

---

## 1. The three axes (recap)

Every node = **TYPE** (structural role, this file §2) + **FACETS** (content
kind & metadata, §4) + **STATUS** (standing, in `STATUS_AND_COMMITMENT.md`).
Never encode a facet or a status into a type.

---

## 2. Node types — 8 families, 30 types

Family = the ~color-family granularity the Map uses (`DESIGN_BRIEF.md`).
Terminal types (may never have children) are marked ⚓.

### Family I — INQUIRY (what is being asked)

| Type | Definition | Test |
|---|---|---|
| `question` [v1] | An open issue posed for exploration. Roots a tree or deepens one (`raises`). | Is it interrogative in force (even if phrased as a statement)? |
| `presupposition` **[NEW]** | A proposition a question *assumes true* in order to be askable. Attached to the question via `presupposes`. If a presupposition is defeated, the question is **dissolved**, not answered. | Must this be true for the question to even make sense? ("Have you stopped beating your wife?" presupposes "you beat your wife.") |

### Family II — STANCE (what is being claimed)

| Type | Definition | Test |
|---|---|---|
| `position` [v1] | A direct answer to a question; a thesis. | Does it answer the parent question, rather than support/attack another answer? |
| `synthesis` **[NEW]** | An authored verdict summarizing where a question currently stands: which positions survive, on what grounds, and where the residual clash sits. Accountable to computed statuses — a synthesis contradicting the computed standing is flaggable. One per question at most. | Does it summarize the state of the whole question rather than take a side? |

### Family III — REASONING (why to believe it)

| Type | Definition | Test |
|---|---|---|
| `argument-support` [v1] | A reason to accept the parent claim. | Does it answer "why believe it?" |
| `argument-attack` [v1] | A reason to reject the parent claim. | Does it answer "why disbelieve it?" |
| `warrant` **[NEW]** | The *license of an inference*: the general rule connecting a piece of support to its conclusion (Toulmin). Usually implicit; author it when the inference itself is worth examining or attacking. Warrants are the target of `undercuts`. | Is it of the form "things like E are (generally) grounds for things like C"? Does it explain why the support *counts as* support? |
| `implication` **[NEW]** | A consequence that follows from the parent claim ("if this holds, then…"). The forward-reasoning node: powers reductio (implication → absurd → attack the source), slippery slope, argument from consequences. Connected via `entails`. | Does it state what *follows from* the parent, rather than what supports it? |

### Family IV — EVIDENCE (what shows it)

| Type | Definition | Test |
|---|---|---|
| `evidence-empirical` [v1] | Systematic observation: studies, data, measurements, replicated results. | Would it appear in a methods/results section? |
| `evidence-anecdotal` [v1] | Particular reported experience offered as support. | Is it "this happened (to someone)" without systematic backing? |
| `example` **[NEW]** | A concrete instance offered to support or illustrate a general claim (Walton: argument from example). Distinct from evidence: it *instantiates* rather than statistically supports. Edge: `exemplifies`. | Is it one specific case of the general claim, offered constructively? |

### Family V — DIALECTIC (the back-and-forth)

| Type | Definition | Test |
|---|---|---|
| `objection` [v1] | A challenge to a node. **Two modes, distinguished by edge:** `objects-to` (rebuts the claim: "C is false because…") or `undercuts` (severs the inference: "E doesn't support C here, because…" — Pollock). | Does it push back on a specific node or inference above it? |
| `rebuttal` [v1] | An answer to an objection, restoring what it attacked. | Does it target an objection? |
| `counter-argument` [v1] | An independent opposing argument (not a point-by-point objection). | Does it stand on its own against the claim, rather than dissect it? |
| `counter-example` **[NEW]** | A concrete instance that contradicts a general claim ("all X are Y" — "here is an X that isn't Y"). The decisive move against universals; deductive in force when the instance is granted. Edge: `objects-to`. | Is it one specific case that the general claim gets wrong? |
| `concession` **[NEW]** | An acknowledgment that an opposing point is *granted*, without abandoning one's claim ("granted E, but still C, because…"). Scopes the disagreement: marks what is NOT in dispute. Edge: `concedes` (concession → the point granted). | Does it grant an opposing point while maintaining the position? |
| `logical-fallacy` [v1] | Names a formal/informal fallacy committed by the parent. A structural attack: functions as an undercut with a named pattern. | Does it identify a *named* reasoning error (ad hominem, straw man, affirming the consequent…)? |

### Family VI — PRECISION (sharpening the terms)

| Type | Definition | Test |
|---|---|---|
| `definition` [v1] | Fixes the meaning of a term as used in this subtree. | Is it "by X we mean…"? |
| `distinction` **[NEW]** | Splits an ambiguous question/claim into disambiguated senses that must be treated separately ("it depends what you mean by X: in sense A…, in sense B…"). Unlike a clarification, it *forks the branch* — children continue under each sense. | Does it identify two-or-more senses requiring separate treatment? |
| `clarification` [v1] | Restates or sharpens a claim without splitting it. | Does it re-express the same single claim more precisely? |
| `assumption` [v1] | An unstated proposition the parent *needs* to be true, surfaced for inspection. Unlike a warrant, it is a required *premise*, not an inference license. | Is it a hidden "and this must also be true" behind the parent? |
| `caveat` [v1] | A scope limitation: conditions under which the parent claim holds/fails. Edge: `qualifies`. | Is it "true, except/only when…"? |
| `criterion` **[NEW]** | The standard by which an evaluative question is to be judged ("a policy is *just* if…"). Evaluative questions are undecidable without one, and the criterion is usually where the real disagreement lives. Criteria are groundable and attackable like any claim. | Does it propose the measuring stick for an evaluative term in the question? |

### Family VII — EXPLORATION (lateral moves)

| Type | Definition | Test |
|---|---|---|
| `analogy` [v1] | Maps this case to a structurally similar one to transfer a judgment. | Is it "this is like X, so treat it like X"? |
| `thought-experiment` [v1] | A constructed hypothetical isolating one variable to pump an intuition. | Is it an invented scenario probing "what would you say if…"? |
| `related-concept` [v1] | A lateral pointer to relevant material that is neither support nor attack. | Is it "see also"? |

### Family VIII — FOUNDATION (where the regress ends) + the reverse root

| Type | Definition | Test |
|---|---|---|
| `value` ⚓ [v1] | A fundamental preference/commitment not argued for further ("minimize suffering"). Chosen, not proven. | If you ask "why?" is the honest answer "that is simply what I hold"? |
| `principle` ⚓ [v1] | A general rule accepted as given ("innocent until proven guilty"). More rule-like than a value, still not argued for further *here*. | Is it a normative/methodological rule taken as the floor? |
| `epistemic-limit` ⚓ [v1] | The recognition that the chain ends because knowledge gives out ("why these physical constants — no one knows"). | Is the honest end "this cannot (currently) be known," not "I choose this"? |
| `premise` [v1] | A foundational assumption used as a **root to build forward from** (`entails` children). The reverse-direction entry point; non-terminal. | Is it a base someone adopts to explore its consequences? |

**The terminal rule (unchanged, absolute):** only `value`, `principle`,
`epistemic-limit` end a chain. If a branch "just stops" anywhere else, the
question is OPEN. Test for genuine bedrock: *can a sincere "why?" still be
asked and answered?* If yes, it is not bedrock — keep digging.

---

## 3. Edge types — 18

Edges are semantic (from → to encodes the relationship, not visual layout —
see `CLAUDE.md`). `DOWNWARD` edges run parent → child; all others child →
parent.

### v1 edges (11, unchanged)

| Edge | from → to | Meaning |
|---|---|---|
| `answers` | position → question | answers it |
| `supports` | evidence → claim | evidences it |
| `argues-for` | argument-support → position | backs it |
| `argues-against` | argument-attack → position | opposes it |
| `raises` | argument → question | opens a deeper question (DOWNWARD) |
| `objects-to` | objection/counter-example → target | challenges the *claim* (rebutting) |
| `rebuts` | rebuttal → objection | answers the objection |
| `grounds-in` | argument/position → terminal | the regress ends here (DOWNWARD) |
| `connects-to` | any ↔ any | lateral relation |
| `illustrates` | analogy/thought-experiment → target | illustrates it |
| `entails` | claim → implication/derived node | strict consequence (DOWNWARD). **v2 generalizes this beyond premise roots: any claim may entail.** |

### v2 new edges (7)

| Edge | from → to | Direction | Meaning |
|---|---|---|---|
| `undercuts` **[NEW]** | objection/logical-fallacy → warrant *or* argument | child → parent | Attacks the **inference**, not the conclusion (Pollock). "The light was red" undercuts "looks red ⇒ is red" without claiming the object isn't red. |
| `presupposes` **[NEW]** | question/claim → presupposition | DOWNWARD | Surfaces what the question assumes. Defeated presupposition ⇒ question **dissolved**. |
| `contradicts` **[NEW]** | claim ↔ claim | symmetric | The two cannot both hold (Brandom: material incompatibility). Powers clash detection and the stance audit. Not an attack by itself — it is a *constraint*. |
| `exemplifies` **[NEW]** | example → claim | child → parent | Instance supports/illustrates the general claim. |
| `concedes` **[NEW]** | concession → opposing point | child → parent | Grants it (removes it from live dispute for this branch) while the conceder's position stands. |
| `qualifies` **[NEW]** | caveat/criterion → target | child → parent | Scopes or sets the standard for the target. (v1 caveats used generic edges; v2 makes it precise.) |
| `supersedes` **[NEW]** | successor node → superseded node | lateral | This formulation replaces that one (status system; see `STATUS_AND_COMMITMENT.md`). |

`DOWNWARD` set becomes: `raises`, `grounds-in`, `entails`, `presupposes`.

---

## 4. Facets (axis 2 + metadata)

Facets are optional labeled attributes on nodes/edges — never new types.

### 4.1 Content kind (on any claim-bearing node)

`empirical` · `normative` · `conceptual` · `metaphysical` ·
`logical-mathematical` · `practical`

| Kind | Test | Example |
|---|---|---|
| empirical | Settleable (in principle) by observation | "The switch diverts the trolley" |
| normative | About what ought to be / what is good, right, permitted | "One ought to minimize deaths" |
| conceptual | About what a term means / how concepts relate | "Killing differs from letting die" |
| metaphysical | About what exists / the nature of things, beyond observation | "Persons have free will" |
| logical-mathematical | Settleable by proof | "Five is greater than one" |
| practical | About what to do, given the rest | "Pull the lever" |

**The is/ought firewall (checkable rule):** a `normative` or `practical`
conclusion whose entire grounding is `empirical`/`logical` is structurally
suspect — somewhere a normative link (value, principle, normative criterion or
warrant) is missing. Labelers should flag it; the graph can eventually compute
it.

### 4.2 Inference strength (on support-type edges — Toulmin's qualifier)

`deductive` (cannot fail if the source holds) · `strong` (reliable, defeasible)
· `presumptive` (default that invites critical questions — most Walton
schemes) · `speculative` (offered tentatively)

Strength lives on **edges**, not nodes. `entails` is always `deductive` — if
the inference is defeasible, the edge is wrong, not the strength: use an
argument with `argues-for` instead.

### 4.3 Scheme tag (optional, on arguments — Walton)

A tag naming the argumentation scheme instantiated: `expert-opinion` ·
`analogy` · `example` · `consequence` · `cause-to-effect` · `sign` ·
`slippery-slope` · `popular-opinion` · `precedent` · `best-explanation` ·
`commitment` · `position-to-know` … (open list, from [Walton's
compendium](https://journals.sagepub.com/doi/10.1080/19462166.2015.1123772)).
The tag activates that scheme's **critical questions** (§6) as authoring
prompts and AI review checks.

### 4.4 Proof standard (on questions — Carneades)

`preponderance` (default) · `clear-and-convincing` · `beyond-reasonable-doubt`
· `dialectical-validity`. Declares how decisively positions must win for the
question to count as resolved. See `STATUS_AND_COMMITMENT.md §4`.

---

## 5. The AI labeling procedure

Given a natural-language contribution and its intended parent, classify in
this order. **First matching step wins.**

1. **Interrogative force?** → `question`. Then check: does it smuggle an
   assumption? If so, also author the `presupposition`.
2. **Does it summarize the whole question's state, taking no side?** →
   `synthesis`.
3. **Does it directly answer the question?** → `position`.
4. **Does it grant an opposing point while keeping the position?** →
   `concession`.
5. **Is it a named reasoning error in the parent?** → `logical-fallacy`.
6. **Does it challenge a specific node above?** Decide the *target*:
   - attacks the **claim's truth** → `objection` (edge `objects-to`), or
     `counter-argument` if it stands alone, or `counter-example` if it is a
     single contradicting instance;
   - attacks the **inference** ("that doesn't follow / doesn't support it
     here") → `objection` with edge `undercuts` (target the `warrant` if
     authored, else the argument);
   - attacks **what the question assumes** → attack the `presupposition`;
   - answers an objection → `rebuttal`.
7. **Is it a reason for/against the parent claim?** → `argument-support` /
   `argument-attack`.
8. **Does it state why the support counts as support (a general license)?** →
   `warrant`.
9. **Is it observational backing?** → `evidence-empirical` (systematic) /
   `evidence-anecdotal` (particular report) / `example` (constructive
   instance of a generalization).
10. **Does it state what follows from the parent?** → `implication`
    (edge `entails`; if the consequence is bad and meant as attack, the
    attack is a separate `argument-attack` on the source citing it).
11. **Does it sharpen terms?** → `definition` (fixes meaning) /
    `distinction` (splits senses, forks the branch) / `clarification`
    (restates one claim) / `assumption` (surfaces a hidden required premise)
    / `caveat` (limits scope) / `criterion` (sets the standard of judgment
    for an evaluative question).
12. **Is it a lateral exploration?** → `analogy` / `thought-experiment` /
    `related-concept`.
13. **Does the chain honestly end here?** Apply the bedrock test ("can a
    sincere *why?* still be asked?"): chosen commitment → `value`; accepted
    rule → `principle`; unknowable → `epistemic-limit`. **Never** terminal
    merely because the author is tired.
14. **Is it a base to build forward from (a root)?** → `premise`.

### Hard boundary cases (the disambiguation table)

| Confusable pair | The difference |
|---|---|
| `assumption` vs `warrant` | Assumption = hidden **premise** (another fact needed). Warrant = the **license** connecting support to conclusion (a rule about inference). "The trolley brakes are broken" (assumption) vs "diverting harm to fewer people is generally preferable" (warrant). |
| `warrant` vs `principle` | A warrant licenses one *inference pattern* and sits mid-chain, attackable by `undercuts`. A principle is *bedrock*, terminal. The same sentence can be either — placement decides: if it's being argued *from* as a floor, it's a principle; if it explains why E supports C, it's a warrant. |
| `objection` (rebutting) vs `objection` (undercutting) | Ask: does it claim the conclusion is **false** (rebut), or that the support **doesn't establish it** (undercut)? "The object isn't red" vs "the light was red." Edge choice, same node type. |
| `objection` vs `counter-argument` | Objection dissects a specific point; counter-argument is an independent case against. If it would still make sense with the parent argument deleted, it's a counter-argument. |
| `argument-attack` vs `counter-argument` | Argument-attack opposes a **position** (edge `argues-against`); counter-argument opposes an **argument**. Same dialectical act, different altitude. |
| `caveat` vs `concession` | Caveat limits **my own claim's scope** ("except when…"). Concession grants **the opponent's point** ("you're right that…, but…"). |
| `clarification` vs `distinction` | Clarification keeps one claim, restated. Distinction produces **two+ branches** that proceed separately. If the answer is "it depends," it's a distinction. |
| `definition` vs `criterion` | Definition fixes what a word **means**. Criterion fixes how to **judge** an evaluative matter. "Justice = giving each their due" (definition) vs "a policy is just iff it would be chosen behind a veil of ignorance" (criterion). |
| `evidence` vs `example` | Evidence bears on truth via observation/data. An example *instantiates* a generalization ("courage: consider Socrates at trial"). One good example ≠ statistics. |
| `example` vs `analogy` | Example is an instance **of** the claim's domain. Analogy imports a judgment from a **different** domain via structural similarity. |
| `analogy` vs `thought-experiment` | Analogy maps to a real/known case. Thought-experiment constructs a hypothetical to isolate a variable. |
| `value` vs `principle` | Value = a *good to be pursued/protected* ("human dignity"). Principle = a *rule to be followed* ("never punish the innocent"). Rules usually serve values; when a chain offers both, the principle typically grounds in the value. |
| `epistemic-limit` vs unanswered question | An epistemic limit is a **claim that this cannot be known** (itself contestable!). An unanswered question is just OPEN. Do not use epistemic-limit as a shrug. |
| `implication` vs `argument-support` on the child question | `raises` opens a question an argument depends on; `entails`/`implication` asserts a consequence that *follows*. Dependency runs upward, consequence runs downward. |

### Labeling discipline (rules for the AI)

1. **One claim per node.** Sentences with "and"/"because" usually decompose:
   the "because"-half is a child argument, not part of the claim.
2. **Label the role, not the topic.** The same sentence can be a position
   under one question and an objection under another. Parent context is part
   of the input.
3. **Prefer the more specific type.** `counter-example` beats generic
   `objection`; `criterion` beats generic `assumption`.
4. **When torn between two types, author the distinction.** Persistent
   ambiguity usually means the *content* is ambiguous — a `distinction` or
   `clarification` node is the honest fix.
5. **Never invent bedrock.** Terminals require the bedrock test. When in
   doubt, leave the chain OPEN — a false "FULLY GROUNDED" is the worst
   corruption of the product's meaning.
6. **Tag facets independently after typing:** content kind (always), scheme
   tag and edge strength (when clear), never letting facet uncertainty change
   the type decision.

---

## 6. Critical questions (Walton) — the review checklist

When an argument carries a scheme tag, these become authoring prompts ("this
usually fails when…") and the AI reviewer's checklist. Canonical examples:

- **expert-opinion:** Is the source a genuine expert *in this field*? Do
  experts disagree? Is the assertion within their expertise? Personal
  reliability concerns? Consistent with the evidence?
- **analogy:** Are the cases similar in the *relevant* respects? Are there
  relevant differences? Is there a closer contrasting case?
- **consequence:** How likely is the consequence? Is the causal link real?
  Are there offsetting consequences the argument ignores?
- **example:** Is the instance real and correctly described? Is it *typical*
  or cherry-picked? Do counter-examples exist?
- **cause-to-effect:** Correlation vs causation? Common cause? Does the
  effect ever occur without the cause?
- **popular-opinion / practice:** Does majority acceptance actually bear on
  truth here?
- **sign:** How reliable is the sign? Alternative explanations for it?

Each unanswered critical question is a *candidate child node* (objection or
open question) — this is how the taxonomy actively deepens trees rather than
merely classifying them.

---

## 7. Attachment matrix (delta)

Additions to `ALLOWED_CHILDREN` (full v1 matrix: `SPECIFICATION.md`). Format:
parent → new allowed children.

| Parent | New children allowed |
|---|---|
| `question` | `presupposition` (via `presupposes`), `criterion`, `distinction`, `synthesis` |
| `position` | `implication` (via `entails`), `concession`, `distinction`, `warrant`* |
| `argument-*` | `warrant`, `implication`, `example`, `counter-example`, `concession` |
| `warrant` | `objection` (via `undercuts`), `evidence-*` (backing — Toulmin), `assumption`, `caveat` |
| `evidence-*` | `warrant` (why this evidence bears), `counter-example` |
| `presupposition` | `objection`, `counter-argument`, `evidence-*`, `rebuttal` chain — it is an attackable claim |
| `implication` | everything an argument may have (it is a claim: attackable, groundable, may `raise`/`entail` further) |
| `criterion` | full claim treatment: arguments, objections, `grounds-in` terminals |
| `distinction` | `question`/`position` per disambiguated sense (it forks) |
| `example` / `counter-example` | `objection` ("mis-described", "atypical") |
| `concession` | `clarification`, `caveat` |
| `synthesis` | none authored beneath (it summarizes; challenges go on the question) |

*Terminals (`value`, `principle`, `epistemic-limit`) still allow **nothing**.*
*`premise` gains nothing new; `entails` is simply no longer exclusive to it.*

\* position-level warrants license `answers` inferences in the rare case the
position is itself inferential.

---

## 8. Growth policy (keeping 30 from becoming 300)

A new node type is admitted only if **all four** hold:

1. It is a **structural role**, not a content kind or a status (axis test).
2. No existing type + edge + facet combination expresses it.
3. It has **ancestry** in argumentation theory (name the framework).
4. A labeling test can distinguish it from its nearest neighbor (add the row
   to the disambiguation table *in the same change*).

Everything else — urgency, domain, audience, confidence, topic — is a facet.
