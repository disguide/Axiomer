# Project & Agent Infrastructure Analysis Report

**Investigator**: Explorer Project & Agent Infrastructure (`explorer_arch_1`)  
**Target Project**: Axiomer (C:\Users\arthu\projects\Axiomer)  
**Date**: 2026-08-22  
**Scope**: Requirements R3, R4, and Project/Agent Acceptance Criteria

---

## Executive Summary

Axiomer has a solid foundation for its local-first argument mapping engine, featuring pure graph logic (`client/src/lib/graph.ts`), TypeScript 5.8 + React 19 + Vite 6 build setup, and Vitest test runner. All current checks (`npm run typecheck`, `npm test`, `npm run build`) pass cleanly.

However, several critical gaps must be addressed to fulfill requirements R3, R4 and the Acceptance Criteria:
1. **MCP Server Package (`mcp/`)**: Missing entirely. Needs a dedicated MCP server package implementing the 7 standard tools (`get_graph`, `get_children`, `get_roots`, `get_grounding_gaps`, `get_acceptability`, `get_value_clashes`, `propose_node`) wired to the pure graph engine, with automated Vitest tests.
2. **`llms.txt` Agent Discovery Index**: Missing from `client/public/` and the project root. Needs a comprehensive Markdown discovery index describing Axiomer's ontology, graph algorithms, MCP tools, and data formats.
3. **Project & Branch Management**: `useProjects.ts` supports project creation and branch coordinate tracking, but lacks branch deletion, project deletion, and branch-switching UI in `Home.tsx` / `Dashboard.tsx`.
4. **Markdown Import & Schema Validation**: Markdown export (`exportGraphToMarkdown`) is implemented, but Markdown import (`importGraphFromMarkdown`) with schema validation is missing.
5. **Static Read-Only Viewer Data**: `client/public/graph.json` contains legacy 22-type schema. While runtime migration handles it, updating the canonical public file to modern 10-node schema ensures direct validation.
6. **TypeScript & Vitest Configuration**: Configs currently target only `client/src`. They must be updated to include `mcp/` for typechecking and test execution.

---

## 1. Project Management, Branching & Local Storage (Requirement R3)

### Current Implementation
- **Data Models** (`client/src/lib/projectTypes.ts:1-25`):
  ```ts
  export interface Branch {
    id: string;
    name: string;
    graphId: string;
    position: { x: number; y: number };
    createdAt: number;
    updatedAt: number;
  }
  export interface Project {
    id: string;
    name: string;
    color?: string;
    branches: Branch[];
    edges: ProjectEdge[];
    createdAt: number;
    updatedAt: number;
  }
  ```
- **Project Store** (`client/src/hooks/useProjects.ts:1-145`):
  - LocalStorage Key: `axiomer_projects`
  - Starter Project: `id: "starter"`, `branches: [{ id: "examples", name: "Two worked examples", graphId: "starter" }]`.
  - Methods provided: `createProject`, `updateProjectColor`, `createBranch`, `getProject`, `getBranch`, `moveBranch`, `connectBranches`.
- **Graph Store** (`client/src/hooks/useGraph.ts:1-140`):
  - LocalStorage Key: `axiomer_graph_${graphId}`
  - Auto-saves whenever the graph changes in authoring mode (`!readOnly`).
  - Default graphs: `graphId === "starter" || graphId === "default"` loads `seedGraph`; other graph IDs start with empty graph `{ nodes: [], edges: [] }`.

### Identified Gaps & Action Items
- **Missing Deletion Operations**: `useProjects.ts` lacks `deleteProject(projectId)` and `deleteBranch(projectId, branchId)`. Also when a branch or project is deleted, orphaned `axiomer_graph_${graphId}` entries should be cleaned up.
- **UI Gaps**: `Dashboard.tsx` allows creating maps (`createProject`) and listing all branches, but has no controls to rename, delete, or duplicate projects/branches. `Home.tsx` has no branch switcher or branch creation UI in the toolbar.
- **Branch Graph Isolation**: Newly created branches in `createBranch` allocate a unique `graphId: generateId()` and initialize empty, which is correct for branch isolation.

---

## 2. URL Hash Sharing, Export/Import & Public Read-Only Mode (Requirement R3)

### URL Hash Sharing
- **Compression Mechanism**:
  - `Home.tsx:78-86`: `LZString.compressToEncodedURIComponent(JSON.stringify(graph))` creates a URL with `#tree=${compressed}`.
  - `useGraph.ts:16-27`: On initialization, if `window.location.hash.startsWith("#tree=")`, it decompresses with `LZString.decompressFromEncodedURIComponent`, parses JSON, migrates the schema (`migrateGraph`), and cleans the URL with `window.history.replaceState`.
- **Finding**: URL hash compression and decompression work cleanly and seamlessly preserve full graph state. A dedicated unit test for URL hash round-tripping should be added.

### Export & Import Validation
- **JSON Export & Import**:
  - `client/src/lib/io.ts:14-74`:
    - `exportGraph(graph)`: serializes graph to JSON.
    - `validateGraph(value)`: validates object shape, node array, edge array, node types (`NODE_TYPES`), edge types (`EDGE_TYPES`), and referential integrity (ensuring every edge `from` and `to` matches an existing node). Throws descriptive errors.
    - `parseGraph(text)`: strict JSON parser wrapping `validateGraph`.
  - `ExportModal.tsx:1-122`: Dual-tab export modal supporting JSON download/copy and Markdown download/copy.
- **Markdown Export**:
  - `client/src/lib/markdown.ts:8-60`: `exportGraphToMarkdown(graph)` traverses roots downward, generating formatted Markdown lists with type tags like `### [CLAIM]` and `- **[SUPPORT]**`.
- **Identified Gap - Markdown Import**:
  - Acceptance criterion 38 states: *"Graph export and import handle valid JSON and Markdown formats with comprehensive schema validation."*
  - Currently, `markdown.ts` only implements export. No Markdown parser (`importGraphFromMarkdown` / `parseMarkdownGraph`) exists.
  - UI in `Home.tsx:131` only accepts `.json` files (`accept=".json"`).
  - **Recommendation**: Implement `parseMarkdownGraph(text: string): Graph` that parses indented Markdown bullet trees (e.g. `### [CLAIM] ...`, `- **[SUPPORT]** ...`) into nodes and semantic edges, with full validation. Update `Home.tsx` file input to accept `.json,.md`.

### Static Public Read-Only Viewer Mode (`VITE_PUBLIC_READONLY`)
- **Architecture**:
  - Build flag: `npm run build:viewer` sets `VITE_PUBLIC_READONLY=1`.
  - `client/src/lib/dataSource.ts:13-20`: `isReadOnly()` checks `import.meta.env.VITE_PUBLIC_READONLY === "1"`. `loadCanonicalGraph()` fetches `${import.meta.env.BASE_URL}graph.json` and runs `validateGraph`.
  - `useGraph.ts:67-116`: In read-only mode, mutators become no-ops (`noop`), and local storage persistence is disabled.
  - `Home.tsx`: Suppresses authoring triggers, edit inputs, and reset actions while preserving graph viewing, pan/zoom, node selection, search, outline view, and export modal.
- **Canonical Graph (`client/public/graph.json`)**:
  - Currently uses legacy 22-type schema (`question`, `position`, `argument-support`, etc.). While `migrateGraph` transforms it at load time, updating `client/public/graph.json` to canonical 10-node ontology (`claim`, `support`, `note`, `value`, `limit`) improves clarity and standardizes the public payload.

---

## 3. Agent Legibility & MCP Server (Requirement R4)

### Current State
- `mcp/` directory: **Does not exist**.
- `llms.txt`: **Does not exist**.

### Required MCP Architecture (`mcp/`)
The MCP server must expose 7 tools wrapping pure graph operations:

| Tool Name | Parameters | Pure Graph Engine Function | Description |
|---|---|---|---|
| `get_graph` | `{ graphId?: string, format?: "json" \| "summary" }` | `getNode`, `getGraphStats` | Returns the entire graph or a structural summary with counts and depth |
| `get_children` | `{ nodeId: string }` | `getChildren(graph, nodeId)` | Returns all child nodes connected beneath `nodeId` |
| `get_roots` | `{}` | `getRoots(graph)` | Returns all top-level entry points (claims and premises) |
| `get_grounding_gaps` | `{}` | `getGroundingGaps(graph)` | Returns ungrounded arguments sorted shallowest-first by depth |
| `get_acceptability` | `{}` | `getAcceptability(graph)` | Returns acceptability mapping (`coherent`, `conflicted`, `contested`) |
| `get_value_clashes` | `{}` | `getValueClashes(graph)` | Returns root questions with competing terminal values |
| `propose_node` | `{ parentId: string, type: NodeType, content: string }` | `addNode(graph, type, content, parentId)` | Proposes a new child node with inferred edge type |

### MCP Implementation Design Blueprint
1. **Package Setup**:
   - `mcp/package.json` or root package export.
   - Entry point `mcp/index.ts` / `mcp/server.ts` utilizing Model Context Protocol stdio transport (or `@modelcontextprotocol/sdk`).
2. **Decoupled Architecture**:
   - MCP tools load graph data from canonical `client/public/graph.json` or local memory, delegating all operations to `client/src/lib/graph.ts`.
3. **Automated Testing**:
   - Vitest suite `mcp/server.test.ts` to test tool handlers and validation.

---

## 4. Agent Discovery Index: `llms.txt` (Requirement R4)

### Required Placement
- `client/public/llms.txt` (served by Vite at `/llms.txt` and copied to `dist/llms.txt` during build).
- Also mirrored at root `llms.txt` for direct repo visibility.

### Required Content Specification
1. **System Identity**: Axiomer local-first argument mapping & coherence engine.
2. **Epistemic Ontology**:
   - 5 Structural Node Types: `claim`, `premise`, `support`, `conflict`, `note`.
   - 5 Terminal Foundation Types: `value`, `source`, `limit`, `bedrock`, `preference`.
   - 5 Semantic Edge Types: `supports`, `conflicts`, `annotates`, `grounds`, `cites`.
3. **Graph Evaluation Algorithms**:
   - Grounding rules (`isFullyGrounded`, `isNodeGrounded`).
   - Acceptability / defeat analysis (Dung-style argumentation semantics).
   - Value convergence & value clash detection.
4. **Tool Interfaces & Formats**:
   - MCP tools specification and schema.
   - JSON export/import schema.
   - Markdown list format.

---

## 5. Build, Test & TypeScript Configuration Verification

### Current Status Verification
| Command | Result | Details |
|---|---|---|
| `npm run typecheck` | ✅ PASSED (Code 0) | `tsc -b --noEmit` exits with 0 diagnostics |
| `npm test` | ✅ PASSED (Code 0) | 2 test files, 52 passed tests (46 in `graph.test.ts`, 6 in `io.test.ts`) |
| `npm run build` | ✅ PASSED (Code 0) | Production bundle built to `../dist` in 5.36s |

### Required Configuration Adjustments for MCP and New Features
1. **`tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`**:
   - Create `tsconfig.mcp.json` or update `tsconfig.json` to include `"mcp/**/*"` so `npm run typecheck` validates the MCP server code.
2. **`vitest.config.ts`**:
   - Update `include` array from:
     ```ts
     include: ["src/**/*.{test,spec}.ts", "client/src/**/*.{test,spec}.ts"]
     ```
     to:
     ```ts
     include: ["src/**/*.{test,spec}.ts", "client/src/**/*.{test,spec}.ts", "mcp/**/*.{test,spec}.ts"]
     ```
3. **`package.json`**:
   - Add `"mcp"` or `"start:mcp"` script (e.g. `"mcp": "tsx mcp/index.ts"` or `"mcp": "node dist/mcp/index.js"`).
   - Ensure devDependencies/dependencies include `@modelcontextprotocol/sdk` (or standalone JSON-RPC handler) if needed.

---

## Summary of Actionable Implementation Tasks

```text
1. [MCP Server]
   - Create `mcp/server.ts` & `mcp/tools.ts` implementing the 7 specified tools.
   - Create `mcp/server.test.ts` covering all tools with 100% pass rate.
   - Add `mcp` scripts and tsconfig support.

2. [Agent Discovery Index]
   - Create `client/public/llms.txt` and root `llms.txt`.

3. [Markdown Import & Schema Validation]
   - Implement `parseMarkdownGraph` in `client/src/lib/markdown.ts`.
   - Add Markdown import unit tests in `client/src/lib/io.test.ts` / `markdown.test.ts`.
   - Update file upload handling in `Home.tsx` to support `.md` files.

4. [Project & Branch Workflows]
   - Add `deleteProject` and `deleteBranch` in `client/src/hooks/useProjects.ts`.
   - Add branch management and switching UI.

5. [Canonical Graph Modernization]
   - Update `client/public/graph.json` to modern 10-node / 5-edge ontology.
```
