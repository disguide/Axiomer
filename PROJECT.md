# Project: Axiomer Elevation

## Architecture
Axiomer is a local-first argument mapping and coherence engine that makes the logical derivation of beliefs down to terminal foundations visible and verifiable.
The architecture is structured as follows:
- **Pure Epistemic Graph Engine** (`client/src/lib/types.ts`, `client/src/lib/graph.ts`): Functional, purely decoupled graph data structures, 10-node ontology, 5 semantic edge types, recursive grounding verification (`isFullyGrounded`, `isNodeGrounded`), and Dung acceptability conflict evaluation.
- **Serialization & I/O** (`client/src/lib/io.ts`, `client/src/lib/markdown.ts`): Bidirectional JSON and Markdown export/import with schema validation, LZ-string URL hash compression/decompression.
- **Project & State Management** (`client/src/hooks/useProjects.ts`, `client/src/hooks/useGraph.ts`): Local-first project/branch management, local storage persistence, read-only viewer mode (`VITE_PUBLIC_READONLY`).
- **Agent Legibility & MCP Server** (`mcp/`, `client/public/llms.txt`, `llms.txt`): Standalone Model Context Protocol server exposing 7 pure graph query and reasoning tools, along with standard `llms.txt` index.
- **Modern UI/UX Layer** (`client/src/pages/Home.tsx`, `client/src/components/`): Strict 2-row header/toolbar, responsive Map/Outline views, calm 6-family styling, frosted glass design tokens, standard Lucide SVGs, mobile-optimized ergonomics.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 10-Node Ontology & 5 Edge Types | Canonical node/edge model and allowed child rules | M1 | ORIGINAL_REQUEST §R2 |
| 2 | Multi-Hop Recursive Grounding | Grounding evaluation across nested support chains and position claims | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Dung Acceptability & Conflict Evaluation | Computing grounded extension, defeat sets, and value clashes | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Decoupled Ontology Rules | Extract `ALLOWED_CHILDREN` and ontology helpers to pure types/lib | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Source Citation Grounding | Integrate terminal `source` citations via `cites` edges | M1 | ORIGINAL_REQUEST §R2 |
| 6 | Project & Branch Lifecycle | Full project/branch switching, creation, color updates, and deletion | M2 | ORIGINAL_REQUEST §R3 |
| 7 | Bidirectional JSON & Markdown I/O | Schema-validated JSON and Markdown import/export | M2 | ORIGINAL_REQUEST §R3 |
| 8 | URL Hash Sharing & Public Readonly | Compressed URL share links and static read-only viewer mode | M2 | ORIGINAL_REQUEST §R3 |
| 9 | MCP Server Implementation | 7 MCP tools wrapping pure graph engine in `mcp/` | M3 | ORIGINAL_REQUEST §R4 |
| 10 | Agent Discovery Index | Standardized `llms.txt` at public root and repo root | M3 | ORIGINAL_REQUEST §R4 |
| 11 | Strict 2-Row Header & Toolbar | Row 1 (Nav/Branding/Share) + Row 2 (Action Toolbar/Search) | M4 | ORIGINAL_REQUEST §R1 |
| 12 | Responsive Outline View | Mobile-optimized indentation without single-character line wraps | M4 | ORIGINAL_REQUEST §R1 |
| 13 | Smooth Map Canvas & Layout Sync | Synchronized dagre layout, fluid pan/zoom, terminal node layout fix | M4 | ORIGINAL_REQUEST §R1 |
| 14 | Calm 6-Family Design Tokens | Standardized Lucide SVGs, frosted glass surfaces, anti-slop tokens | M4 | ORIGINAL_REQUEST §R1 |
| 15 | E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite across all features | E2E Track | ORIGINAL_REQUEST §Acceptance Criteria |
| 16 | 100% E2E Verification & Adversarial Hardening | E2E pass + Tier 5 white-box coverage hardening | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Epistemic Engine & Ontology Decoupling | `client/src/lib/types.ts`, `client/src/lib/graph.ts`, `graph.test.ts` | none | DONE |
| M2 | Project Management & Bidirectional I/O | `useProjects.ts`, `markdown.ts`, `io.ts`, `io.test.ts` | M1 | IN_PROGRESS |
| M3 | Agent Legibility & MCP Server | `mcp/`, `llms.txt`, `client/public/llms.txt`, `tsconfig`, `vitest.config.ts` | M1 | IN_PROGRESS |
| M4 | Modern UI/UX Refactor & Layout Polish | `Home.tsx`, `ArgumentView.tsx`, `GraphMap.tsx`, `FlowNode.tsx`, `index.css` | M1, M2 | PLANNED |
| M5 | Final Milestone (100% E2E Pass + Adversarial Hardening) | Whole project verification, Tier 1-4 E2E test pass, Tier 5 hardening | M1, M2, M3, M4, E2E Track | PLANNED |
| E2E | E2E Testing Track | Test harness, test runners, Tier 1-4 tests (`TEST_READY.md`) | none (Parallel) | DONE |


## Interface Contracts

### Epistemic Engine ↔ UI & MCP
- `ALLOWED_CHILDREN: Record<NodeType, NodeType[]>` exported from `types.ts` or `graph.ts` (zero React/JSX dependencies).
- `isFullyGrounded(graph: Graph, rootId?: string): boolean`
- `isNodeGrounded(graph: Graph, nodeId: string): boolean`
- `getGroundingGaps(graph: Graph): { ungroundedClaims: string[]; ungroundedArguments: string[] }`
- `getAcceptability(graph: Graph, rootId: string): AcceptabilityResult`
- `getValueClashes(graph: Graph): ValueClash[]`
- `edgeTypeFor(childType: NodeType, parentType: NodeType): EdgeType`
- `validateGraph(data: unknown): Graph`

### Markdown I/O Contract
- `exportGraphToMarkdown(graph: Graph): string`
- `parseMarkdownGraph(markdown: string): Graph` (or `parseMarkdownToGraph`)

### MCP Server Contract
- Transport: stdio JSON-RPC.
- Tools: `get_graph`, `get_children`, `get_roots`, `get_grounding_gaps`, `get_acceptability`, `get_value_clashes`, `propose_node`.

## Code Layout
- `client/src/lib/types.ts`: Ontology node types, edge types, graph interfaces, allowed children rules.
- `client/src/lib/graph.ts`: Pure graph operations, grounding, acceptability, layout helpers.
- `client/src/lib/io.ts`: JSON export/import and schema validation.
- `client/src/lib/markdown.ts`: Markdown serialization and parsing.
- `client/src/hooks/useProjects.ts`: Project and branch management, storage persistence.
- `client/src/hooks/useGraph.ts`: Graph state management and synchronization.
- `client/src/pages/Home.tsx`: Main application shell, 2-row header/toolbar, view switching.
- `client/src/components/ArgumentView.tsx`: Outline view, responsive tree authoring.
- `client/src/components/GraphMap.tsx`: React Flow map canvas, pan/zoom, inspector, search.
- `client/public/llms.txt`, `llms.txt`: Agent discovery indices.
- `mcp/`: Standalone MCP server implementation and tests.
- `tests/e2e/`: Opaque-box E2E test suite.
