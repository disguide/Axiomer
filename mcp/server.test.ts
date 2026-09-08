import { describe, expect, it } from "vitest";
import type { Graph } from "../client/src/lib/types";
import { addNode, addRootPremise, addRootQuestion, verifySource } from "../client/src/lib/graph";
import {
  executeTool,
  get_acceptability,
  get_children,
  get_graph,
  get_grounding_gaps,
  get_roots,
  get_value_clashes,
  MCP_TOOL_DEFINITIONS,
  mcpTools,
  propose_node,
} from "./tools";
import { JSON_RPC_ERRORS, createMcpServer } from "./server";

describe("Axiomer MCP Tools Suite", () => {
  describe("Tool 1: get_graph", () => {
    it("returns graph data and summary stats from Graph object", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Is consciousness substrate-independent?");
      const qId = g.nodes[0].id;
      g = addNode(g, "support", "Functionalism implies computational equivalence", qId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "bedrock", "Turing-Church thesis on computability", sId);

      const result = get_graph(g);
      expect(result.graph.nodes).toHaveLength(3);
      expect(result.graph.edges).toHaveLength(2);
      expect(result.stats.claims).toBe(1);
      expect(result.stats.supports).toBe(1);
      expect(result.stats.terminals).toBe(1);
      expect(result.stats.groundedClaims).toBe(1);
      expect(result.stats.openClaims).toBe(0);
      expect(result.summary.nodeCount).toBe(3);
      expect(result.summary.edgeCount).toBe(2);
    });

    it("parses serialized JSON string correctly", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Question");
      const jsonStr = JSON.stringify(g);

      const result = get_graph({ graphJson: jsonStr });
      expect(result.graph.nodes).toHaveLength(1);
      expect(result.stats.claims).toBe(1);
      expect(result.stats.openClaims).toBe(1);
    });

    it("throws a descriptive error on malformed JSON", () => {
      expect(() => get_graph({ graphJson: "invalid json string {{" })).toThrow();
    });

    it("handles an empty graph returning zero metrics", () => {
      const emptyGraph: Graph = { nodes: [], edges: [] };
      const result = get_graph(emptyGraph);
      expect(result.summary.nodeCount).toBe(0);
      expect(result.summary.edgeCount).toBe(0);
      expect(result.stats.maxDepth).toBe(0);
    });
  });

  describe("Tool 2: get_children", () => {
    it("returns immediate child nodes and sub-arguments", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Claim");
      const rId = g.nodes[0].id;
      g = addNode(g, "support", "Child Support", rId);
      g = addNode(g, "conflict", "Child Conflict", rId);
      g = addNode(g, "note", "Child Note", rId);

      const res = get_children(g, { nodeId: rId });
      expect(res.node.id).toBe(rId);
      expect(res.children).toHaveLength(3);
      expect(res.subArguments).toHaveLength(2); // support and conflict
    });

    it("supports direct parameter passing: get_children(graph, nodeId)", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Q");
      const qId = g.nodes[0].id;
      g = addNode(g, "support", "S", qId);

      const res = get_children(g, qId);
      expect(res.children).toHaveLength(1);
      expect(res.children[0].content).toBe("S");
    });

    it("throws when node is not found", () => {
      const empty: Graph = { nodes: [], edges: [] };
      expect(() => get_children(empty, { nodeId: "non_existent_node" })).toThrow(
        /Node non_existent_node not found/,
      );
    });

    it("returns empty children array for leaf/terminal nodes", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root");
      const rId = g.nodes[0].id;
      g = addNode(g, "support", "Arg", rId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "Terminal Value", sId);
      const vId = g.nodes[g.nodes.length - 1].id;

      const res = get_children(g, vId);
      expect(res.children).toHaveLength(0);
      expect(res.subArguments).toHaveLength(0);
    });
  });

  describe("Tool 3: get_roots", () => {
    it("returns all root claims and premises", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Claim 1");
      const q1 = g.nodes[0].id;
      g = addRootPremise(g, "Axiom Premise 1");
      const p1 = g.nodes[g.nodes.length - 1].id;

      // Add children so we confirm nested nodes are not returned in get_roots
      g = addNode(g, "support", "Nested Support", q1);
      g = addNode(g, "claim", "Nested Claim", p1);

      const res = get_roots(g);
      expect(res.roots).toHaveLength(2);
      expect(res.claims).toHaveLength(1);
      expect(res.premises).toHaveLength(1);
      expect(res.roots.map((r) => r.id).sort()).toEqual([q1, p1].sort());
    });

    it("returns empty arrays on an empty graph", () => {
      const empty: Graph = { nodes: [], edges: [] };
      const res = get_roots(empty);
      expect(res.roots).toHaveLength(0);
      expect(res.claims).toHaveLength(0);
      expect(res.premises).toHaveLength(0);
    });
  });

  describe("Tool 4: get_grounding_gaps", () => {
    it("identifies ungrounded arguments and sorts them shallowest-first", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Question");
      const qId = g.nodes[0].id;

      g = addNode(g, "support", "Level 1 Support", qId);
      const s1Id = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "support", "Level 2 Support", s1Id);
      const s2Id = g.nodes[g.nodes.length - 1].id;

      const res = get_grounding_gaps(g);
      expect(res.gaps).toHaveLength(2);
      expect(res.gaps[0].nodeId).toBe(s1Id);
      expect(res.gaps[0].depth).toBe(1);
      expect(res.gaps[1].nodeId).toBe(s2Id);
      expect(res.gaps[1].depth).toBe(2);
      expect(res.ungroundedClaims).toContain(qId);
      expect(res.count).toBe(2);
    });

    it("returns 0 gaps when all arguments are grounded in terminal foundations", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Question");
      const qId = g.nodes[0].id;

      g = addNode(g, "support", "Support A", qId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "source", "https://doi.org/10.1000/182", sId);

      const res = get_grounding_gaps(g);
      expect(res.gaps).toHaveLength(0);
      expect(res.ungroundedClaims).toHaveLength(0);
      expect(res.count).toBe(0);
    });
  });

  describe("Tool 5: get_acceptability", () => {
    it("evaluates Dung grounded extension for defeat and reinstatement", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Policy Proposal");
      const qId = g.nodes[0].id;

      // Thesis
      g = addNode(g, "support", "Main argument A", qId);
      const sA = g.nodes[g.nodes.length - 1].id;

      // Attack on Thesis
      g = addNode(g, "conflict", "Objection B", sA);
      const oB = g.nodes[g.nodes.length - 1].id;

      // Initial check: objection defeats thesis
      let acc = get_acceptability(g);
      expect(acc.acceptability[oB]).toBe("coherent");
      expect(acc.acceptability[sA]).toBe("conflicted");
      expect(acc.coherent).toContain(oB);
      expect(acc.conflicted).toContain(sA);

      // Rebuttal / Defender attacking objection
      g = addNode(g, "conflict", "Rebuttal C", oB);
      const rC = g.nodes[g.nodes.length - 1].id;

      // Re-evaluation: Rebuttal defeats objection, reinstating the thesis!
      acc = get_acceptability(g);
      expect(acc.acceptability[rC]).toBe("coherent");
      expect(acc.acceptability[oB]).toBe("conflicted");
      expect(acc.acceptability[sA]).toBe("coherent");
      expect(acc.stats?.coherent).toBeGreaterThanOrEqual(2);
      expect(acc.stats?.conflicted).toBeGreaterThanOrEqual(1);
    });

    it("identifies contested state in symmetric defeat cycles", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Paradox Question");
      const qId = g.nodes[0].id;

      g = addNode(g, "support", "Proposition 1", qId);
      const p1 = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "support", "Proposition 2", qId);
      const p2 = g.nodes[g.nodes.length - 1].id;

      // Symmetric conflict: p1 conflicts p2 AND p2 conflicts p1
      g.edges.push({ id: "e_c1", from: p1, to: p2, edgeType: "conflicts" });
      g.edges.push({ id: "e_c2", from: p2, to: p1, edgeType: "conflicts" });

      const acc = get_acceptability(g);
      expect(acc.acceptability[p1]).toBe("contested");
      expect(acc.acceptability[p2]).toBe("contested");
      expect(acc.contested).toContain(p1);
      expect(acc.contested).toContain(p2);
    });
  });

  describe("Tool 6: get_value_clashes", () => {
    it("detects value clash when root is grounded in distinct terminal values", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Autonomous vehicle dilemma");
      const qId = g.nodes[0].id;

      g = addNode(g, "support", "Protect passengers", qId);
      const s1 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "Duty of care to customers", s1);
      const v1 = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "conflict", "Minimize total casualties", qId);
      const s2 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "Utilitarian aggregate welfare", s2);
      const v2 = g.nodes[g.nodes.length - 1].id;

      const res = get_value_clashes(g);
      expect(res.clashes).toHaveLength(1);
      expect(res.clashes[0].questionId).toBe(qId);
      expect(res.clashes[0].values).toHaveLength(2);
      const valIds = res.clashes[0].values.map((v) => v.id).sort();
      expect(valIds).toEqual([v1, v2].sort());
    });

    it("returns empty clashes when only 1 terminal value exists", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Single value root");
      const qId = g.nodes[0].id;
      g = addNode(g, "support", "Support", qId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "Value A", sId);

      const res = get_value_clashes(g);
      expect(res.clashes).toHaveLength(0);
      expect(res.count).toBe(0);
    });
  });

  describe("Tool 7: propose_node", () => {
    it("proposes and attaches a valid support argument and infers correct edge type", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Question");
      const qId = g.nodes[0].id;

      const res = propose_node(g, {
        parentId: qId,
        nodeType: "support",
        content: "Empirical support proposition",
      });

      expect(res.success).toBe(true);
      expect(res.node.type).toBe("support");
      expect(res.node.content).toBe("Empirical support proposition");
      expect(res.edgeType).toBe("supports");
      expect(res.graph.nodes).toHaveLength(2);
      expect(res.graph.edges).toHaveLength(1);
      expect(res.graphJson).toBeDefined();
    });

    it("correctly infers edge types across various node types", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root");
      const qId = g.nodes[0].id;

      // 1. conflict -> conflicts
      const pConflict = propose_node(g, qId, "conflict", "Objection");
      expect(pConflict.edgeType).toBe("conflicts");

      // 2. note -> annotates
      const pNote = propose_node(g, qId, "note", "Context note");
      expect(pNote.edgeType).toBe("annotates");

      // 3. source under support -> cites
      const pSupport = propose_node(g, qId, "support", "Support");
      const sId = pSupport.newNodeId;
      const pSource = propose_node(pSupport.graph, sId, "source", "https://example.com");
      expect(pSource.edgeType).toBe("cites");

      // 4. bedrock under support -> grounds
      const pBedrock = propose_node(pSupport.graph, sId, "bedrock", "Axiom");
      expect(pBedrock.edgeType).toBe("grounds");

      // 5. limit under support -> grounds
      const pLimit = propose_node(pSupport.graph, sId, "limit", "Limit");
      expect(pLimit.edgeType).toBe("grounds");

      // 6. preference under support -> grounds
      const pPref = propose_node(pSupport.graph, sId, "preference", "Preference");
      expect(pPref.edgeType).toBe("grounds");
    });

    it("rejects invalid child additions under terminal nodes", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root");
      const qId = g.nodes[0].id;
      g = addNode(g, "support", "Support", qId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "Bedrock Value", sId);
      const vId = g.nodes[g.nodes.length - 1].id;

      expect(() =>
        propose_node(g, {
          parentId: vId,
          nodeType: "support",
          content: "Cannot attach under terminal",
        }),
      ).toThrow(/Invalid child type "support" for parent type "value"/);
    });

    it("rejects non-existent parent node ID", () => {
      const empty: Graph = { nodes: [], edges: [] };
      expect(() =>
        propose_node(empty, {
          parentId: "ghost_id",
          nodeType: "support",
          content: "Orphan",
        }),
      ).toThrow(/Parent node ghost_id not found/);
    });

    it("rejects invalid node type strings", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root");
      const qId = g.nodes[0].id;

      expect(() =>
        propose_node(g, {
          parentId: qId,
          nodeType: "invalid_type" as any,
          content: "Invalid",
        }),
      ).toThrow(/Invalid node type "invalid_type"/);
    });
  });

  describe("MCP Schema & executeTool Dispatcher", () => {
    it("exposes all 7 tool definitions with valid schemas", () => {
      expect(MCP_TOOL_DEFINITIONS).toHaveLength(7);
      const toolNames = MCP_TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toEqual([
        "get_graph",
        "get_children",
        "get_roots",
        "get_grounding_gaps",
        "get_acceptability",
        "get_value_clashes",
        "propose_node",
      ]);

      for (const tool of MCP_TOOL_DEFINITIONS) {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it("executes all 7 tools dynamically via executeTool", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Dynamic Test Root");
      const qId = g.nodes[0].id;
      const gJson = JSON.stringify(g);

      // get_graph
      const gRes = executeTool("get_graph", { graphJson: gJson });
      expect(gRes.stats.claims).toBe(1);

      // propose_node
      const propRes = executeTool("propose_node", {
        graphJson: gJson,
        parentId: qId,
        nodeType: "support",
        content: "Dynamic Support",
      });
      expect(propRes.success).toBe(true);
      const updatedJson = propRes.graphJson;

      // get_children
      const childRes = executeTool("get_children", {
        graphJson: updatedJson,
        nodeId: qId,
      });
      expect(childRes.children).toHaveLength(1);

      // get_roots
      const rootsRes = executeTool("get_roots", { graphJson: updatedJson });
      expect(rootsRes.roots).toHaveLength(1);

      // get_grounding_gaps
      const gapsRes = executeTool("get_grounding_gaps", { graphJson: updatedJson });
      expect(gapsRes.gaps).toHaveLength(1);

      // get_acceptability
      const accRes = executeTool("get_acceptability", { graphJson: updatedJson });
      expect(accRes.acceptability[propRes.newNodeId]).toBe("coherent");

      // get_value_clashes
      const clashRes = executeTool("get_value_clashes", { graphJson: updatedJson });
      expect(clashRes.clashes).toHaveLength(0);
    });

    it("throws error for unknown tool name in executeTool", () => {
      expect(() => executeTool("non_existent_tool", {})).toThrow(
        /Unknown MCP tool "non_existent_tool"/,
      );
    });
  });

  describe("MCP Server JSON-RPC Protocol Handler", () => {
    it("handles initialize request with protocolVersion, capabilities, and serverInfo", async () => {
      const server = createMcpServer();
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      });

      expect(res).not.toBeNull();
      expect(res?.id).toBe(1);
      expect(res?.result.protocolVersion).toBe("2024-11-05");
      expect(res?.result.capabilities.tools).toBeDefined();
      expect(res?.result.serverInfo.name).toBe("axiomer-mcp");
    });

    it("handles initialized and notifications/initialized notifications returning null", async () => {
      const server = createMcpServer();
      const res1 = await server.handleRequest({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });
      expect(res1).toBeNull();

      const res2 = await server.handleRequest({
        jsonrpc: "2.0",
        method: "initialized",
      });
      expect(res2).toBeNull();
    });

    it("handles ping request", async () => {
      const server = createMcpServer();
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: "ping-1",
        method: "ping",
      });

      expect(res?.id).toBe("ping-1");
      expect(res?.result).toEqual({});
    });

    it("handles tools/list returning 7 tools", async () => {
      const server = createMcpServer();
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      });

      expect(res?.result.tools).toHaveLength(7);
      expect(res?.result.tools[0].name).toBe("get_graph");
    });

    it("handles tools/call for valid tool and wraps in MCP text content", async () => {
      const server = createMcpServer();
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "JSON-RPC Protocol Root");

      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "get_graph",
          arguments: {
            graphJson: JSON.stringify(g),
          },
        },
      });

      expect(res?.result.isError).toBe(false);
      expect(res?.result.content).toHaveLength(1);
      expect(res?.result.content[0].type).toBe("text");
      const parsedData = JSON.parse(res?.result.content[0].text);
      expect(parsedData.stats.claims).toBe(1);
    });

    it("handles tools/call error gracefully returning isError: true", async () => {
      const server = createMcpServer();
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "get_children",
          arguments: {
            graphJson: JSON.stringify({ nodes: [], edges: [] }),
            nodeId: "missing_id",
          },
        },
      });

      expect(res?.result.isError).toBe(true);
      expect(res?.result.content[0].text).toContain("Node missing_id not found");
    });

    it("returns METHOD_NOT_FOUND error for unsupported methods", async () => {
      const server = createMcpServer();
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "unknown/method",
      });

      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND);
      expect(res?.error?.message).toContain('Method not found: "unknown/method"');
    });

    it("handles raw text line processing with handleLine", async () => {
      const server = createMcpServer();
      const line = JSON.stringify({
        jsonrpc: "2.0",
        id: "line-test",
        method: "ping",
      });

      const responseLine = await server.handleLine(line);
      expect(responseLine).not.toBeNull();
      const parsed = JSON.parse(responseLine!);
      expect(parsed.id).toBe("line-test");
      expect(parsed.result).toEqual({});
    });

    it("returns PARSE_ERROR for invalid JSON lines", async () => {
      const server = createMcpServer();
      const responseLine = await server.handleLine("{ invalid json line");
      expect(responseLine).not.toBeNull();
      const parsed = JSON.parse(responseLine!);
      expect(parsed.error.code).toBe(JSON_RPC_ERRORS.PARSE_ERROR);
    });
  });

  describe("Multi-Turn Agent Dialectical Reasoning Flow", () => {
    it("executes multi-turn agent exploration, objection, defense, and grounding workflow", () => {
      // Turn 1: Agent initializes an inquiry
      let graph: Graph = { nodes: [], edges: [] };
      graph = addRootQuestion(graph, "Should medical AI diagnostic systems possess autonomous prescription authority?");
      const rootId = graph.nodes[0].id;

      // Turn 2: Agent queries roots & gaps
      const rootsTurn = mcpTools.get_roots(graph);
      expect(rootsTurn.roots).toHaveLength(1);

      // Turn 3: Agent proposes positive support
      const p1 = mcpTools.propose_node(graph, {
        parentId: rootId,
        type: "support",
        content: "Autonomous diagnostics dramatically reduce treatment latency in acute medical emergencies",
      });
      expect(p1.success).toBe(true);
      graph = p1.graph;
      const supId = p1.newNodeId;

      // Turn 4: Agent proposes objection / conflict
      const p2 = mcpTools.propose_node(graph, {
        parentId: supId,
        type: "conflict",
        content: "Out-of-distribution distribution shift can cause catastrophic unmonitored misprescriptions",
      });
      expect(p2.success).toBe(true);
      graph = p2.graph;
      const conId = p2.newNodeId;

      // Turn 5: Acceptability check (objection defeats thesis)
      let acc = mcpTools.get_acceptability(graph);
      expect(acc.acceptability[conId]).toBe("coherent");
      expect(acc.acceptability[supId]).toBe("conflicted");

      // Turn 6: Agent proposes defense / rebuttal attacking the objection
      const p3 = mcpTools.propose_node(graph, {
        parentId: conId,
        type: "conflict",
        content: "Strict conformal prediction sets bound error rates with guaranteed coverage thresholds",
      });
      expect(p3.success).toBe(true);
      graph = p3.graph;
      const rebId = p3.newNodeId;

      // Turn 7: Re-evaluate acceptability (rebuttal defeats objection, thesis restored)
      acc = mcpTools.get_acceptability(graph);
      expect(acc.acceptability[rebId]).toBe("coherent");
      expect(acc.acceptability[conId]).toBe("conflicted");
      expect(acc.acceptability[supId]).toBe("coherent");

      // Turn 8: Agent grounds the rebuttal with an empirical source
      const p4 = mcpTools.propose_node(graph, {
        parentId: rebId,
        type: "source",
        content: "https://jamanetwork.com/journals/jama/article-abstract/2789123",
      });
      expect(p4.success).toBe(true);
      graph = p4.graph;
      const srcId = p4.newNodeId;
      graph = verifySource(graph, srcId, true);

      // Turn 9: Agent grounds the support in a moral value
      const p5 = mcpTools.propose_node(graph, {
        parentId: supId,
        type: "value",
        content: "Beneficence and alleviation of acute physiological suffering",
      });
      expect(p5.success).toBe(true);
      graph = p5.graph;

      // Turn 10: Final verification of complete grounding and 0 gaps
      const finalGaps = mcpTools.get_grounding_gaps(graph);
      expect(finalGaps.gaps).toHaveLength(0);
      expect(finalGaps.ungroundedClaims).toHaveLength(0);

      const finalStats = mcpTools.get_graph(graph).stats;
      expect(finalStats.claims).toBe(1);
      expect(finalStats.supports).toBe(1);
      expect(finalStats.conflicts).toBe(2);
      expect(finalStats.terminals).toBe(2);
      expect(finalStats.groundedClaims).toBe(1);
      expect(finalStats.openClaims).toBe(0);
    });
  });
});
