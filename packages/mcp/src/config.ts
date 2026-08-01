/**
 * Configuration for the Paperclip MCP connector.
 *
 * The connector is a thin, read-only protocol layer that forwards requests to a
 * running Paperclip server over its REST API. It reuses Paperclip's existing
 * bearer-credential auth model (board or agent API key / agent JWT) rather than
 * introducing a new auth surface — see
 * `doc/plans/2026-08-01-chatgpt-mcp-connector.md`.
 */

export interface McpConnectorConfig {
  /** Base URL of the Paperclip server, e.g. `http://localhost:3100`. No trailing slash. */
  baseUrl: string;
  /** Bearer token forwarded on every request. Company scoping is enforced server-side. */
  apiKey: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Load connector configuration from the environment.
 *
 * - `PAPERCLIP_API_URL` (required): base URL of the Paperclip server.
 * - `PAPERCLIP_API_KEY` (required): bearer credential to forward.
 * - `PAPERCLIP_MCP_TIMEOUT_MS` (optional): request timeout, default 30000.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConnectorConfig {
  const rawUrl = env.PAPERCLIP_API_URL?.trim();
  if (!rawUrl) {
    throw new ConfigError("PAPERCLIP_API_URL is required (e.g. http://localhost:3100)");
  }

  let baseUrl: string;
  try {
    // Normalize and validate; strip any trailing slash so path joining is predictable.
    baseUrl = new URL(rawUrl).toString().replace(/\/+$/, "");
  } catch {
    throw new ConfigError(`PAPERCLIP_API_URL is not a valid URL: ${rawUrl}`);
  }

  const apiKey = env.PAPERCLIP_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError("PAPERCLIP_API_KEY is required (a board or agent API key)");
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  const rawTimeout = env.PAPERCLIP_MCP_TIMEOUT_MS?.trim();
  if (rawTimeout) {
    const parsed = Number(rawTimeout);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new ConfigError(`PAPERCLIP_MCP_TIMEOUT_MS must be a positive number, got: ${rawTimeout}`);
    }
    timeoutMs = parsed;
  }

  return { baseUrl, apiKey, timeoutMs };
}
