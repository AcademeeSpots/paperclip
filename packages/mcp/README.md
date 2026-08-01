# @paperclipai/mcp

A read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
connector for the Paperclip control plane. It lets any MCP-compatible AI client
— Claude Desktop/Code, ChatGPT Developer Mode, Cursor, Codex, and others — see
your Paperclip companies, agents, tasks, goals, approvals, costs, and activity
conversationally.

This is **phase 1** of the connector plan
([`doc/plans/2026-08-01-chatgpt-mcp-connector.md`](../../doc/plans/2026-08-01-chatgpt-mcp-connector.md)):
it exposes **only read operations**, so there is no approval-gate, budget, or
race-condition risk. Write tools and remote OAuth are later phases.

## How it works

The connector is a thin layer that forwards requests to a running Paperclip
server over its REST API. It reuses Paperclip's existing bearer-credential auth
(a board or agent API key / agent JWT) — company scoping and every control-plane
invariant are still enforced server-side. It never talks to the database and has
no privileged bypass.

Transport is **stdio** (newline-delimited JSON-RPC 2.0), the mode local MCP
clients use.

## Configuration

Set via environment variables:

| Variable | Required | Description |
| --- | --- | --- |
| `PAPERCLIP_API_URL` | yes | Base URL of the Paperclip server, e.g. `http://localhost:3100`. |
| `PAPERCLIP_API_KEY` | yes | Bearer credential to forward (board or agent API key). |
| `PAPERCLIP_MCP_TIMEOUT_MS` | no | Per-request timeout in ms (default `30000`). |

## Run

```sh
pnpm --filter @paperclipai/mcp build
PAPERCLIP_API_URL=http://localhost:3100 PAPERCLIP_API_KEY=... paperclip-mcp
```

## Connect a client

Point any MCP client at the `paperclip-mcp` command. For example, Claude Desktop
(`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "paperclip": {
      "command": "paperclip-mcp",
      "env": {
        "PAPERCLIP_API_URL": "http://localhost:3100",
        "PAPERCLIP_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

| Tool | Arguments | Description |
| --- | --- | --- |
| `paperclip_health` | — | Verify the server is reachable. |
| `list_companies` | — | Companies visible to the credential. |
| `get_company` | `companyId` | A single company. |
| `list_agents` | `companyId` | Agents in a company. |
| `get_agent` | `agentId` | A single agent. |
| `list_issues` | `companyId`, `status?`, `q?` | Tasks in a company. |
| `get_issue` | `issueId` | A single issue. |
| `list_goals` | `companyId` | Goals for a company. |
| `list_approvals` | `companyId`, `status?` | Approval requests (human-in-the-loop gates). |
| `get_costs_summary` | `companyId` | Spend/budget summary. |
| `get_activity` | `companyId`, `limit?` | Recent activity log. |
