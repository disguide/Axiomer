// The thinking framework maps plain-language prompts onto the existing graph model.
// A personal profile is separate context, never an inferred personality score.
import type { Graph, GraphEdge, GraphNode, NodeType } from "./types";
import { isTerminalType } from "./types";
import { edgeEndpoints } from "./graph";
import { assertGraphTextSize, validateGraph } from "./io";

export interface ThinkingProfile {
  values: string[];
  beliefs: string[];
  personality: string;
}

export interface GuidedArgument {
  question: string;
  position: string;
  reason: string;
  assumption: string;
  source: string;
  value: string;
  objection: string;
}

export type TreeRelation = "supports" | "conflicts" | "annotates";
export interface ComposeOptions {
  rootId?: string;
  parentId?: string;
  relation?: TreeRelation;
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function relationship(parent: string, child: string, edgeType: GraphEdge["edgeType"]): GraphEdge {
  const downward = edgeType === "grounds" || edgeType === "cites";
  return { id: id("edge"), from: downward ? parent : child, to: downward ? child : parent, edgeType };
}

/** Build only the content the person entered. Prompts never become authored beliefs. */
export function buildGuidedArgument(input: GuidedArgument): Graph {
  for (const key of ["question", "position", "reason"] as const) {
    if (typeof input[key] !== "string" || !input[key].trim())
      throw new Error(`Add a ${key} before creating the argument`);
  }
  const graph: Graph = { nodes: [], edges: [] };
  const add = (type: NodeType, text: string, parent?: string, relation: GraphEdge["edgeType"] = "supports") => {
    const node: GraphNode = { id: id("node"), type, content: text.trim() };
    graph.nodes.push(node);
    if (parent) graph.edges.push(relationship(parent, node.id, relation));
    return node.id;
  };
  const question = add("claim", input.question);
  const position = add("claim", input.position, question);
  const reason = add("support", input.reason, position);
  if (input.assumption?.trim()) add("premise", input.assumption, reason, "annotates");
  if (input.source?.trim()) add("source", input.source, reason, "cites");
  if (input.value?.trim()) add("value", input.value, reason, "grounds");
  if (input.objection?.trim()) add("conflict", input.objection, position, "conflicts");
  return validateGraph(graph);
}

function rootIds(graph: Graph): string[] {
  const children = new Set(graph.edges.map((edge) => edgeEndpoints(edge).child));
  return graph.nodes.filter((node) => !children.has(node.id)).map((node) => node.id);
}

function checkAttachment(target: Graph, parentId: string | undefined, relation: TreeRelation | undefined): void {
  if (relation !== undefined && !["supports", "conflicts", "annotates"].includes(relation))
    throw new Error("Choose Supports, Challenges, or Context for the attachment");
  if (parentId === undefined) {
    if (relation !== undefined) throw new Error("Choose a parent thought for this relationship");
    return;
  }
  const parent = target.nodes.find((node) => node.id === parentId);
  if (!parent) throw new Error("The attachment thought no longer exists");
  if (isTerminalType(parent.type)) throw new Error("A foundation cannot contain another tree. Choose a reasoning thought.");
}

/**
 * Attach a copy, never a live reference. Every imported identity is regenerated,
 * so editing one map cannot change another map that supplied a tree.
 */
export function composeTree(target: Graph, incoming: Graph, options: ComposeOptions = {}): Graph {
  const current = validateGraph(target);
  const source = validateGraph(incoming);
  checkAttachment(current, options.parentId, options.relation);
  if (!source.nodes.length) throw new Error("Choose a tree with at least one thought");
  const selected = new Set<string>();
  if (options.rootId !== undefined) {
    if (!source.nodes.some((node) => node.id === options.rootId)) throw new Error("The selected tree root does not exist");
    const children = new Map<string, string[]>();
    for (const edge of source.edges) {
      const { parent, child } = edgeEndpoints(edge);
      const list = children.get(parent) || [];
      list.push(child);
      children.set(parent, list);
    }
    const queue = [options.rootId];
    selected.add(options.rootId);
    for (let index = 0; index < queue.length; index += 1) {
      for (const child of children.get(queue[index]) || []) {
        if (!selected.has(child)) { selected.add(child); queue.push(child); }
      }
    }
  } else {
    for (const node of source.nodes) selected.add(node.id);
  }
  const occupiedNodeIds = new Set(current.nodes.map((node) => node.id));
  const occupiedEdgeIds = new Set(current.edges.map((edge) => edge.id));
  const newNodeId = () => {
    let value = id("node");
    while (occupiedNodeIds.has(value)) value = id("node");
    occupiedNodeIds.add(value);
    return value;
  };
  const newEdgeId = () => {
    let value = id("edge");
    while (occupiedEdgeIds.has(value)) value = id("edge");
    occupiedEdgeIds.add(value);
    return value;
  };
  const identities = new Map(source.nodes.filter((node) => selected.has(node.id)).map((node) => [node.id, newNodeId()]));
  const copiedNodes = source.nodes.filter((node) => selected.has(node.id)).map((node) => ({
    ...node,
    id: identities.get(node.id)!,
    ...(node.position ? { position: { ...node.position } } : {}),
  }));
  const copiedEdges = source.edges.filter((edge) => selected.has(edge.from) && selected.has(edge.to)).map((edge) => ({
    ...edge, id: newEdgeId(), from: identities.get(edge.from)!, to: identities.get(edge.to)!,
  }));
  if (options.parentId !== undefined) {
    const roots = options.rootId !== undefined ? [options.rootId] : rootIds(source);
    for (const root of roots) {
      const edge = relationship(options.parentId, identities.get(root)!, options.relation || "supports");
      copiedEdges.push({ ...edge, id: newEdgeId() });
    }
  }
  return validateGraph({ nodes: [...current.nodes, ...copiedNodes], edges: [...current.edges, ...copiedEdges] });
}

/**
 * A deterministic stale-edit guard, not an authentication token or proof of truth.
 * Sorting identities makes serialization order irrelevant; every saved node field
 * and connection participates, including URLs, verification, and positions.
 */
export function graphFingerprint(graph: Graph): string {
  const checked = validateGraph(graph);
  const canonical = JSON.stringify({
    nodes: [...checked.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...checked.edges].sort((a, b) => a.id.localeCompare(b.id)),
  });
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < canonical.length; index += 1) {
    first = Math.imul(first ^ canonical.charCodeAt(index), 0x01000193);
    second = Math.imul(second ^ canonical.charCodeAt(index), 0x85ebca6b);
  }
  return `axiomer-v1-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export interface AiProposal {
  version: 1;
  baseFingerprint: string;
  summary: string;
  additions: Graph;
  attachTo?: string;
  relation?: TreeRelation;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate an external AI draft without applying it or contacting a model. */
export function parseAiProposal(text: string, currentGraph: Graph): AiProposal {
  assertGraphTextSize(text);
  let input: unknown;
  try { input = JSON.parse(text); } catch { throw new Error("The AI proposal must be valid JSON"); }
  if (!isObject(input)) throw new Error("The AI proposal must be an object");
  const allowed = new Set(["version", "baseFingerprint", "summary", "additions", "attachTo", "relation"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("AI proposals can only add a tree. Remove unsupported operations or fields.");
  if (input.version !== 1) throw new Error("Unsupported AI proposal version");
  if (input.baseFingerprint !== graphFingerprint(currentGraph)) throw new Error("This map changed since the AI draft was requested. Request a fresh draft before applying it.");
  if (typeof input.summary !== "string" || !input.summary.trim() || input.summary.length > 5000) throw new Error("Add a short summary of the AI proposal");
  if (!isObject(input.additions) || Object.keys(input.additions).some((key) => key !== "nodes" && key !== "edges")) throw new Error("AI additions must contain only nodes and edges");
  const additions = validateGraph(input.additions);
  if (!additions.nodes.length) throw new Error("The AI draft does not add any thoughts");
  if (input.attachTo !== undefined && typeof input.attachTo !== "string") throw new Error("Choose a valid attachment thought");
  if (input.relation !== undefined && typeof input.relation !== "string") throw new Error("Choose a valid attachment relationship");
  if (input.attachTo !== undefined && input.relation === undefined) throw new Error("An attached AI tree needs a Supports, Challenges, or Context relationship");
  checkAttachment(currentGraph, input.attachTo as string | undefined, input.relation as TreeRelation | undefined);
  return {
    version: 1,
    baseFingerprint: input.baseFingerprint as string,
    summary: input.summary.trim(),
    additions,
    ...(input.attachTo !== undefined ? { attachTo: input.attachTo as string } : {}),
    ...(input.relation !== undefined ? { relation: input.relation as TreeRelation } : {}),
  };
}

/** Re-check immediately before approval so a stale preview cannot overwrite work. */
export function applyAiProposal(currentGraph: Graph, proposal: AiProposal): Graph {
  const checked = parseAiProposal(JSON.stringify(proposal), currentGraph);
  return composeTree(currentGraph, checked.additions, { parentId: checked.attachTo, relation: checked.relation });
}
