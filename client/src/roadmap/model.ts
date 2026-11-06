import { validateWhiteboard, whiteboardMeaning, type WhiteboardAnnotation } from "./whiteboard.ts";
export type { WhiteboardAnnotation } from "./whiteboard.ts";

export const KINDS = [
  "value",
  "premise",
  "claim",
  "support",
  "conflict",
  "note",
  "source",
  "limit",
  "bedrock",
  "preference",
] as const;
export type Kind = (typeof KINDS)[number];
export interface Source {
  id: string;
  title: string;
  url: string;
  locator?: string;
}
export interface Thought {
  id: string;
  text: string;
  kind: Kind | null;
  sources?: Source[];
}
export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  semantic?: { from: string; to: string; type: string };
}
export type DrawingPositions = Record<string, { x: number; y: number }>;
export interface WhiteboardLayer { annotations: WhiteboardAnnotation[]; positions: DrawingPositions }
function validateDrawingPositions(value: unknown, ids: Set<string>): DrawingPositions {
  if (value === undefined) return {};
  if (!record(value) || Object.keys(value).length > 20000) throw new Error("Invalid drawing arrangement");
  const result: DrawingPositions = Object.create(null);
  for (const [id, point] of Object.entries(value)) {
    if (!ids.has(id) || !record(point) || Object.keys(point).some(k => k !== "x" && k !== "y") || typeof point.x !== "number" || typeof point.y !== "number" || !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1e8 || Math.abs(point.y) > 1e8) throw new Error("Invalid drawing arrangement point");
    result[id] = { x: point.x, y: point.y };
  }
  return result;
}
function drawingLayer(g: Roadmap): WhiteboardLayer { return { annotations: validateWhiteboard(g.whiteboard), positions: validateDrawingPositions(g.whiteboardPositions, new Set(g.nodes.map(n => n.id))) }; }
function drawingMeaning(value: WhiteboardLayer) { return JSON.stringify([whiteboardMeaning(value.annotations), Object.entries(value.positions).sort(([a], [b]) => a.localeCompare(b))]); }
export interface Roadmap {
  schema: 2;
  anchor: string | null;
  nodes: Thought[];
  edges: Connection[];
  whiteboard?: WhiteboardAnnotation[];
  whiteboardPositions?: DrawingPositions;
}
export interface Draft {
  id: string;
  title: string;
  graph: Roadmap;
  updated: string;
  publishedId?: string;
  revision?: string;
  ownerId?: string;
  replacesProposalId?: string;
}
export interface Suggestion {
  id: string;
  text: string;
  parentId: string | null;
  kind: Kind | null;
  rationale: string;
  excerpt: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
}
export const uid = () => crypto.randomUUID();
export const emptyGraph = (): Roadmap => ({
  schema: 2,
  anchor: null,
  nodes: [],
  edges: [],
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function str(v: unknown, name: string, max = 10000): string {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new Error(`${name} is missing or too long`);
  return v;
}
/** Evidence is author-supplied metadata, never fetched or certified by validation. */
export function validateSources(value: unknown): Source[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw new Error("A thought can have up to 20 sources");
  const sources = value.map((item): Source => {
    if (!record(item)) throw new Error("Invalid source");
    const id = str(item.id, "Source ID", 150).trim();
    const title = str(item.title, "Source title", 300).trim();
    const raw = str(item.url, "Source URL", 2048).trim();
    let url: URL;
    try {
      if (/[\u0000-\u0020\u007f]/.test(raw)) throw new Error();
      url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol) ||
          !url.hostname || url.username || url.password) throw new Error();
    } catch {
      throw new Error("Source URL must use HTTP or HTTPS without login details");
    }
    const source: Source = { id, title, url: url.href };
    if (item.locator !== undefined) {
      if (typeof item.locator !== "string" || item.locator.length > 500)
        throw new Error("Source location is too long");
      if (item.locator.trim()) source.locator = item.locator.trim();
    }
    return source;
  });
  if (new Set(sources.map((source) => source.id)).size !== sources.length)
    throw new Error("Duplicate source IDs on a thought");
  return sources;
}
function thoughtMeaning(thought: Thought) {
  return JSON.stringify([
    thought.id, thought.text, thought.kind,
    validateSources(thought.sources),
  ]);
}
export function validateRoadmap(value: unknown): Roadmap {
  if (
    !record(value) ||
    value.schema !== 2 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  )
    throw new Error("Not an Axiomer roadmap");
  if (value.nodes.length > 20000 || value.edges.length > 60000)
    throw new Error("This release supports up to 20,000 thoughts per map");
  const nodes = value.nodes.map((n: unknown): Thought => {
    if (!record(n)) throw new Error("Invalid thought");
    if (n.kind !== null && !KINDS.includes(n.kind as Kind))
      throw new Error("Unknown thought label");
    return {
      id: str(n.id, "Thought ID", 150),
      text: str(n.text, "Thought"),
      kind: n.kind as Kind | null,
      ...(n.sources !== undefined ? { sources: validateSources(n.sources) } : {}),
    };
  });
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) throw new Error("Duplicate thought IDs");
  const edges = value.edges.map((e: unknown): Connection => {
    if (!record(e)) throw new Error("Invalid connection");
    const from = str(e.from, "Connection start", 150),
      to = str(e.to, "Connection end", 150);
    if (!ids.has(from) || !ids.has(to) || from === to)
      throw new Error("Connection points to a missing or identical thought");
    const edge: Connection = {
      id: str(e.id, "Connection ID", 150),
      from,
      to,
      label: typeof e.label === "string" ? e.label.slice(0, 100) : "",
    };
    if (record(e.semantic))
      edge.semantic = {
        from: str(e.semantic.from, "Semantic source", 150),
        to: str(e.semantic.to, "Semantic target", 150),
        type: str(e.semantic.type, "Semantic relation", 100),
      };
    if (
      edge.semantic &&
      (!ids.has(edge.semantic.from) ||
        !ids.has(edge.semantic.to) ||
        edge.semantic.from === edge.semantic.to)
    )
      throw new Error(
        "Original relationship points to a missing or identical thought",
      );
    return edge;
  });
  if (
    new Set(edges.map((e) => e.id)).size !== edges.length ||
    new Set(edges.map((e) => `${e.from}\0${e.to}`)).size !== edges.length
  )
    throw new Error("Duplicate connections");
  const anchor =
    value.anchor === null ? null : str(value.anchor, "Starting thought", 150);
  if ((nodes.length && !anchor) || (anchor && !ids.has(anchor)))
    throw new Error("Starting thought is missing");
  const whiteboard = validateWhiteboard(value.whiteboard);
  const whiteboardPositions = validateDrawingPositions(value.whiteboardPositions, ids);
  const graph: Roadmap = { schema: 2, anchor, nodes, edges, ...(whiteboard.length ? { whiteboard } : {}), ...(Object.keys(whiteboardPositions).length ? { whiteboardPositions } : {}) };
  indexGraph(graph); // Reject cycles with iterative traversal, including deep imports.
  return graph;
}
export function indexGraph(g: Roadmap) {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const children = new Map(g.nodes.map((n) => [n.id, [] as string[]]));
  const parents = new Map(g.nodes.map((n) => [n.id, [] as string[]]));
  const degree = new Map(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) {
    children.get(e.from)?.push(e.to);
    parents.get(e.to)?.push(e.from);
    degree.set(e.to, (degree.get(e.to) || 0) + 1);
  }
  const queue = g.nodes.filter((n) => !degree.get(n.id)).map((n) => n.id),
    order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    order.push(id);
    for (const next of children.get(id) || []) {
      degree.set(next, degree.get(next)! - 1);
      if (!degree.get(next)) queue.push(next);
    }
  }
  if (order.length !== g.nodes.length)
    throw new Error(
      "This connection would create a loop in the reasoning path",
    );
  return { byId, children, parents, order };
}
export function addThought(
  g: Roadmap,
  text: string,
  parent: string | null,
  kind: Kind | null = null,
  id: string = uid(),
): Roadmap {
  if (parent && !g.nodes.some((n) => n.id === parent))
    throw new Error("Choose an existing thought first");
  return validateRoadmap({
    ...g,
    anchor: g.anchor || id,
    nodes: [...g.nodes, { id, text: text.trim(), kind }],
    edges: parent
      ? [...g.edges, { id: uid(), from: parent, to: id, label: "" }]
      : g.edges,
  });
}
export function connectThought(g: Roadmap, from: string, to: string): Roadmap {
  return validateRoadmap({
    ...g,
    edges: [...g.edges, { id: uid(), from, to, label: "" }],
  });
}
export function removeThought(g: Roadmap, id: string): Roadmap {
  const nodes = g.nodes.filter((n) => n.id !== id);
  return validateRoadmap({
    ...g,
    nodes,
    whiteboardPositions: Object.fromEntries(Object.entries(g.whiteboardPositions || {}).filter(([nodeId]) => nodeId !== id)),
    anchor: g.anchor === id ? nodes[0]?.id || null : g.anchor,
    edges: g.edges.filter((e) => e.from !== id && e.to !== id),
  });
}
export function layoutRoadmap(g: Roadmap) {
  const { children, order } = indexGraph(g),
    ranks = new Map<string, number>();
  for (const id of order) {
    const rank = ranks.get(id) || 0;
    ranks.set(id, rank);
    for (const next of children.get(id) || [])
      ranks.set(next, Math.max(ranks.get(next) || 0, rank + 1));
  }
  const groups = new Map<number, string[]>();
  for (const id of order) {
    const r = ranks.get(id)!;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(id);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [r, ids] of groups)
    ids.forEach((id, i) =>
      positions.set(id, { x: (i - (ids.length - 1) / 2) * 300, y: r * 160 }),
    );
  return positions;
}
export function diffRoadmaps(before: Roadmap, after: Roadmap) {
  const old = new Map(before.nodes.map((n) => [n.id, n])),
    next = new Map(after.nodes.map((n) => [n.id, n]));
  const pair = (e: Connection) => JSON.stringify([e.from, e.to]);
  const oldEdges = new Map(before.edges.map((e) => [pair(e), e]));
  const newEdges = new Map(after.edges.map((e) => [pair(e), e]));
  const oldOrder = readingOrder(before),
    newOrder = readingOrder(after);
  return {
    added: after.nodes.filter((n) => !old.has(n.id)),
    removed: before.nodes.filter((n) => !next.has(n.id)),
    edited: after.nodes
      .filter(
        (n) =>
          old.has(n.id) &&
          thoughtMeaning(old.get(n.id)!) !== thoughtMeaning(n),
      )
      .map((n) => ({ before: old.get(n.id)!, after: n })),
    connectionsAdded: after.edges.filter((e) => !oldEdges.has(pair(e))),
    connectionsRemoved: before.edges.filter((e) => !newEdges.has(pair(e))),
    connectionsEdited: after.edges
      .filter(
        (e) =>
          oldEdges.has(pair(e)) &&
          connectionMeaning(oldEdges.get(pair(e))!) !== connectionMeaning(e),
      )
      .map((e) => ({ before: oldEdges.get(pair(e))!, after: e })),
    anchorChanged: before.anchor !== after.anchor,
    whiteboardChanged: drawingMeaning(drawingLayer(before)) !== drawingMeaning(drawingLayer(after)),
    branchOrderChanged: [...newOrder].flatMap(([from, order]) => {
      const previous = oldOrder.get(from) || [];
      const previousIds = new Set(previous);
      const common = new Set(order.filter((id) => previousIds.has(id)));
      const a = previous.filter((id) => common.has(id)),
        b = order.filter((id) => common.has(id));
      return a.length > 1 && JSON.stringify(a) !== JSON.stringify(b)
        ? [{ from, before: previous, after: order }]
        : [];
    }),
  };
}
export function hasRoadmapChanges(before: Roadmap, after: Roadmap) {
  const d = diffRoadmaps(before, after);
  return !!(
    d.added.length ||
    d.removed.length ||
    d.edited.length ||
    d.connectionsAdded.length ||
    d.connectionsRemoved.length ||
    d.connectionsEdited.length ||
    d.anchorChanged ||
    d.whiteboardChanged ||
    d.branchOrderChanged.length
  );
}
function readingOrder(g: Roadmap) {
  const order = new Map<string, string[]>();
  for (const e of g.edges) {
    if (!order.has(e.from)) order.set(e.from, []);
    order.get(e.from)!.push(e.to);
  }
  return order;
}

function connectionMeaning(e: Connection) {
  return JSON.stringify([
    e.from,
    e.to,
    e.label,
    e.semantic?.from ?? null,
    e.semantic?.to ?? null,
    e.semantic?.type ?? null,
  ]);
}
export type MergeChoice = "proposed" | "latest";
export type MergeValue = Thought | Connection | string | string[] | WhiteboardAnnotation[] | WhiteboardLayer | null;
export interface MergeConflict {
  key: string;
  kind: "thought" | "connection" | "anchor" | "order" | "whiteboard";
  base: MergeValue;
  proposed: MergeValue;
  latest: MergeValue;
  choice?: MergeChoice;
}
function fingerprint(value: MergeValue | undefined): string {
  if (value === undefined) return "missing";
  if (value === null || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return value.length && typeof value[0] !== "string" ? whiteboardMeaning(value) : JSON.stringify(value);
  if ("annotations" in value) return drawingMeaning(value);
  return "text" in value
    ? thoughtMeaning(value)
    : connectionMeaning(value);
}
/** Three-way graph merge. Never drops broken links or guesses a conflict choice. */
export function rebaseRoadmap(
  base: Roadmap,
  proposed: Roadmap,
  latest: Roadmap,
  choices: Record<string, MergeChoice> = {},
): { graph: Roadmap | null; conflicts: MergeConflict[]; error: string | null } {
  [base, proposed, latest].forEach(validateRoadmap);
  const conflicts: MergeConflict[] = [];
  function pick<T extends MergeValue>(
    kind: MergeConflict["kind"],
    id: string,
    original: T | undefined,
    ours: T | undefined,
    theirs: T | undefined,
  ): T | undefined {
    if (fingerprint(ours) === fingerprint(original)) return theirs;
    if (
      fingerprint(theirs) === fingerprint(original) ||
      fingerprint(ours) === fingerprint(theirs)
    )
      return ours;
    const key = `${kind}:${id}`;
    const choice = choices[key];
    conflicts.push({
      key,
      kind,
      base: original ?? null,
      proposed: ours ?? null,
      latest: theirs ?? null,
      choice,
    });
    return choice === "proposed" ? ours : theirs;
  }
  function merge<T extends Thought | Connection>(
    kind: "thought" | "connection",
    originals: T[],
    ours: T[],
    theirs: T[],
  ): T[] {
    const b = new Map(originals.map((v) => [v.id, v]));
    const p = new Map(ours.map((v) => [v.id, v]));
    const l = new Map(theirs.map((v) => [v.id, v]));
    return [...new Set([...l.keys(), ...p.keys(), ...b.keys()])].flatMap(
      (id) => {
        const value = pick(kind, id, b.get(id), p.get(id), l.get(id));
        return value ? [value] : [];
      },
    );
  }
  const nodes = merge("thought", base.nodes, proposed.nodes, latest.nodes);
  const mergedEdges = merge(
    "connection",
    base.edges,
    proposed.edges,
    latest.edges,
  );
  const bOrder = readingOrder(base),
    pOrder = readingOrder(proposed),
    lOrder = readingOrder(latest);
  const groups = new Map<string, Connection[]>();
  for (const e of mergedEdges) {
    if (!groups.has(e.from)) groups.set(e.from, []);
    groups.get(e.from)!.push(e);
  }
  const edges = [...groups].flatMap(([from, group]) => {
    const order =
      pick(
        "order",
        from,
        bOrder.get(from) || [],
        pOrder.get(from) || [],
        lOrder.get(from) || [],
      ) || [];
    const ranks = new Map(order.map((id, i) => [id, i]));
    return group.sort(
      (a, b) =>
        (ranks.get(a.to) ?? order.length) - (ranks.get(b.to) ?? order.length),
    );
  });
  const anchor =
    pick("anchor", "start", base.anchor, proposed.anchor, latest.anchor) ??
    null;
  const layer = pick("whiteboard", "drawing", drawingLayer(base), drawingLayer(proposed), drawingLayer(latest))!;
  if (conflicts.some((c) => !c.choice))
    return { graph: null, conflicts, error: null };
  try {
    return {
      graph: validateRoadmap({ schema: 2, anchor, nodes, edges, whiteboard: layer.annotations, whiteboardPositions: layer.positions }),
      conflicts,
      error: null,
    };
  } catch (e) {
    return { graph: null, conflicts, error: (e as Error).message };
  }
}
export function parseSuggestions(value: unknown, g: Roadmap): Suggestion[] {
  if (
    !record(value) ||
    !Array.isArray(value.steps) ||
    !value.steps.length ||
    value.steps.length > 20
  )
    throw new Error("AI must return between 1 and 20 proposed thoughts");
  const existing = new Set(g.nodes.map((n) => n.id));
  return value.steps.map((v: unknown): Suggestion => {
    if (!record(v)) throw new Error("Invalid AI proposal");
    const id = str(v.id, "Proposal ID", 150);
    if (existing.has(id)) throw new Error("AI reused a thought ID");
    const parentId =
      v.parentId === null ? null : str(v.parentId, "Proposal parent", 150);
    if (parentId && !existing.has(parentId))
      throw new Error("AI proposal has a missing or out-of-order parent");
    if (v.kind !== null && !KINDS.includes(v.kind as Kind))
      throw new Error("AI returned an unknown label");
    existing.add(id);
    return {
      id,
      text: str(v.text, "Proposal text"),
      parentId,
      kind: v.kind as Kind | null,
      rationale: str(v.rationale, "Connection explanation", 2000),
      excerpt: typeof v.excerpt === "string" ? v.excerpt.slice(0, 3000) : "",
      status: "pending",
    };
  });
}
export function approveSuggestion(g: Roadmap, step: Suggestion): Roadmap {
  if (step.status !== "pending")
    throw new Error("This suggestion has already been reviewed");
  if (g.nodes.some((n) => n.id === step.id))
    throw new Error("This suggestion was already applied");
  return addThought(g, step.text, step.parentId, step.kind, step.id);
}
export function rejectSuggestion(
  steps: Suggestion[],
  id: string,
): Suggestion[] {
  const blocked = new Set([id]);
  return steps.map((s) => {
    if (s.id === id) return { ...s, status: "rejected" };
    if (s.parentId && blocked.has(s.parentId) && s.status === "pending") {
      blocked.add(s.id);
      return { ...s, status: "blocked" };
    }
    return s;
  });
}
export function importRoadmap(value: unknown): Roadmap {
  if (record(value) && value.schema === 2) return validateRoadmap(value);
  if (record(value) && record(value.graph)) return importRoadmap(value.graph);
  if (
    !record(value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  )
    throw new Error("Choose an Axiomer roadmap or legacy graph JSON");
  const nodes: Thought[] = value.nodes.map((n: Record<string, unknown>) => ({
    id: str(n.id, "Legacy ID", 150),
    text: str(n.content, "Legacy thought"),
    kind: KINDS.includes(n.type as Kind) ? (n.type as Kind) : null,
  }));
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edges: Connection[] = value.edges.map((e: Record<string, unknown>) => {
    const from = str(e.from, "Legacy source", 150),
      to = str(e.to, "Legacy target", 150),
      type = str(e.edgeType, "Legacy relation", 100);
    const downward = ["grounds", "cites"].includes(type);
    // Foundation-first navigation is a projection; retain the exact original semantics.
    const foundation = nodesById.get(to)?.kind === "value";
    return {
      id: str(e.id, "Legacy connection", 150),
      from: foundation || !downward ? to : from,
      to: foundation || !downward ? from : to,
      label: type,
      semantic: { from, to, type },
    };
  });
  const incoming = new Set(edges.map((e) => e.to));
  return validateRoadmap({
    schema: 2,
    nodes,
    edges,
    anchor:
      nodes.find((n) => n.kind === "value" && !incoming.has(n.id))?.id ||
      nodes.find((n) => !incoming.has(n.id))?.id ||
      null,
  });
}
export function exampleGraph(): Roadmap {
  const text = [
    ["v", "Improve well-being and reduce avoidable suffering.", "value"],
    [
      "r",
      "Consider the consequences of our choices for everyone affected.",
      "premise",
    ],
    ["a", "Compare the benefits and harms of each available action.", null],
    [
      "b",
      "Protect individual rights even when a shortcut looks beneficial.",
      "conflict",
    ],
    [
      "c",
      "Make uncertainty and the assumptions behind the comparison explicit.",
      null,
    ],
    [
      "d",
      "Choose the action whose expected benefits justify its harms.",
      "claim",
    ],
    ["e", "Revisit the conclusion when the evidence changes.", null],
  ];
  return validateRoadmap({
    schema: 2,
    anchor: "v",
    nodes: text.map(([id, text, kind]) => ({ id, text, kind })),
    edges: [
      ["v", "r"],
      ["r", "a"],
      ["r", "b"],
      ["a", "c"],
      ["c", "d"],
      ["d", "e"],
    ].map(([from, to], i) => ({ id: `example-${i}`, from, to, label: "" })),
  });
}
