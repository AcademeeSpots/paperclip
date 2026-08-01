import { describe, expect, it, vi } from "vitest";
import { PaperclipApiClient, PaperclipApiError, type FetchLike } from "../client.js";
import type { McpConnectorConfig } from "../config.js";

const config: McpConnectorConfig = {
  baseUrl: "http://localhost:3100",
  apiKey: "test-key",
  timeoutMs: 1000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PaperclipApiClient", () => {
  it("sends the bearer token and hits the companies endpoint", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([{ id: "c1" }]));
    const client = new PaperclipApiClient({ config, fetchImpl });

    const result = await client.listCompanies();

    expect(result).toEqual([{ id: "c1" }]);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("http://localhost:3100/api/companies");
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).headers).toMatchObject({ authorization: "Bearer test-key" });
  });

  it("encodes path parameters", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ id: "a/b" }));
    const client = new PaperclipApiClient({ config, fetchImpl });

    await client.getCompany("a/b");

    expect(fetchImpl.mock.calls[0]![0]).toBe("http://localhost:3100/api/companies/a%2Fb");
  });

  it("adds query parameters and omits empty ones", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([]));
    const client = new PaperclipApiClient({ config, fetchImpl });

    await client.listIssues("c1", { status: "open", q: undefined });

    expect(fetchImpl.mock.calls[0]![0]).toBe("http://localhost:3100/api/companies/c1/issues?status=open");
  });

  it("throws PaperclipApiError with status on a non-ok response", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response("nope", { status: 403 }));
    const client = new PaperclipApiClient({ config, fetchImpl });

    await expect(client.listCompanies()).rejects.toMatchObject({
      name: "PaperclipApiError",
      status: 403,
    });
  });

  it("wraps network failures", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new PaperclipApiClient({ config, fetchImpl });

    await expect(client.health()).rejects.toBeInstanceOf(PaperclipApiError);
  });
});
