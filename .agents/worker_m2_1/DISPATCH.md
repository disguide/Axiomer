## 2026-08-22T11:01:21Z

You are Worker M2 (teamwork_preview_worker) implementing Project Management & Bidirectional I/O for Axiomer.
Your working directory is: C:\Users\arthu\projects\Axiomer\.agents\worker_m2_1
Project Root: C:\Users\arthu\projects\Axiomer
Original Request: C:\Users\arthu\projects\Axiomer\.agents\ORIGINAL_REQUEST.md
Project Scope: C:\Users\arthu\projects\Axiomer\PROJECT.md
Explorer Analysis: C:\Users\arthu\projects\Axiomer\.agents\explorer_arch_1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Implement Milestone M2 (Project Management, Branching & Bidirectional I/O):
1. **Project & Branch Deletion Lifecycle**:
   - In `client/src/hooks/useProjects.ts`, implement `deleteProject(projectId: string)` and `deleteBranch(projectId: string, branchId: string)`.
   - Ensure local storage cleanup of associated graph state (`axiomer_graph_<graphId>`), safe fallback selection of active project/branch when the active one is deleted, and prevention of deleting the last remaining branch/project (or creating default initial project if empty).
2. **Bidirectional Markdown I/O with Schema Validation**:
   - In `client/src/lib/markdown.ts`, implement `parseMarkdownGraph(markdown: string): Graph` (and alias `parseMarkdownToGraph`).
   - The parser must robustly parse exported Markdown trees (hierarchical bullet points, indentation levels, node type headers, node labels, terminal grounding connections, and notes) into a valid `Graph` structure matching `validateGraph`.
   - In `client/src/lib/io.ts`, update `exportGraph` and `importGraph` helpers to support both JSON and Markdown formats seamlessly with strict schema validation and error reporting.
3. **URL Sharing & Read-Only Mode Invariance**:
   - Verify LZ-String compressed hash generation and loading in `client/src/pages/Home.tsx` and `client/src/hooks/useGraph.ts`.
   - Verify that `VITE_PUBLIC_READONLY` properly disables editing controls and state mutations while preserving full exploration and navigation.
4. **Unit & Integration Tests**:
   - Expand `client/src/lib/io.test.ts` to comprehensively test:
     - `deleteProject` and `deleteBranch` state transitions and storage cleanup.
     - Markdown roundtrip export -> parse -> compare graph structures and grounding invariance.
     - Malformed markdown / JSON error rejection with descriptive validation messages.
5. **Verification**:
   - Run `npm test` and `npm run typecheck`. Ensure 100% tests pass and 0 TypeScript diagnostics.
6. **Handoff**:
   - Write your handoff report to `C:\Users\arthu\projects\Axiomer\.agents\worker_m2_1\handoff.md`.
   - Send a message to orchestrator with results when complete.
