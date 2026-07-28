# Deploying Paperclip to Railway

A phone-friendly recipe for deploying this repo (`AcademeeSpots/paperclip`) to
Railway as an internet-facing (`authenticated + public`) service. Everything
here is done in Railway's web UI — no local terminal required.

Paperclip is fully configurable via environment variables, so no interactive
onboarding step is needed. Railway auto-detects the root `Dockerfile`, which
pre-installs the `claude` and `codex` CLIs so agents can actually run in the
container.

## Steps

1. **Create the service**
   - Railway → **New** → **Deploy from GitHub repo**
   - Repo: `AcademeeSpots/paperclip`
   - Branch: `master`
   - Railway detects the root `Dockerfile` and builds it.

2. **Add a database**
   - Railway → **New** → **Database** → **PostgreSQL**
   - Reference its connection string from the Paperclip service as
     `${{Postgres.DATABASE_URL}}` (see the variable table below).

3. **Set environment variables** on the Paperclip service:

   | Variable | Value | Why |
   |---|---|---|
   | `HOST` | `0.0.0.0` | Required — the default `127.0.0.1` binding is unreachable on Railway |
   | `PAPERCLIP_DEPLOYMENT_MODE` | `authenticated` | Login-protected deployment |
   | `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `public` | Internet-facing exposure policy |
   | `PAPERCLIP_PUBLIC_URL` | your Railway domain, e.g. `https://paperclip-production.up.railway.app` | Required for public mode |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Use the Railway Postgres service |
   | `PAPERCLIP_SECRETS_MASTER_KEY` | a stable 32-byte base64 key | So saved secrets survive redeploys |
   | `SERVE_UI` | `true` | Serve the web UI from the same service |
   | `ANTHROPIC_API_KEY` | your Anthropic API key | Enables the Claude Local agent adapter |

   > Do **not** set `PORT` — Railway injects it automatically and Paperclip reads it.
   >
   > Add `OPENAI_API_KEY` too if you want to use the Codex adapter.

4. **Generate a public domain**
   - Service → **Settings → Networking → Generate Domain**
   - Copy the generated URL into `PAPERCLIP_PUBLIC_URL`, then redeploy.

5. **Onboard**
   - Open the public URL → Paperclip login/onboarding screen
   - Create your account → create your first company → define a goal → hire a
     CEO agent → set budgets → assign tasks → go.
   - From here on, day-to-day management works entirely from a phone browser.

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

## Health checks

Once deployed, confirm it's live from any browser:

- `https://<your-domain>/` → the Paperclip web UI
- `https://<your-domain>/api/health` → a JSON health response with the
  deployment mode

## Cost notes

- Railway bills for the running service and Postgres.
- Agents consume Anthropic (and/or OpenAI) API tokens per heartbeat. Use
  Paperclip's per-agent budgets to cap spend.
