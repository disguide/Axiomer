# UI/UX Investigation & Refactoring Analysis

**Explorer**: Explorer UI/UX (explorer_ui_1)  
**Date**: 2026-08-22  
**Target**: Requirement R1 (Modern UI/UX & Layout Architecture) & Design Standards  
**Status**: Read-Only Analysis Complete  

---

## 1. Executive Summary

Axiomer's frontend is built with React 19, TypeScript, Vite, Tailwind CSS 4, @xyflow/react (React Flow), and dagre. The current UI already adheres to important product principles (clean typography, zero decorative emojis, pure Lucide icons, responsive modals), but exhibits key layout and architectural deficiencies that violate modern SaaS/Studio design guidelines and Requirement R1:

1. **Header/Toolbar Fragmentation**: The top bar uses a single cramped row (Home.tsx:90) combined with detached, floating overlay controls on the map canvas (GraphMap.tsx:268). This violates the **strict 2-row layout architecture** mandated by modern-ui-design/SKILL.md and R1.
2. **Outline View Mobile Squeezing & Single-Character Line Wraps**: Deeply nested nodes in ArgumentView.tsx:86 accumulate recursive left padding (pl-4 sm:pl-6), plus card padding, icon width, and fixed action buttons (Pencil, Trash2), causing text width on mobile screens (< 390px) to collapse to < 80px, producing severe single-character line wraps.
3. **Map Canvas Pill Text Overlapping & Dimension Mismatches**: In GraphMap.tsx:95, terminal nodes employ a fragile negative top-margin (ml-6 -mt-4 text-xs) to force text inline next to the icon/label, which causes text collision when labels or content wrap. Additionally, flowLayout.ts specifies node bounding boxes (240x80, 200x36, 220x48) that slightly diverge from FlowNode rendered widths (250, 210, 225).
4. **Frosted Glass Styling Consistency**: While CSS theme variables exist in index.css, several surfaces use opaque white or raw Tailwind backdrops instead of cohesive frosted glass tokens (bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm).
5. **Calm 6-Family Color Palette & Iconography**: The 10 ontology node types are mapped to 6 calm semantic families with Lucide SVGs, but require uniform stroke weights (1.75 / 2) and consistent sizing tokens across all components.

---

## 2. Detailed Findings & Gap Analysis

### 2.1 Header & Toolbar Layout (Requirement R1, AC-1)

#### Current Implementation
- **client/src/pages/Home.tsx:90–133**:
  Single row header containing:
  - Left: Back link (ArrowLeft), divider, GitFork icon, Project name, Branch name, thought counter.
  - Right: Grounded/Open pills ({stats.groundedClaims} grounded, {stats.openClaims} open), View switcher (Map / Outline), Help button (HelpCircle), Menu dropdown (Menu).
- **client/src/components/GraphMap.tsx:268–292**:
  Floating overlay widget placed at absolute left-3 top-3 z-10 containing:
  - Search input with inline dropdown (Search, X, ChevronRight).
  - Add root button (Plus).
  - Fit map button (fitView).

#### Deficiencies Identified
- **Violates Strict 2-Row Rule**: Global navigation, project identity, view switching, statistics, search, root thought creation, and canvas controls are fragmented between a single header row and floating canvas overlays.
- **Inconsistent Across Views**: When switching to Outline view, the floating search bar and Fit Map controls disappear entirely. Outline view lacks search functionality.
- **Mobile Clutter**: The floating search bar and buttons on the map collide with canvas nodes and the mobile inspector bottom sheet (GraphMap.tsx:306).
- **Menu Dropdown Icon**: Uses hamburger Menu instead of standard contextual overflow icon (MoreHorizontal / ...).

#### Target Refactored Architecture (Strict 2-Row Top Bar)
Consolidate into a unified 2-row layout in Home.tsx:
`
+---------------------------------------------------------------------------------------------------------+
| ROW 1: BRANDING & GLOBAL NAVIGATION (Height: 48px–52px)                                                 |
| [← Back] [GitFork] [Project Name / Branch]      [Map ⊞ | Outline ≡]      [Grounded Pill] [Share] [···] |
+---------------------------------------------------------------------------------------------------------+
| ROW 2: ACTION TOOLBAR & CONTEXTUAL CONTROLS (Height: 42px–46px)                                         |
| [+ New Thought] | [🔍 Find a thought...  (/)]   |   [Fit View ⛶] [Zoom - / +]   |   [X Thoughts]         |
+---------------------------------------------------------------------------------------------------------+
`

1. **Row 1 (Global Header)**:
   - **Left**: Dashboard back arrow (ArrowLeft), Axiomer brand icon (GitFork), Project name & Branch switcher chip.
   - **Center**: Segmented primary navigation control (Map / Outline) with clear active pill styling (bg-white shadow-xs text-slate-950).
   - **Right**: Epistemic summary badge (X grounded, Y open, Z conflicted), Quick Share link (Share2), Help Guide modal trigger (HelpCircle), More options menu (MoreHorizontal with Export JSON/MD, Import JSON, Reset to starter).
2. **Row 2 (Action Toolbar)**:
   - **Left**: Contextual Primary Action (+ New Thought button opening the starting thought composer) + Search input with / hotkey badge (works across both Map and Outline views).
   - **Center**: Epistemic health indicator / Filter / Active Thought lineage indicator.
   - **Right**: Canvas utilities when in Map mode (Fit Map, Zoom In/Out, Minimap toggle) or Outline utilities when in Outline mode (Expand/Collapse All).

---

### 2.2 Outline View & Responsive Wrapping (Requirement R1, AC-2)

#### Current Implementation
- **client/src/components/ArgumentView.tsx:86–148**:
  Recursive component rendering:
  - Indentation: `depth === 0 ? "mb-9" : "relative mt-3 pl-4 sm:pl-6"`.
 - Node card: flex items-start gap-3, icon h-7 w-7, title/content min-w-0 flex-1.
 - Actions: flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 with Pencil and Trash2.

#### Deficiencies Identified
- **Nesting Compounding**: Left padding accumulates recursively (pl-4 sm:pl-6). At depth 4+, mobile padding consumes > 64px.
- **Fixed Width Row Squeeze**: Inside the card row, the icon (28px) + gap (12px) + action buttons (64px) + card padding (24px) = 128px of non-text width.
- **Single-Character Line Wrapping**: On a 360px viewport, 360 - 32 - 64 - 128 = 136px of remaining width, which easily causes long words or sentences to wrap single letters or look severely squeezed.
- **Action Buttons Always Visible on Mobile**: Action buttons use opacity-100 sm:opacity-0, meaning they permanently consume horizontal space on mobile devices.

#### Target Refactoring Steps
1. **Responsive Indentation**:
 - Use pl-2.5 sm:pl-6 with capped visual nesting (e.g., maximum indent step or stepped margin ml-2 sm:ml-4).
2. **Mobile Action Relocation**:
 - Place edit/delete actions on mobile in a secondary row beneath the content or behind a subtle ... touch target, reserving 100% of the flex row width for text content.
3. **Word Wrapping & Breakage**:
 - Add break-words [overflow-wrap:anywhere] to the paragraph and textarea elements so long terms, chemical names, and URLs never overflow or cause awkward breaks.
4. **Visual Hierarchy**:
 - Use subtle vertical guide lines (border-l border-slate-200/80) with soft node card borders and smooth hover backgrounds.

---

### 2.3 Map Canvas, Pan/Zoom & Inspector (Requirement R1, AC-3)

#### Current Implementation
- Canvas uses @xyflow/react with BackgroundVariant.Dots, MiniMap, and Controls.
- FlowNode renders nodes conditionally based on root / terminal / intermediate.
- Lineage highlighting dims non-ancestor / non-descendant nodes and displays animated labels on active edges.
- Inspector <aside> renders on node selection.

#### Deficiencies Identified
1. **Brittle Negative Margins in FlowNode (GraphMap.tsx:95)**:
 Terminal nodes use -mt-4 ml-6 to attempt positioning text inline with the icon, causing text clipping and overlapping on multi-line content.
2. **Dagre vs FlowNode Dimension Mismatch (flowLayout.ts vs GraphMap.tsx:80)**:
 - flowLayout.ts: root = 240x80, terminal = 200x36, intermediate = 220x48.
 - GraphMap.tsx: root width = 250, terminal width = 210, intermediate width = 225.
 - Discrepancy causes dagre layout coordinates to center handles slightly off-target.
3. **Inspector Mobile Ergonomics (GraphMap.tsx:306)**:
 - On mobile, max-sm:bottom-3 max-sm:max-h-[54%] leaves little room for canvas manipulation when a node is selected.
 - Needs a clean bottom sheet header with drag handle / dismiss button and smooth scrolling.
4. **Search Jumping Usability**:
 - Currently lives in a floating box on the map. Moving it to Row 2 toolbar makes it accessible via keyboard shortcut / across the whole app.

---

### 2.4 Calm 6-Family Color System & Iconography Standards

#### Ontology to Visual Family Mapping
The 10 ontology node types map cleanly to 6 color families:

| Color Family | Node Types | Hex Accent | Tailwind Light Surface | Semantic Meaning |
|---|---|---|---|---|
| **Claim Family** (Blue) | claim | #2563eb | bg-blue-50/80 text-blue-700 border-blue-200 | The thought, question, or proposition being explored |
| **Premise Family** (Violet) | premise | #7c3aed | bg-violet-50/80 text-violet-700 border-violet-200 | Foundational assumption or axiom |
| **Support Family** (Emerald) | support | #059669 | bg-emerald-50/80 text-emerald-700 border-emerald-200 | Reasoning, evidence, data supporting parent |
| **Conflict Family** (Rose) | conflict | #e11d48 | bg-rose-50/80 text-rose-700 border-rose-200 | Contradiction, objection, or counter-argument |
| **Context Family** (Slate) | note | #64748b | bg-slate-50/80 text-slate-700 border-slate-200 | Clarification, caveat, or definition |
| **Foundation Family** (Warm Grounding Anchors) | value, bedrock, source, limit, preference | Warm accents (#b45309, #4f46e5, #0d9488, #94a3b8, #ec4899) | bg-amber-50/80, bg-indigo-50/80, bg-teal-50/80, etc. | Terminal foundations where derivation terminates |

#### Iconography Standardization
- **Zero Raw Emojis**: Confirmed 0 raw emojis in buttons, tabs, headers, or node cards.
- **Lucide SVG Sizing & Weight**:
 - Node card icons: h-4 w-4 with uniform strokeWidth={2}.
 - Toolbar & Header icons: h-4 w-4 or h-3.5 w-3.5 with strokeWidth={1.75}.
 - Action buttons: h-3.5 w-3.5 with strokeWidth={2}.

---

### 2.5 Frosted Glass Styling & Design Tokens

Update and unify frosted glass tokens in client/src/index.css:
`css
@theme {
 --color-canvas: #f7f7f4;
 --color-glass: rgba(255, 255, 255, 0.82);
 --color-glass-solid: rgba(255, 255, 255, 0.94);
 --blur-glass: 12px;
 --blur-glass-heavy: 24px;
 --radius-card: 12px;
 --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}
`
Apply unified frosted glass classes:
- Header & Toolbar: bg-white/80 backdrop-blur-md border-b border-slate-200/80
- Inspector Panel: bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl
- Modals & Overlays: bg-white/85 backdrop-blur-2xl border border-white/60 shadow-2xl
- Canvas Controls: bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs

---

## 3. Concrete Refactoring Steps for Implementation

1. **client/src/pages/Home.tsx**:
 - Refactor header into **Row 1** (Logo, Project/Branch info, Map/Outline view switcher, Grounded status pill, Share, Guide, More Menu) and **Row 2** (Primary + New Thought button, Search Input with hotkey /, Fit Map, Canvas Zoom controls, Stats).
 - Pass global search query and focused node down to GraphMap and ArgumentView.
 - Wire search matching across both Map and Outline views.

2. **client/src/components/GraphMap.tsx**:
 - Remove floating search box and floating toolbar from canvas; receive toolbar actions (fitView, search focus) from parent.
 - Refactor FlowNode:
 - Fix terminal node layout: render icon and label horizontally, followed by clean content text below (no negative margins).
 - Align node dimensions exactly with flowLayout.ts constants (230x76 for intermediate, 250x84 for root, 210x52 for terminal).
 - Refactor Inspector:
 - Polish frosted glass backdrop and border hierarchy.
 - Add clean touch-friendly mobile bottom sheet handling.

3. **client/src/components/ArgumentView.tsx**:
 - Refactor indentation logic: use pl-2.5 sm:pl-6 with capped depth for narrow screens.
 - On mobile (max-sm), place node edit/delete actions below content or in a non-intrusive action bar so text content retains 100% column width.
 - Add break-words [overflow-wrap:anywhere] on all text content blocks.
 - Support search filtering / highlight jumping when query is provided from Row 2 toolbar.

4. **client/src/lib/flowLayout.ts**:
 - Synchronize dimension constants (MAP_NODE_WIDTH, MAP_NODE_HEIGHT) with FlowNode styles.

5. **client/src/lib/meta.tsx**:
 - Verify all 10 NODE_META entries use consistent Lucide icon sizes (h-4 w-4) and clear accessible contrast colors.

6. **client/src/index.css**:
 - Polish frosted glass custom theme properties and utility classes.

---

## 4. Verification Plan

1. **Automated Verification**:
 - Run npm run typecheck (ensure 0 TypeScript diagnostics).
 - Run npm test (ensure 100% passing tests in graph.test.ts and io.test.ts).
 - Run npm run build (ensure production bundle generates without errors).
2. **Visual & Responsive Verification**:
 - Test Desktop viewport (1440x900): Verify strict 2-row layout, search focus (/), fit view, node inspection, and outline reading.
 - Test Mobile viewport (375x812 / 390x844): Verify zero single-character line wraps in Outline view, no overflowing or clipped node cards on Map view, and smooth bottom sheet inspector behavior.