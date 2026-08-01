import type { Readable, Writable } from "node:stream";
import { handleMessage, JsonRpcErrorCode, type JsonRpcResponse, type McpServerDeps } from "./server.js";

/**
 * stdio transport for the MCP server.
 *
 * MCP's stdio transport frames each JSON-RPC message as a single line of UTF-8
 * JSON terminated by a newline. We buffer incoming data, split on newlines, and
 * dispatch each complete line to `handleMessage`.
 */

export interface StdioOptions {
  input?: Readable;
  output?: Writable;
}

function writeResponse(output: Writable, response: JsonRpcResponse): void {
  output.write(`${JSON.stringify(response)}\n`);
}

/**
 * Run the stdio server loop. Resolves when the input stream ends.
 */
export function runStdioServer(deps: McpServerDeps, opts: StdioOptions = {}): Promise<void> {
  const input = opts.input ?? process.stdin;
  const output = opts.output ?? process.stdout;

  input.setEncoding("utf8");

  let buffer = "";
  // Serialize processing so responses are written in the order lines arrived.
  let queue: Promise<void> = Promise.resolve();

  function dispatchLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed === "") return;

    queue = queue.then(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        writeResponse(output, {
          jsonrpc: "2.0",
          id: null,
          error: { code: JsonRpcErrorCode.ParseError, message: "Parse error: invalid JSON" },
        });
        return;
      }

      try {
        const response = await handleMessage(parsed, deps);
        if (response) writeResponse(output, response);
      } catch (e) {
        // handleMessage should not throw, but guard the loop regardless.
        writeResponse(output, {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: JsonRpcErrorCode.InternalError,
            message: `Internal error: ${e instanceof Error ? e.message : String(e)}`,
          },
        });
      }
    });
  }

  return new Promise<void>((resolve, reject) => {
    input.on("data", (chunk: string) => {
      buffer += chunk;
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        dispatchLine(line);
        newlineIndex = buffer.indexOf("\n");
      }
    });

    input.on("end", () => {
      if (buffer.length > 0) dispatchLine(buffer);
      buffer = "";
      queue.then(resolve, reject);
    });

    input.on("error", reject);
  });
}
