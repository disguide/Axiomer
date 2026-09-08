// Standalone Model Context Protocol (MCP) Server Entrypoint for Axiomer

import { fileURLToPath } from "node:url";
import { startStdioServer, createMcpServer, AxiomerMcpServer } from "./server";
import {
  mcpTools,
  MCP_TOOL_DEFINITIONS,
  executeTool,
  get_graph,
  get_children,
  get_roots,
  get_grounding_gaps,
  get_acceptability,
  get_value_clashes,
  propose_node,
} from "./tools";

export {
  AxiomerMcpServer,
  createMcpServer,
  startStdioServer,
  mcpTools,
  MCP_TOOL_DEFINITIONS,
  executeTool,
  get_graph,
  get_children,
  get_roots,
  get_grounding_gaps,
  get_acceptability,
  get_value_clashes,
  propose_node,
};

// If invoked directly from CLI, launch stdio JSON-RPC server
if (process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith("mcp/index.ts") ||
  process.argv[1].endsWith("mcp\\index.ts")
)) {
  startStdioServer();
}
