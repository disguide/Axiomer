import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import { edgeEndpoints, getChildren } from "./graph";
import { applyAiProposal, buildGuidedArgument, composeTree, graphFingerprint, parseAiProposal, type GuidedArgument } from "./framework";

const form: GuidedArgument = {
  question: "Should our town build a library?", position: "Build a small library", reason: "More people can access books",
  assumption: "The library will be reachable", source: "Survey of residents", value: "Equal access to learning", objection: "The cost may displace another service",
};
const empty: Graph = { nodes: [], edges: [] };
const base: Graph = { nodes: [{ id: "existing", type: "claim", content: "How should we spend the budget?" }], edges: [] };
const draft = () => buildGuidedArgument(form);
const proposal = (current: Graph, additions = draft()) => ({ version: 1, baseFingerprint: graphFingerprint(current), summary: "Add a library argument for review", additions });

describe("guided argument framework", () => {
  it("builds a connected argument with assumptions, evidence, values, and objections", () => {
    const graph = draft();
    expect(graph.nodes).toHaveLength(7);
    const byContent = (content: string) => graph.nodes.find((node) => node.content === content)!;
    const position = byContent(form.position);
    expect(getChildren(graph, byContent(form.question).id)).toEqual([position]);
    expect(getChildren(graph, position.id).map((node) => node.type)).toEqual(["support", "conflict"]);
    const reason = byContent(form.reason);
    expect(getChildren(graph, reason.id).map((node) => node.type)).toEqual(["premise", "source", "value"]);
    expect(graph.edges.find((edge) => edge.edgeType === "cites")?.from).toBe(reason.id);
    expect(graph.edges.find((edge) => edge.edgeType === "grounds")?.from).toBe(reason.id);
    expect(getChildren(graph, byContent(form.source).id)).toHaveLength(0);
  });

  it("omits optional prompts and trims content without inventing beliefs", () => {
    const graph = buildGuidedArgument({ ...form, question: "  A question?  ", assumption: "", source: " ", value: "", objection: "" });
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0].content).toBe("A question?");
    expect(graph.nodes.every((node) => node.content.trim())).toBe(true);
  });

  it.each(["question", "position", "reason"] as const)("requires a person-entered %s", (key) => {
    expect(() => buildGuidedArgument({ ...form, [key]: " " })).toThrow(key);
  });
});

describe("tree composition", () => {
  it("copies a tree with fresh identities, correct relationship, and no input mutation", () => {
    const source = draft();
    const snapshot = JSON.stringify({ base, source });
    const result = composeTree(base, source, { parentId: "existing", relation: "conflicts" });
    expect(result.nodes).toHaveLength(base.nodes.length + source.nodes.length);
    expect(source.nodes.some((node) => result.nodes.some((copy) => copy.id === node.id))).toBe(false);
    expect(source.edges.some((edge) => result.edges.some((copy) => copy.id === edge.id))).toBe(false);
    const attachment = result.edges.find((edge) => edge.edgeType === "conflicts" && edge.to === "existing")!;
    expect(edgeEndpoints(attachment).parent).toBe("existing");
    expect(JSON.stringify({ base, source })).toBe(snapshot);
    result.nodes[1].content = "Edit the copy";
    expect(source.nodes[0].content).toBe(form.question);
  });

  it("selects only the chosen root and its semantic descendants", () => {
    const source = draft();
    source.nodes.push({ id: "unrelated", type: "claim", content: "Another question" });
    const reason = source.nodes.find((node) => node.type === "support")!;
    const result = composeTree(empty, source, { rootId: reason.id });
    expect(result.nodes.map((node) => node.content)).toEqual([form.reason, form.assumption, form.source, form.value]);
    expect(result.edges).toHaveLength(3);
  });

  it("preserves source metadata and does not automatically merge matching values", () => {
    const source: Graph = { nodes: [{ id: "value", type: "value", content: "Fairness", url: "https://example.com/fairness", verified: false, position: { x: 10, y: 20 } }], edges: [] };
    const once = composeTree(empty, source);
    const twice = composeTree(once, source);
    expect(twice.nodes).toHaveLength(2);
    expect(twice.nodes[1]).toMatchObject({ content: "Fairness", url: "https://example.com/fairness", verified: false, position: { x: 10, y: 20 } });
    twice.nodes[1].position!.x = 50;
    expect(source.nodes[0].position!.x).toBe(10);
  });

  it("refuses missing or terminal parents and invalid roots and relationships", () => {
    const target = composeTree(base, { nodes: [{ id: "v", type: "value", content: "Fairness" }], edges: [] });
    const terminal = target.nodes.find((node) => node.type === "value")!;
    expect(() => composeTree(target, draft(), { parentId: terminal.id })).toThrow(/foundation/i);
    expect(() => composeTree(target, draft(), { parentId: "missing" })).toThrow(/no longer exists/);
    expect(() => composeTree(base, draft(), { rootId: "missing" })).toThrow(/root does not exist/);
    expect(() => composeTree(base, draft(), { relation: "supports" })).toThrow(/parent thought/);
  });
});

describe("AI addition proposals", () => {
  it("is an explicit preview followed by an additive apply; approval never edits originals", () => {
    const before = JSON.stringify(base);
    const checked = parseAiProposal(JSON.stringify({ ...proposal(base), attachTo: "existing", relation: "supports" }), base);
    expect(JSON.stringify(base)).toBe(before);
    const next = applyAiProposal(base, checked);
    expect(next.nodes[0]).toEqual(base.nodes[0]);
    expect(next.nodes.length).toBeGreaterThan(base.nodes.length);
    expect(() => applyAiProposal(next, checked)).toThrow(/changed/);
  });

  it("rejects stale drafts, unsupported destructive operations and invalid attachments", () => {
    expect(() => parseAiProposal(JSON.stringify(proposal(empty)), base)).toThrow(/changed/);
    expect(() => parseAiProposal(JSON.stringify({ ...proposal(base), deleteIds: ["existing"] }), base)).toThrow(/only add/);
    expect(() => parseAiProposal(JSON.stringify({ ...proposal(base), attachTo: "existing" }), base)).toThrow(/relationship/);
    expect(() => parseAiProposal(JSON.stringify({ ...proposal(base), attachTo: "missing", relation: "supports" }), base)).toThrow(/no longer exists/);
    expect(() => parseAiProposal(JSON.stringify({ ...proposal(base), attachTo: "existing", relation: "delete" }), base)).toThrow(/Choose Supports/);
    expect(() => parseAiProposal(JSON.stringify({ ...proposal(base), additions: { ...draft(), mutations: [] } }), base)).toThrow(/only nodes and edges/);
  });

  it("checks metadata and connections but ignores serialization order in fingerprints", () => {
    const graph = draft();
    expect(graphFingerprint({ nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() })).toBe(graphFingerprint(graph));
    const changed = structuredClone(graph);
    changed.nodes[0].verified = true;
    expect(graphFingerprint(changed)).not.toBe(graphFingerprint(graph));
    changed.nodes[0].url = "https://example.com";
    expect(graphFingerprint(changed)).not.toBe(graphFingerprint(graph));
    expect(graphFingerprint({ nodes: graph.nodes, edges: graph.edges.slice(1) })).not.toBe(graphFingerprint(graph));
  });

  it("cannot apply an invalid or circular additions graph", () => {
    const additions: Graph = { nodes: [{ id: "a", type: "claim", content: "A" }, { id: "b", type: "claim", content: "B" }], edges: [{ id: "e1", from: "a", to: "b", edgeType: "supports" }, { id: "e2", from: "b", to: "a", edgeType: "supports" }] };
    expect(() => parseAiProposal(JSON.stringify(proposal(base, additions)), base)).toThrow(/circular/);
  });
});
