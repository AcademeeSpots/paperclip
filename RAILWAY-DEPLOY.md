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

So you only override a handful of variables.

> Note: the official multi-service Railway template (separate `@paperclipai/*`
> services for server + each adapter) is heavier and harder to configure from a
> phone. This single-service path builds the whole monorepo from one Dockerfile
> and is the recommended route.

## Steps

1. **Create the service**
   - Railway → **New** → **Deploy from GitHub repo**
   - Repo: `AcademeeSpots/paperclip`
   - Branch: `master`
   - Railway detects the root `Dockerfile` and builds it.

2. **Add a database**
   - Railway → **New** → **Database** → **PostgreSQL**

3. **Set these Variables** on the Paperclip service (everything else is already
   defaulted by the Dockerfile):

   | Variable | Value |
   |---|---|
   | `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `public` |
   | `PAPERCLIP_PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `PAPERCLIP_SECRETS_MASTER_KEY` | a stable 32-byte base64 key (see below) |
   | `ANTHROPIC_API_KEY` | your Anthropic API key |

   > The `${{...}}` entries are Railway variable references — type them exactly
   > and Railway substitutes the real values. Add `OPENAI_API_KEY` too if you
   > want the Codex adapter.

4. **Generate a public domain**
   - Service → **Settings → Networking → Generate Domain**
   - This activates `RAILWAY_PUBLIC_DOMAIN` (referenced by `PAPERCLIP_PUBLIC_URL`
     above), then the service redeploys.

5. **Onboard**
   - Open the domain → Paperclip login/onboarding screen
   - Create your account → create your first company → define a goal → hire a
     CEO agent → set budgets → assign tasks → go.
   - Day-to-day management then works entirely from a phone browser.

## Generating the secrets master key

`PAPERCLIP_SECRETS_MASTER_KEY` must be a stable 32-byte key (base64, hex, or
raw). Set it once and keep it — rotating it makes previously encrypted secrets
undecryptable. Generate one with either:

```sh
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the output into the Railway variable. **Never commit the actual key to
this repo** — it belongs only in Railway's Variables.

## Optional: persist uploaded assets

With an external `DATABASE_URL` (the Railway Postgres above), your database is
already persistent. Uploaded assets under `/paperclip` are ephemeral unless you
attach a Railway **volume** mounted at `/paperclip`. Fine to skip when starting
out.

## Health checks

Once the single service is green, confirm from any browser:

- `https://<your-domain>/` → the Paperclip web UI
- `https://<your-domain>/api/health` → a JSON health response with the
  deployment mode

## Cost notes

- Railway bills for the running service and Postgres.
- Agents consume Anthropic (and/or OpenAI) API tokens per heartbeat. Use
  Paperclip's per-agent budgets to cap spend.
