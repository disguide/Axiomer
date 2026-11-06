# Working on Axiomer

The current product direction is value-first, map-first reasoning with clean node-by-node reading and branching. This file and README supersede older specifications, including mandatory types, terminal values, static viewer flags and outline-first UX. Preserve historical docs as evidence, not current requirements.

## Product rules

- Begin with a human value; add a reason, then another connected step. A chosen path is readable and ordered; the overall map supports many branches, depth and shared nodes.
- One expanded thought at a time. Minimal controls; whole-map overview, guided navigation and simple authoring.
- Labels are optional and may be assigned after writing. No required ontology knowledge or forced terminal nodes.
- AI is a drafting assistant. Every proposed node/connection requires Approve/Edit/Reject. AI review, publication and acceptance of a reader correction are distinct actions.
- Free core use, open-source code, visible version history and PR-style corrections. Never claim a well-structured map proves truth.
- 100+ nodes are a baseline ambition, not a limit. Do not claim Wikipedia scalability from local tests.

## Architecture

- React 19/TypeScript/Vite, React Flow lazily loaded in `client/src/roadmap/Canvas.tsx`.
- `client/src/roadmap/Workbench.tsx`: current app shell and journeys. `App.tsx` mounts it.
- `client/src/roadmap/model.ts`: schema v2, optional kinds, navigation links, iterative DAG validation/index/layout, AI proposal validation, graph diffs and legacy import.
- Legacy edge meaning/direction is retained in `semantic`; navigation projection is separate. Do not silently turn semantic evidence into proven conclusions.
- `Review.tsx`: readable old/new node, source, relationship, original-semantic and branch-order diffs; conflict version previews. Never hide a semantic-only change.
- `model.ts` proposal updates use three-way item comparisons and explicit conflict choices. Validate merged graphs; never silently prune a broken link or auto-publish the result.
- `layoutStorage.ts`: device-local per-draft spatial arrangement, separate from graph meaning, shared revisions and exports. Treat arbitrary imported IDs as data with own-property guards; a view-only save must not clear pending AI review.
- `storage.ts`: atomic draft/review snapshot at `axiomer.roadmaps.v2`; old keys untouched. Active draft and proposal-update provenance recover with the saved work. Corrupt data must not be silently overwritten.
- `server/app.mjs`: Node24 built-ins, SQLite, scrypt passwords, hashed session tokens, immutable full revisions, optimistic base checks and owner-reviewed proposals. Additive proposal-history columns link superseded/updated requests; only their author can submit an update against the latest head. No provider key storage/logging.
- `scripts/dev.mjs` starts Vite + API. `npm start` serves built UI + API.
- Old `pages`, `hooks`, `components` and `lib` modules are retained for migration/reference and their existing tests; they are not the current UI.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:server`, `npm run test:browser` and `npm run test:whiteboard` (requires Chromium; `CHROMIUM_PATH` overrides `/usr/bin/chromium`). Meaningful browser workflows cover editing, branching, AI review recovery, ownership/proposals/history and deep map navigation. Provider fixture tests are not proof of live inference.

## Release constraints

See docs/ANTIGRAVITY_HANDOFF.md for the GitHub source branch, setup, known defects and verification scope. Historical release reports describe their original local-only snapshots. Do not imply deployment or Wikipedia-scale performance. Colab Calendar and the recurring discovery task remain outside this manual implementation scope.
