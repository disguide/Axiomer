# Original User Request

## 2026-08-22T04:31:30Z

Axiomer is a local-first argument mapping and coherence engine that makes the logical derivation of beliefs down to terminal foundations (values, sources, limits, bedrock, preferences) visible and verifiable. This project comprehensively elevates Axiomer: modernizing its UI/UX to clean anti-slop standards, aligning features with documentation (branching, dual Map/Outline views, grounding & conflict resolution), perfecting sharing/export, and providing agent legibility via a dedicated MCP server and llms.txt.

Working directory: C:\Users\arthu\projects\Axiomer
Integrity mode: development

## Requirements

### R1. Modern UI/UX & Layout Architecture
Refactor the interface to adhere to modern design and anti-AI-slop standards: strict 2-row header/toolbar layout, calm 6-family color system, zero decorative emoji icons, standardized Lucide SVG iconography with uniform stroke weight and sizing, frosted glass surface styling, responsive mobile layout, smooth canvas pan/zoom, and non-blocking inline authoring.

### R2. Epistemic Engine & Ontology Coherence
Maintain strict compliance with the 10-node ontology (5 structural: claim, premise, support, conflict, note; 5 terminal: value, source, limit, bedrock, preference), semantic edge types, grounding verification, and conflict detection across both Map and Outline views. Keep graph algorithms pure and decoupled from the UI.

### R3. Project Management, Branching & Sharing
Deliver robust project and branch workflows, persistent local storage, compressed URL hash sharing, validated JSON and Markdown export/import, and static public read-only viewer mode.

### R4. Agent Legibility & MCP Server
Provide an independent Model Context Protocol (MCP) server wrapping pure graph operations (querying nodes, inspecting grounding gaps, computing acceptability, detecting value clashes, and proposing candidate nodes) alongside an `llms.txt` discovery index at the web root.

## Acceptance Criteria

### Frontend & UI
- [ ] Header and toolbar follow a strict 2-row layout with clear visual hierarchy and zero decorative emoji icons (pure Lucide SVGs).
- [ ] Outline and Map views render smoothly without layout wrapping bugs or single-character line wraps on small screens.
- [ ] Map canvas supports fluid pan, zoom, node selection, inspection, search jumping, and inline authoring.

### Epistemic Engine & Logic
- [ ] All 10 node types and 5 edge types strictly adhere to semantic edge directions and allowed child rules.
- [ ] Grounding (`isFullyGrounded` / `isNodeGrounded`) and acceptability conflict evaluation are computed accurately and updated in real time.
- [ ] Pure graph logic in `client/src/lib/graph.ts` remains decoupled from presentation and network layers.

### Persistence & Sharing
- [ ] Graphs save reliably to local storage and support project/branch switching, creation, and deletion.
- [ ] Graph export and import handle valid JSON and Markdown formats with comprehensive schema validation.
- [ ] URL hash sharing generates loadable compressed graph links.
- [ ] Public read-only mode (`VITE_PUBLIC_READONLY`) properly disables editing controls while preserving full exploration.

### Agent Legibility
- [ ] A dedicated MCP server package under `mcp/` implements tools (`get_graph`, `get_children`, `get_roots`, `get_grounding_gaps`, `get_acceptability`, `get_value_clashes`, `propose_node`) using the pure graph engine.
- [ ] `llms.txt` is served at the public root to provide structured metadata for AI agents.

### Verification & Automated Testing
- [ ] `npm run typecheck` passes with 0 TypeScript diagnostics.
- [ ] `npm test` executes Vitest test suites with 100% passing tests covering pure graph utilities, import/export, and MCP tools.
- [ ] `npm run build` generates a production-ready client bundle without warnings or errors.
