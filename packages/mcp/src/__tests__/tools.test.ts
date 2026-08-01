import { describe, expect, it } from "vitest";
import { getToolByName, TOOLS, ToolInputError } from "../tools.js";
import type { PaperclipApiClient } from "../client.js";

// A stub client that records the last method + args it was called with.
function stubClient() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const handler = {
    get(_target: unknown, prop: string) {
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return Promise.resolve({ ok: true, method: prop });
      };
    },
  };
  const client = new Proxy({}, handler) as unknown as PaperclipApiClient;
  return { client, calls };
}

describe("tool registry", () => {
  it("exposes only read-oriented tools with unique names and object schemas", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
    }
    // Nothing that mutates state should be present in the read-only connector.
    const forbidden = /(create|update|delete|assign|approve|reject|set_|post_)/i;
    expect(names.filter((n) => forbidden.test(n))).toEqual([]);
  });

  it("list_companies requires no arguments and calls the client", async () => {
    const { client, calls } = stubClient();
    const tool = getToolByName("list_companies")!;
    await tool.handler(client, {});
    expect(calls).toEqual([{ method: "listCompanies", args: [] }]);
  });

  it("get_company forwards the companyId", async () => {
    const { client, calls } = stubClient();
    const tool = getToolByName("get_company")!;
    await tool.handler(client, { companyId: "c1" });
    expect(calls[0]).toEqual({ method: "getCompany", args: ["c1"] });
  });

  it("throws ToolInputError when a required argument is missing", async () => {
    const { client } = stubClient();
    const tool = getToolByName("get_company")!;
    await expect(tool.handler(client, {})).rejects.toBeInstanceOf(ToolInputError);
  });

  it("list_issues passes optional filters through", async () => {
    const { client, calls } = stubClient();
    const tool = getToolByName("list_issues")!;
    await tool.handler(client, { companyId: "c1", status: "open" });
    expect(calls[0]).toEqual({ method: "listIssues", args: ["c1", { status: "open", q: undefined }] });
  });

  it("get_activity rejects a non-numeric limit", async () => {
    const { client } = stubClient();
    const tool = getToolByName("get_activity")!;
    await expect(tool.handler(client, { companyId: "c1", limit: "lots" })).rejects.toBeInstanceOf(ToolInputError);
  });

  it("returns undefined for an unknown tool name", () => {
    expect(getToolByName("nope")).toBeUndefined();
  });
});
