#!/usr/bin/env node
import { loadConfig, ConfigError } from "./config.js";
import { PaperclipApiClient } from "./client.js";
import { runStdioServer } from "./stdio.js";
import { SERVER_INFO } from "./server.js";

export { loadConfig, ConfigError } from "./config.js";
export type { McpConnectorConfig } from "./config.js";
export { PaperclipApiClient, PaperclipApiError } from "./client.js";
export { TOOLS, getToolByName } from "./tools.js";
export type { ToolDefinition } from "./tools.js";
export { handleMessage, PROTOCOL_VERSION, SERVER_INFO } from "./server.js";
export { runStdioServer } from "./stdio.js";

/**
 * Entrypoint for the `paperclip-mcp` binary.
 *
 * Reads configuration from the environment and serves the read-only Paperclip
 * MCP connector over stdio, the transport used by local MCP clients (Claude
 * Desktop/Code, ChatGPT Developer Mode via a local bridge, Cursor, etc.).
 */
async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`[paperclip-mcp] ${e.message}\n`);
      process.exit(2);
    }
    throw e;
  }

  const client = new PaperclipApiClient({ config });
  process.stderr.write(`[paperclip-mcp] ${SERVER_INFO.name} v${SERVER_INFO.version} → ${config.baseUrl} (read-only)\n`);
  await runStdioServer({ client });
}

// Only run when invoked directly, not when imported (e.g. by tests).
const invokedDirectly = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[paperclip-mcp] fatal: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    process.exit(1);
  });
}
