# Axiomer Model Context Protocol (MCP) Server

A standalone, lightweight MCP server that exposes pure Axiomer epistemic graph operations as JSON-RPC 2.0 tools for autonomous AI agents.

## Overview

The Axiomer MCP server allows AI agents to:
- Inspect reasoning graphs and derivation trees
- Detect grounding gaps (unsupported claims and arguments)
- Compute Dung abstract acceptability (defeat and conflict resolution)
- Identify value clashes and divergence points
- Propose new nodes while strictly enforcing the 10-node ontology

## Tools

| Tool | Description |
|------|-------------|
| `get_graph` | Parses a graph JSON and returns nodes, edges, and epistemic metrics. |
| `get_children` | Returns child sub-arguments and edge relationships for a node. |
| `get_roots` | Returns all top-level entry points (claims and foundational premises). |
| `get_grounding_gaps` | Detects all ungrounded propositions sorted by tree depth. |
| `get_acceptability` | Computes Dung grounded extension labels (`coherent`, `conflicted`, `contested`). |
| `get_value_clashes` | Detects root claims grounded in competing terminal values or limits. |
| `propose_node` | Validates ontology constraints and appends a new node and semantic edge. |

## Running the Server

### Stdio Mode (Standard MCP JSON-RPC 2.0):
```bash
npx tsx mcp/index.ts
```

### Integration with AI Tools:
Configure in your MCP client settings (e.g. Claude Desktop, Codex, Antigravity):
```json
{
  "mcpServers": {
    "axiomer": {
      "command": "npx",
      "args": ["tsx", "C:/Users/arthu/projects/Axiomer/mcp/index.ts"]
    }
  }
}
```
