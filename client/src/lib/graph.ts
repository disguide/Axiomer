// Pure graph utilities. No mutation — every transform returns a new Graph.
//
// EDGE DIRECTION IS SEMANTIC, NOT VISUAL.
// An edge `from -> to` encodes a relationship. Most relationships run
// child -> parent (a position `answers` a question; an argument `argues-for` a
// position). Two run the other way, parent -> child:
//   - `raises`     : argument -> question  (the argument drills into a question)
//   - `grounds-in` : argument -> value     (the argument bottoms out at a value)
// `childEndpoints` normalizes this so the rest of the tree logic is direction
// agnostic.

import type { EdgeType, Graph, GraphEdge, GraphNode, NodeType } from "./types";
import { isTerminalType } from "./types";

// Edge types whose direction runs parent(from) -> child(to).
const DOWNWARD: readonly EdgeType[] = ["raises", "grounds-in"];

function endpoints(edge: GraphEdge): { parent: string; child: string } {
  return DOWNWARD.includes(edge.edgeType)
    ? { parent: edge.from, child: edge.to }
    : { parent: edge.to, child: edge.from };
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

// Root questions: questions that are nobody's child.
export function getRootQuestions(graph: Graph): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      n.type === "question" &&
      !graph.edges.some((e) => endpoints(e).child === n.id),
  );
}

// All bedrock values (for the "link to existing value" picker).
export function getValues(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => n.type === "value");
}

// Edge type connecting a new child of `childType` to a parent of `parentType`.
export function edgeTypeFor(
  childType: NodeType,
  parentType: NodeType,
): EdgeType {
  if (childType === "position" && parentType === "question") return "answers";
  if (childType === "argument-support") return "argues-for";
  if (childType === "argument-attack") return "argues-against";
  if (childType === "evidence-empirical" || childType === "evidence-anecdotal")
    return "supports";
  if (childType === "question") return "raises"; // argument drills deeper
  if (childType === "objection") return "objects-to";
  if (childType === "rebuttal") return "rebuts";
  if (childType === "analogy" || childType === "thought-experiment")
    return "illustrates";
  if (isTerminalType(childType)) return "grounds-in";
  return "connects-to";
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
    : "connects-to";
  return {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges, makeEdge(parentId, newNode.id, edgeType)],
  };
}

// Create a brand new root question (no parent edge).
export function addRootQuestion(graph: Graph, content: string): Graph {
  const newNode: GraphNode = {
    id: uid("node"),
    type: "question",
    content,
    createdAt: new Date().toISOString(),
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

// Collect a node and all descendants, EXCEPT shared terminals that are still
// grounded by an argument outside the deletion set (so reused values survive).
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
          e.edgeType === "grounds-in" &&
          e.to === id &&
          !doomed.has(e.from),
      );
      if (hasSurvivingParent) doomed.delete(id);
    }
  }
  return doomed;
}

// Number of nodes (excluding the target itself) that deletion would remove.
export function countDescendants(graph: Graph, nodeId: string): number {
  return doomedSet(graph, nodeId).size - 1;
}

// Delete a node, its descendants, and any edges touching removed nodes.
export function deleteNode(graph: Graph, nodeId: string): Graph {
  const doomed = doomedSet(graph, nodeId);
  return {
    nodes: graph.nodes.filter((n) => !doomed.has(n.id)),
    edges: graph.edges.filter((e) => !doomed.has(e.from) && !doomed.has(e.to)),
  };
}

// Ground an argument in an EXISTING terminal node. Replaces any prior
// grounds-in edge from this argument. Never duplicates the value.
export function linkToExistingValue(
  graph: Graph,
  argumentId: string,
  valueId: string,
): Graph {
  const edges = graph.edges.filter(
    (e) => !(e.from === argumentId && e.edgeType === "grounds-in"),
  );
  edges.push(makeEdge(argumentId, valueId, "grounds-in"));
  return { nodes: graph.nodes, edges };
}

// --- Grounding ---------------------------------------------------------------
// A question is FULLY GROUNDED when every argument chain beneath it bottoms out
// at a terminal node. Walkers traverse edges in semantic direction and guard
// against cycles.

export function isFullyGrounded(graph: Graph, questionId: string): boolean {
  return groundedQuestion(graph, questionId, new Set());
}

function groundedQuestion(
  graph: Graph,
  questionId: string,
  visiting: Set<string>,
): boolean {
  const question = getNode(graph, questionId);
  if (!question || question.type !== "question") return false;
  if (visiting.has(questionId)) return false;
  const next = new Set(visiting).add(questionId);

  const positions = graph.edges
    .filter((e) => e.to === questionId && e.edgeType === "answers")
    .map((e) => getNode(graph, e.from))
    .filter((n): n is GraphNode => Boolean(n));

  if (positions.length === 0) return false;
  return positions.every((p) => groundedPosition(graph, p.id, next));
}

function groundedPosition(
  graph: Graph,
  positionId: string,
  visiting: Set<string>,
): boolean {
  // A position may rest directly on a terminal (some seed data does this), or
  // be backed by arguments that each ground out.
  const direct = graph.edges.find(
    (e) => e.from === positionId && e.edgeType === "grounds-in",
  );
  if (direct) {
    const terminal = getNode(graph, direct.to);
    if (terminal && isTerminalType(terminal.type)) return true;
  }

  const args = graph.edges
    .filter(
      (e) =>
        e.to === positionId &&
        (e.edgeType === "argues-for" || e.edgeType === "argues-against"),
    )
    .map((e) => getNode(graph, e.from))
    .filter((n): n is GraphNode => Boolean(n));

  if (args.length === 0) return false;
  return args.every((a) => groundedArgument(graph, a.id, visiting));
}

function groundedArgument(
  graph: Graph,
  argumentId: string,
  visiting: Set<string>,
): boolean {
  // Grounds out directly at a terminal node?
  const groundsIn = graph.edges.find(
    (e) => e.from === argumentId && e.edgeType === "grounds-in",
  );
  if (groundsIn) {
    const terminal = getNode(graph, groundsIn.to);
    return Boolean(terminal && isTerminalType(terminal.type));
  }

  // Or raises a child question that is itself fully grounded?
  const raises = graph.edges.find(
    (e) => e.from === argumentId && e.edgeType === "raises",
  );
  if (raises) return groundedQuestion(graph, raises.to, visiting);

  return false;
}

// Trace from a node down its grounds-in / raises chain to the terminal it
// reaches, if any.
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
      (e) =>
        e.from === current &&
        (e.edgeType === "grounds-in" || e.edgeType === "raises"),
    );
    current = next?.to;
  }
  return undefined;
}

// --- Convergence ------------------------------------------------------------
// The product thesis: many questions resolving to the same bedrock values.
// These read-only queries power the Values index and clash detection.

// All terminal nodes (value / principle / epistemic-limit).
export function getTerminals(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => isTerminalType(n.type));
}

// Walk up the parent chain to the root question a node ultimately sits under.
// Returns undefined if the chain doesn't reach a top-level question.
export function getRootQuestionFor(
  graph: Graph,
  nodeId: string,
): GraphNode | undefined {
  let node = getNode(graph, nodeId);
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const parent = getParent(graph, node.id);
    if (!parent) {
      return node.type === "question" ? node : undefined;
    }
    node = parent;
  }
  return undefined;
}

export interface ValueUsage {
  value: GraphNode;
  // Nodes (arguments or positions) that ground directly in this terminal.
  groundingNodes: GraphNode[];
  // Distinct root questions whose chains reach this terminal.
  questions: GraphNode[];
  // True when reached from more than one distinct root question.
  convergent: boolean;
}

// Usage summary for every terminal, sorted by how many questions converge on it.
export function getValueUsage(graph: Graph): ValueUsage[] {
  return getTerminals(graph)
    .map((value) => {
      const groundingNodes = graph.edges
        .filter((e) => e.edgeType === "grounds-in" && e.to === value.id)
        .map((e) => getNode(graph, e.from))
        .filter((n): n is GraphNode => Boolean(n));

      const questionMap = new Map<string, GraphNode>();
      for (const node of groundingNodes) {
        const root = getRootQuestionFor(graph, node.id);
        if (root) questionMap.set(root.id, root);
      }
      const questions = [...questionMap.values()];
      return {
        value,
        groundingNodes,
        questions,
        convergent: questions.length > 1,
      };
    })
    .sort((a, b) => b.questions.length - a.questions.length);
}

export interface ValueClash {
  question: GraphNode;
  values: GraphNode[]; // the distinct terminals its chains bottom out at
}

// A root question "clashes" when its chains ground in more than one distinct
// terminal — the real value disagreement the product aims to surface.
export function getValueClashes(graph: Graph): ValueClash[] {
  const clashes: ValueClash[] = [];
  for (const question of getRootQuestions(graph)) {
    const terminals = new Map<string, GraphNode>();
    for (const t of getTerminals(graph)) {
      const reaches = graph.edges.some(
        (e) =>
          e.edgeType === "grounds-in" &&
          e.to === t.id &&
          getRootQuestionFor(graph, e.from)?.id === question.id,
      );
      if (reaches) terminals.set(t.id, t);
    }
    if (terminals.size > 1) {
      clashes.push({ question, values: [...terminals.values()] });
    }
  }
  return clashes;
}
