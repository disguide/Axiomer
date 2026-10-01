# Handoff Report: Epistemic Engine & Ontology Coherence Investigation

**Agent ID**: explorer_engine_1  
**Parent Conversation ID**: dec4554d-49d1-4f61-8d77-80d2c872348d  
**Project**: Axiomer  
**Scope**: Requirement R2 & Acceptance Criteria (Pure Graph Logic, Ontology, Grounding, Acceptability, Serialization)  
**Artifact File**: C:\Users\arthu\projects\Axiomer\.agents\explorer_engine_1\analysis.md  

---

## 1. Observation

1. **Test Suite Baseline**:
   Running 
pm test executes Vitest across 2 test files with 52 passing tests:
   - client/src/lib/io.test.ts (6 tests)
   - client/src/lib/graph.test.ts (46 tests)
   Running 
pm run typecheck (	sc -b --noEmit) passes with exit code 0.

2. **Grounding Implementation (client/src/lib/graph.ts)**:
   - groundedClaim (lines 337–349):
     `	s
     const args = graph.edges
       .filter(
         (e) =>
           endpoints(e).parent === claimId &&
           (e.edgeType === "supports" || e.edgeType === "conflicts"),
       )
       .map((e) => getNode(graph, endpoints(e).child))
       .filter((n): n is GraphNode => Boolean(n))
       .filter((n) => n.type === "support" || n.type === "conflict");

     if (args.length === 0) return false;
     return args.every((a) => groundedArgument(graph, a.id, next));
     `
     rgs strictly excludes children of type "claim". If a root claim has child position claims, rgs.length === 0 and it returns alse.
   - groundedArgument (lines 351–364):
     `	s
     function groundedArgument(
       graph: Graph,
       argumentId: string,
       _visiting: Set<string>,
     ): boolean {
       const groundsEdge = graph.edges.find(
         (e) => e.from === argumentId && e.edgeType === "grounds",
       );
       if (groundsEdge) {
         const terminal = getNode(graph, groundsEdge.to);
         return Boolean(terminal && isTerminalType(terminal.type));
       }
       return false;
     }
     `
     _visiting is unused. It checks only a direct grounds edge from rgumentId. If an argument has child support arguments rather than an immediate terminal, it returns alse.

3. **Edge Inference Ordering (client/src/lib/graph.ts lines 114–125)**:
   `	s
   export function edgeTypeFor(
     childType: NodeType,
     parentType: NodeType,
   ): EdgeType {
     // Anything built on a premise is supported by it
     if (parentType === "premise") return "supports";
     if (childType === "support" || childType === "claim") return "supports";
     if (childType === "conflict") return "conflicts";
     if (childType === "source") return "cites";
     if (isTerminalType(childType)) return "grounds";
     return "annotates"; // note, limit
   }
   `
   When parentType === "premise", line 119 immediately returns "supports" for all child types, including conflict, source, alue, limit, edrock, preference, and 
ote.

4. **Ontology Rules Coupled to Presentation Layer (client/src/lib/meta.tsx lines 116–127)**:
   ALLOWED_CHILDREN is defined in meta.tsx which imports React and Lucide icons:
   `	s
   import type { ReactNode } from "react";
   import { MessageSquare, Sprout, CheckCircle2, ... } from "lucide-react";
   `
   No child validation helpers exist in 	ypes.ts or graph.ts.

5. **Terminal Source Citations Disconnected from Grounding / Convergence**:
   isTerminalType("source") is true (	ypes.ts), but source edges are cites. groundedClaim, groundedArgument, getValueUsage, getValueClashes, getValueChainDetail, and doomedSet search only for edgeType === "grounds".

6. **Markdown Serialization Asymmetry**:
   client/src/lib/markdown.ts exports exportGraphToMarkdown(graph: Graph): string, but no parser parseMarkdownToGraph(text: string): Graph exists.

---

## 2. Logic Chain

1. From **Observation 2**, groundedArgument does not traverse child support chains, and groundedClaim discards child claim nodes. Therefore, any non-trivial argument tree (such as multi-hop reasoning or question-with-positions) fails to evaluate as grounded.
2. From **Observation 3**, placing if (parentType === "premise") return "supports" as the first condition overrides all specific child types. Therefore, attacking a premise or citing evidence under a premise produces incorrect edge semantics (supports instead of conflicts or cites), breaking defeat detection and citation tracking.
3. From **Observation 4**, placing ALLOWED_CHILDREN in a .tsx file that depends on React and Lucide icons violates the architectural decoupling requirement (R2) and prevents non-UI packages (like mcp/ or CLI runners) from sharing canonical child validation logic.
4. From **Observation 5**, treating source as a terminal type in the ontology while ignoring cites edges in isFullyGrounded, getValueUsage, and getValueClashes produces inconsistent statistics and false ungrounded statuses for cited claims.
5. From **Observation 6**, acceptance criteria specify bidirectional export and import handling for both JSON and Markdown formats. Without a Markdown parser, Markdown import is impossible.

---

## 3. Caveats

1. The Dung grounded acceptability extension in getAcceptability operates over tree parent-child conflict edges. Cross-branch conflicts outside tree hierarchies (e.g. arbitary lateral conflict graphs) require manual edge construction.
2. No live backend or Anthropic API key was configured during this read-only test run; AI assistant mocks in ssist.ts operate locally.

---

## 4. Conclusion

Axiomer's epistemic foundation in client/src/lib/graph.ts is pure and functional, but contains three high-priority logical flaws that directly undermine Requirement R2:
- Non-recursive groundedArgument and child-claim blind groundedClaim.
- Premise priority bug in edgeTypeFor.
- Coupling of ALLOWED_CHILDREN to meta.tsx.

Correcting these algorithms, relocating child rules to 	ypes.ts, adding a Markdown parser, and expanding test coverage in graph.test.ts will fully satisfy Requirement R2 and prepare pure graph logic for seamless MCP server integration (R4).

---

## 5. Verification Method

To independently verify all findings and test suite integrity:

1. **Run Current Test Suite**:
   `ash
   npm test
   `
2. **Run TypeScript Diagnostics**:
   `ash
   npm run typecheck
   `
3. **Verify Premise Edge Inference Defect**:
   In client/src/lib/graph.ts, inspect line 119: calling edgeTypeFor("conflict", "premise") evaluates to "supports" rather than "conflicts".
4. **Verify Multi-Hop Grounding Defect**:
   Construct a test graph with:
   - Root Claim $
   - Child Support $ under $
   - Child Support $ under $
   - Terminal Value $ under $ (grounds edge)
   Calling isFullyGrounded(g, C1) currently returns alse instead of 	rue.
