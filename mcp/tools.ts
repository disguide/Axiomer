// Standalone Model Context Protocol (MCP) Tools for Axiomer
// Pure epistemic graph operations wrapping client/src/lib/graph.ts and client/src/lib/types.ts

import type { Graph, NodeType } from "../client/src/lib/types";
import {
  NODE_TYPES,
  EDGE_TYPES,
  TERMINAL_TYPES,
  ALLOWED_CHILDREN,
} from "../client/src/lib/types";
import {
  getNode,
  getChildren,
  getRoots,
  getRootQuestions,
  getGroundingGaps,
  getAcceptability,
  getValueClashes,
  getGraphStats,
  addNode,
  edgeTypeFor,
  isFullyGrounded,
} from "../client/src/lib/graph";
import { validateGraph, parseGraph } from "../client/src/lib/io";

export { NODE_TYPES, EDGE_TYPES, TERMINAL_TYPES, ALLOWED_CHILDREN };

/**
 * Resolves a graph input from either a Graph object or JSON string with schema validation.
 */
export function resolveGraph(input: string | Graph | unknown): Graph {
  if (typeof input === "string") {
    return parseGraph(input);
  }
  if (input && typeof input === "object" && "nodes" in input && "edges" in input) {
    return validateGraph(input);
  }
  throw new Error("Invalid graph input: expected valid Graph object or JSON string");
}

// ---------------------------------------------------------------------------
// 1. get_graph
// ---------------------------------------------------------------------------

export interface GetGraphParams {
  graphJson?: string;
  graph?: Graph | string;
}

export function get_graph(input: string | Graph | GetGraphParams) {
  let g: Graph;
  if (typeof input === "object" && input !== null && ("graphJson" in input || "graph" in input)) {
    const raw = (input as GetGraphParams).graphJson ?? (input as GetGraphParams).graph;
    g = resolveGraph(raw);
  } else {
    g = resolveGraph(input as string | Graph);
  }

  const stats = getGraphStats(g);
  return {
    graph: g,
    stats,
    summary: {
      nodeCount: g.nodes.length,
      edgeCount: g.edges.length,
      claims: stats.claims,
      premises: stats.premises,
      supports: stats.supports,
      conflicts: stats.conflicts,
      terminals: stats.terminals,
      groundedClaims: stats.groundedClaims,
      openClaims: stats.openClaims,
      clashes: stats.clashes,
      maxDepth: stats.maxDepth,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. get_children
// ---------------------------------------------------------------------------

export interface GetChildrenParams {
  graphJson?: string;
  graph?: Graph | string;
  nodeId: string;
}

export function get_children(
  input: string | Graph | GetChildrenParams,
  paramsOrNodeId?: string | { nodeId: string },
) {
  let g: Graph;
  let nodeId: string;

  if (typeof input === "object" && input !== null && "nodeId" in input) {
    const p = input as GetChildrenParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
    nodeId = p.nodeId;
  } else {
    g = resolveGraph(input as string | Graph);
    if (typeof paramsOrNodeId === "string") {
      nodeId = paramsOrNodeId;
    } else if (paramsOrNodeId && typeof paramsOrNodeId === "object" && "nodeId" in paramsOrNodeId) {
      nodeId = paramsOrNodeId.nodeId;
    } else {
      throw new Error("Missing nodeId parameter");
    }
  }

  const node = getNode(g, nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const children = getChildren(g, nodeId);
  const subArguments = children.filter(
    (c) => c.type === "support" || c.type === "conflict" || c.type === "claim",
  );

  return {
    node,
    children,
    subArguments,
  };
}

// ---------------------------------------------------------------------------
// 3. get_roots
// ---------------------------------------------------------------------------

export interface GetRootsParams {
  graphJson?: string;
  graph?: Graph | string;
}

export function get_roots(input: string | Graph | GetRootsParams) {
  let g: Graph;
  if (typeof input === "object" && input !== null && ("graphJson" in input || "graph" in input)) {
    const p = input as GetRootsParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
  } else {
    g = resolveGraph(input as string | Graph);
  }

  const roots = getRoots(g);
  const claims = roots.filter((r) => r.type === "claim");
  const premises = roots.filter((r) => r.type === "premise");

  return {
    roots,
    claims,
    premises,
  };
}

// ---------------------------------------------------------------------------
// 4. get_grounding_gaps
// ---------------------------------------------------------------------------

export interface GetGroundingGapsParams {
  graphJson?: string;
  graph?: Graph | string;
}

export function get_grounding_gaps(input: string | Graph | GetGroundingGapsParams) {
  let g: Graph;
  if (typeof input === "object" && input !== null && ("graphJson" in input || "graph" in input)) {
    const p = input as GetGroundingGapsParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
  } else {
    g = resolveGraph(input as string | Graph);
  }

  const rawGaps = getGroundingGaps(g);
  const gaps = rawGaps.map((gap) => ({
    nodeId: gap.node.id,
    content: gap.node.content,
    type: gap.node.type,
    rootId: gap.root?.id,
    rootContent: gap.root?.content,
    depth: gap.depth,
  }));

  const ungroundedClaims = getRootQuestions(g)
    .filter((q) => !isFullyGrounded(g, q.id))
    .map((q) => q.id);

  const ungroundedArguments = rawGaps.map((gap) => gap.node.id);

  return {
    gaps,
    ungroundedClaims,
    ungroundedArguments,
    count: gaps.length,
  };
}

// ---------------------------------------------------------------------------
// 5. get_acceptability
// ---------------------------------------------------------------------------

export interface GetAcceptabilityParams {
  graphJson?: string;
  graph?: Graph | string;
  rootId?: string;
}

export function get_acceptability(
  input: string | Graph | GetAcceptabilityParams,
  rootIdOrParams?: string | { rootId?: string },
) {
  let g: Graph;
  let rootId: string | undefined;

  if (typeof input === "object" && input !== null && ("graphJson" in input || "graph" in input)) {
    const p = input as GetAcceptabilityParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
    rootId = p.rootId;
  } else {
    g = resolveGraph(input as string | Graph);
    if (typeof rootIdOrParams === "string") {
      rootId = rootIdOrParams;
    } else if (rootIdOrParams && typeof rootIdOrParams === "object") {
      rootId = rootIdOrParams.rootId;
    }
  }

  const accMap = getAcceptability(g);
  const acceptability: Record<string, "coherent" | "conflicted" | "contested"> = {};
  const coherent: string[] = [];
  const conflicted: string[] = [];
  const contested: string[] = [];

  for (const [id, status] of accMap.entries()) {
    acceptability[id] = status;
    if (status === "coherent") coherent.push(id);
    else if (status === "conflicted") conflicted.push(id);
    else if (status === "contested") contested.push(id);
  }

  return {
    acceptability,
    coherent,
    conflicted,
    contested,
    rootId,
    stats: {
      coherent: coherent.length,
      conflicted: conflicted.length,
      contested: contested.length,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. get_value_clashes
// ---------------------------------------------------------------------------

export interface GetValueClashesParams {
  graphJson?: string;
  graph?: Graph | string;
}

export function get_value_clashes(input: string | Graph | GetValueClashesParams) {
  let g: Graph;
  if (typeof input === "object" && input !== null && ("graphJson" in input || "graph" in input)) {
    const p = input as GetValueClashesParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
  } else {
    g = resolveGraph(input as string | Graph);
  }

  const rawClashes = getValueClashes(g);
  const clashes = rawClashes.map((c) => ({
    questionId: c.question.id,
    question: c.question.content,
    values: c.values.map((v) => ({
      id: v.id,
      content: v.content,
      type: v.type,
    })),
  }));

  return {
    clashes,
    count: clashes.length,
  };
}

// ---------------------------------------------------------------------------
// 7. propose_node
// ---------------------------------------------------------------------------

export interface ProposeNodeParams {
  graphJson?: string;
  graph?: Graph | string;
  parentId: string;
  nodeType?: string;
  type?: NodeType;
  label?: string;
  content?: string;
}

export function propose_node(
  input: string | Graph | ProposeNodeParams,
  parentIdOrParams?: string | { parentId: string; nodeType?: string; type?: NodeType; label?: string; content?: string },
  nodeTypeArg?: string,
  labelArg?: string,
  contentArg?: string,
) {
  let g: Graph;
  let parentId: string;
  let rawNodeType: string;
  let textContent: string;

  if (typeof input === "object" && input !== null && "parentId" in input) {
    const p = input as ProposeNodeParams;
    const raw = p.graphJson ?? p.graph;
    g = resolveGraph(raw);
    parentId = p.parentId;
    rawNodeType = (p.nodeType || p.type) as string;
    textContent = (p.content !== undefined ? p.content : p.label) || "";
  } else {
    g = resolveGraph(input as string | Graph);
    if (typeof parentIdOrParams === "object" && parentIdOrParams !== null) {
      parentId = parentIdOrParams.parentId;
      rawNodeType = (parentIdOrParams.nodeType || parentIdOrParams.type) as string;
      textContent = (parentIdOrParams.content !== undefined ? parentIdOrParams.content : parentIdOrParams.label) || "";
    } else {
      parentId = parentIdOrParams as string;
      rawNodeType = nodeTypeArg as string;
      textContent = (contentArg !== undefined ? contentArg : labelArg) || "";
    }
  }

  if (!parentId) {
    throw new Error("Missing required argument: parentId");
  }
  if (!rawNodeType) {
    throw new Error("Missing required argument: nodeType (or type)");
  }

  const parent = getNode(g, parentId);
  if (!parent) {
    throw new Error(`Parent node ${parentId} not found`);
  }

  const type = rawNodeType.toLowerCase() as NodeType;
  if (!NODE_TYPES.includes(type)) {
    throw new Error(`Invalid node type "${rawNodeType}". Allowed types: ${NODE_TYPES.join(", ")}`);
  }

  const allowed = ALLOWED_CHILDREN[parent.type] || [];
  if (!allowed.includes(type)) {
    throw new Error(
      `Invalid child type "${type}" for parent type "${parent.type}". Allowed: ${allowed.join(", ")}`
    );
  }

  const updatedGraph = addNode(g, type, textContent, parentId);
  const newNode = updatedGraph.nodes[updatedGraph.nodes.length - 1];
  const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1];

  return {
    success: true,
    newNodeId: newNode.id,
    node: newNode,
    edgeType: newEdge?.edgeType || edgeTypeFor(type, parent.type),
    graph: updatedGraph,
    graphJson: JSON.stringify(updatedGraph),
  };
}

// ---------------------------------------------------------------------------
// Tool Dispatcher & MCP Schema Definitions
// ---------------------------------------------------------------------------

export const mcpTools = {
  get_graph,
  get_children,
  get_roots,
  get_grounding_gaps,
  get_acceptability,
  get_value_clashes,
  propose_node,
};

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "get_graph",
    description:
      "Parses an Axiomer graph JSON string or object and returns full node/edge structure, epistemic grounding statistics, and coherence metrics.",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
      },
      required: [],
    },
  },
  {
    name: "get_children",
    description:
      "Returns immediate child nodes, connecting edge types, and sub-arguments nested under a specific node ID.",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
        nodeId: {
          type: "string",
          description: "Unique identifier of the parent node to inspect",
        },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "get_roots",
    description:
      "Returns all top-level entry points in the epistemic tree (root question claims and foundational premises).",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
      },
      required: [],
    },
  },
  {
    name: "get_grounding_gaps",
    description:
      "Returns all ungrounded claims and arguments with path details and tree depths to missing terminal foundations (values, sources, limits, bedrock, preferences).",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
      },
      required: [],
    },
  },
  {
    name: "get_acceptability",
    description:
      "Computes Dung grounded extension semantics and returns acceptability status ('coherent', 'conflicted', 'contested') for all argument nodes.",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
        rootId: {
          type: "string",
          description: "Optional root claim ID to scope acceptability evaluation",
        },
      },
      required: [],
    },
  },
  {
    name: "get_value_clashes",
    description:
      "Identifies all root questions whose derivations ground in multiple conflicting terminal values, limits, or preferences.",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
      },
      required: [],
    },
  },
  {
    name: "propose_node",
    description:
      "Validates parent-child ontology rules, infers the canonical semantic edge type, and immutably appends a new node and edge to the graph.",
    inputSchema: {
      type: "object",
      properties: {
        graphJson: {
          type: "string",
          description: "Serialized Axiomer graph JSON string",
        },
        parentId: {
          type: "string",
          description: "ID of the parent node to attach the new node to",
        },
        nodeType: {
          type: "string",
          enum: [
            "claim",
            "premise",
            "support",
            "conflict",
            "note",
            "value",
            "source",
            "limit",
            "bedrock",
            "preference",
          ],
          description: "Ontological type of the new node",
        },
        label: {
          type: "string",
          description: "Short label or proposition text for the node",
        },
        content: {
          type: "string",
          description: "Detailed proposition text or content for the node",
        },
      },
      required: ["parentId", "nodeType"],
    },
  },
];

/**
 * Execute an MCP tool by name with arguments object.
 */
export function executeTool(name: string, args: Record<string, any>): any {
  switch (name) {
    case "get_graph":
      return get_graph(args as any);
    case "get_children":
      return get_children(args as any);
    case "get_roots":
      return get_roots(args as any);
    case "get_grounding_gaps":
      return get_grounding_gaps(args as any);
    case "get_acceptability":
      return get_acceptability(args as any);
    case "get_value_clashes":
      return get_value_clashes(args as any);
    case "propose_node":
      return propose_node(args as any);
    default:
      throw new Error(`Unknown MCP tool "${name}"`);
  }
}
