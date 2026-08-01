# ChatGPT / MCP Connector for Paperclip

Date: 2026-08-01
Status: Proposed
Branch: `claude/railway-chatgpt-plugin-t7eneg`

## Role of This Document

This document captures the research behind, and the phased implementation plan
for, exposing the Paperclip control plane to AI clients (ChatGPT, Claude, and
any other MCP-compatible agent) via a Model Context Protocol (MCP) connector.

It is the direction-of-travel record. The first implementation slice
(read-only connector) is being delivered alongside this document; later phases
are proposed and not yet built.

## Motivation

Railway shipped a "plugin for ChatGPT" (2026-07-31). On inspection it is not a
bespoke ChatGPT integration — it is Railway's existing **MCP server** surfaced
through ChatGPT's new **Developer Mode / MCP-apps**. The same server already
works with Claude, Cursor, Codex, Copilot and other MCP clients. Two transports
are offered:

- **Local MCP** — runs through the Railway CLI, sharing CLI auth + project
  context (`railway mcp install`).
- **Remote MCP** — hosted endpoint at `mcp.railway.com`, browser **OAuth**, no
  local install (`railway mcp install --remote`).

Because MCP is client-agnostic, one server backs every client, and multiple
clients (e.g. Claude and ChatGPT) can connect concurrently. The main discipline
is human-in-the-loop confirmation of mutating actions and "one writer at a time"
per resource.

The direct analog for Paperclip is a connector that fronts our `/api` control
plane so an AI client can see and (later) manage companies, tasks/issues,
agents, approvals, goals, budgets and activity conversationally.

## References

- Railway MCP Server docs: https://docs.railway.com/ai/mcp-server
- Railway for Agents: https://docs.railway.com/agents
- Remote MCP + OAuth changelog: https://railway.com/changelog/2026-04-17-remote-mcp
- ChatGPT Developer Mode + MCP apps (OpenAI): https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta
- OpenAI — build an MCP server for plugins: https://developers.openai.com/plugins/build/mcp-server

## Constraints and Invariants

The connector is a thin protocol layer over the existing REST API. It must never
be a privileged bypass. All control-plane invariants (see AGENTS.md §5) continue
to be enforced by the server/service layer the connector calls:

- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions
- Strict company scoping — agent credentials must not reach other companies

## Auth Model

Reuse Paperclip's existing actor model rather than inventing a new one:

- **Local MCP (phase 1):** bearer credential from the existing
  company-scoped agent API keys (`agent_api_keys`, hashed at rest) / agent JWT.
  The connector reads `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY` from its
  environment and forwards the bearer to `/api`. No new auth surface.
- **Remote MCP (phase 3):** a browser **OAuth** flow that mints a scoped,
  company-bound token, matching Railway/ChatGPT Developer Mode expectations.

## Phased Plan

### Phase 1 — Read-only connector (first slice, low risk)

A new `packages/mcp` package: an MCP server (stdio transport) that exposes
read-only Paperclip data as MCP tools. No mutations, so no approval-gate,
budget, or race-condition risk, and no OAuth required.

Read-only tools map to routes that already exist:

| Tool | Backing route |
| --- | --- |
| `list_companies`, `get_company` | `server/src/routes/companies.ts` |
| `list_agents`, `get_agent` | `server/src/routes/agents.ts` |
| `list_issues`, `get_issue` | `server/src/routes/issues.ts` |
| `list_goals` | `server/src/routes/goals.ts` |
| `list_approvals` (pending gates) | `server/src/routes/approvals.ts` |
| `get_costs` (spend/budget status) | `server/src/routes/costs.ts` |
| `get_activity` (recent log) | `server/src/routes/activity.ts` |

Deliverables:

- `packages/mcp` package (build + typecheck wired into the workspace)
- Tool definitions + a small typed HTTP client for `/api`
- Company scoping honored via the supplied bearer credential
- Unit tests following `server/src/__tests__` patterns (tool listing, argument
  validation, API-call shaping, error mapping)
- Usage doc under `docs/ai/` plus a short connect guide

### Phase 2 — Write tools behind existing gates

Add mutating tools (`create_issue`, `assign_issue`, `update_issue_status`,
`approve` / `reject`, etc.). Every write routes through the same service layer
so approval gates, budget hard-stops, and activity logging fire unchanged.
Mutating tools are annotated destructive so clients prompt for confirmation.

### Phase 3 — Remote MCP + OAuth

Add a streamable HTTP/SSE transport mounted under `/api/mcp` and a browser OAuth
flow issuing scoped, company-bound tokens, so hosted clients (ChatGPT Developer
Mode) can connect without a local install.

## Rollout / Compatibility

- Phase 1 is additive and touches no existing server behavior; it only reads.
- The connector is decoupled (talks to `/api` over HTTP), so it can ship and be
  versioned independently of the server.
- Recommended operating posture at small scale: one write-capable client, and
  any additional client (e.g. ChatGPT) restricted to the read-only connector.

## Definition of Done (per phase)

1. Behavior matches this plan and `doc/SPEC-implementation.md` invariants
2. `pnpm -r typecheck`, `pnpm test:run`, `pnpm build` pass
3. Contracts synced across db/shared/server/ui where touched
4. Docs updated when behavior or commands change
