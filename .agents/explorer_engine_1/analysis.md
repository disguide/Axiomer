# Epistemic Engine & Graph Logic Deep Investigation (R2 & Acceptance Criteria)

**Date**: 2026-08-22  
**Author**: Explorer Epistemic Engine (explorer_engine_1)  
**Scope**: client/src/lib/graph.ts, client/src/lib/types.ts, client/src/lib/meta.tsx, client/src/lib/io.ts, client/src/lib/markdown.ts, client/src/lib/graph.test.ts  

---

## 1. Executive Summary

Axiomer's epistemic core is designed as a local-first argument mapping and coherence engine that derives beliefs down to 5 terminal foundations.
The current pure graph codebase (client/src/lib/graph.ts) contains **39 exported functions** and **46 unit tests** verifying basic traversals, single-step grounding, cycle detection, Dung acceptability, similarity deduplication, and status statistics.

However, a comprehensive structural and algorithmic investigation revealed **critical bugs, edge-case failures, and architectural coupling gaps**:
1. **Grounding Calculation Incompleteness**:
   - groundedArgument only inspects direct outgoing grounds edges, failing completely on multi-level argument chains (e.g., Claim → Support 1 → Support 2 → Value).
   - groundedClaim strictly filters for child nodes of type support or conflict, completely ignoring child claim nodes (e.g. root Question → candidate Position claims), causing multi-position question trees to evaluate as ungrounded even when all positions are fully grounded.
   - source is one of the 5 terminal types, but uses the cites edge type; grounding functions (isFullyGrounded, isNodeGrounded, getValueUsage, getValueClashes) exclusively check edgeType === "grounds" and ignore cites.
2. **Edge Type Inference Order Bug (edgeTypeFor)**:
   - if (parentType === "premise") return "supports" is evaluated before child type checks, causing conflicts (conflict), citations (source), and terminal foundations (alue, limit) added under a premise to erroneously receive "supports" edges instead of "conflicts", "cites", or "grounds".
3. **Ontology & Rules Coupled to Presentation Layer**:
   - ALLOWED_CHILDREN is defined inside client/src/lib/meta.tsx (which imports React and Lucide icons), preventing non-UI consumers (such as CLI tools or the planned mcp/ server) from importing child rules without React/JSX dependencies.
4. **ddEdge Semantic Inversion & Missing Invariant Validation**:
   - ddEdge(graph, sourceId, targetId) assumes sourceId is the child and 	argetId is the parent, creating an inversion hazard with standard UI handle conventions. It also lacks validation against self-loops, duplicate edges, or edges extending out of terminal nodes.
5. **Markdown Import Missing**:
   - While Markdown export exists (exportGraphToMarkdown), there is no corresponding Markdown parser/importer (parseMarkdownToGraph).

---

## 2. Ontology & Edge Direction Analysis

### 2.1 The 10-Node Ontology Matrix
Axiomer defines exactly 10 node types divided into 5 structural types (can have children) and 5 terminal foundation types (never have children):

| Node Type | Category | Is Terminal | Allowed Children | Semantic Description |
|---|---|---|---|---|
| claim | Structural | No | claim, support, conflict, 
ote, alue, source, limit, edrock, preference | Question, position, proposition, or statement |
| premise | Structural | No | claim, support, conflict, 
ote, alue, source, limit, edrock, preference | Foundational axiom/assumption reasoned forward from |
| support | Structural | No | support, conflict, 
ote, alue, source, limit, edrock, preference | Backing evidence, rationale, or data |
| conflict | Structural | No | support, conflict, 
ote, alue, source, limit, edrock, preference | Counterargument, objection, or inconsistency |
| 
ote | Structural | No | conflict, 
ote, source | Context, caveat, definition, or clarification |
| alue | Terminal | **Yes** | *None* ([]) | Bedrock ethical or philosophical value |
| source | Terminal | **Yes** | *None* ([]) | Citation, paper, dataset, URL, or DOI |
| limit | Terminal | **Yes** | *None* ([]) | Epistemic limit or boundary of knowledge |
| edrock | Terminal | **Yes** | *None* ([]) | Fundamental philosophical axiom (e.g. Cogito) |
| preference | Terminal | **Yes** | *None* ([]) | Subjective inclination or aesthetic priority |

### 2.2 The 5 Edge Types & Semantic Directions
Edge directions are semantic rather than visual:

| Edge Type | Stored rom | Stored 	o | Semantic Meaning | DOWNWARD Flag |
|---|---|---|---|---|
| supports | Child Node | Parent Node | Child reasoning backs up Parent | No |
| conflicts | Child Node | Parent Node | Child reasoning attacks/challenges Parent | No |
| nnotates | Child Node | Parent Node | Child provides context/caveat to Parent | No |
| grounds | Parent Node | Terminal Node | Parent reasoning bottoms out at Terminal | **Yes** |
| cites | Parent Node | Source Node | Parent reasoning references external Source | **Yes** |

### 2.3 Edge Endpoint Translation
In client/src/lib/graph.ts, endpoints(edge: GraphEdge) normalizes all edges into a uniform { parent, child } pair:
`	s
const DOWNWARD: readonly EdgeType[] = ["grounds", "cites"];

function endpoints(edge: GraphEdge): { parent: string; child: string } {
  return DOWNWARD.includes(edge.edgeType)
    ? { parent: edge.from, child: edge.to }
    : { parent: edge.to, child: edge.from };
}
`
All traversal algorithms (getChildren, getParent, getParents, getDescendantIds, getAncestors) correctly use this function, preserving semantic integrity across all 5 edge types.

### 2.4 Identified Flaws in Edge Logic

#### Defect 1: Ordering Bug in edgeTypeFor
In graph.ts (lines 114–125):
`	s
export function edgeTypeFor(childType: NodeType, parentType: NodeType): EdgeType {
  if (parentType === "premise") return "supports"; // BUG: overrides childType!
  if (childType === "support" || childType === "claim") return "supports";
  if (childType === "conflict") return "conflicts";
  if (childType === "source") return "cites";
  if (isTerminalType(childType)) return "grounds";
  return "annotates"; // note, limit (stale comment)
}
`
- **Consequence**: If a user attaches a conflict, source, alue, limit, edrock, preference, or 
ote under a premise, parentType === "premise" triggers first and forces supports!
- **Fix**: Check childType rules first:
  1. childType === "conflict" → "conflicts"
  2. childType === "source" → "cites"
  3. isTerminalType(childType) → "grounds"
  4. childType === "note" → "annotates"
  5. childType === "support" || childType === "claim" || parentType === "premise" → "supports"
  6. default → "annotates"

#### Defect 2: UI Coupling of ALLOWED_CHILDREN
- ALLOWED_CHILDREN is declared in meta.tsx.
- Pure graph functions in graph.ts (ddNode, ddEdge) perform no validation against ALLOWED_CHILDREN or isTerminalType(parent).
- **Fix**: Move ALLOWED_CHILDREN into 	ypes.ts (or graph.ts), add pure helper functions getAllowedChildren(type: NodeType): NodeType[] and canAddChild(parentType: NodeType, childType: NodeType): boolean, and import them in meta.tsx.

---

## 3. Epistemic Algorithms: Grounding & Acceptability

### 3.1 Grounding Calculation Analysis (isFullyGrounded & isNodeGrounded)

#### Implementation Gaps Discovered:

1. **Multi-Hop Argument Chains Not Grounded**:
   `	s
   function groundedArgument(graph: Graph, argumentId: string, _visiting: Set<string>): boolean {
     const groundsEdge = graph.edges.find((e) => e.from === argumentId && e.edgeType === "grounds");
     if (groundsEdge) {
       const terminal = getNode(graph, groundsEdge.to);
       return Boolean(terminal && isTerminalType(terminal.type));
     }
     return false; // BUG: does not check child supports!
   }
   `
   - In real epistemics, an argument $ is supported by sub-argument $, which in turn grounds in Value $.
   - Current groundedArgument returns alse for $ because it only looks for a direct grounds edge from $.
   - **Fix**: groundedArgument should check:
     - Is $ directly grounded (grounds or cites edge to terminal)? If so, 	rue.
     - Otherwise, does $ have children of type support / claim? If yes, are all child support chains grounded (with cycle detection via isiting)?

2. **Root Questions with Child Claims (claim → claim)**:
   - In groundedClaim:
     `	s
     const args = graph.edges
       .filter((e) => endpoints(e).parent === claimId && (e.edgeType === "supports" || e.edgeType === "conflicts"))
       .map((e) => getNode(graph, endpoints(e).child))
       .filter((n): n is GraphNode => Boolean(n))
       .filter((n) => n.type === "support" || n.type === "conflict");

     if (args.length === 0) return false;
     return args.every((a) => groundedArgument(graph, a.id, next));
     `
   - When a Question claim has child Position claims (e.g. 	rolley-q1 has 	rolley-p1 and 	rolley-p3), rgs is filtered to only support and conflict types.
   - Result: rgs is empty (rgs.length === 0), and groundedClaim returns alse unconditionally!
   - **Fix**: Check direct grounding first. If absent, gather all relevant children (claim, support, conflict). If child is claim, recurse via groundedClaim. If child is support/conflict, recurse via groundedArgument.

3. **source Citing Omitted from Grounding and Convergence**:
   - source is in TERMINAL_TYPES.
   - Its edge is cites (rom: parent, to: source).
   - groundedClaim, groundedArgument, getValueUsage, getValueClashes, getValueChainDetail, and doomedSet all search exclusively for edgeType === "grounds".
   - **Fix**: Recognize terminal citation edges (e.edgeType === "grounds" || (e.edgeType === "cites" && getNode(graph, e.to)?.type === "source")).

### 3.2 Acceptability (Dung-Style Defeat Semantics)

`	s
export type Acceptability = "coherent" | "conflicted" | "contested";
`
- **Evaluation**: The fixpoint iteration in getAcceptability correctly computes grounded extension semantics for argumentation graphs:
  - Base case: unattacked nodes are marked "in" (coherent).
  - Propagation: nodes attacked by an "in" node are marked "out" (conflicted).
  - Reinstatement: nodes whose attackers are all "out" are marked "in" (coherent).
  - Cycles / unresolvable: remaining nodes are marked "contested".
- **Improvement**: getConflicts(graph, nodeId) currently checks getChildren(graph, nodeId).filter((c) => c.type === "conflict"). It should also check edges where edge.edgeType === "conflicts", allowing attacks between general node types (e.g., cross-claim conflicts).

---

## 4. Comprehensive Graph Function Catalog & Audit

All 39 exported functions in client/src/lib/graph.ts:

| # | Function | Return Type | Purity | Status & Findings |
|---|---|---|---|---|
| 1 | edgeEndpoints(edge) | { parent, child } | 100% Pure | Robust, normalized |
| 2 | getNode(graph, nodeId) | GraphNode \| undefined | 100% Pure | Verified |
| 3 | getChildren(graph, nodeId) | GraphNode[] | 100% Pure | Verified |
| 4 | getParent(graph, nodeId) | GraphNode \| undefined | 100% Pure | Returns first parent |
| 5 | getParents(graph, nodeId) | GraphNode[] | 100% Pure | Verified for shared terminals |
| 6 | getDescendantIds(graph, nodeId) | Set<string> | 100% Pure | Cycle-safe BFS |
| 7 | getAncestors(graph, nodeId) | Set<string> | 100% Pure | Cycle-safe BFS, excludes self |
| 8 | getRootQuestions(graph) | GraphNode[] | 100% Pure | Returns root claims |
| 9 | getRoots(graph) | GraphNode[] | 100% Pure | Returns root claims & premises |
| 10 | getValues(graph) | GraphNode[] | 100% Pure | Only returns 	ype === "value" |
| 11 | edgeTypeFor(childType, parentType) | EdgeType | 100% Pure | **Bug**: Premise priority over child |
| 12 | ddNode(graph, type, content, parentId) | Graph | 100% Pure | Immutable; missing child validation |
| 13 | ddRootQuestion(graph, content) | Graph | 100% Pure | Verified |
| 14 | ddRootPremise(graph, content) | Graph | 100% Pure | Verified |
| 15 | ddFloatingNode(graph, type, content, pos) | Graph | 100% Pure | Verified |
| 16 | editNode(graph, nodeId, newContent) | Graph | 100% Pure | Verified |
| 17 | moveNode(graph, nodeId, position) | Graph | 100% Pure | Verified |
| 18 | ddEdge(graph, sourceId, targetId) | Graph | 100% Pure | **Hazard**: Parameter inversion |
| 19 | countDescendants(graph, nodeId) | 
umber | 100% Pure | Uses doomedSet |
| 20 | deleteNode(graph, nodeId) | Graph | 100% Pure | Cascade delete with shared terminal sparing |
| 21 | linkToExistingValue(graph, argId, valId) | Graph | 100% Pure | Verified convergence helper |
| 22 | isFullyGrounded(graph, claimId) | oolean | 100% Pure | **Bug**: Multi-hop & child claim blind |
| 23 | isNodeGrounded(graph, nodeId) | oolean | 100% Pure | **Bug**: Multi-hop blind; premise default |
| 24 | getGroundingTerminal(graph, nodeId) | GraphNode \| undefined | 100% Pure | Direct grounds only |
| 25 | getConflicts(graph, nodeId) | GraphNode[] | 100% Pure | Checks c.type === "conflict" |
| 26 | getAcceptability(graph) | Map<string, Acceptability> | 100% Pure | Verified Dung fixpoint |
| 27 | getDepth(graph, nodeId) | 
umber | 100% Pure | Cycle-safe root depth |
| 28 | getGraphStats(graph) | GraphStats | 100% Pure | Summary statistics |
| 29 | getGroundingGaps(graph) | GroundingGap[] | 100% Pure | Shallowest ungrounded nodes |
| 30 | getTerminals(graph) | GraphNode[] | 100% Pure | Uses isTerminalType |
| 31 | getRootFor(graph, nodeId) | GraphNode \| undefined | 100% Pure | Cycle-safe root resolution |
| 32 | getValueUsage(graph) | ValueUsage[] | 100% Pure | Convergence tracker |
| 33 | getValueClashes(graph) | ValueClash[] | 100% Pure | Cross-terminal clash detector |
| 34 | similarity(a, b) | 
umber | 100% Pure | Jaccard + substring metric |
| 35 | indSimilarTerminals(graph, text, type) | TerminalMatch[] | 100% Pure | Deduplication search |
| 36 | getStatusProfile(graph) | StatusProfile | 100% Pure | Status window calculations |
| 37 | computeArchetype(topValues) | string | 100% Pure | Epistemic archetype classifier |
| 38 | getValueChainDetail(graph, terminalId) | ValueChainDetail | 100% Pure | Grounding derivation inspector |
| 39 | erifySource(graph, sourceId, verified) | Graph | 100% Pure | Source verification toggle |

---

## 5. Architectural Decoupling & MCP Server Readiness

1. **Zero DOM / React Pollution in graph.ts**:
   - graph.ts contains no DOM references, React hooks, or storage/network calls.
   - All state transitions return fresh immutable Graph objects.
2. **Readiness for MCP Server (mcp/)**:
   - The planned MCP server tools (get_graph, get_children, get_roots, get_grounding_gaps, get_acceptability, get_value_clashes, propose_node) can directly import and consume graph.ts functions.
   - To make this completely seamless, ALLOWED_CHILDREN and validation helpers must be located in 	ypes.ts or graph.ts.

---

## 6. Concrete Technical Roadmap for Pure Graph Engine

### Step 1: Relocate and Export Child Rules & Validators
- Move ALLOWED_CHILDREN from client/src/lib/meta.tsx to client/src/lib/types.ts.
- Add getAllowedChildren(type: NodeType): NodeType[] and canAddChild(parentType: NodeType, childType: NodeType): boolean to 	ypes.ts / graph.ts.
- Refactor meta.tsx to import ALLOWED_CHILDREN from 	ypes.ts.

### Step 2: Fix Edge Inference Order in edgeTypeFor
- Reorder edgeTypeFor so that explicit child types (conflict → conflicts, source → cites, terminals → grounds, 
ote → nnotates) are matched before premise fallbacks.

### Step 3: Implement Recursive & Multi-Branch Grounding
- Update groundedArgument to recursively check if child arguments (support) are grounded when no direct terminal edge is present.
- Update groundedClaim to handle child claim positions recursively, returning 	rue only when all active position branches resolve to grounded foundations.
- Include cites edges to source nodes as valid grounding/citation foundations.

### Step 4: Harden ddEdge and Mutation Invariants
- Provide explicit parameter naming or validation in ddEdge(graph, parentId, childId, explicitEdgeType?).
- Disallow edges originating from terminal nodes.

### Step 5: Expand Vitest Test Suite (graph.test.ts)
- Add test cases for:
  - Multi-hop argument grounding (Claim → Support 1 → Support 2 → Value).
  - Question with multiple Position claims grounding in values.
  - Citing source nodes with cites edges and verifying grounding.
  - Adding conflict, source, and 
ote under premise ensuring correct edge types.
  - Cycle detection across mixed claim/support/nnotates chains.
  - canAddChild validation rules.

### Step 6: Implement Markdown Importer (parseMarkdownToGraph)
- Implement parseMarkdownToGraph(markdown: string): Graph in markdown.ts to complement exportGraphToMarkdown and enable full bidirectional round-tripping.
