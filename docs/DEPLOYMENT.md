# Sapiion Workplace — Testing Environment Deployment

> Set up 2026-09-03. This documents what was actually built and every issue hit along the way, so it doesn't need re-discovering.

## Overview

- **Live URL:** `https://workplace.sapiion.ai` (custom domain, DNS propagating as of setup)
- **Fallback URL:** `https://sapiion-workplace.vercel.app` (always works, no DNS dependency)
- **Frontend + backend:** one Vercel project (`sapiion-workplace`), combined via `vercel.json` — no separate backend host
- **Database:** Railway, separate project, Postgres only (no Node service on Railway — the backend runs on Vercel instead)

This is a **testing environment**, not production-grade. See Known Limitations below before pointing real users at it.

## Architecture

`vercel.json` (repo root) defines two services in one Vercel project:
- `frontend` — root `frontend/`, Vite static build
- `backend` — root `backend/`, Express, explicit `"entrypoint": "index.js"` (required — Vercel's Express Web Service builder won't infer it)

Rewrites route `/api/*` to the backend service, everything else to the frontend — same-origin from the browser's perspective, so no CORS complexity between the two halves.

## Environment variables (Vercel project → Settings → Environment Variables)

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Railway Postgres public connection string | Must use the **public** proxy host (e.g. `tokaido.proxy.rlwy.net:21710`), never `postgres.railway.internal` — that's only reachable from inside Railway's own network |
| `JWT_SECRET` | any long random string | |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | the deployment's own URL (`https://workplace.sapiion.ai` or the `.vercel.app` fallback) | Required — `backend/index.js` has a fatal startup guard that exits if this isn't set in production, even though this same-origin setup doesn't functionally need CORS |

## Railway setup

- Separate Railway **project** from ILS-dev's `zealous-reprieve` — Workplace's database must never mix with ILS-dev's (standalone-product architecture)
- One service: Postgres (`ghcr.io/railwayapp-templates/postgres-ssl:18`)
- **Public Networking must be explicitly enabled** (service → Settings → Networking → "Add Public Access") to get a reachable host:port — without it, only the Railway-internal-only hostname exists, which Vercel cannot reach at all

**Known Railway UI quirk hit during setup:** public domain generation got stuck in a broken state the first time (Networking section showed a blank host before `:5432`, with only a delete option, no way to regenerate). Deleting and recreating the Postgres service from scratch fixed it — and even then, clicking "Add Public Access" required an explicit "Deploy it to activate" step and a hard page refresh before the real domain appeared. If this happens again, delete-and-recreate is the known fix.

## DNS (Hostnet)

- Domain `sapiion.ai` registered at Hostnet (along with `.com`/`.nl`, both parked, no hosting)
- Record: **CNAME**, Name = the **full** `workplace.sapiion.ai` (not just `workplace` — Hostnet's form requires the fully-qualified name unlike most other DNS panels, and will reject/silently fail to save a bare subdomain prefix), Value = the per-project CNAME target Vercel shows under the domain's "Invalid Configuration" detail (unique per Vercel project, looks like `<hash>.vercel-dns-017.com`)

**Resolved a longstanding mystery while doing this:** `api.sapiion.ai` (an old, seemingly orphaned record) and any *other* undefined `sapiion.ai` subdomain both resolve to `91.184.0.200` with an SSL cert for `*.hostnetbv.nl` — that's Hostnet's own default/parking page, not an abandoned third-party service. Any subdomain without its own explicit DNS record falls through to this. Worth remembering next time a "mystery IP" shows up on a sapiion.ai subdomain.

## Bugs found and fixed during this deployment

All pushed to `master`, in order hit:

1. **`85a54a3`** — Vercel's Express "Web Service" builder needs an explicit entrypoint: `"backend": { "root": "backend", "entrypoint": "index.js" }` in `vercel.json`. Without it: `Error: Service "backend" detected framework "express" ... must specify an "entrypoint"`.
2. **`a50963f`** + **`8587355`** — `backend/routes/internships.js` called `fs.mkdirSync` for its uploads directory unguarded at module-load time (twice — once directly, once via multer's `dest` shorthand doing its own internal mkdir). On Vercel's read-only filesystem this threw, and because it happened during route import rather than inside a request handler, it crashed the **entire server** — every route, including `/api/health`, returned 500. Fixed by switching to `multer.diskStorage` with the directory created lazily inside the per-request `destination` callback, wrapped in try/catch. A failure there now fails just that one upload request, not the whole process. Tracked in [#26](https://github.com/Maestrocop/sapiion-workplace/issues/26).
3. **`fe031fa`** — Sequelize loads its Postgres driver (`pg`) dynamically by dialect name at runtime. Vercel's bundler only detects static imports, so it excluded `pg` from the deployed bundle entirely — `Error: Please install pg package manually`, despite `pg` being a real, installed dependency. Fixed with an explicit `import pg from 'pg'` plus `dialectModule: pg` passed to the `Sequelize` constructor in `backend/index.js`.
4. **`CORS_ORIGIN` fatal guard** — not a code bug, just easy to miss: the app deliberately refuses to boot in production without `CORS_ORIGIN` set. Set it to the deployment's own URL (see env var table above).

If setting this up again elsewhere (a real production deploy, a second environment, etc.), all four of these will resurface unless the underlying causes are addressed at the framework/library level rather than patched per-symptom.

## Known limitation — file uploads don't persist

`backend/routes/internships.js` writes uploaded documents to local disk. Vercel's runtime filesystem is read-only/ephemeral outside of a deploy — uploads will fail at request time (an isolated failure, not a crash, since the fix above) until real persistent storage (a Railway Volume, S3-compatible bucket, etc.) is added. Not fixed here — accepted as a known gap for a testing environment. Same caveat would apply to Railway's default filesystem too, absent an explicitly attached Volume — this isn't a Vercel-specific weakness.

## How to update the live data with a full copy of local dev

```powershell
pg_dump --clean --if-exists -d "postgresql://postgres:security@localhost:5432/sapiion_workplace" | psql "<railway-database-url>"
```

Replaces everything on Railway with whatever's in local dev right now — use this instead of re-running seed scripts when you want the actual curated data rather than a generic reseed.

## How to run migrations against the Railway DB from a local machine

```powershell
cd backend
$env:DATABASE_URL = "<railway-database-url>"
npm run create-db
```

(The Railway project has no Node service to run this from directly, since the backend lives on Vercel — this has to be run from a machine that has the codebase and can reach Railway's public Postgres endpoint.)

## How to redeploy

Push to `master` on `Maestrocop/sapiion-workplace` — Vercel auto-deploys. Check the Vercel project's **Deployments** tab for build status, and its **Logs** tab (not the build log — a separate runtime log) for actual request-time errors.

## Costs

- **Vercel:** Hobby/free tier — one more project on an existing account, no additional cost
- **Railway:** Hobby plan, $5/month included usage — confirmed 2026-09-03 that a small test database stays well within the included allowance (existing ILS-dev usage was $0.60/month before adding this)
