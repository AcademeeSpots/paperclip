import type { PaperclipApiClient } from "./client.js";

/**
 * Read-only MCP tool registry for the Paperclip control plane.
 *
 * Every tool maps to an existing REST endpoint and performs no mutations, so
 * there is no approval-gate, budget, or race-condition risk. Write tools are a
 * later phase (see the plan doc) and intentionally excluded here.
 */

export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (client: PaperclipApiClient, args: Record<string, unknown>) => Promise<unknown>;
}

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ToolInputError(`Missing or invalid required string argument: "${key}"`);
  }
  return value;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ToolInputError(`Argument "${key}" must be a string`);
  }
  return value;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ToolInputError(`Argument "${key}" must be a number`);
  }
  return value;
}

const companyIdProp = {
  companyId: { type: "string", description: "The Paperclip company id to scope the query to." },
} as const;

export const TOOLS: ToolDefinition[] = [
  {
    name: "paperclip_health",
    description:
      "Check that the Paperclip server is reachable and report its status/version. Requires no arguments; useful for verifying the connection.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (client) => client.health(),
  },
  {
    name: "list_companies",
    description:
      "List the companies visible to the configured credential. A company is a self-contained AI-agent organization in Paperclip.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (client) => client.listCompanies(),
  },
  {
    name: "get_company",
    description: "Get a single company by id, including its metadata.",
    inputSchema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.getCompany(requireString(args, "companyId")),
  },
  {
    name: "list_agents",
    description: "List the agents (the AI 'employees') belonging to a company.",
    inputSchema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.listAgents(requireString(args, "companyId")),
  },
  {
    name: "get_agent",
    description: "Get a single agent by id, including its role and configuration summary.",
    inputSchema: {
      type: "object",
      properties: { agentId: { type: "string", description: "The agent id." } },
      required: ["agentId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.getAgent(requireString(args, "agentId")),
  },
  {
    name: "list_issues",
    description:
      "List issues (tasks) for a company. Optionally filter by status or a free-text query. Issues are the unit of work agents pick up and complete.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyIdProp,
        status: { type: "string", description: "Optional status filter, e.g. 'open', 'in_progress', 'done'." },
        q: { type: "string", description: "Optional free-text search query." },
      },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) =>
      client.listIssues(requireString(args, "companyId"), {
        status: optionalString(args, "status"),
        q: optionalString(args, "q"),
      }),
  },
  {
    name: "get_issue",
    description: "Get a single issue (task) by id, including its status, assignee, and details.",
    inputSchema: {
      type: "object",
      properties: { issueId: { type: "string", description: "The issue id." } },
      required: ["issueId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.getIssue(requireString(args, "issueId")),
  },
  {
    name: "list_goals",
    description: "List the goals defined for a company. Goals capture the business objectives agents are aligned to.",
    inputSchema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.listGoals(requireString(args, "companyId")),
  },
  {
    name: "list_approvals",
    description:
      "List approval requests for a company (the human-in-the-loop gates for governed actions). Optionally filter by status, e.g. 'pending'.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyIdProp,
        status: { type: "string", description: "Optional status filter, e.g. 'pending', 'approved', 'rejected'." },
      },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) =>
      client.listApprovals(requireString(args, "companyId"), { status: optionalString(args, "status") }),
  },
  {
    name: "get_costs_summary",
    description: "Get the cost/spend summary for a company, useful for monitoring budget consumption.",
    inputSchema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) => client.getCostsSummary(requireString(args, "companyId")),
  },
  {
    name: "get_activity",
    description: "Get the recent activity log for a company. Optionally cap the number of entries with 'limit'.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyIdProp,
        limit: { type: "number", description: "Optional maximum number of activity entries to return." },
      },
      required: ["companyId"],
      additionalProperties: false,
    },
    handler: async (client, args) =>
      client.getActivity(requireString(args, "companyId"), { limit: optionalNumber(args, "limit") }),
  },
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}
