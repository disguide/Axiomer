## 2026-08-22T04:37:17Z
Implement Milestone M1 (Epistemic Engine & Ontology Decoupling):
1. **Decouple Ontology Rules**: Move `ALLOWED_CHILDREN` and ontology validation logic out of `client/src/lib/meta.tsx` into `client/src/lib/types.ts` / `client/src/lib/graph.ts` so pure graph logic has zero React or Lucide dependencies. Update `client/src/lib/meta.tsx` and all components to import `ALLOWED_CHILDREN` cleanly from `types.ts` or `graph.ts`.
2. **Recursive Multi-Hop Grounding & Sub-Claims**:
   - In `client/src/lib/graph.ts`, update `groundedClaim` to handle child `claim` nodes (candidate positions) as well as `support`/`conflict`.
   - Update `groundedArgument` to recursively evaluate child support chains down to terminal nodes with cycle detection (`visiting` set).
3. **Fix `edgeTypeFor` Inference Ordering**:
   - Fix ordering so that specific child types (`conflict` -> `conflicts`, `source` -> `cites`, terminals -> `grounds`, `note`/`limit` -> `annotates`) are correctly resolved even when parent is a `premise`.
4. **Source Citations in Grounding & Conflict Evaluation**:
   - Ensure terminal `source` nodes connected via `cites` edges are properly handled in `isFullyGrounded`, `isNodeGrounded`, `getValueUsage`, and `getValueClashes`.
5. **Unit Test Expansion**:
   - Expand `client/src/lib/graph.test.ts` to comprehensively verify multi-hop grounding, cycle resistance, premise child types, source citations, acceptability extensions, and value clash calculations.
6. **Verification**:
   - Run `npm test` and `npm run typecheck`. Ensure 0 TypeScript errors and 100% tests pass.
7. **Handoff**:
   - Write your detailed implementation and verification report to `C:\Users\arthu\projects\Axiomer\.agents\worker_m1_1\handoff.md`.
   - Send a message to orchestrator with results when complete.
