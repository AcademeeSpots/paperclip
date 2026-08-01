import type { PaperclipApiClient } from "./client.js";
import { TOOLS, getToolByName, type ToolDefinition } from "./tools.js";

/**
 * Minimal Model Context Protocol server.
 *
 * MCP is JSON-RPC 2.0. This module implements the request/response semantics
 * (initialize, tools/list, tools/call, ping) as a pure function of the incoming
 * message, so it can be unit-tested without any transport. The stdio transport
 * lives in `stdio.ts`.
 */

/** Protocol version this server advertises. */
export const PROTOCOL_VERSION = "2025-06-18";

export const SERVER_INFO = { name: "paperclip-mcp", version: "0.3.1" } as const;

export const JsonRpcErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpServerDeps {
  client: PaperclipApiClient;
  tools?: ToolDefinition[];
}

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function isRequestObject(value: unknown): value is JsonRpcRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
    typeof (value as { method?: unknown }).method === "string"
  );
}

/** A message is a notification (no response expected) when it carries no id. */
function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined;
}

/**
 * Handle a single parsed JSON-RPC message. Returns the response to send, or
 * `null` when the message is a notification and no response is warranted.
 */
export async function handleMessage(message: unknown, deps: McpServerDeps): Promise<JsonRpcResponse | null> {
  if (!isRequestObject(message)) {
    return err(null, JsonRpcErrorCode.InvalidRequest, "Invalid JSON-RPC request");
  }

  const tools = deps.tools ?? TOOLS;
  const id = message.id ?? null;
  const notification = isNotification(message);

  switch (message.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: negotiateProtocolVersion(message.params),
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
    case "initialized":
      // Client acknowledging initialization; no response.
      return null;

    case "ping":
      return notification ? null : ok(id, {});

    case "tools/list":
      return ok(id, {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });

    case "tools/call":
      return handleToolsCall(id, message.params, deps.client, tools);

    default:
      if (notification) return null;
      return err(id, JsonRpcErrorCode.MethodNotFound, `Method not found: ${message.method}`);
  }
}

function negotiateProtocolVersion(params: unknown): string {
  const requested = (params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
  // Echo the client's requested version when it sends a string, otherwise our default.
  return typeof requested === "string" && requested.trim() !== "" ? requested : PROTOCOL_VERSION;
}

async function handleToolsCall(
  id: string | number | null,
  params: unknown,
  client: PaperclipApiClient,
  tools: ToolDefinition[],
): Promise<JsonRpcResponse> {
  const name = (params as { name?: unknown } | undefined)?.name;
  if (typeof name !== "string") {
    return err(id, JsonRpcErrorCode.InvalidParams, "tools/call requires a string 'name'");
  }

  const rawArgs = (params as { arguments?: unknown } | undefined)?.arguments;
  if (rawArgs !== undefined && (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs))) {
    return err(id, JsonRpcErrorCode.InvalidParams, "tools/call 'arguments' must be an object");
  }
  const args = (rawArgs as Record<string, unknown> | undefined) ?? {};

  const tool = getTool(tools, name);
  if (!tool) {
    return err(id, JsonRpcErrorCode.InvalidParams, `Unknown tool: ${name}`);
  }

  try {
    const data = await tool.handler(client, args);
    return ok(id, toolResult(data));
  } catch (e) {
    // Surface tool-level failures (bad input, API errors) inside the result so
    // the model can read and react to them, per MCP conventions.
    const messageText = e instanceof Error ? e.message : String(e);
    return ok(id, toolResult(`Error calling tool "${name}": ${messageText}`, true));
  }
}

function getTool(tools: ToolDefinition[], name: string): ToolDefinition | undefined {
  // Prefer the caller-supplied list; fall back to the global registry lookup.
  return tools.find((tool) => tool.name === name) ?? getToolByName(name);
}

function toolResult(data: unknown, isError = false): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) };
}
