# Sapiion Workplace

Open-source workplace learning / internship management: companies, placements, supervisors, activity logs, assessments, and reflections.

This is a standalone product — a fresh build using the internship domain design from [Sapiion](https://sapiion.ai) as its blueprint, not an extraction of that codebase. It does not depend on, share a database with, or require the main Sapiion platform to run.

## Status

Under active development. Repository kept private until ready to launch publicly.

## Development setup

```bash
# Backend (port 4100)
cd backend
cp .env.example .env   # edit DATABASE_URL etc.
npm install
npm run create-db      # creates schema via migrations
npm run dev

# Frontend (port 5174, proxies /api to :4100)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Self-hosting with Docker

```bash
docker compose up
```

Starts Postgres, backend (port 4100), and frontend (port 8080) together.

## License

[AGPL-3.0](LICENSE) — chosen so anyone can self-host and modify freely, but running it as a network service requires releasing modifications too.
