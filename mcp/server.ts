// Standalone Model Context Protocol (MCP) Server for Axiomer
// Implements standard JSON-RPC 2.0 stdio transport

import * as readline from "node:readline";
import { MCP_TOOL_DEFINITIONS, executeTool } from "./tools";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

export class AxiomerMcpServer {
  private serverInfo = {
    name: "axiomer-mcp",
    version: "1.0.0",
  };

  private protocolVersion = "2024-11-05";

  /**
   * Process a single incoming JSON-RPC request and return the response (or null for notifications).
   */
  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const isNotification = req.id === undefined || req.id === null;
    const id = req.id ?? null;

    try {
      if (!req.jsonrpc || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: JSON_RPC_ERRORS.INVALID_REQUEST,
            message: "Invalid Request: expected valid JSON-RPC 2.0 object with method string",
          },
        };
      }

      switch (req.method) {
        case "initialize": {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: this.protocolVersion,
              capabilities: {
                tools: {},
              },
              serverInfo: this.serverInfo,
            },
          };
        }

        case "notifications/initialized":
        case "initialized": {
          // Notification from client confirming initialization
          return null;
        }

        case "ping": {
          return {
            jsonrpc: "2.0",
            id,
            result: {},
          };
        }

        case "tools/list": {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: MCP_TOOL_DEFINITIONS,
            },
          };
        }

        case "tools/call": {
          const params = req.params;
          if (!params || typeof params.name !== "string") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: JSON_RPC_ERRORS.INVALID_PARAMS,
                message: "Missing or invalid tool name in tools/call params",
              },
            };
          }

          try {
            const toolArgs = params.arguments || {};
            const resultData = executeTool(params.name, toolArgs);
            return {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: typeof resultData === "string" ? resultData : JSON.stringify(resultData, null, 2),
                  },
                ],
                isError: false,
              },
            };
          } catch (err: any) {
            return {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: err?.message || String(err),
                  },
                ],
                isError: true,
              },
            };
          }
        }

        default: {
          if (isNotification) return null;
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
              message: `Method not found: "${req.method}"`,
            },
          };
        }
      }
    } catch (err: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: JSON_RPC_ERRORS.INTERNAL_ERROR,
          message: err?.message || "Internal JSON-RPC server error",
        },
      };
    }
  }

  /**
   * Process a single incoming raw text line from stdio and return the serialized response line.
   */
  public async handleLine(line: string): Promise<string | null> {
    const trimmed = line.trim();
    if (!trimmed) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: JSON_RPC_ERRORS.PARSE_ERROR,
          message: "Parse error: invalid JSON",
        },
      });
    }

    const response = await this.handleRequest(parsed);
    return response ? JSON.stringify(response) : null;
  }

  /**
   * Start listening on Node.js stdio for line-delimited JSON-RPC messages.
   */
  public startStdio(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
  ): readline.Interface {
    const rl = readline.createInterface({
      input,
      output: undefined,
      terminal: false,
    });

    rl.on("line", async (line) => {
      try {
        const res = await this.handleLine(line);
        if (res) {
          output.write(res + "\n");
        }
      } catch (err) {
        const errRes = JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: JSON_RPC_ERRORS.INTERNAL_ERROR,
            message: String(err),
          },
        });
        output.write(errRes + "\n");
      }
    });

    return rl;
  }
}

export function createMcpServer(): AxiomerMcpServer {
  return new AxiomerMcpServer();
}

export function startStdioServer(): AxiomerMcpServer {
  const server = new AxiomerMcpServer();
  server.startStdio();
  return server;
}
