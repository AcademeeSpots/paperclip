import { describe, expect, it } from "vitest";
import { handleMessage, JsonRpcErrorCode, PROTOCOL_VERSION, SERVER_INFO } from "../server.js";
import type { ToolDefinition } from "../tools.js";
import type { PaperclipApiClient } from "../client.js";

const noopClient = {} as PaperclipApiClient;

const echoTool: ToolDefinition = {
  name: "echo",
  description: "echo back",
  inputSchema: { type: "object", properties: { value: { type: "string" } } },
  handler: async (_client, args) => ({ echoed: args.value }),
};

const throwingTool: ToolDefinition = {
  name: "boom",
  description: "always throws",
  inputSchema: { type: "object" },
  handler: async () => {
    throw new Error("kaboom");
  },
};

const deps = { client: noopClient, tools: [echoTool, throwingTool] };

describe("handleMessage", () => {
  it("responds to initialize with protocol version, capabilities, and server info", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      deps,
    );
    expect(res?.result).toMatchObject({
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  });

  it("falls back to the default protocol version when none is requested", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, deps);
    expect((res?.result as { protocolVersion: string }).protocolVersion).toBe(PROTOCOL_VERSION);
  });

  it("lists tools without leaking the handler", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, deps);
    const tools = (res?.result as { tools: unknown[] }).tools;
    expect(tools).toHaveLength(2);
    expect(tools[0]).toEqual({
      name: "echo",
      description: "echo back",
      inputSchema: echoTool.inputSchema,
    });
    expect(tools[0]).not.toHaveProperty("handler");
  });

  it("calls a tool and wraps the result as text content", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo", arguments: { value: "hi" } } },
      deps,
    );
    const result = res?.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]!.text)).toEqual({ echoed: "hi" });
  });

  it("reports tool exceptions as an isError result rather than a JSON-RPC error", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "boom" } },
      deps,
    );
    const result = res?.result as { content: Array<{ text: string }>; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("kaboom");
  });

  it("returns InvalidParams for an unknown tool", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "ghost" } },
      deps,
    );
    expect(res?.error?.code).toBe(JsonRpcErrorCode.InvalidParams);
  });

  it("returns InvalidParams when tools/call is missing a name", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 6, method: "tools/call", params: {} }, deps);
    expect(res?.error?.code).toBe(JsonRpcErrorCode.InvalidParams);
  });

  it("returns MethodNotFound for an unknown method", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 7, method: "does/not/exist" }, deps);
    expect(res?.error?.code).toBe(JsonRpcErrorCode.MethodNotFound);
  });

  it("suppresses responses to notifications (no id)", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, deps);
    expect(res).toBeNull();
  });

  it("rejects a non-JSON-RPC object", async () => {
    const res = await handleMessage({ hello: "world" }, deps);
    expect(res?.error?.code).toBe(JsonRpcErrorCode.InvalidRequest);
  });
});
