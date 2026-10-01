# Handoff Report: Project & Agent Infrastructure

**Agent**: Explorer Project & Agent Infrastructure (`explorer_arch_1`)  
**Working Directory**: `C:\Users\arthu\projects\Axiomer\.agents\explorer_arch_1`  
**Target Project**: Axiomer (`C:\Users\arthu\projects\Axiomer`)  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

1. **Build and Test Scripts Status**:
   - `npm run typecheck` executes `tsc -b --noEmit` and completed with exit code 0 and 0 diagnostics.
   - `npm test` executes `vitest run` and completed with exit code 0 (2 test files, 52 passed tests across `graph.test.ts` and `io.test.ts`).
   - `npm run build` executes `tsc -b && vite build` and succeeded in 5.36s outputting to `../dist`.
2. **Persistence and Local Storage**:
   - `client/src/hooks/useProjects.ts:4` uses `const PROJECTS_STORAGE_KEY = "axiomer_projects"`.
   - `client/src/hooks/useGraph.ts:89-94` uses `localStorage.setItem("axiomer_graph_" + graphId, JSON.stringify(graph))`.
   - `client/src/hooks/useProjects.ts:51-143` provides `createProject`, `updateProjectColor`, `createBranch`, `getProject`, `getBranch`, `moveBranch`, `connectBranches`, but has no `deleteProject` or `deleteBranch` functions.
3. **URL Sharing & Compression**:
   - `client/src/pages/Home.tsx:78-79` generates share links using `LZString.compressToEncodedURIComponent(JSON.stringify(graph))` with `#tree=${compressed}`.
   - `client/src/hooks/useGraph.ts:16-25` parses and loads `#tree=` URL hashes with `LZString.decompressFromEncodedURIComponent`, migrates them via `migrateGraph(parsed)`, and clears the hash via `window.history.replaceState`.
4. **Export and Import**:
   - `client/src/lib/io.ts:14-74` exports formatted JSON and validates imported JSON via `validateGraph`, checking nodes, types, edges, edge types, and referential integrity.
   - `client/src/lib/markdown.ts:8-60` exports graph structure to Markdown (`exportGraphToMarkdown`).
   - Markdown import parser (`parseMarkdownGraph` / `importGraphFromMarkdown`) is **missing** from `client/src/lib/markdown.ts` and `client/src/lib/io.ts`.
   - `client/src/pages/Home.tsx:131` restricts file upload to `accept=".json"`.
5. **Static Public Read-Only Viewer**:
   - `package.json:9` defines `"build:viewer": "tsc -b && VITE_PUBLIC_READONLY=1 vite build"`.
   - `client/src/lib/dataSource.ts:13-20` checks `import.meta.env.VITE_PUBLIC_READONLY === "1"` and fetches `${import.meta.env.BASE_URL}graph.json`.
   - `client/src/hooks/useGraph.ts:67-116` disables editing mutators (replaces with `noop`) and disables local storage saving in read-only mode.
   - `client/public/graph.json` contains a valid graph with trolley and sky blue examples in legacy format (migrated on load).
6. **Agent Legibility (MCP Server & llms.txt)**:
   - `mcp/` directory does not exist (`find_by_name` returned 0 results).
   - `client/public/llms.txt` and root `llms.txt` do not exist (`find_by_name` returned 0 results).
7. **TypeScript & Vitest Configs**:
   - `vitest.config.ts:13` includes only `["src/**/*.{test,spec}.ts", "client/src/**/*.{test,spec}.ts"]`.
   - `tsconfig.app.json:27` includes only `["client/src"]`.

---

## 2. Logic Chain

1. **From Observation 1**: The baseline codebase builds and passes all existing tests cleanly, confirming no syntax or type regressions in the pure graph or UI engine.
2. **From Observation 2**: While project and branch data structures exist and persist to `localStorage`, the absence of `deleteProject` and `deleteBranch` in `useProjects.ts` and missing UI controls in `Dashboard.tsx` / `Home.tsx` prevents users from fully managing and cleaning up projects/branches as required by AC 37 ("support project/branch switching, creation, and deletion").
3. **From Observation 3**: URL hash sharing via `lz-string` is functionally sound and decouples sharing from backend servers.
4. **From Observation 4**: JSON export/import has strict schema validation, but Markdown import is completely absent, failing AC 38 ("Graph export and import handle valid JSON and Markdown formats with comprehensive schema validation").
5. **From Observation 5**: Static public viewer mode (`VITE_PUBLIC_READONLY`) cleanly disables state mutation while fetching `graph.json`, fulfilling AC 40.
6. **From Observation 6**: MCP server package and `llms.txt` must be created from scratch to fulfill requirement R4, AC 43, and AC 44.
7. **From Observation 7**: Once `mcp/` is created, `tsconfig` and `vitest.config.ts` must be updated so that typechecking and automated testing encompass the MCP server tools without separate disjoint configurations.

---

## 3. Caveats

- **Network-free MCP Execution**: The MCP server should be implemented using pure standard stdio JSON-RPC transport or `@modelcontextprotocol/sdk` to run standalone with zero external network dependencies.
- **Markdown Importer Tree Ambiguity**: Markdown list indentation can have varying spacing (2 spaces vs 4 spaces, tabs). The parser should normalize leading indentation levels robustly.

---

## 4. Conclusion

The existing Axiomer codebase has high-quality core graph mathematics, clean local storage hooks, and active Vitest tests. To complete requirements R3 & R4 and achieve 100% Acceptance Criteria compliance:

1. **Implement `mcp/`**: Build MCP server with tools `get_graph`, `get_children`, `get_roots`, `get_grounding_gaps`, `get_acceptability`, `get_value_clashes`, `propose_node`, and write a Vitest suite in `mcp/server.test.ts`.
2. **Add `llms.txt`**: Place structured agent metadata index at `client/public/llms.txt` and `llms.txt`.
3. **Implement Markdown Import**: Create `parseMarkdownGraph` with schema validation in `client/src/lib/markdown.ts`, add test cases in `io.test.ts`, and update file picker in `Home.tsx`.
4. **Enhance Project/Branch Management**: Add `deleteProject` and `deleteBranch` to `useProjects.ts`, with project/branch management controls in UI.
5. **Modernize `client/public/graph.json`**: Update static public graph asset to canonical 10-node schema.
6. **Update Build & Test Configs**: Update `vitest.config.ts` and `tsconfig` to include `mcp/`.

---

## 5. Verification Method

1. **Typecheck Verification**:
   ```bash
   npm run typecheck
   ```
   *Expected*: Exits with code 0 and 0 diagnostics.
2. **Vitest Verification**:
   ```bash
   npm test
   ```
   *Expected*: Exits with code 0, 100% test passing rate across `client/src/lib/graph.test.ts`, `client/src/lib/io.test.ts`, and `mcp/**/*.test.ts`.
3. **Build Verification**:
   ```bash
   npm run build
   npm run build:viewer
   ```
   *Expected*: Both generate production bundles in `../dist` with code 0.
4. **File Inspection**:
   - Confirm `client/public/llms.txt` is present and accessible at `/llms.txt`.
   - Confirm `mcp/` directory contains tool implementations and test suite.
