import { describe, expect, it } from "vitest";
import {
  addThought,
  connectThought,
  diffRoadmaps,
  exampleGraph,
  hasRoadmapChanges,
  rebaseRoadmap,
  removeThought,
  validateRoadmap,
  type Roadmap,
} from "./model";
import { readDrafts } from "./storage";
const edit = (g: Roadmap, id: string, text: string) => ({
  ...g,
  nodes: g.nodes.map((n) => (n.id === id ? { ...n, text } : n)),
});

describe("reviewing the meaning of a correction", () => {
  it("shows label and legacy semantic-only edits instead of hiding them", () => {
    const base = exampleGraph();
    base.edges[0] = {
      ...base.edges[0],
      label: "supports",
      semantic: { from: "r", to: "v", type: "supports" },
    };
    const changed = {
      ...base,
      edges: base.edges.map((e, i) =>
        i === 0
          ? {
              ...e,
              label: "challenges",
              semantic: { from: "r", to: "v", type: "conflicts" },
            }
          : e,
      ),
    };
    const d = diffRoadmaps(base, changed);
    expect(d.connectionsEdited).toHaveLength(1);
    expect(d.connectionsAdded).toHaveLength(0);
    expect(d.connectionsRemoved).toHaveLength(0);
    expect(d.connectionsEdited[0].before.semantic?.type).toBe("supports");
    expect(d.connectionsEdited[0].after.semantic?.type).toBe("conflicts");
    const onlySemantic = {
      ...base,
      edges: base.edges.map((e, i) =>
        i === 0
          ? { ...e, semantic: { from: "r", to: "v", type: "grounds" } }
          : e,
      ),
    };
    expect(hasRoadmapChanges(base, onlySemantic)).toBe(true);
    const regenerated = {
      ...base,
      edges: base.edges.map((e) => ({ ...e, id: "copy-" + e.id })),
    };
    expect(hasRoadmapChanges(base, regenerated)).toBe(false);
  });
  it("reports changed branch reading order and rejects broken semantic references", () => {
    const base = exampleGraph(),
      changed = {
        ...base,
        edges: [
          base.edges[0],
          base.edges[2],
          base.edges[1],
          ...base.edges.slice(3),
        ],
      };
    expect(diffRoadmaps(base, changed).branchOrderChanged).toEqual([
      { from: "r", before: ["a", "b"], after: ["b", "a"] },
    ]);
    expect(() =>
      validateRoadmap({
        ...base,
        edges: base.edges.map((e, i) =>
          i === 0
            ? { ...e, semantic: { from: "missing", to: "v", type: "grounds" } }
            : e,
        ),
      }),
    ).toThrow("Original relationship");
  });
});

describe("updating a proposal against later published work", () => {
  it("combines independent edits and additions without changing any input", () => {
    const base = exampleGraph(),
      proposed = edit(base, "a", "Contributor reason"),
      latest = addThought(
        edit(base, "b", "Owner clarification"),
        "New owner branch",
        "v",
        null,
        "owner-step",
      );
    const snapshot = JSON.stringify([base, proposed, latest]);
    const result = rebaseRoadmap(base, proposed, latest);
    expect(result.conflicts).toHaveLength(0);
    expect(result.graph?.nodes.find((n) => n.id === "a")?.text).toBe(
      "Contributor reason",
    );
    expect(result.graph?.nodes.find((n) => n.id === "b")?.text).toBe(
      "Owner clarification",
    );
    expect(result.graph?.nodes.some((n) => n.id === "owner-step")).toBe(true);
    expect(JSON.stringify([base, proposed, latest])).toBe(snapshot);
  });
  it("requires an explicit choice for conflicting edits and retains other owner changes", () => {
    const base = exampleGraph(),
      proposed = edit(base, "v", "My value"),
      latest = edit(
        edit(base, "v", "Owner value"),
        "a",
        "Keep this owner edit",
      );
    const pending = rebaseRoadmap(base, proposed, latest);
    expect(pending.graph).toBeNull();
    expect(pending.conflicts[0].key).toBe("thought:v");
    expect(pending.conflicts[0].choice).toBeUndefined();
    const resolved = rebaseRoadmap(base, proposed, latest, {
      "thought:v": "proposed",
    });
    expect(resolved.graph?.nodes[0].text).toBe("My value");
    expect(resolved.graph?.nodes.find((n) => n.id === "a")?.text).toBe(
      "Keep this owner edit",
    );
  });
  it("asks about delete-versus-edit instead of silently deleting the newer thought", () => {
    const base = exampleGraph(),
      proposed = removeThought(base, "b"),
      latest = edit(base, "b", "Owner rewrite");
    expect(rebaseRoadmap(base, proposed, latest).conflicts[0]).toMatchObject({
      kind: "thought",
      proposed: null,
    });
    expect(
      rebaseRoadmap(base, proposed, latest, {
        "thought:b": "latest",
      }).graph?.nodes.find((n) => n.id === "b")?.text,
    ).toBe("Owner rewrite");
  });
  it("blocks structurally invalid combinations instead of pruning others' work", () => {
    const base = exampleGraph(),
      proposed = removeThought(base, "b"),
      latest = addThought(base, "Owner added child", "b", null, "child");
    const result = rebaseRoadmap(base, proposed, latest);
    expect(result.graph).toBeNull();
    expect(result.error).toMatch(/missing/);
    expect(latest.nodes.some((n) => n.id === "child")).toBe(true);
    const left = connectThought(base, "a", "b"),
      right = connectThought(base, "b", "a");
    expect(rebaseRoadmap(base, left, right).graph).toBeNull();
  });
  it("carries a reordered reading path forward and preserves every concurrent branch", () => {
    const base = exampleGraph(),
      proposed = {
        ...base,
        edges: [
          base.edges[0],
          base.edges[2],
          base.edges[1],
          ...base.edges.slice(3),
        ],
      };
    const result = rebaseRoadmap(
      base,
      proposed,
      edit(base, "e", "Owner end note"),
    );
    expect(
      result.graph?.edges.filter((e) => e.from === "r").map((e) => e.to),
    ).toEqual(["b", "a"]);
    const ours = addThought(base, "My branch", "r", null, "ours"),
      theirs = addThought(base, "Owner branch", "r", null, "theirs");
    const merged = rebaseRoadmap(base, ours, theirs, { "order:r": "proposed" });
    expect(
      merged.graph?.edges.filter((e) => e.from === "r").map((e) => e.to),
    ).toEqual(["a", "b", "ours", "theirs"]);
  });
  it("restores a prepared update and its selected draft without discarding another draft's AI queue", () => {
    const base = exampleGraph(),
      draft = {
        id: "updated",
        title: "Updated",
        graph: base,
        updated: "now",
        publishedId: "map",
        revision: "latest",
        ownerId: "owner",
        replacesProposalId: "original",
      };
    const data = {
      drafts: [{ ...draft, id: "earlier" }, draft],
      queue: { draftId: "earlier", steps: [] },
      activeDraftId: "updated",
    };
    const result = readDrafts({ getItem: () => JSON.stringify(data) });
    expect(result.error).toBeNull();
    expect(result.activeDraftId).toBe("updated");
    expect(result.drafts[1].replacesProposalId).toBe("original");
    expect(result.queue?.draftId).toBe("earlier");
  });
});
