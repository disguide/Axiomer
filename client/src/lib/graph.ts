// Pure graph utilities. No mutation — every transform returns a new Graph.
//
// EDGE DIRECTION: `supports`, `conflicts`, `annotates` run child→parent.
// `grounds` and `cites` run parent→child (downward).

import type { EdgeType, Graph, GraphEdge, GraphNode, NodeType } from "./types";
import { isTerminalType } from "./types";

// Edge types whose direction runs parent(from) → child(to).
const DOWNWARD: readonly EdgeType[] = ["grounds", "cites"];

function endpoints(edge: GraphEdge): { parent: string; child: string } {
  return DOWNWARD.includes(edge.edgeType)
    ? { parent: edge.from, child: edge.to }
    : { parent: edge.to, child: edge.from };
}

// Public accessor for an edge's parent/child, used by the graph-map layout.
export function edgeEndpoints(edge: GraphEdge): {
  parent: string;
  child: string;
} {
  return endpoints(edge);
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getNode(graph: Graph, nodeId: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

// Children = nodes nested under this one in the tree.
export function getChildren(graph: Graph, nodeId: string): GraphNode[] {
  return graph.edges
    .filter((e) => endpoints(e).parent === nodeId)
    .map((e) => getNode(graph, endpoints(e).child))
    .filter((n): n is GraphNode => Boolean(n));
}

// Parent = the node this one is nested under (first, if a value is shared).
export function getParent(graph: Graph, nodeId: string): GraphNode | undefined {
  const edge = graph.edges.find((e) => endpoints(e).child === nodeId);
  return edge ? getNode(graph, endpoints(edge).parent) : undefined;
}

// All parents — a shared value has several (one per grounding argument).
export function getParents(graph: Graph, nodeId: string): GraphNode[] {
  return graph.edges
    .filter((e) => endpoints(e).child === nodeId)
    .map((e) => getNode(graph, endpoints(e).parent))
    .filter((n): n is GraphNode => Boolean(n));
}

// Every node reachable downward FROM nodeId (descendants, including nodeId).
export function getDescendantIds(graph: Graph, nodeId: string): Set<string> {
  const seen = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of getChildren(graph, current)) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return seen;
}

// Every node with a downward path INTO nodeId (its ancestors).
export function getAncestors(graph: Graph, nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  const seen = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const parent of getParents(graph, current)) {
      if (!seen.has(parent.id)) {
        seen.add(parent.id);
        result.add(parent.id);
        queue.push(parent.id);
      }
    }
  }
  return result;
}

// Root claims: claims that are nobody's child.
export function getRootQuestions(graph: Graph): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      n.type === "claim" &&
      !graph.edges.some((e) => endpoints(e).child === n.id),
  );
}

// Tree entry points: top-level claims AND premises (nobody's child).
export function getRoots(graph: Graph): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      (n.type === "claim" || n.type === "premise") &&
      !graph.edges.some((e) => endpoints(e).child === n.id),
  );
}

// All bedrock values (for the "link to existing value" picker).
export function getValues(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => n.type === "value");
}

// Edge type connecting a new child to its parent — auto-inferred from types.
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

// Build an edge with the correct orientation for its type.
function makeEdge(
  parentId: string,
  childId: string,
  edgeType: EdgeType,
): GraphEdge {
  const downward = DOWNWARD.includes(edgeType);
  return {
    id: uid("edge"),
    from: downward ? parentId : childId,
    to: downward ? childId : parentId,
    edgeType,
  };
}

export function addNode(
  graph: Graph,
  nodeType: NodeType,
  content: string,
  parentId: string,
): Graph {
  const parent = getNode(graph, parentId);
  const newNode: GraphNode = {
    id: uid("node"),
    type: nodeType,
    content,
    createdAt: new Date().toISOString(),
  };
  const edgeType = parent
    ? edgeTypeFor(nodeType, parent.type)
    : "annotates";
  return {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges, makeEdge(parentId, newNode.id, edgeType)],
  };
}

// Create a brand new root claim (no parent edge).
export function addRootQuestion(graph: Graph, content: string): Graph {
  return addRoot(graph, "claim", content);
}

// Create a brand new root premise.
export function addRootPremise(graph: Graph, content: string): Graph {
  return addRoot(graph, "premise", content);
}

function addRoot(graph: Graph, type: NodeType, content: string): Graph {
  const newNode: GraphNode = {
    id: uid("node"),
    type,
    content,
    createdAt: new Date().toISOString(),
  };
  return { nodes: [...graph.nodes, newNode], edges: graph.edges };
}

export function addFloatingNode(
  graph: Graph,
  type: NodeType,
  content: string,
  position: { x: number; y: number }
): Graph {
  const newNode: GraphNode = {
    id: uid("node"),
    type,
    content,
    createdAt: new Date().toISOString(),
    position,
  };
  return { nodes: [...graph.nodes, newNode], edges: graph.edges };
}

export function editNode(
  graph: Graph,
  nodeId: string,
  newContent: string,
): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, content: newContent } : n,
    ),
  };
}

export function moveNode(
  graph: Graph,
  nodeId: string,
  position: { x: number; y: number },
): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, position } : n,
    ),
  };
}

export function addEdge(
  graph: Graph,
  sourceId: string,
  targetId: string,
): Graph {
  const sourceNode = getNode(graph, sourceId);
  const targetNode = getNode(graph, targetId);
  if (!sourceNode || !targetNode) return graph;
  
  const edgeType = edgeTypeFor(sourceNode.type, targetNode.type);
  const newEdge = makeEdge(targetId, sourceId, edgeType);
  return {
    ...graph,
    edges: [...graph.edges, newEdge],
  };
}

// Collect a node and all descendants, EXCEPT shared terminals that are still
// grounded by a parent outside the deletion set.
function doomedSet(graph: Graph, nodeId: string): Set<string> {
  const doomed = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (doomed.has(current)) continue;
    doomed.add(current);
    for (const child of getChildren(graph, current)) {
      if (!doomed.has(child.id)) queue.push(child.id);
    }
  }
  // Spare shared terminals with a surviving parent.
  for (const id of [...doomed]) {
    const node = getNode(graph, id);
    if (node && isTerminalType(node.type) && id !== nodeId) {
      const hasSurvivingParent = graph.edges.some(
        (e) =>
          e.edgeType === "grounds" &&
          e.to === id &&
          !doomed.has(e.from),
      );
      if (hasSurvivingParent) doomed.delete(id);
    }
  }
  return doomed;
}

export function countDescendants(graph: Graph, nodeId: string): number {
  return doomedSet(graph, nodeId).size - 1;
}

export function deleteNode(graph: Graph, nodeId: string): Graph {
  const doomed = doomedSet(graph, nodeId);
  return {
    nodes: graph.nodes.filter((n) => !doomed.has(n.id)),
    edges: graph.edges.filter((e) => !doomed.has(e.from) && !doomed.has(e.to)),
  };
}

// Ground an argument in an EXISTING terminal node.
export function linkToExistingValue(
  graph: Graph,
  argumentId: string,
  valueId: string,
): Graph {
  const edges = graph.edges.filter(
    (e) => !(e.from === argumentId && e.edgeType === "grounds"),
  );
  edges.push(makeEdge(argumentId, valueId, "grounds"));
  return { nodes: graph.nodes, edges };
}

// --- Grounding ---------------------------------------------------------------

export function isFullyGrounded(graph: Graph, claimId: string): boolean {
  return groundedClaim(graph, claimId, new Set());
}

export function isNodeGrounded(graph: Graph, nodeId: string): boolean {
  const node = getNode(graph, nodeId);
  if (!node) return false;
  switch (node.type) {
    case "claim":
      return groundedClaim(graph, nodeId, new Set());
    case "support":
    case "conflict":
      return groundedArgument(graph, nodeId, new Set());
    default:
      return true;
  }
}

function groundedClaim(
  graph: Graph,
  claimId: string,
  visiting: Set<string>,
): boolean {
  const claim = getNode(graph, claimId);
  if (!claim || claim.type !== "claim") return false;
  if (visiting.has(claimId)) return false;
  const next = new Set(visiting).add(claimId);

  // Check for direct grounding
  const directGround = graph.edges.find(
    (e) => e.from === claimId && e.edgeType === "grounds",
  );
  if (directGround) {
    const terminal = getNode(graph, directGround.to);
    if (terminal && isTerminalType(terminal.type)) return true;
  }

  // Check children support/conflict arguments
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
}

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

export function getGroundingTerminal(
  graph: Graph,
  nodeId: string,
): GraphNode | undefined {
  let current: string | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = getNode(graph, current);
    if (node && isTerminalType(node.type)) return node;
    const next = graph.edges.find(
      (e) => e.from === current && e.edgeType === "grounds",
    );
    current = next?.to;
  }
  return undefined;
}

// --- Acceptability (Dung-style defeat analysis) -----------------------------

export type Acceptability = "coherent" | "conflicted" | "contested";

// Nodes that conflict with their parent.
const CONFLICTING_TYPES: ReadonlySet<NodeType> = new Set<NodeType>(["conflict"]);

export function getConflicts(graph: Graph, nodeId: string): GraphNode[] {
  return getChildren(graph, nodeId).filter((c) => CONFLICTING_TYPES.has(c.type));
}

export function getAcceptability(graph: Graph): Map<string, Acceptability> {
  const conflictsList = new Map<string, string[]>();
  for (const n of graph.nodes) {
    conflictsList.set(
      n.id,
      getConflicts(graph, n.id).map((a) => a.id),
    );
  }

  const label = new Map<string, "in" | "out">();
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of graph.nodes) {
      if (label.has(n.id)) continue;
      const atk = conflictsList.get(n.id) as string[];
      if (atk.every((a) => label.get(a) === "out")) {
        label.set(n.id, "in");
        changed = true;
      }
    }
    for (const n of graph.nodes) {
      if (label.has(n.id)) continue;
      const atk = conflictsList.get(n.id) as string[];
      if (atk.some((a) => label.get(a) === "in")) {
        label.set(n.id, "out");
        changed = true;
      }
    }
  }

  const result = new Map<string, Acceptability>();
  for (const n of graph.nodes) {
    const l = label.get(n.id);
    result.set(n.id, l === "in" ? "coherent" : l === "out" ? "conflicted" : "contested");
  }
  return result;
}

// --- Depth metrics ----------------------------------------------------------

export function getDepth(graph: Graph, nodeId: string): number {
  let depth = 0;
  let current = getParent(graph, nodeId);
  const seen = new Set<string>([nodeId]);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = getParent(graph, current.id);
  }
  return depth;
}

function longestPath(
  graph: Graph,
  nodeId: string,
  memo: Map<string, number>,
  visiting: Set<string>,
): number {
  const cached = memo.get(nodeId);
  if (cached !== undefined) return cached;
  if (visiting.has(nodeId)) return 0;
  visiting.add(nodeId);
  const children = getChildren(graph, nodeId);
  const depth =
    children.length === 0
      ? 0
      : 1 + Math.max(...children.map((c) => longestPath(graph, c.id, memo, visiting)));
  visiting.delete(nodeId);
  memo.set(nodeId, depth);
  return depth;
}

export interface GraphStats {
  claims: number;
  premises: number;
  supports: number;
  conflicts: number;
  terminals: number;
  groundedClaims: number;
  openClaims: number;
  convergentValues: number;
  clashes: number;
  maxDepth: number;
}

export function getGraphStats(graph: Graph): GraphStats {
  const claims = getRootQuestions(graph);
  const grounded = claims.filter((q) => isFullyGrounded(graph, q.id)).length;
  const memo = new Map<string, number>();
  const roots = getRoots(graph);
  const maxDepth = roots.reduce(
    (m, r) => Math.max(m, longestPath(graph, r.id, memo, new Set())),
    0,
  );
  return {
    claims: graph.nodes.filter((n) => n.type === "claim").length,
    premises: graph.nodes.filter((n) => n.type === "premise").length,
    supports: graph.nodes.filter((n) => n.type === "support").length,
    conflicts: graph.nodes.filter((n) => n.type === "conflict").length,
    terminals: getTerminals(graph).length,
    groundedClaims: grounded,
    openClaims: claims.length - grounded,
    convergentValues: getValueUsage(graph).filter((u) => u.convergent).length,
    clashes: getValueClashes(graph).length,
    maxDepth,
  };
}

export interface GroundingGap {
  node: GraphNode;
  root: GraphNode | undefined;
  depth: number;
}

export function getGroundingGaps(graph: Graph): GroundingGap[] {
  return graph.nodes
    .filter(
      (n) =>
        (n.type === "support" || n.type === "conflict") &&
        !isNodeGrounded(graph, n.id),
    )
    .map((n) => ({
      node: n,
      root: getRootFor(graph, n.id),
      depth: getDepth(graph, n.id),
    }))
    .sort((a, b) => a.depth - b.depth);
}

// --- Convergence ------------------------------------------------------------

export function getTerminals(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => isTerminalType(n.type));
}

export function getRootFor(
  graph: Graph,
  nodeId: string,
): GraphNode | undefined {
  let node = getNode(graph, nodeId);
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const parent = getParent(graph, node.id);
    if (!parent) {
      return node.type === "claim" || node.type === "premise"
        ? node
        : undefined;
    }
    node = parent;
  }
  return undefined;
}

export interface ValueUsage {
  value: GraphNode;
  groundingNodes: GraphNode[];
  roots: GraphNode[];
  convergent: boolean;
}

export function getValueUsage(graph: Graph): ValueUsage[] {
  return getTerminals(graph)
    .map((value) => {
      const groundingNodes = graph.edges
        .filter((e) => e.edgeType === "grounds" && e.to === value.id)
        .map((e) => getNode(graph, e.from))
        .filter((n): n is GraphNode => Boolean(n));

      const rootMap = new Map<string, GraphNode>();
      for (const node of groundingNodes) {
        const root = getRootFor(graph, node.id);
        if (root) rootMap.set(root.id, root);
      }
      const roots = [...rootMap.values()];
      return {
        value,
        groundingNodes,
        roots,
        convergent: roots.length > 1,
      };
    })
    .sort((a, b) => b.roots.length - a.roots.length);
}

export interface ValueClash {
  question: GraphNode;
  values: GraphNode[];
}

export function getValueClashes(graph: Graph): ValueClash[] {
  const clashes: ValueClash[] = [];
  for (const question of getRootQuestions(graph)) {
    const terminals = new Map<string, GraphNode>();
    for (const t of getTerminals(graph)) {
      const reaches = graph.edges.some(
        (e) =>
          e.edgeType === "grounds" &&
          e.to === t.id &&
          getRootFor(graph, e.from)?.id === question.id,
      );
      if (reaches) terminals.set(t.id, t);
    }
    if (terminals.size > 1) {
      clashes.push({ question, values: [...terminals.values()] });
    }
  }
  return clashes;
}

// --- Value de-duplication ---------------------------------------------------

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union ? inter / union : 0;
  const contained = na.includes(nb) || nb.includes(na) ? 0.6 : 0;
  return Math.max(jaccard, contained);
}

export interface TerminalMatch {
  node: GraphNode;
  score: number;
}

export function findSimilarTerminals(
  graph: Graph,
  text: string,
  type: NodeType,
  threshold = 0.5,
): TerminalMatch[] {
  if (!text.trim()) return [];
  return graph.nodes
    .filter((n) => n.type === type)
    .map((node) => ({ node, score: similarity(text, node.content) }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

// --- Status Window Profiles -------------------------------------------------

export interface ValueRank {
  terminal: GraphNode;
  convergenceCount: number;
  roots: GraphNode[];
  groundingArgs: GraphNode[];
  chainDepths: number[];
}

export interface StatusProfile {
  rankedValues: ValueRank[];
  stats: StatusStats;
  topValues: ValueRank[];
  archetype: string;
}

export interface StatusStats {
  totalClaims: number;
  groundedClaims: number;
  openClaims: number;
  totalTerminals: number;
  convergentTerminals: number;
  convergenceRatio: number;
  valueClashes: number;
  maxDepth: number;
}

export function getStatusProfile(graph: Graph): StatusProfile {
  const usage = getValueUsage(graph);
  
  const rankedValues: ValueRank[] = usage.map(u => ({
    terminal: u.value,
    convergenceCount: u.roots.length,
    roots: u.roots,
    groundingArgs: u.groundingNodes,
    chainDepths: u.groundingNodes.map(node => getDepth(graph, node.id)),
  })).sort((a, b) => b.convergenceCount - a.convergenceCount);
  
  const topValues = rankedValues.slice(0, 5);
  
  const graphStats = getGraphStats(graph);
  
  const stats: StatusStats = {
    totalClaims: getRootQuestions(graph).length,
    groundedClaims: graphStats.groundedClaims,
    openClaims: graphStats.openClaims,
    totalTerminals: graphStats.terminals,
    convergentTerminals: graphStats.convergentValues,
    convergenceRatio: graphStats.terminals > 0 
      ? graphStats.convergentValues / graphStats.terminals 
      : 0,
    valueClashes: graphStats.clashes,
    maxDepth: graphStats.maxDepth,
  };
  
  const archetype = computeArchetype(topValues);
  
  return { rankedValues, stats, topValues, archetype };
}

export function computeArchetype(topValues: ValueRank[]): string {
  if (topValues.length === 0) return "Seeker";

  let valuesCount = 0;
  let limitsCount = 0;

  for (const rank of topValues) {
    if (rank.terminal.type === "value") valuesCount++;
    else if (rank.terminal.type === "limit") limitsCount++;
  }

  let prefix = "Pluralist";
  if (valuesCount > limitsCount) {
    prefix = "Value-grounded";
  } else if (limitsCount > valuesCount) {
    prefix = "Epistemically cautious";
  }

  let convergentCount = 0;
  let shallowCount = 0;
  let deepCount = 0;
  let totalChains = 0;

  for (const rank of topValues) {
    if (rank.convergenceCount >= 4) convergentCount++;
    for (const depth of rank.chainDepths) {
      if (depth <= 3) shallowCount++;
      else deepCount++;
      totalChains++;
    }
  }

  let suffix = "";
  if (convergentCount >= 2 || (topValues[0] && topValues[0].convergenceCount >= 4)) {
    suffix = "synthesizer";
  } else if (totalChains > 0 && deepCount > shallowCount) {
    suffix = "deep reasoner";
  } else {
    suffix = "intuitive";
  }

  return `${prefix} ${suffix}`;
}

export interface ValueChainDetail {
  terminal: GraphNode;
  groundingArgs: Array<{
    argument: GraphNode;
    root: GraphNode | undefined;
    depth: number;
    rootGrounded: boolean;
  }>;
}

export function getValueChainDetail(graph: Graph, terminalId: string): ValueChainDetail {
  const terminal = getNode(graph, terminalId);
  if (!terminal) throw new Error("Terminal not found");

  const groundingEdges = graph.edges.filter(e => e.edgeType === "grounds" && e.to === terminalId);
  
  const groundingArgs = groundingEdges.map(e => {
    const argument = getNode(graph, e.from)!;
    const root = getRootFor(graph, argument.id);
    const rootGrounded = root && root.type === "claim" ? isFullyGrounded(graph, root.id) : false;
    
    return {
      argument,
      root,
      depth: getDepth(graph, argument.id),
      rootGrounded
    };
  });

  return { terminal, groundingArgs };
}

export function verifySource(graph: Graph, sourceId: string, verified: boolean): Graph {
  return {
    nodes: graph.nodes.map(n => n.id === sourceId ? { ...n, verified } : n),
    edges: graph.edges
  };
}
