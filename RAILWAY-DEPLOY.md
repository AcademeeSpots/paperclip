# Deploying Paperclip to Railway (single service)

A phone-friendly recipe for deploying this repo (`AcademeeSpots/paperclip`) to
Railway as one internet-facing service. Everything is done in Railway's web UI —
no local terminal required.

Railway auto-detects the root `Dockerfile`, which already:

- builds the UI + server,
- pre-installs the `claude`, `codex`, and `opencode` agent CLIs (so agents run
  in the container), and
- sets sensible defaults: `HOST=0.0.0.0`, `PORT`, `SERVE_UI=true`,
  `PAPERCLIP_HOME=/paperclip`, and `PAPERCLIP_DEPLOYMENT_MODE=authenticated`.

You override a handful of variables and add a database.

> **Do NOT use the official multi-service Railway template.** Searching
> "paperclip" in Railway surfaces a template that provisions ~17 separate
> `@paperclipai/*` services (server + each adapter + plugins). It is heavy,
> hard to configure, and easy to get wrong from a phone. This single-service
> path builds the whole monorepo from one Dockerfile and is the recommended
> route. If you see service names starting with `@paperclipai/...` or an
> "Apply 106 changes" banner, you picked the template — back out.

## Steps

### 1. Create the service

- Railway → **New** → **Deploy from GitHub repo** (NOT "Deploy a Template")
- Repo: **`AcademeeSpots/paperclip`**
- Branch: **`master`**
- Railway detects the root `Dockerfile` and builds it. The build takes a few
  minutes (it compiles the UI + server). You know it's the right repo when the
  build log shows Docker steps (pnpm install, building `@paperclipai/ui`), not
  a "supported languages" Railpack message.

### 2. Add the database — this is a SERVICE, not just a variable

- Railway → **New** → **Database** → **Add PostgreSQL**
- Wait for the **`Postgres`** box to appear on the canvas and go green
  (Online).

> **Critical gotcha:** the `DATABASE_URL` variable below is a *reference* to
> this Postgres service. If the Postgres service does not exist, the reference
> resolves to an **empty string**, and Paperclip silently falls back to a
> throwaway embedded database (`Using embedded PostgreSQL` in the logs). The
> variable existing is not enough — the **service** must exist.

### 3. Generate the public domain (do this before the URL variable)

- Service → **Settings → Networking → Generate Domain**
- This activates `RAILWAY_PUBLIC_DOMAIN`, referenced by `PAPERCLIP_PUBLIC_URL`
  below. If you set the URL variable before the domain exists, it resolves to
  an invalid value and the server fails its public-mode startup check.

### 4. Set these Variables on the Paperclip service

| Variable | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Connect to the Railway Postgres (see gotcha below) |
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `public` | Internet-facing exposure |
| `PAPERCLIP_PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Required for public mode |
| `PAPERCLIP_SECRETS_MASTER_KEY` | a stable 32-byte base64 key (see below) | Encrypts stored secrets |
| `BETTER_AUTH_SECRET` | a stable 32-byte base64 key (see below) | Signs **human login** sessions |
| `PAPERCLIP_AGENT_JWT_SECRET` | a stable 32-byte base64 key (see below) | Signs **agent** API tokens |
| `ANTHROPIC_API_KEY` | your Anthropic API key (`sk-ant-...`) | Enables the Claude agent adapter |
| `SERVE_UI` | `true` | Serve the web UI (also defaulted by the Dockerfile) |

Notes:

- The `${{...}}` entries are Railway variable references — type them exactly, or
  use Railway's reference picker (the `{}` icon in the value field) to insert
  them without typos. Add `OPENAI_API_KEY` too if you want the Codex adapter.
- **`DATABASE_URL` verification:** after setting it, tap the 👁 eye in the
  variables list. It MUST show a real
  `postgresql://…@postgres.railway.internal:5432/railway` string — **not**
  `<empty string>`, **not** `localhost`/`127.0.0.1`. If it's empty, the Postgres
  service isn't there or the reference is wrong. Do not use the repo's
  `.env.example` value (`…@localhost:5432…`) — that's for local dev and will
  crash on Railway with `ECONNREFUSED 127.0.0.1:5432`.
- **Three separate secrets.** `PAPERCLIP_SECRETS_MASTER_KEY`,
  `BETTER_AUTH_SECRET`, and `PAPERCLIP_AGENT_JWT_SECRET` are all required and all
  distinct. Authenticated mode refuses to start without `BETTER_AUTH_SECRET`;
  agents cannot authenticate without `PAPERCLIP_AGENT_JWT_SECRET` (the doctor
  logs `Agent JWT: missing`).

### 5. Redeploy so the running instance picks everything up

Adding a database or changing variables does not retroactively update an
already-running deployment. After the Postgres service exists and all variables
are set:

- **your service → Deployments → ⋮ → Redeploy**

### 6. Confirm it's healthy

Open the newest deployment's **Deploy** log. You want to see:

- `INFO: Using external PostgreSQL` (NOT "Using embedded PostgreSQL")
- `Mode: external-postgres`
- `Deploy: authenticated (public)`
- Status **Active**

### 7. Onboard

- Open your domain (e.g. `https://<service>-production.up.railway.app`)
- Create your account → create your first company → define a goal → hire a CEO
  agent → set budgets → assign tasks → go.
- Day-to-day management then works entirely from a phone browser.

## Generating the three secret keys

Each of `PAPERCLIP_SECRETS_MASTER_KEY`, `BETTER_AUTH_SECRET`, and
`PAPERCLIP_AGENT_JWT_SECRET` must be a stable 32-byte key (base64). Set each once
and keep it — rotating `PAPERCLIP_SECRETS_MASTER_KEY` makes previously encrypted
secrets undecryptable. Generate one each with:

```sh
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Never commit the actual keys to this repo** — they belong only in Railway's
Variables.

## Health checks

Once the single service is green, confirm from any browser:

- `https://<your-domain>/` → the Paperclip web UI
- `https://<your-domain>/api/health` → a JSON health response with the
  deployment mode

## Troubleshooting — blockers seen in practice

| Symptom in build/deploy log | Cause | Fix |
|---|---|---|
| `Railpack could not determine how to build` / "supported languages" list | Building the wrong repo (no Dockerfile/app at root) | Point the service Source at `AcademeeSpots/paperclip` @ `master` |
| `dockerfile invalid: docker VOLUME at Line 55 is not supported` | Railway rejects the `VOLUME` instruction | Already fixed on `master` (VOLUME line removed) |
| `connect ECONNREFUSED 127.0.0.1:5432` | `DATABASE_URL` points at localhost | Set `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` |
| `Using embedded PostgreSQL` (though `DATABASE_URL` is listed) | No Postgres **service** exists, so the reference resolves to empty | Add the PostgreSQL service, then redeploy |
| `DATABASE_URL` shows `<empty string>` in the 👁 eye | Reference not saved / no Postgres service | Overwrite it with `${{Postgres.DATABASE_URL}}`; confirm eye shows `railway.internal` |
| `authenticated mode requires BETTER_AUTH_SECRET … to be set` | Missing login secret | Set `BETTER_AUTH_SECRET` |
| `Agent JWT: missing` (INFO) | Missing agent-token secret; agents can't authenticate | Set `PAPERCLIP_AGENT_JWT_SECRET` |

## Cost notes

- Railway bills for the running service and Postgres.
- Agents consume Anthropic (and/or OpenAI) API tokens per heartbeat. Use
  Paperclip's per-agent budgets to cap spend.
