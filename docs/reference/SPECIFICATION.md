# AXIOMER V1 — COMPLETE MASTER SPECIFICATION & IMPLEMENTATION GUIDE

**Project:** Axiomer - Question Tree to Bedrock Values  
**Version:** V1 (MVP)  
**Status:** Ready for Implementation  
**Repository:** disguide/Axiomer (GitHub)  
**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui  
**Date:** June 2026  

---

## TABLE OF CONTENTS

1. [Project Vision](#project-vision)
2. [Core Concept](#core-concept)
3. [Architecture & Data Model](#architecture--data-model)
4. [All 20 Node Types](#all-20-node-types)
5. [Edge Types & Semantics](#edge-types--semantics)
6. [Visual Hierarchy](#visual-hierarchy)
7. [User Workflow](#user-workflow)
8. [Manual Input System](#manual-input-system)
9. [Implementation Structure](#implementation-structure)
10. [Implementation Phases](#implementation-phases)
11. [Code Examples](#code-examples)
12. [Seed Data](#seed-data)
13. [Acceptance Criteria](#acceptance-criteria)

---

## PROJECT VISION

Axiomer is a **wiki-style argument tree platform** where users explore questions by tracing arguments down to their **bedrock values**. Unlike Kialo (which stays shallow with light arguments), Axiomer forces **deep exploration**: every argument chain must eventually bottom out at a fundamental value, principle, or epistemic limit.

**The Power:** As users answer multiple questions, they discover that seemingly different issues often converge to the **same core values**—revealing the fundamental value clashes underlying disagreements.

**Example:** 
- Question 1: "Should you pull the lever?" → grounds in "Minimize suffering"
- Question 2: "Should we help refugees?" → grounds in "Minimize suffering"
- Question 3: "Is capital punishment justified?" → grounds in "Never use people as means"

Result: A massive web showing how different questions resolve to the same core values.

---

## CORE CONCEPT

### The Cumulative Mega-Tree

```
                    QUESTIONS (many, at the top)
                           ↓
                    POSITIONS (branch out)
                           ↓
              OBSERVATIONS & ARGUMENTS (expand)
                           ↓
                   CHILD QUESTIONS (narrow down)
                           ↓
                    MORE ARGUMENTS
                           ↓
                   BEDROCK VALUES (few, at the bottom)
```

**Key Insight:** The graph grows **cumulatively**. Users answer multiple root questions, and as they do, they **link to existing values** instead of creating duplicates. This creates **convergence** showing how different questions lead to the same core values.

### Grounding Status

For each question, compute and display:
- **"FULLY GROUNDED"** → Every argument chain under it reaches a bedrock value/principle/epistemic-limit
- **"OPEN"** → Some arguments dead-end or lead to unanswered questions

This badge shows which questions are truly traced to their foundations.

---

## ARCHITECTURE & DATA MODEL

### TypeScript Interfaces

```typescript
// Node types enum
type NodeType = 
  | "question" 
  | "position" 
  | "argument-support" 
  | "argument-attack"
  | "evidence-empirical"
  | "evidence-anecdotal"
  | "assumption"
  | "definition"
  | "caveat"
  | "clarification"
  | "counter-argument"
  | "objection"
  | "rebuttal"
  | "analogy"
  | "thought-experiment"
  | "related-concept"
  | "logical-fallacy"
  | "value"
  | "principle"
  | "epistemic-limit";

// Edge types enum
type EdgeType = 
  | "answers"
  | "supports"
  | "argues-for"
  | "argues-against"
  | "raises"
  | "objects-to"
  | "rebuts"
  | "grounds-in"
  | "connects-to"
  | "illustrates";

// Node interface
interface GraphNode {
  id: string;
  type: NodeType;
  content: string;
  createdAt?: string;
}

// Edge interface
interface GraphEdge {
  id: string;
  from: string;      // source node id
  to: string;        // target node id
  edgeType: EdgeType;
}

// Graph interface
interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

---

## ALL 20 NODE TYPES

### 1. QUESTION `?` Blue (#0066cc)

**What it is:** An inquiry, issue, or topic that needs to be explored or answered.

**When to use:**
- As a root question that starts a line of inquiry
- As a child question raised by an argument
- When you want to drill deeper into a topic

**Examples:**
- "Should you pull the lever?"
- "Why does saving lives matter?"
- "What is justice?"

**Valid children:** Position, Argument (Support/Attack), Evidence, Assumption, Definition, Caveat, Clarification, Counter-argument, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy

**Terminal?** No

---

### 2. POSITION `◆` Grey (#666666)

**What it is:** A candidate answer, stance, or claim about what should be done or what is true.

**When to use:**
- As a direct answer to a question
- When presenting a viewpoint or perspective
- When stating what you believe or propose

**Examples:**
- "Yes, pull the lever"
- "Justice is about proportional punishment"
- "We should help refugees"

**Valid children:** Argument (Support/Attack), Evidence, Assumption, Definition, Caveat, Clarification, Counter-argument, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy

**Terminal?** No

---

### 3. ARGUMENT (SUPPORT) `+` Green (#00aa00)

**What it is:** Reasoning that backs up or supports a position. A reason WHY a position is correct or good.

**When to use:**
- When you want to justify a position
- When explaining your reasoning
- When providing a logical chain of thought

**Examples:**
- "Saving more lives is better"
- "Proportional punishment deters crime"
- "Refugees are suffering and we have resources"

**Valid children:** Question (drill deeper), Evidence, Assumption, Definition, Caveat, Clarification, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy, Value, Principle, Epistemic-Limit

**Terminal?** No

---

### 4. ARGUMENT (ATTACK) `−` Red (#cc0000)

**What it is:** Reasoning that challenges, undermines, or attacks a position. A reason WHY a position is wrong or problematic.

**When to use:**
- When presenting counterarguments
- When pointing out flaws in a position
- When showing why an argument fails

**Examples:**
- "But pulling the lever makes you actively kill someone"
- "Proportional punishment ignores rehabilitation"
- "Helping refugees strains our own economy"

**Valid children:** Question (drill deeper), Evidence, Assumption, Definition, Caveat, Clarification, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy, Value, Principle, Epistemic-Limit

**Terminal?** No

---

### 5. EVIDENCE (EMPIRICAL) `📊` Teal (#008080)

**What it is:** Data, studies, statistics, research findings, or measurable facts that support or challenge a claim.

**When to use:**
- When citing research or academic studies
- When providing statistical data or numbers
- When grounding claims in observable reality

**Examples:**
- "Studies show that 78% of refugees become self-sufficient within 5 years"
- "Recidivism rates for violent offenders are 45% in countries with capital punishment vs 30% without"
- "Brain imaging shows that moral decisions activate the emotional centers of the brain"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 6. EVIDENCE (ANECDOTAL) `📖` Orange (#ff8800)

**What it is:** Personal stories, examples, case studies, or real-world instances that illustrate a point.

**When to use:**
- When sharing a real-world example
- When illustrating a concept with a story
- When showing how something works in practice

**Examples:**
- "I knew a refugee who fled war and is now a doctor"
- "My friend was wrongly convicted and later exonerated"
- "I once had to choose between helping a friend or following the rules"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 7. ASSUMPTION `⚙` Purple (#9900cc)

**What it is:** An unstated premise, belief, or condition that an argument relies on. Something taken for granted.

**When to use:**
- When identifying hidden premises in an argument
- When making implicit beliefs explicit
- When questioning what an argument assumes

**Examples:**
- "This argument assumes we can predict the outcomes of our actions"
- "This assumes that suffering is the only thing that matters morally"
- "This assumes people act rationally in their own interest"

**Valid children:** Objection, Counter-argument, Definition, Related Concept

**Terminal?** No

---

### 8. DEFINITION `📝` Indigo (#4B0082)

**What it is:** Clarification or explanation of what a term, concept, or phrase means. Establishing shared understanding.

**When to use:**
- When a term is ambiguous or contested
- When you need to clarify what you mean
- When different people define a term differently

**Examples:**
- "By 'justice' I mean: treating people according to what they deserve"
- "By 'suffering' I mean: physical or emotional pain"
- "By 'responsibility' I mean: being accountable for one's actions"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 9. CAVEAT / EXCEPTION `⚠` Yellow (#ffcc00)

**What it is:** A limitation, condition, or exception to a claim. When and where an argument does NOT apply or has limits.

**When to use:**
- When an argument only applies in certain contexts
- When there are edge cases or exceptions
- When you want to be precise about the scope

**Examples:**
- "This argument only applies when you have perfect information about outcomes"
- "This is true EXCEPT when the person is acting in self-defense"
- "This holds for most people, but not for those with severe mental illness"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 10. CLARIFICATION `💬` Cyan (#00FFFF)

**What it is:** Explanation or elaboration of what you meant. Removing ambiguity or misunderstanding about your position.

**When to use:**
- When someone misunderstood your position
- When you need to be more precise
- When explaining what you DON'T mean

**Examples:**
- "I don't mean that all punishment is wrong, just that capital punishment is disproportionate"
- "By 'helping' I mean providing asylum, not necessarily integration support"
- "I'm not saying refugees never cause problems, just that the benefits outweigh the costs"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 11. COUNTER-ARGUMENT `⚡` Red (#ff0000)

**What it is:** A direct response to an argument, presenting an alternative view, rebuttal, or opposing perspective.

**When to use:**
- When responding to someone else's argument
- When presenting the opposing side's perspective
- When showing why an argument is flawed or incomplete

**Examples:**
- "But you're ignoring the fact that inaction also has consequences"
- "That assumes utilitarianism is correct, but many reject it"
- "Studies show the opposite: countries with capital punishment have higher murder rates"

**Valid children:** Rebuttal, Counter-argument, Related Concept

**Terminal?** No

---

### 12. OBJECTION `✗` Dark Red (#8B0000)

**What it is:** A challenge, problem, or concern with a position or argument. Why it might not work or why it's problematic.

**When to use:**
- When pointing out a flaw or weakness
- When raising a concern about an argument
- When showing why something is problematic

**Examples:**
- "This ignores the psychological trauma of being forced to kill"
- "This assumes we have perfect information, which we don't"
- "This violates the principle of bodily autonomy"

**Valid children:** Rebuttal, Counter-argument, Related Concept

**Terminal?** No

---

### 13. REBUTTAL `✓` Dark Green (#006400)

**What it is:** A direct response to an objection or counter-argument, defending your original position.

**When to use:**
- When defending against an objection
- When responding to a counter-argument
- When showing why an objection doesn't work

**Examples:**
- "But the psychological trauma is outweighed by saving 5 lives"
- "We can make reasonable predictions even with imperfect information"
- "Bodily autonomy doesn't apply when someone else's life is at stake"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 14. ANALOGY `🔄` Magenta (#FF00FF)

**What it is:** A comparison to a similar situation to illustrate or support a point. Showing how a principle applies to different contexts.

**When to use:**
- When explaining a concept by comparison
- When showing how a principle applies to different contexts
- When making an abstract idea concrete

**Examples:**
- "This is like a doctor choosing between treating one patient or five"
- "Pulling the lever is like actively harming someone vs letting them be harmed"
- "This is analogous to the ship of Theseus problem"

**Valid children:** Objection, Counter-argument, Related Concept, Logical Fallacy

**Terminal?** No

---

### 15. THOUGHT EXPERIMENT `🧠` Lime (#00FF00)

**What it is:** A hypothetical scenario designed to test intuitions, explore implications, or challenge assumptions.

**When to use:**
- When testing whether a principle holds in edge cases
- When exploring the implications of a position
- When challenging someone's intuitions

**Examples:**
- "Imagine you had to choose between saving your child or 5 strangers"
- "What if the person on the track put themselves there intentionally?"
- "Suppose we could painlessly eliminate criminals—would that be justified?"

**Valid children:** Objection, Counter-argument, Related Concept, Logical Fallacy

**Terminal?** No

---

### 16. RELATED CONCEPT `🔗` Brown (#8B4513)

**What it is:** A connection to another idea, principle, philosophical concept, or field that's relevant to the discussion.

**When to use:**
- When linking to related philosophical concepts
- When showing how this connects to other domains
- When building a web of related ideas

**Examples:**
- "This connects to the concept of 'moral agency'"
- "This is related to the trolley problem"
- "This involves the principle of double effect"

**Valid children:** Objection, Counter-argument, Related Concept

**Terminal?** No

---

### 17. LOGICAL FALLACY `⛔` Crimson (#DC143C)

**What it is:** An error in reasoning or a flaw in an argument's logic. When an argument doesn't follow logically or uses faulty reasoning.

**When to use:**
- When identifying a flaw in reasoning
- When pointing out when an argument doesn't follow logically
- When showing why an argument is invalid

**Examples:**
- "This is a false dilemma—there are other options"
- "This commits the ad hominem fallacy—attacking the person instead of the argument"
- "This is circular reasoning—it assumes what it's trying to prove"

**Valid children:** Rebuttal, Counter-argument, Related Concept

**Terminal?** No

---

### 18. VALUE `⚓` Gold (#FFD700)

**What it is:** A fundamental principle or bedrock belief. Something considered intrinsically important and non-negotiable.

**When to use:**
- When you've traced an argument to its foundation
- When identifying what someone truly cares about
- When showing the value clash underlying a disagreement

**Examples:**
- "Minimize total suffering"
- "Never use a person merely as a means"
- "Maximize individual freedom"
- "Respect human dignity"

**Valid children:** None (TERMINAL NODE)

**Terminal?** **YES** ✓

---

### 19. PRINCIPLE `⚖` Silver (#C0C0C0)

**What it is:** A fundamental rule or guideline for action or reasoning. Similar to a value but more action-oriented and specific.

**When to use:**
- When establishing a rule that guides reasoning or action
- When stating a foundational guideline
- When referencing a well-known ethical or logical principle

**Examples:**
- "The principle of proportionality: punishment should match the crime"
- "The principle of double effect: an action with bad side effects can be justified if the good outweighs the bad"
- "The principle of non-interference: don't impose your values on others"

**Valid children:** None (TERMINAL NODE)

**Terminal?** **YES** ✓

---

### 20. EPISTEMIC LIMIT `∞` Purple (#9900cc)

**What it is:** The boundary of what we know or can know. An acknowledgment of uncertainty, limits of human knowledge, or unanswerable questions.

**When to use:**
- When an argument reaches a point where we simply don't know
- When acknowledging scientific uncertainty
- When admitting a question can't be answered with current knowledge

**Examples:**
- "That's our best current scientific theory (but it could be wrong)"
- "We don't know if consciousness is fundamental or emergent"
- "This depends on metaphysical questions we can't empirically answer"
- "We simply don't have enough data to know"

**Valid children:** None (TERMINAL NODE)

**Terminal?** **YES** ✓

---

## EDGE TYPES & SEMANTICS

### Edge Direction Gotcha

**CRITICAL:** Edge direction is semantic, not visual. The direction indicates the relationship type, not the visual flow.

| Edge Type | From | To | Meaning | Direction |
|-----------|------|-----|---------|-----------|
| **answers** | Position | Question | This position answers this question | Position → Question |
| **supports** | Evidence/Observation | Position/Argument | This supports that | Evidence → Position |
| **argues-for** | Argument (Support) | Position | This argument backs this position | Argument → Position |
| **argues-against** | Argument (Attack) | Position | This argument undermines this position | Argument → Position |
| **raises** | Argument | Question | This argument raises a deeper question | Argument → Question |
| **objects-to** | Objection | Argument | This objects to that argument | Objection → Argument |
| **rebuts** | Rebuttal | Objection | This rebuts that objection | Rebuttal → Objection |
| **grounds-in** | Argument | Value/Principle/Epistemic-limit | This bottoms out at this foundation | Argument → Terminal |
| **connects-to** | Any | Any | This relates to that concept | Bidirectional |
| **illustrates** | Analogy/Thought Experiment | Position/Argument | This illustrates that | Analogy → Position |

### Important Notes on Direction

1. **grounds-in edge:** The direction is Argument → Value/Principle/Epistemic-Limit. This means the argument "grounds in" (bottoms out at) the value. The value is the foundation.

2. **Visual vs Semantic:** In the tree view, nodes flow top-to-bottom visually, but edge direction is semantic (what the relationship means), not visual (which way the arrow points).

3. **Traversal:** When checking if a question is "fully grounded," traverse edges in the direction they point. An argument is grounded if it has an outgoing "grounds-in" edge.

---

## VISUAL HIERARCHY

### Tree Structure (Top to Bottom)

```
                    ROOT QUESTIONS (many)
                           ↓
                    POSITIONS (branch out)
                           ↓
              OBSERVATIONS & ARGUMENTS (expand)
                           ↓
                   CHILD QUESTIONS (narrow down)
                           ↓
                    MORE ARGUMENTS
                           ↓
                   BEDROCK VALUES (few)
```

### Node Display (NodeCard Component)

Each node displays:
- **Icon** (type-specific)
- **Type label** (e.g., "ARGUMENT (SUPPORT)")
- **Content** (the text)
- **Grounding badge** (if applicable)
- **Action buttons** (Edit, Delete, Add Child)

### Colors & Icons

| Type | Icon | Color | Hex |
|------|------|-------|-----|
| Question | ? | Blue | #0066cc |
| Position | ◆ | Grey | #666666 |
| Argument (Support) | + | Green | #00aa00 |
| Argument (Attack) | − | Red | #cc0000 |
| Evidence (Empirical) | 📊 | Teal | #008080 |
| Evidence (Anecdotal) | 📖 | Orange | #ff8800 |
| Assumption | ⚙ | Purple | #9900cc |
| Definition | 📝 | Indigo | #4B0082 |
| Caveat/Exception | ⚠ | Yellow | #ffcc00 |
| Clarification | 💬 | Cyan | #00FFFF |
| Counter-argument | ⚡ | Red | #ff0000 |
| Objection | ✗ | Dark Red | #8B0000 |
| Rebuttal | ✓ | Dark Green | #006400 |
| Analogy | 🔄 | Magenta | #FF00FF |
| Thought Experiment | 🧠 | Lime | #00FF00 |
| Related Concept | 🔗 | Brown | #8B4513 |
| Logical Fallacy | ⛔ | Crimson | #DC143C |
| Value | ⚓ | Gold | #FFD700 |
| Principle | ⚖ | Silver | #C0C0C0 |
| Epistemic Limit | ∞ | Purple | #9900cc |

---

## USER WORKFLOW

### Session 1: Answer Question 1 (Trolley Problem)

```
1. User clicks "New Question"
2. Enters: "Should you pull the lever?"
3. Adds POSITION: "Yes, pull the lever"
4. Adds ARGUMENT (Support): "Saving more lives is better"
5. Adds EVIDENCE (Empirical): "Pulling saves 5 lives vs 1"
6. Adds CAVEAT: "This assumes outcomes are predictable"
7. Raises QUESTION: "Why does saving lives matter?"
8. Adds POSITION: "Because minimizing suffering is the goal"
9. Adds ARGUMENT (Support): "Suffering is bad"
10. Grounds in VALUE (NEW): "Minimize total suffering"

Status: OPEN (other position not yet grounded)

11. User adds POSITION: "No, don't pull"
12. Adds ARGUMENT (Support): "Using people as means is wrong"
13. Grounds in VALUE (NEW): "Never use a person merely as a means"

Status: OPEN (two different values, not resolved)
```

### Session 2: Answer Question 2 (Refugees)

```
1. User clicks "New Question"
2. Enters: "Should we help refugees?"
3. Adds POSITION: "Yes, help them"
4. Adds ARGUMENT (Support): "We should minimize suffering"
5. Grounds in VALUE (EXISTING): "Minimize total suffering" ← REUSE!

Status: PARTIALLY GROUNDED (one position grounded)

6. User adds POSITION: "No, it's not our responsibility"
7. Adds ARGUMENT (Support): "Using our resources violates citizens' rights"
8. Grounds in VALUE (EXISTING): "Never use a person merely as a means" ← REUSE!

Status: FULLY GROUNDED (both positions grounded in existing values)
```

### Result

The graph now shows:
- 2 root questions
- 4 positions
- 4 arguments
- 2 bedrock values (reused across questions)
- **Convergence:** Different questions lead to the same values

---

## MANUAL INPUT SYSTEM

### Form 1: Create Root Question

```
┌─────────────────────────────────────────┐
│ START A NEW QUESTION TREE               │
├─────────────────────────────────────────┤
│                                         │
│ What question do you want to explore?   │
│ [________________________]               │
│ e.g., "Should you pull the lever?"      │
│                                         │
│ [Create Question]  [Cancel]             │
└─────────────────────────────────────────┘
```

### Form 2: Add Node (Type Selector)

```
┌──────────────────────────────────────────────┐
│ ADD A NODE                                   │
├──────────────────────────────────────────────┤
│ Parent: "Should you pull the lever?"         │
│ (QUESTION)                                   │
│                                              │
│ What type of node are you adding?            │
│ ┌──────────────────────────────────────────┐ │
│ │ ▼ Select Node Type                       │ │
│ │ • Position                               │ │
│ │ • Argument (Support)                     │ │
│ │ • Argument (Attack)                      │ │
│ │ • Evidence (Empirical)                   │ │
│ │ • Evidence (Anecdotal)                   │ │
│ │ • Assumption                             │ │
│ │ • Definition                             │ │
│ │ • Caveat / Exception                     │ │
│ │ • Clarification                          │ │
│ │ • Counter-argument                       │ │
│ │ • Objection                              │ │
│ │ • Rebuttal                               │ │
│ │ • Analogy                                │ │
│ │ • Thought Experiment                     │ │
│ │ • Related Concept                        │ │
│ │ • Logical Fallacy                        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [Type-specific input field appears]          │
│ [________________________]                   │
│                                              │
│ [Add Node]  [Cancel]                         │
└──────────────────────────────────────────────┘
```

### Type-Specific Input Prompts

| Node Type | Prompt | Placeholder |
|-----------|--------|-------------|
| Position | "What is your position/answer?" | "Yes, pull the lever" |
| Argument (Support) | "What is your reasoning?" | "Saving more lives is better" |
| Argument (Attack) | "What is your objection?" | "But pulling makes you a killer" |
| Evidence (Empirical) | "What data or study supports this?" | "Studies show 78% of refugees..." |
| Evidence (Anecdotal) | "What example or story illustrates this?" | "I knew a refugee who became..." |
| Assumption | "What assumption underlies this?" | "This assumes we can predict outcomes" |
| Definition | "How do you define this term?" | "By 'justice' I mean..." |
| Caveat / Exception | "What is the limitation or exception?" | "This only applies when..." |
| Clarification | "What do you need to clarify?" | "I don't mean that all punishment is wrong" |
| Counter-argument | "What is the counter-argument?" | "But you're ignoring..." |
| Objection | "What is the objection?" | "This ignores the psychological trauma" |
| Rebuttal | "How do you respond to this objection?" | "But the trauma is outweighed by..." |
| Analogy | "What analogy illustrates this?" | "This is like a doctor choosing between..." |
| Thought Experiment | "What hypothetical scenario tests this?" | "Imagine you had to choose between..." |
| Related Concept | "What concept does this relate to?" | "This connects to the principle of..." |
| Logical Fallacy | "What logical fallacy is this?" | "This is a false dilemma because..." |
| Value | "What is the bedrock value?" | "Minimize total suffering" |
| Principle | "What is the foundational principle?" | "The principle of proportionality" |
| Epistemic Limit | "What is the limit of knowledge?" | "We don't know if consciousness is..." |

### Context-Sensitive Dropdowns

**Under QUESTION:**
Position, Argument (Support), Argument (Attack), Evidence (Empirical), Evidence (Anecdotal), Assumption, Definition, Caveat, Clarification, Counter-argument, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy

**Under POSITION:**
Argument (Support), Argument (Attack), Evidence (Empirical), Evidence (Anecdotal), Assumption, Definition, Caveat, Clarification, Counter-argument, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy

**Under ARGUMENT:**
Question (drill deeper), Evidence (Empirical), Evidence (Anecdotal), Assumption, Definition, Caveat, Clarification, Objection, Rebuttal, Analogy, Thought Experiment, Related Concept, Logical Fallacy, Value, Principle, Epistemic Limit

**Under EVIDENCE:**
Objection, Counter-argument, Related Concept

**Under ASSUMPTION:**
Objection, Counter-argument, Definition, Related Concept

**Under DEFINITION:**
Objection, Counter-argument, Related Concept

**Under CAVEAT:**
Objection, Counter-argument, Related Concept

**Under CLARIFICATION:**
Objection, Counter-argument, Related Concept

**Under OBJECTION:**
Rebuttal, Counter-argument, Related Concept

**Under REBUTTAL:**
Objection, Counter-argument, Related Concept

**Under ANALOGY:**
Objection, Counter-argument, Related Concept, Logical Fallacy

**Under THOUGHT EXPERIMENT:**
Objection, Counter-argument, Related Concept, Logical Fallacy

**Under RELATED CONCEPT:**
Objection, Counter-argument, Related Concept

**Under LOGICAL FALLACY:**
Rebuttal, Counter-argument, Related Concept

**Under VALUE / PRINCIPLE / EPISTEMIC-LIMIT:**
(No children — these are terminal nodes)

### Edit & Delete Operations

**Edit Node:**
- Users can edit the content (text)
- Type cannot be changed (must delete and recreate)
- Grounding badges update automatically

**Delete Node:**
- Deletes the node and all descendants
- Shows warning: "This will delete X descendants"
- Cannot be undone

### Ground in Value (Special Form)

```
┌──────────────────────────────────────────────┐
│ GROUND THIS ARGUMENT IN A VALUE              │
├──────────────────────────────────────────────┤
│ Argument: "Suffering is bad"                 │
│                                              │
│ What bedrock value does this rest on?        │
│                                              │
│ ○ Create a NEW bedrock value                 │
│ ○ Link to an EXISTING bedrock value          │
│                                              │
│ [If NEW selected:]                           │
│ What is the bedrock value?                   │
│ [________________________]                   │
│ e.g., "Minimize total suffering"             │
│                                              │
│ [If EXISTING selected:]                      │
│ Choose an existing value:                    │
│ ┌──────────────────────────────────────────┐ │
│ │ • Minimize total suffering               │ │
│ │ • Never use a person merely as a means   │ │
│ │ • Maximize individual freedom            │ │
│ │ • Respect human dignity                  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [Ground in Value]  [Cancel]                  │
└──────────────────────────────────────────────┘
```

**Key Feature:** Users can link to existing values instead of creating duplicates. This enables convergence in the graph.

---

## IMPLEMENTATION STRUCTURE

```
/axiomer
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx              ← Main app page
│   │   ├── components/
│   │   │   ├── TreeView.tsx          ← Hierarchical tree display
│   │   │   ├── NodeCard.tsx          ← Individual node display
│   │   │   ├── AddNodeForm.tsx       ← Form for creating nodes
│   │   │   ├── Legend.tsx            ← Legend panel
│   │   │   └── ui/                   ← shadcn/ui components
│   │   ├── lib/
│   │   │   ├── graph.ts              ← Graph utilities
│   │   │   ├── types.ts              ← TypeScript types
│   │   │   └── seed.ts               ← Seed data
│   │   ├── hooks/
│   │   │   └── useGraph.ts           ← Graph state management
│   │   ├── App.tsx                   ← Routes & layout
│   │   ├── main.tsx                  ← React entry point
│   │   └── index.css                 ← Global styles
│   ├── public/
│   │   └── favicon.ico
│   └── index.html
├── package.json
└── vite.config.ts
```

---

## IMPLEMENTATION PHASES

### Phase 1: Data Model & Types (4 hours)

**Tasks:**
1. Define `NodeType` enum with all 20 types
2. Define `GraphNode`, `GraphEdge`, `Graph` interfaces
3. Create `types.ts` with all TypeScript definitions
4. Create `seed.ts` with Trolley Problem + Why is Sky Blue examples
5. Test data model with sample graph

**Deliverables:**
- `client/src/lib/types.ts` — Complete type definitions
- `client/src/lib/seed.ts` — Seed data

---

### Phase 2: Core Graph Utilities (6 hours)

**Tasks:**
1. Implement `getChildren(graph, nodeId)` — Get all child nodes
2. Implement `getParent(graph, nodeId)` — Get parent node
3. Implement `isFullyGrounded(graph, questionId)` — Check grounding status
4. Implement `getGroundingChain(graph, nodeId)` — Trace to terminal
5. Implement `addNode(graph, nodeType, content, parentId)` — Add node
6. Implement `deleteNode(graph, nodeId)` — Delete node + descendants
7. Implement `editNode(graph, nodeId, newContent)` — Edit content
8. Implement `linkToExistingValue(graph, argumentId, valueId)` — Link to value
9. Test all functions with seed data

**Deliverables:**
- `client/src/lib/graph.ts` — All graph utilities

---

### Phase 3: UI Components (8 hours)

**Tasks:**
1. Create `TreeView.tsx` — Recursive tree display with expand/collapse
2. Create `NodeCard.tsx` — Individual node with type icon, content, badge, buttons
3. Create `AddNodeForm.tsx` — Form with type selector and context-sensitive dropdowns
4. Create `Legend.tsx` — Panel showing all 20 node types
5. Create `Home.tsx` — Main page layout with TreeView + Legend
6. Wire up components to use graph utilities

**Deliverables:**
- `client/src/components/TreeView.tsx`
- `client/src/components/NodeCard.tsx`
- `client/src/components/AddNodeForm.tsx`
- `client/src/components/Legend.tsx`
- `client/src/pages/Home.tsx`

---

### Phase 4: State Management (4 hours)

**Tasks:**
1. Create `useGraph()` hook — Manage graph state with useState
2. Implement localStorage persistence — Save/load graph
3. Implement auto-save on every change
4. Handle graph updates from AddNodeForm, delete, edit operations
5. Test state management with all operations

**Deliverables:**
- `client/src/hooks/useGraph.ts` — Graph state hook
- localStorage integration in Home.tsx

---

### Phase 5: Styling & Polish (4 hours)

**Tasks:**
1. Apply colors to all 20 node types
2. Add icons to all node types
3. Style NodeCard with type label, icon, content, badge
4. Style TreeView with indentation and expand/collapse animations
5. Style Legend panel with type descriptions
6. Make responsive for mobile (TreeView, forms)
7. Add hover effects and transitions
8. Test on desktop and mobile

**Deliverables:**
- Updated CSS in `client/src/index.css`
- Responsive design verified

---

## CODE EXAMPLES

### Graph Utilities (graph.ts)

```typescript
// Check if a question is fully grounded
function isFullyGrounded(graph: Graph, questionId: string): boolean {
  const question = graph.nodes.find(n => n.id === questionId);
  if (!question || question.type !== "question") return false;

  // Get all positions that answer this question
  const positions = graph.edges
    .filter(e => e.to === questionId && e.edgeType === "answers")
    .map(e => graph.nodes.find(n => n.id === e.from))
    .filter(Boolean);

  // For each position, check if all argument chains are grounded
  for (const position of positions) {
    if (!isPositionFullyGrounded(graph, position!.id)) {
      return false;
    }
  }

  return positions.length > 0;
}

// Check if a position is fully grounded
function isPositionFullyGrounded(graph: Graph, positionId: string): boolean {
  // Get all arguments supporting/attacking this position
  const arguments = graph.edges
    .filter(e => e.to === positionId && (e.edgeType === "argues-for" || e.edgeType === "argues-against"))
    .map(e => graph.nodes.find(n => n.id === e.from))
    .filter(Boolean);

  // For each argument, check if it's grounded
  for (const arg of arguments) {
    if (!isArgumentFullyGrounded(graph, arg!.id)) {
      return false;
    }
  }

  return arguments.length > 0;
}

// Check if an argument is fully grounded
function isArgumentFullyGrounded(graph: Graph, argumentId: string): boolean {
  // Check if this argument has a grounds-in edge to a terminal node
  const groundsIn = graph.edges.find(
    e => e.from === argumentId && e.edgeType === "grounds-in"
  );

  if (groundsIn) {
    const terminal = graph.nodes.find(n => n.id === groundsIn.to);
    return terminal && (terminal.type === "value" || terminal.type === "principle" || terminal.type === "epistemic-limit");
  }

  // Check if this argument raises a child question
  const raisesQuestion = graph.edges.find(
    e => e.from === argumentId && e.edgeType === "raises"
  );

  if (raisesQuestion) {
    // Check if the child question is fully grounded
    return isFullyGrounded(graph, raisesQuestion.to);
  }

  // If no grounds-in and no raises, it's not grounded
  return false;
}

// Add a new node
function addNode(
  graph: Graph,
  nodeType: NodeType,
  content: string,
  parentId: string
): Graph {
  const newNode: GraphNode = {
    id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: nodeType,
    content,
    createdAt: new Date().toISOString()
  };

  // Determine edge type based on parent and child types
  let edgeType: EdgeType = "connects-to"; // default
  
  if (parentId && nodeType === "position") {
    edgeType = "answers";
  } else if (parentId && (nodeType === "argument-support" || nodeType === "argument-attack")) {
    edgeType = nodeType === "argument-support" ? "argues-for" : "argues-against";
  } else if (parentId && nodeType.startsWith("evidence")) {
    edgeType = "supports";
  }

  const newEdge: GraphEdge = {
    id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from: newNode.id,
    to: parentId,
    edgeType
  };

  return {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges, newEdge]
  };
}

// Delete a node and all descendants
function deleteNode(graph: Graph, nodeId: string): Graph {
  // Find all descendants
  const descendants = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.add(current);

    // Find all children
    const children = graph.edges
      .filter(e => e.to === current)
      .map(e => e.from);

    queue.push(...children);
  }

  // Remove all nodes and edges related to descendants
  return {
    nodes: graph.nodes.filter(n => !descendants.has(n.id)),
    edges: graph.edges.filter(e => !descendants.has(e.from) && !descendants.has(e.to))
  };
}

// Link an argument to an existing value
function linkToExistingValue(
  graph: Graph,
  argumentId: string,
  valueId: string
): Graph {
  // Remove any existing grounds-in edge from this argument
  const filtered = graph.edges.filter(
    e => !(e.from === argumentId && e.edgeType === "grounds-in")
  );

  // Add new grounds-in edge
  const newEdge: GraphEdge = {
    id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from: argumentId,
    to: valueId,
    edgeType: "grounds-in"
  };

  return {
    nodes: graph.nodes,
    edges: [...filtered, newEdge]
  };
}
```

### React Hook (useGraph.ts)

```typescript
import { useState, useEffect } from "react";
import { Graph } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
import * as GraphUtils from "@/lib/graph";

export function useGraph() {
  const [graph, setGraph] = useState<Graph>(() => {
    // Load from localStorage or use seed data
    const stored = localStorage.getItem("axiomer_graph");
    return stored ? JSON.parse(stored) : seedGraph;
  });

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("axiomer_graph", JSON.stringify(graph));
  }, [graph]);

  const addNode = (nodeType: string, content: string, parentId: string) => {
    setGraph(prev => GraphUtils.addNode(prev, nodeType as any, content, parentId));
  };

  const deleteNode = (nodeId: string) => {
    setGraph(prev => GraphUtils.deleteNode(prev, nodeId));
  };

  const editNode = (nodeId: string, newContent: string) => {
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, content: newContent } : n
      )
    }));
  };

  const linkToExistingValue = (argumentId: string, valueId: string) => {
    setGraph(prev => GraphUtils.linkToExistingValue(prev, argumentId, valueId));
  };

  return {
    graph,
    addNode,
    deleteNode,
    editNode,
    linkToExistingValue
  };
}
```

### TreeView Component (TreeView.tsx)

```typescript
import { useState } from "react";
import { Graph, GraphNode } from "@/lib/types";
import NodeCard from "./NodeCard";
import * as GraphUtils from "@/lib/graph";

interface TreeViewProps {
  graph: Graph;
  onAddNode: (nodeType: string, content: string, parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string, newContent: string) => void;
  onLinkToValue: (argumentId: string, valueId: string) => void;
}

export default function TreeView({
  graph,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onLinkToValue
}: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: GraphNode, depth: number = 0) => {
    const children = GraphUtils.getChildren(graph, node.id);
    const isExpanded = expandedNodes.has(node.id);
    const isFullyGrounded = GraphUtils.isFullyGrounded(graph, node.id);

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          onClick={() => children.length > 0 && toggleExpanded(node.id)}
          style={{ cursor: children.length > 0 ? "pointer" : "default" }}
        >
          {children.length > 0 && (
            <span>{isExpanded ? "▼" : "▶"}</span>
          )}
          <NodeCard
            node={node}
            isFullyGrounded={isFullyGrounded}
            onEdit={(content) => onEditNode(node.id, content)}
            onDelete={() => onDeleteNode(node.id)}
            onAddChild={(type, content) => onAddNode(type, content, node.id)}
            onLinkToValue={(valueId) => onLinkToValue(node.id, valueId)}
          />
        </div>
        {isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  // Get root nodes (questions with no parent)
  const rootNodes = graph.nodes.filter(n => {
    const hasParent = graph.edges.some(e => e.from === n.id);
    return n.type === "question" && !hasParent;
  });

  return (
    <div className="tree-view">
      {rootNodes.map(node => renderNode(node))}
    </div>
  );
}
```

---

## SEED DATA

### Example 1: Trolley Problem (OPEN)

```typescript
const trolleyProblem: Graph = {
  nodes: [
    {
      id: "trolley-q1",
      type: "question",
      content: "Should you pull the lever?"
    },
    {
      id: "trolley-p1",
      type: "position",
      content: "Yes, pull the lever"
    },
    {
      id: "trolley-a1",
      type: "argument-support",
      content: "Saving more lives is better"
    },
    {
      id: "trolley-e1",
      type: "evidence-empirical",
      content: "Pulling saves 5 lives vs 1"
    },
    {
      id: "trolley-c1",
      type: "caveat",
      content: "This assumes the trolley will definitely hit someone"
    },
    {
      id: "trolley-q2",
      type: "question",
      content: "Why does saving lives matter?"
    },
    {
      id: "trolley-p2",
      type: "position",
      content: "Because minimizing suffering is the goal"
    },
    {
      id: "trolley-a2",
      type: "argument-support",
      content: "Suffering is bad"
    },
    {
      id: "trolley-v1",
      type: "value",
      content: "Minimize total suffering"
    },
    {
      id: "trolley-p3",
      type: "position",
      content: "No, don't pull the lever"
    },
    {
      id: "trolley-a3",
      type: "argument-support",
      content: "Using people as means is wrong"
    },
    {
      id: "trolley-v2",
      type: "value",
      content: "Never use a person merely as a means"
    }
  ],
  edges: [
    {
      id: "edge-1",
      from: "trolley-p1",
      to: "trolley-q1",
      edgeType: "answers"
    },
    {
      id: "edge-2",
      from: "trolley-a1",
      to: "trolley-p1",
      edgeType: "argues-for"
    },
    {
      id: "edge-3",
      from: "trolley-e1",
      to: "trolley-a1",
      edgeType: "supports"
    },
    {
      id: "edge-4",
      from: "trolley-c1",
      to: "trolley-a1",
      edgeType: "connects-to"
    },
    {
      id: "edge-5",
      from: "trolley-a1",
      to: "trolley-q2",
      edgeType: "raises"
    },
    {
      id: "edge-6",
      from: "trolley-p2",
      to: "trolley-q2",
      edgeType: "answers"
    },
    {
      id: "edge-7",
      from: "trolley-a2",
      to: "trolley-p2",
      edgeType: "argues-for"
    },
    {
      id: "edge-8",
      from: "trolley-a2",
      to: "trolley-v1",
      edgeType: "grounds-in"
    },
    {
      id: "edge-9",
      from: "trolley-p3",
      to: "trolley-q1",
      edgeType: "answers"
    },
    {
      id: "edge-10",
      from: "trolley-a3",
      to: "trolley-p3",
      edgeType: "argues-for"
    },
    {
      id: "edge-11",
      from: "trolley-a3",
      to: "trolley-v2",
      edgeType: "grounds-in"
    }
  ]
};
```

**Status:** OPEN (two different values at bottom, not resolved)

### Example 2: Why is the Sky Blue? (FULLY GROUNDED)

```typescript
const skyBlue: Graph = {
  nodes: [
    {
      id: "sky-q1",
      type: "question",
      content: "Why is the sky blue?"
    },
    {
      id: "sky-p1",
      type: "position",
      content: "Because of Rayleigh scattering"
    },
    {
      id: "sky-e1",
      type: "evidence-empirical",
      content: "Shorter wavelengths scatter more"
    },
    {
      id: "sky-a1",
      type: "argument-support",
      content: "Scattering intensity is proportional to wavelength^-4"
    },
    {
      id: "sky-q2",
      type: "question",
      content: "Why is it proportional to wavelength^-4?"
    },
    {
      id: "sky-p2",
      type: "position",
      content: "That's derived from Maxwell's equations"
    },
    {
      id: "sky-el1",
      type: "epistemic-limit",
      content: "That's our best current scientific theory"
    }
  ],
  edges: [
    {
      id: "edge-1",
      from: "sky-p1",
      to: "sky-q1",
      edgeType: "answers"
    },
    {
      id: "edge-2",
      from: "sky-e1",
      to: "sky-p1",
      edgeType: "supports"
    },
    {
      id: "edge-3",
      from: "sky-a1",
      to: "sky-p1",
      edgeType: "argues-for"
    },
    {
      id: "edge-4",
      from: "sky-a1",
      to: "sky-q2",
      edgeType: "raises"
    },
    {
      id: "edge-5",
      from: "sky-p2",
      to: "sky-q2",
      edgeType: "answers"
    },
    {
      id: "edge-6",
      from: "sky-p2",
      to: "sky-el1",
      edgeType: "grounds-in"
    }
  ]
};
```

**Status:** FULLY GROUNDED (all chains reach epistemic limit)

---

## ACCEPTANCE CRITERIA

### V1 Acceptance Checklist

- [ ] All 20 node types render with correct icons and colors
- [ ] Users can create root questions via "New Question" button
- [ ] Users can add nodes of any type under valid parents
- [ ] Type selector dropdown works and shows context-sensitive options
- [ ] Nodes display with type label, icon, and content
- [ ] Grounding badges (FULLY GROUNDED / OPEN) compute correctly
- [ ] Users can edit node content (not type)
- [ ] Users can delete nodes (with warning for descendants)
- [ ] Users can link arguments to existing values (no duplicates)
- [ ] Graph persists in localStorage
- [ ] Legend panel displays all 20 types with descriptions and examples
- [ ] Tree view is responsive (mobile-friendly)
- [ ] Seed data (Trolley Problem + Sky Blue) loads on first visit
- [ ] All workflows from manual input guide work end-to-end

---

## GETTING STARTED FOR CLAUDE CODE

### Step 1: Read This Document

You're reading it! This is the complete spec.

### Step 2: Review the Project Structure

The project is already initialized at `/home/ubuntu/axiomer` with:
- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- shadcn/ui components
- All dependencies installed

### Step 3: Implement in Phases

Follow the 5 phases above in order:
1. Phase 1: Data model (4 hours)
2. Phase 2: Graph utilities (6 hours)
3. Phase 3: UI components (8 hours)
4. Phase 4: State management (4 hours)
5. Phase 5: Styling & polish (4 hours)

**Total: ~26 hours of work**

### Step 4: Test Against Acceptance Criteria

Use the 14-point checklist above to verify everything works.

### Step 5: Create Checkpoint & Push to GitHub

Once V1 is complete:
1. Create a checkpoint in Manus
2. Push to disguide/Axiomer on GitHub

---

## IMPORTANT NOTES

1. **Edge Direction Gotcha:** The direction of edges is semantic, not visual. Read the edge types section carefully.

2. **Terminal Nodes:** VALUE, PRINCIPLE, and EPISTEMIC-LIMIT nodes cannot have children. Don't allow adding children to these nodes.

3. **Cumulative Building:** The power of Axiomer is users answering multiple questions and linking to existing values. Make sure this feature works perfectly.

4. **Grounding Calculation:** The `isFullyGrounded()` function is critical. It needs to traverse all argument chains and check if they reach terminal nodes.

5. **Type Selector:** When users create a node, they MUST select a type. The dropdown should be context-sensitive (different options based on parent node type).

6. **Seed Data:** Include both examples (Trolley Problem + Why is Sky Blue) so users see the system in action on first load.

7. **Mobile Responsive:** The tree view should work on phones. Consider how to handle expand/collapse on small screens.

8. **No Backend in V1:** Everything is localStorage. No API calls, no database. Keep it simple.

---

**AXIOMER V1 IS READY TO BUILD!**

For Claude Code: Start with Phase 1 (data model), then proceed sequentially through all 5 phases.

Good luck! 🚀
