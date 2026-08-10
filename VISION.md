# Axiomer — Vision & Purpose

## What Is Axiomer?

Axiomer is a coherence engine and a shared, GitHub-style platform for philosophy. It exists to map the logical derivation of your beliefs from your foundational values.

It is **not** a debate platform. In Axiomer, arguments are not "won" or "lost" through adversarial attack and defense. An argument is objectively right or wrong *relative to the values it is built on*. The platform forces you to trace every belief down to its ultimate foundation, revealing whether your conclusions actually cohere with your stated values.

By mapping your worldviews this way, Axiomer aims to maximize the general human good by **stopping people from making decisions against themselves** and their own core values.

---

## Why It Matters

### The Goal is Coherence, Not Debate
- **Adversarial debate is broken.** Arguing to "win" obscures truth. Axiomer rejects attack/defense mechanics entirely. Instead, you map derivations. If a conclusion logically follows from a value, it is coherent. If it contradicts it, it is a conflict that must be resolved.
- **You are likely contradicting yourself.** People hold positions that violate their own underlying values because they have never formally mapped the derivation. Axiomer makes these internal conflicts structurally visible.
- **You don't know what you actually value.** Most people cannot answer "why do you believe that?" more than two or three times. Axiomer forces you to keep going until you hit a named foundation: a fact, a value, a preference, or an honest admission of uncertainty.

### GitHub for Worldviews
- **Auto-corrective collaboration.** Axiomer is like GitHub for philosophy. You map your reasoning tree and share it. If someone spots a logical inconsistency between your conclusions and your stated values, they can submit a "Pull Request" (PR) to your graph.
- **Shared philosophical infrastructure.** When hundreds of derivations across different topics all trace down to the same bedrock value — say, "maximize human well-being" — that convergence becomes visible. You can see the philosophical DNA of a community.
- **Honest divergence.** When two people disagree, it's usually because they start from different values. Axiomer makes the exact point of divergence visible, moving the conversation from surface-level arguing to foundational understanding.

### Your Philosophical Profile
- You hold hundreds of positions, but you've never mapped what drives them. Axiomer aggregates the terminal nodes you consistently reach across all your arguments to reveal your foundational worldview.
- You can take a **baseline questionnaire** to seed your profile with starting positions (e.g., "I am utilitarian," "I am atheist").
- When starting a new argument, you can **pull from your profile** — reusing established values and premises rather than rediscovering them every time. This creates massive convergence across your entire body of reasoning.

---

## How It Works

### Getting started

**You start with a blank canvas.** That's it. No templates, no wizards, no forced structure.

1. **Drop a block.** Write whatever is on your mind — a claim, a gut feeling, a fact.
2. **Derive and support.** Add the reasons and evidence that support it.
3. **Connect them.** Draw a line from one block to another.
4. **Type them.** Label each block with what it actually is — a Claim, a Support, a Conflict, a Value, a Bedrock.
5. **Go deeper.** Keep asking "why?" and "what supports this?" until every branch of your tree hits a terminal — a point where you genuinely cannot go any further.
6. **Share & Review.** Publish your tree. Others can view it, fork it, and submit PRs to fix logical inconsistencies.

What Axiomer *does* enforce is that your tree must eventually bottom out. Every floating idea is flagged as ungrounded until you trace it to a terminal.

### Two ways to view the same data

- **Map View**: A free-flowing 2D canvas where you spatially arrange blocks and draw connections. Think visual whiteboard. Good for exploring structure.
- **Tree View**: A hierarchical, nested document view of the same data. Good for reading, writing, and inline editing.

### Projects and Branches

Your work is organized into **Projects** (a topic or domain) and **Branches** (different angles or versions within a project). Each branch is its own coherence graph.

---

## The Node System

### Argument layers (structural — the derivation)

| Type | Purpose | Example |
|---|---|---|
| **Claim** | A question, position, or statement you're exploring | "We should automate labor" |
| **Premise** | A foundational assumption you reason forward from | "Automation increases total resource abundance" |
| **Support** | Evidence or logic that bridges a claim to its foundation | "Historical data on technological revolutions" |
| **Conflict** | A logical inconsistency or contradiction in the derivation | "This contradicts the value of finding meaning in work" |
| **Note** | Context, clarification, caveat, or annotation | "Assuming universal basic income is implemented" |

### Terminal layers (the foundation — you cannot go deeper)

| Type | What It Means | Example |
|---|---|---|
| **Bedrock** | An undeniable fact. You cannot argue past this. | "I think, therefore I am." |
| **Value** | A moral or ethical anchor you hold as intrinsically important. | "Maximize human well-being." |
| **Preference** | A subjective desire or personal inclination. Honestly stated. | "I prefer quiet over excitement." |
| **Limit** | The boundary of what can be known. An admission of uncertainty. | "We cannot directly experience another's consciousness." |
| **Source** | A citation or external reference grounding a factual claim. | "WHO 2024 report." |

---

## Architecture & Design Philosophy (Developer Context)

To maintain the vision of Axiomer, all future development must adhere to the following technical and UX principles.

### Tech Stack
- **Core:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS v4.
- **Routing:** `wouter`.
- **Canvas:** `@xyflow/react` (React Flow) for the spatial map view.
- **Animations:** `framer-motion` for smooth transitions.
- **State:** `localStorage` (V1), built to eventually sync with a backend.

### Design Aesthetic: "Clean Apple Glassmorphism"
Axiomer strictly avoids the look of generic, stale whiteboards. The UI must feel premium, structural, and clean.
- Use high-quality frosted glass effects (`backdrop-blur`), subtle shadows, rounded cards, and clean typography.
- Use smooth micro-animations for interactions. Iconography is strictly standardized using `lucide-react`.

### UX & Core Rules
1. **The Software is a Pure Tool (Like Obsidian):** The software itself does NOT give feedback, critique, or nag the user. It is a canvas. It does not block, it does not clutter, and it does not judge. Any "coaching" or "critique" will be handled by a separate AI layer in the future. The base tool must remain completely unopinionated and friction-free.
2. **No jarring browser dialogs.** Never use `prompt()` or `alert()`.
3. **Inline interactions.** Node creation, editing, and linking must happen via smooth inline text inputs seamlessly integrated into the canvas or tree view. Avoid heavy, full-screen modals whenever possible.
4. **Keep the ontology tight.** The node system is deliberately constrained to exactly 10 highly-focused types (5 structural, 5 terminal). The simplicity is a feature.
