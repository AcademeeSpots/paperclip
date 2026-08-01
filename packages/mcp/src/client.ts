import type { McpConnectorConfig } from "./config.js";

/**
 * REST API prefix. Mirrors `API_PREFIX` from `@paperclipai/shared`; inlined so
 * the compiled `paperclip-mcp` binary is self-contained and runnable by the MCP
 * clients that spawn it, without workspace source resolution.
 */
const API_PREFIX = "/api";

/**
 * Minimal typed HTTP client for the Paperclip REST API.
 *
 * Only GET requests are implemented: this connector is deliberately read-only
 * (phase 1 of the plan). Every call forwards the configured bearer credential;
 * company scoping and all control-plane invariants remain enforced server-side.
 */

export class PaperclipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly body?: string,
  ) {
    super(message);
    this.name = "PaperclipApiError";
  }
}

/** Injectable fetch implementation, so tests need no network. */
export type FetchLike = typeof fetch;

export interface PaperclipApiClientDeps {
  config: McpConnectorConfig;
  fetchImpl?: FetchLike;
}

type QueryValue = string | number | boolean | undefined | null;

function buildPath(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export class PaperclipApiClient {
  private readonly config: McpConnectorConfig;
  private readonly fetchImpl: FetchLike;

  constructor(deps: PaperclipApiClientDeps) {
    this.config = deps.config;
    this.fetchImpl = deps.fetchImpl ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("global fetch is unavailable; provide fetchImpl (Node >= 20 required)");
    }
  }

  /** Perform a GET request against `path` and parse the JSON response. */
  private async get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    const fullPath = buildPath(path, query);
    const url = `${this.config.baseUrl}${fullPath}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new PaperclipApiError(`Request timed out after ${this.config.timeoutMs}ms`, 0, fullPath);
      }
      throw new PaperclipApiError(
        `Request to Paperclip failed: ${err instanceof Error ? err.message : String(err)}`,
        0,
        fullPath,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (!res.ok) {
      throw new PaperclipApiError(
        `Paperclip API returned ${res.status} for ${fullPath}`,
        res.status,
        fullPath,
        text.slice(0, 2000),
      );
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PaperclipApiError(`Paperclip API returned non-JSON body for ${fullPath}`, res.status, fullPath, text.slice(0, 500));
    }
  }

  // --- Read-only endpoints -------------------------------------------------

  health(): Promise<unknown> {
    return this.get(`${API_PREFIX}/health`);
  }

  listCompanies(): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies`);
  }

  getCompany(companyId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}`);
  }

  listAgents(companyId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/agents`);
  }

  getAgent(agentId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/agents/${encodeURIComponent(agentId)}`);
  }

  listIssues(companyId: string, opts?: { status?: string; q?: string }): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/issues`, {
      status: opts?.status,
      q: opts?.q,
    });
  }

  getIssue(issueId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/issues/${encodeURIComponent(issueId)}`);
  }

  listGoals(companyId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/goals`);
  }

  listApprovals(companyId: string, opts?: { status?: string }): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/approvals`, {
      status: opts?.status,
    });
  }

  getCostsSummary(companyId: string): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/costs/summary`);
  }

  getActivity(companyId: string, opts?: { limit?: number }): Promise<unknown> {
    return this.get(`${API_PREFIX}/companies/${encodeURIComponent(companyId)}/activity`, {
      limit: opts?.limit,
    });
  }
}
