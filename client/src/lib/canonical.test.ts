// CI gate for the CANONICAL GRAPH (client/public/graph.json).
//
// The canonical graph is data-in-Git: contributors edit it through pull
// requests (often by pasting an in-app export over the file on github.com).
// This suite runs in `npm test` — and therefore on every PR — so a paste
// that breaks the file fails CI with a readable reason instead of shipping
// a broken public viewer.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateGraph } from "./io";
import * as G from "./graph";

const CANONICAL_URL = new URL("../../public/graph.json", import.meta.url);

function loadCanonical() {
  const text = readFileSync(CANONICAL_URL, "utf8");
  return { text, json: JSON.parse(text) as unknown };
}

describe("canonical graph (client/public/graph.json)", () => {
  it("is valid JSON", () => {
    expect(() => loadCanonical()).not.toThrow();
  });

  it("passes strict graph validation (types, edges, referential integrity)", () => {
    const { json } = loadCanonical();
    expect(() => validateGraph(json)).not.toThrow();
  });

  it("has at least one root and no orphaned non-root nodes", () => {
    const graph = validateGraph(loadCanonical().json);
    const roots = G.getRoots(graph);
    expect(roots.length).toBeGreaterThan(0);
    // Every node must be reachable from some root (no floating islands from
    // a bad hand-edit). Terminals shared across trees are reachable too.
    const reachable = new Set<string>();
    for (const root of roots) {
      for (const id of G.getDescendantIds(graph, root.id)) reachable.add(id);
    }
    const stranded = graph.nodes.filter((n) => !reachable.has(n.id));
    expect(
      stranded.map((n) => `${n.id} (${n.type}: ${n.content.slice(0, 40)})`),
    ).toEqual([]);
  });

  it("has unique node and edge ids", () => {
    const graph = validateGraph(loadCanonical().json);
    const nodeIds = graph.nodes.map((n) => n.id);
    const edgeIds = graph.edges.map((e) => e.id);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
  });

  it("terminals have no structural children (the terminal rule)", () => {
    const graph = validateGraph(loadCanonical().json);
    for (const t of G.getTerminals(graph)) {
      expect(
        G.getChildren(graph, t.id).map((c) => `${t.id} -> ${c.id}`),
      ).toEqual([]);
    }
  });
});
