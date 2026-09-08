import { beforeEach, describe, expect, it } from "vitest";
import * as LZString from "lz-string";
import type { Graph } from "./types";
import { migrateGraph } from "./types";
import {
  exportGraph,
  importGraph,
  parseGraph,
  validateGraph,
  exportGraphToMarkdown,
  parseMarkdownGraph,
  parseMarkdownToGraph,
  importGraphFromMarkdown,
} from "./io";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  getGroundingGaps,
  getRoots,
  isFullyGrounded,
} from "./graph";
import { seedGraph } from "./seed";
import type { Project } from "./projectTypes";
import {
  deleteBranchFromProject,
  deleteProjectFromList,
} from "@/hooks/useProjects";

describe("JSON Graph Import/Export & Schema Validation", () => {
  it("round-trips the seed graph via JSON", () => {
    const json = exportGraph(seedGraph, "json");
    const restored = parseGraph(json);
    expect(restored).toEqual(seedGraph);
  });

  it("rejects invalid JSON syntax with clear error", () => {
    expect(() => parseGraph("{ not valid json")).toThrow(/invalid JSON/);
  });

  it("rejects a bad node type in JSON", () => {
    const bad = JSON.stringify({
      nodes: [{ id: "n1", type: "banana_type", content: "x" }],
      edges: [],
    });
    expect(() => parseGraph(bad)).toThrow(/not a valid NodeType/);
  });

  it("rejects a bad edge type in JSON", () => {
    const bad = JSON.stringify({
      nodes: [
        { id: "a", type: "claim", content: "q" },
        { id: "b", type: "support", content: "p" },
      ],
      edges: [{ id: "e", from: "b", to: "a", edgeType: "unsupported_edge" }],
    });
    expect(() => parseGraph(bad)).toThrow(/not a valid EdgeType/);
  });

  it("rejects an edge pointing at a missing node (referential integrity)", () => {
    const bad = JSON.stringify({
      nodes: [{ id: "a", type: "claim", content: "q" }],
      edges: [{ id: "e", from: "ghost_node", to: "a", edgeType: "supports" }],
    });
    expect(() => parseGraph(bad)).toThrow(/has no node/);
  });

  it("rejects non-array nodes or edges", () => {
    expect(() => validateGraph({ nodes: {}, edges: [] })).toThrow(/nodes must be an array/);
    expect(() => validateGraph({ nodes: [], edges: {} })).toThrow(/edges must be an array/);
  });

  it("rejects non-object root input in validateGraph", () => {
    expect(() => validateGraph("plain string")).toThrow(/graph is not an object/);
    expect(() => validateGraph(null)).toThrow(/graph is not an object/);
    expect(() => validateGraph([])).toThrow(/graph is not an object/);
  });

  it("rejects non-string content values in node objects", () => {
    const bad = JSON.stringify({
      nodes: [{ id: "n1", type: "claim", content: 12345 }],
      edges: [],
    });
    expect(() => parseGraph(bad)).toThrow(/nodes\[0\].content must be a string/);
  });

  it("preserves optional attributes and safely ignores unknown attributes", () => {
    const withExtra = JSON.stringify({
      nodes: [
        {
          id: "n1",
          type: "claim",
          content: "Claim text",
          createdAt: "2026-08-22T00:00:00Z",
          customScore: 99,
        },
      ],
      edges: [],
    });
    const parsed = parseGraph(withExtra);
    expect(parsed.nodes[0].id).toBe("n1");
    expect(parsed.nodes[0].createdAt).toBe("2026-08-22T00:00:00Z");
  });
});

describe("Bidirectional Markdown I/O with Schema Validation", () => {
  it("exports graph to structured Markdown with headers and nested bullet points", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should we terraform Mars?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Creates multi-planetary redundancy", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Long-term survival of consciousness", sId);
    g = addNode(g, "source", "https://planetary.org/mars-report", sId);

    const md = exportGraphToMarkdown(g);
    expect(md).toContain("### [Claim] Should we terraform Mars?");
    expect(md).toContain("- **[Support]** Creates multi-planetary redundancy");
    expect(md).toContain("- **[Value]** Long-term survival of consciousness");
    expect(md).toContain("- **[Source]** https://planetary.org/mars-report");
  });

  it("roundtrips single-root graph to Markdown and parses back with schema validity", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Is open-source AI safer?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Decentralized red-teaming finds vulnerabilities faster", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Scientific transparency", sId);
    g = addNode(g, "conflict", "Malicious fine-tuning risks", qId);
    const cId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "limit", "Unknown long-term capabilities", cId);
    g = addNode(g, "note", "Requires active monitoring", qId);

    const md = exportGraphToMarkdown(g);
    const parsed = parseMarkdownGraph(md);

    // Schema validation
    const validated = validateGraph(parsed);
    expect(validated.nodes).toHaveLength(6);
    expect(validated.edges).toHaveLength(5);

    // Content preservation
    const contents = validated.nodes.map((n) => n.content);
    expect(contents).toContain("Is open-source AI safer?");
    expect(contents).toContain("Decentralized red-teaming finds vulnerabilities faster");
    expect(contents).toContain("Scientific transparency");
    expect(contents).toContain("Malicious fine-tuning risks");
    expect(contents).toContain("Unknown long-term capabilities");
    expect(contents).toContain("Requires active monitoring");

    // Grounding invariance
    const root = getRoots(validated)[0];
    expect(root).toBeDefined();
    expect(isFullyGrounded(g, qId)).toBe(isFullyGrounded(validated, root.id));
    expect(getGroundingGaps(validated)).toHaveLength(getGroundingGaps(g).length);
  });

  it("roundtrips multi-root graph with claims and premises separated by dividers", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Question 1: Climate action priority");
    const q1 = g.nodes[0].id;
    g = addNode(g, "support", "Prevents irreversible ecological harm", q1);
    const s1 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Biodiversity preservation", s1);

    g = addRootPremise(g, "Premise 1: Energy demand is increasing globally");
    const p1 = g.nodes.find((n) => n.type === "premise")!.id;
    g = addNode(g, "support", "Data center and electrification growth", p1);
    const s2 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://iea.org/reports/energy-2026", s2);

    const md = exportGraphToMarkdown(g);
    expect(md).toContain("---");

    const parsed = parseMarkdownToGraph(md);
    const roots = getRoots(parsed);
    expect(roots).toHaveLength(2);

    const rootTypes = roots.map((r) => r.type);
    expect(rootTypes).toContain("claim");
    expect(rootTypes).toContain("premise");

    expect(validateGraph(parsed)).toBeDefined();
  });

  it("preserves terminal foundation types (value, source, limit, bedrock, preference)", () => {
    const customMd = `
### [Claim] Ethical AI Deployment
- **[Support]** Rigorous safety evaluations
  - **[Value]** Human dignity and autonomy
  - **[Limit]** Bounded empirical verification
  - **[Source]** https://anthropic.com/evals
  - **[Bedrock]** Fundamental moral status of sentient beings
  - **[Preference]** Collaborative over adversarial development
`;
    const parsed = importGraphFromMarkdown(customMd);
    expect(parsed.nodes).toHaveLength(7);

    const types = new Set(parsed.nodes.map((n) => n.type));
    expect(types.has("claim")).toBe(true);
    expect(types.has("support")).toBe(true);
    expect(types.has("value")).toBe(true);
    expect(types.has("limit")).toBe(true);
    expect(types.has("source")).toBe(true);
    expect(types.has("bedrock")).toBe(true);
    expect(types.has("preference")).toBe(true);

    // Terminal grounding edges direction
    const groundsEdges = parsed.edges.filter((e) => e.edgeType === "grounds");
    expect(groundsEdges.length).toBe(4); // value, limit, bedrock, preference

    const citesEdges = parsed.edges.filter((e) => e.edgeType === "cites");
    expect(citesEdges.length).toBe(1); // source
  });

  it("handles empty markdown and cycle reference annotations gracefully", () => {
    expect(parseMarkdownGraph("")).toEqual({ nodes: [], edges: [] });
    expect(parseMarkdownGraph("   ")).toEqual({ nodes: [], edges: [] });
    expect(parseMarkdownGraph("*Empty graph*")).toEqual({ nodes: [], edges: [] });

    const mdWithCycle = `
### [Claim] Root Thought
- **[Support]** Reasoning Step A
  - *(Cyclic reference to: Root Thought...)*
`;
    const parsed = parseMarkdownGraph(mdWithCycle);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
    expect(validateGraph(parsed)).toBeDefined();
  });

  it("parses varied indentation styles (tabs, 4-space indent, varied bullet markers)", () => {
    const mdWithTabsAndStars = `
# [Claim] Tab and star formatted
* [Support] First child with star
\t* [Value] Tab indented terminal
+ [Conflict] Plus bullet conflict
    + [Limit] 4-space indented limit
`;
    const parsed = parseMarkdownGraph(mdWithTabsAndStars);
    expect(parsed.nodes).toHaveLength(5);
    expect(parsed.edges).toHaveLength(4);
    expect(validateGraph(parsed)).toBeDefined();
  });

  it("migrates legacy node types in Markdown seamlessly", () => {
    const legacyMd = `
### [Question] What is justice?
- **[Argument-Support]** Fairness and equality
  - **[Principle]** Veil of ignorance
  - **[Epistemic-Limit]** Incomplete information about utility
- **[Objection]** Desert-based justice
`;
    const parsed = parseMarkdownGraph(legacyMd);
    expect(parsed.nodes[0].type).toBe("claim");
    expect(parsed.nodes[1].type).toBe("support");
    expect(parsed.nodes[2].type).toBe("value");
    expect(parsed.nodes[3].type).toBe("limit");
    expect(parsed.nodes[4].type).toBe("conflict");
  });

  it("rejects unknown/invalid node types in Markdown with descriptive error", () => {
    const badMd = `
### [Claim] Valid Root
- **[UnicornType]** Invalid child node
`;
    expect(() => parseMarkdownGraph(badMd)).toThrow(/not a valid NodeType/);
  });
});

describe("Unified importGraph and exportGraph Helpers", () => {
  it("exports and imports via format parameter", () => {
    const g = seedGraph;
    const jsonOutput = exportGraph(g, "json");
    expect(typeof jsonOutput).toBe("string");
    expect(importGraph(jsonOutput, "json")).toEqual(g);

    let treeGraph: Graph = { nodes: [], edges: [] };
    treeGraph = addRootQuestion(treeGraph, "Root question");
    const rId = treeGraph.nodes[0].id;
    treeGraph = addNode(treeGraph, "support", "Support reasoning", rId);
    const sId = treeGraph.nodes[treeGraph.nodes.length - 1].id;
    treeGraph = addNode(treeGraph, "value", "Terminal value", sId);

    const mdOutput = exportGraph(treeGraph, "markdown");
    expect(typeof mdOutput).toBe("string");
    expect(importGraph(mdOutput, "markdown").nodes.length).toBe(treeGraph.nodes.length);
  });

  it("auto-detects JSON vs Markdown when format is 'auto'", () => {
    const g = seedGraph;
    const jsonStr = exportGraph(g, "json");
    const autoJson = importGraph(jsonStr, "auto");
    expect(autoJson.nodes.length).toBe(g.nodes.length);

    let treeGraph: Graph = { nodes: [], edges: [] };
    treeGraph = addRootQuestion(treeGraph, "Auto detect test");
    const rId = treeGraph.nodes[0].id;
    treeGraph = addNode(treeGraph, "support", "Reason 1", rId);
    const sId = treeGraph.nodes[treeGraph.nodes.length - 1].id;
    treeGraph = addNode(treeGraph, "limit", "Boundary limit", sId);

    const mdStr = exportGraph(treeGraph, "markdown");
    const autoMd = importGraph(mdStr, "auto");
    expect(autoMd.nodes.length).toBe(treeGraph.nodes.length);
    expect(validateGraph(autoMd)).toBeDefined();
  });

  it("throws clear error on malformed input in importGraph", () => {
    expect(() => importGraph(123 as unknown as string)).toThrow(/non-string/);
    expect(() => importGraph("{ bad json:", "json")).toThrow(/invalid JSON/);
  });
});

describe("Project & Branch Deletion Lifecycle and LocalStorage Cleanup", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("deletes branch and cleans up its associated graph state and edges", () => {
    const b1GraphId = "g_main";
    const b2GraphId = "g_secondary";

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`axiomer_graph_${b1GraphId}`, JSON.stringify({ nodes: [], edges: [] }));
      localStorage.setItem(`axiomer_graph_${b2GraphId}`, JSON.stringify({ nodes: [], edges: [] }));
    }

    const testProject: Project = {
      id: "p1",
      name: "Project 1",
      branches: [
        {
          id: "b1",
          name: "Branch 1",
          graphId: b1GraphId,
          position: { x: 0, y: 0 },
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: "b2",
          name: "Branch 2",
          graphId: b2GraphId,
          position: { x: 100, y: 100 },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      edges: [{ id: "e1", source: "b1", target: "b2" }],
      createdAt: 0,
      updatedAt: 0,
    };

    const updated = deleteBranchFromProject(testProject, "b2");
    expect(updated.branches).toHaveLength(1);
    expect(updated.branches[0].id).toBe("b1");
    expect(updated.edges).toHaveLength(0); // Connected edge cleaned up

    if (typeof localStorage !== "undefined") {
      expect(localStorage.getItem(`axiomer_graph_${b2GraphId}`)).toBeNull();
      expect(localStorage.getItem(`axiomer_graph_${b1GraphId}`)).not.toBeNull();
    }
  });

  it("prevents deleting the last remaining branch in a project", () => {
    const singleBranchProject: Project = {
      id: "p_single",
      name: "Single Branch Project",
      branches: [
        {
          id: "b_only",
          name: "Only Branch",
          graphId: "g_only",
          position: { x: 0, y: 0 },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      edges: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const result = deleteBranchFromProject(singleBranchProject, "b_only");
    expect(result.branches).toHaveLength(1);
    expect(result.branches[0].id).toBe("b_only");
  });

  it("deletes project and cleans up all branches' local storage keys", () => {
    const p1GraphA = "p1_graph_a";
    const p1GraphB = "p1_graph_b";
    const p2Graph = "p2_graph";

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`axiomer_graph_${p1GraphA}`, JSON.stringify({ nodes: [], edges: [] }));
      localStorage.setItem(`axiomer_graph_${p1GraphB}`, JSON.stringify({ nodes: [], edges: [] }));
      localStorage.setItem(`axiomer_graph_${p2Graph}`, JSON.stringify({ nodes: [], edges: [] }));
    }

    const p1: Project = {
      id: "p1",
      name: "Project 1",
      branches: [
        { id: "b1", name: "B1", graphId: p1GraphA, position: { x: 0, y: 0 }, createdAt: 0, updatedAt: 0 },
        { id: "b2", name: "B2", graphId: p1GraphB, position: { x: 10, y: 10 }, createdAt: 0, updatedAt: 0 },
      ],
      edges: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const p2: Project = {
      id: "p2",
      name: "Project 2",
      branches: [
        { id: "b3", name: "B3", graphId: p2Graph, position: { x: 0, y: 0 }, createdAt: 0, updatedAt: 0 },
      ],
      edges: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const remaining = deleteProjectFromList([p1, p2], "p1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("p2");

    if (typeof localStorage !== "undefined") {
      expect(localStorage.getItem(`axiomer_graph_${p1GraphA}`)).toBeNull();
      expect(localStorage.getItem(`axiomer_graph_${p1GraphB}`)).toBeNull();
      expect(localStorage.getItem(`axiomer_graph_${p2Graph}`)).not.toBeNull();
    }
  });

  it("safely creates default project fallback when all projects are deleted", () => {
    const p1: Project = {
      id: "p_last",
      name: "Last Project",
      branches: [
        { id: "b1", name: "Main map", graphId: "g_last", position: { x: 0, y: 0 }, createdAt: 0, updatedAt: 0 },
      ],
      edges: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const result = deleteProjectFromList([p1], "p_last");
    expect(result).toHaveLength(1);
    expect(result[0].id).not.toBe("p_last");
    expect(result[0].branches).toHaveLength(1);
    expect(result[0].branches[0].name).toBe("Main map");
  });
});

describe("URL Hash Sharing & Read-Only Invariance", () => {
  it("encodes and decodes graph with 100% fidelity using LZString", () => {
    const graph = seedGraph;
    const json = JSON.stringify(graph);
    const compressed = LZString.compressToEncodedURIComponent(json);
    expect(typeof compressed).toBe("string");

    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    expect(decompressed).toBe(json);

    const parsed = JSON.parse(decompressed!);
    expect(parsed).toEqual(graph);
  });

  it("handles corrupted or invalid LZString hash payload gracefully", () => {
    const invalidHash = "InvalidEncodedData_12345!@#$";
    const decompressed = LZString.decompressFromEncodedURIComponent(invalidHash);
    if (decompressed) {
      expect(() => JSON.parse(decompressed)).toThrow();
    } else {
      expect(decompressed).toBeNull();
    }
  });

  it("migrates legacy graph payloads when decoded from URL hash", () => {
    const legacy = {
      nodes: [
        { id: "q1", type: "question", content: "Should we build this?" },
        { id: "a1", type: "argument-support", content: "High utility" },
        { id: "v1", type: "principle", content: "Human well-being" },
      ],
      edges: [
        { id: "e1", from: "a1", to: "q1", edgeType: "answers" },
        { id: "e2", from: "a1", to: "v1", edgeType: "grounds-in" },
      ],
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(legacy));
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const parsed = JSON.parse(decompressed!);
    const migrated = migrateGraph(parsed);

    expect(migrated.nodes[0].type).toBe("claim");
    expect(migrated.nodes[1].type).toBe("support");
    expect(migrated.nodes[2].type).toBe("value");
    expect(migrated.edges[0].edgeType).toBe("supports");
    expect(migrated.edges[1].edgeType).toBe("grounds");
    expect(validateGraph(migrated)).toBeDefined();
  });
});
