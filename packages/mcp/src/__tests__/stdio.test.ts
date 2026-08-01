import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { runStdioServer } from "../stdio.js";
import type { ToolDefinition } from "../tools.js";
import type { PaperclipApiClient } from "../client.js";

const echoTool: ToolDefinition = {
  name: "echo",
  description: "echo",
  inputSchema: { type: "object" },
  handler: async (_c, args) => args,
};

function collectResponses(input: PassThrough, output: PassThrough) {
  const deps = { client: {} as PaperclipApiClient, tools: [echoTool] };
  const done = runStdioServer(deps, { input, output });

  const lines: unknown[] = [];
  let buf = "";
  output.on("data", (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    let idx = buf.indexOf("\n");
    while (idx !== -1) {
      const line = buf.slice(0, idx).trim();
      if (line) lines.push(JSON.parse(line));
      buf = buf.slice(idx + 1);
      idx = buf.indexOf("\n");
    }
  });

  return { done, lines };
}

describe("runStdioServer", () => {
  it("processes newline-delimited messages and writes framed responses", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const { done, lines } = collectResponses(input, output);

    input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "echo", arguments: { a: 1 } } })}\n`);
    // A notification produces no response line.
    input.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
    input.end();

    await done;

    expect(lines).toHaveLength(2);
    expect((lines[0] as { id: number }).id).toBe(1);
    const callResult = lines[1] as { id: number; result: { content: Array<{ text: string }> } };
    expect(callResult.id).toBe(2);
    expect(JSON.parse(callResult.result.content[0]!.text)).toEqual({ a: 1 });
  });

  it("emits a parse error for malformed JSON lines", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const { done, lines } = collectResponses(input, output);

    input.write("not json\n");
    input.end();

    await done;
    expect(lines).toHaveLength(1);
    expect((lines[0] as { error: { code: number } }).error.code).toBe(-32700);
  });

  it("handles a message split across chunks and a trailing line without a newline", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const { done, lines } = collectResponses(input, output);

    const msg = JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" });
    input.write(msg.slice(0, 10));
    input.write(`${msg.slice(10)}`); // no trailing newline; flushed on end
    input.end();

    await done;
    expect(lines).toHaveLength(1);
    expect((lines[0] as { id: number }).id).toBe(9);
  });
});
