## 2026-08-22T11:01:22Z
You are Worker M3 (teamwork_preview_worker) implementing Agent Legibility & MCP Server for Axiomer.
Your working directory is: C:\Users\arthu\projects\Axiomer\.agents\worker_m3_1
Project Root: C:\Users\arthu\projects\Axiomer
Original Request: C:\Users\arthu\projects\Axiomer\.agents\ORIGINAL_REQUEST.md
Project Scope: C:\Users\arthu\projects\Axiomer\PROJECT.md
Explorer Analysis: C:\Users\arthu\projects\Axiomer\.agents\explorer_arch_1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Implement Milestone M3 (Agent Legibility & MCP Server):
1. **Standalone Model Context Protocol (MCP) Server**:
   - Create the `mcp/` directory structure: `mcp/index.ts`, `mcp/server.ts`, `mcp/tools.ts`.
   - Use standard stdio JSON-RPC or pure TypeScript implementation wrapping the pure graph engine in `client/src/lib/graph.ts` and `client/src/lib/types.ts`.
   - Implement all 7 required MCP tools:
     1. `get_graph(graphJson: string)`: Parses graph and returns node/edge summary, epistemic grounding stats, and coherence metrics.
     2. `get_children(graphJson: string, nodeId: string)`: Returns child nodes, edge types, and sub-arguments for the specified node.
     3. `get_roots(graphJson: string)`: Returns all root question claims and foundational premises in the graph.
     4. `get_grounding_gaps(graphJson: string)`: Returns all ungrounded claims and arguments with path details to missing terminal foundations.
     5. `get_acceptability(graphJson: string, rootId?: string)`: Computes Dung grounded extension and returns `coherent`, `conflicted`, and `contested` status for argument nodes.
     6. `get_value_clashes(graphJson: string)`: Identifies all root questions grounded in conflicting terminal values, limits, or preferences.
     7. `propose_node(graphJson: string, parentId: string, nodeType: string, label: string, content?: string)`: Validates parent-child ontology rules, infers canonical edge type, appends node and edge immutably, and returns updated graph JSON.
2. **Agent Discovery (`llms.txt`)**:
   - Create `client/public/llms.txt` and `llms.txt` at project root documenting Axiomer's 10-node ontology, 5 edge types, epistemic grounding rules, Dung acceptability semantics, MCP tools, and API reference for AI agents.
3. **Build & Test Configurations**:
   - Update `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` and `vitest.config.ts` if needed to include `mcp/` in typechecking and test discovery.
4. **Comprehensive MCP Test Suite**:
   - Create `mcp/server.test.ts` testing all 7 tools across typical argument maps, edge cases, error conditions, invalid node additions, and multi-turn agent reasoning workflows.
5. **Verification**:
   - Run `npm test` and `npm run typecheck`. Ensure 100% tests pass and 0 TypeScript diagnostics.
6. **Handoff**:
   - Write your handoff report to `C:\Users\arthu\projects\Axiomer\.agents\worker_m3_1\handoff.md`.
   - Send a message to orchestrator with results when complete.
