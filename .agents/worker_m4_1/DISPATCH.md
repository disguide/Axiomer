## 2026-08-22T15:48:53Z
Implement Milestone M4 (Modern UI/UX Refactor & Layout Polish):
1. **Strict 2-Row Header & Toolbar Architecture (`client/src/pages/Home.tsx`)**:
   - Refactor top bar into:
     - **Row 1 (Global Header)**: Brand logo/name, Project & Branch switcher (with branch count pill, new branch button, delete branch/project controls), Map / Outline view switcher, Share Link button (LZ-string URL copy), Help modal trigger, and Read-only badge if `VITE_PUBLIC_READONLY` is set.
     - **Row 2 (Contextual Action Toolbar)**: Primary `+ New Thought` button, Global Search input with `/` hotkey badge, Fit Map View button, Zoom In/Out controls, Thought counter badge, and Epistemic status pill.
2. **Responsive Outline View (`client/src/components/ArgumentView.tsx`)**:
   - Fix mobile horizontal squeezing and single-character line wraps on small screens (< 390px):
     - Use responsive indentation (`pl-2.5 sm:pl-6`) with capped maximum indent.
     - Adjust row action buttons (`Pencil`, `Trash2`) so they do not compress node text into narrow columns on mobile.
     - Enforce `break-words [overflow-wrap:anywhere]` across all thought cards and text blocks.
3. **Map Canvas & Node Rendering Polish (`client/src/components/GraphMap.tsx`, `client/src/components/FlowNode.tsx`)**:
   - Fix terminal node negative top margins (`-mt-4`) to standard flex flow layout without text collisions.
   - Synchronize Dagre layout dimensions in `client/src/lib/flowLayout.ts` with `FlowNode.tsx` styles.
   - Ensure smooth pan/zoom, fluid node selection, search jumping, inspector bottom sheet responsiveness, and inline authoring.
4. **Calm 6-Family Design Tokens & Standard Icons (`client/src/index.css`)**:
   - Enforce calm 6-family color tokens and frosted glass surfaces (`bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm`).
   - Use pure Lucide SVGs with uniform stroke width and sizing (zero decorative emojis).
5. **Verification**:
   - Run `npm test`, `npm run typecheck`, and `npm run build`. Ensure 0 errors.
6. **Handoff**:
   - Write your handoff report to `C:\Users\arthu\projects\Axiomer\.agents\worker_m4_1\handoff.md`.
   - Send a message to orchestrator with results when complete.
