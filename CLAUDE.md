# CLAUDE.md

Guidance for working in this repository.

## What this is

Sapiion Workplace — open-source workplace learning / internship management. Standalone product: companies, students, supervisors (token-based, no login), placements, weekly activity logs, bilateral assessments (teacher + supervisor), applications.

This is a **fresh build**, not an extraction. It shares no database, auth, or runtime with the closed-source Sapiion platform (ils-dev in a sibling repo). Schema is intentionally kept structurally parallel to that platform's internship tables so a future upgrade path (Workplace → full Sapiion) is a straightforward data migration, not a transform — but the two codebases are independent.

## Architecture

- **Backend** (`backend/`): Express + Sequelize + Postgres, same conventions as the closed-source platform — migrations are the sole source of truth (`sequelize.sync()` is never used), `BIGINT IDENTITY` PKs, `created_at`/`updated_at`/`deleted_at` soft deletes on all domain tables.
- **Frontend** (`frontend/`): React 18 + Vite + Tailwind, plain fetch for API calls (no i18n/rich-text libraries yet — add only if the project actually needs them).
- **Auth**: local email/password (argon2 + JWT) always works; Microsoft Entra ID and Google OAuth are optional and only activate once real client credentials are set in `.env`.

## Deliberate scope boundaries — do not blur these

- **No rubrics, criteria, or learning_outcomes tables, ever.** Those are the horizontal intelligence layer of the commercial Sapiion platform. `assignments` here is a plain record (title, points, discipline) with no grading/rubric engine behind it — that boundary is what keeps this product's scope honest, not a technical limitation to work around.
- `classes` and `assignments` in this repo are lightweight, Workplace-local tables — not the same tables as the closed-source platform's curriculum hierarchy (which also carries institution/campus/course/module concepts this product doesn't need). Same core columns, same purpose (satisfy the same FKs the internship domain always had), deliberately not the same complexity.
- Don't add new coupling from the internship domain to anything resembling curriculum/outcomes intelligence. If a feature needs that, it belongs in commercial Sapiion, not here.

## Development

```bash
# Backend (port 4100)
cd backend && npm install && npm run create-db && npm run dev

# Frontend (port 5174, proxies /api to :4100)
cd frontend && npm install && npm run dev
```

Self-hosting: `docker compose up` from the repo root (Postgres + backend + frontend).

## Migrations

All migrations in `backend/migrations/` must be idempotent (`IF NOT EXISTS` guards). Never alter an existing migration file — add a new one. Applied via `npm run create-db` (runs all pending, tracked in a `migrations_log` table) or `node scripts/apply_migration.cjs <file>` for a single file.

## License

AGPL-3.0 — see [LICENSE](LICENSE). Chosen deliberately: anyone can self-host and modify freely, but running it as a network service requires releasing modifications too.
