# Sapiion Workplace

Open-source workplace learning / internship management: companies, placements, supervisors, activity logs, assessments, and reflections.

This is a standalone product — a fresh build using the internship domain design from [Sapiion](https://sapiion.ai) as its blueprint, not an extraction of that codebase. It does not depend on, share a database with, or require the main Sapiion platform to run.

## Status

Under active development. Core internship lifecycle (search → placement → on-site → evaluation → completion) is functional end-to-end for coordinators, students, and external company supervisors.

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

### First login

Either create your own admin account:

```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npm run seed:admin
```

...or load a small realistic demo dataset (a class, a campaign, three students, a company, and one internship with a supervisor, activity log, and assessment already filled in):

```bash
cd backend
npm run seed:demo
```

This prints the demo logins (`coordinator@example.com` / `student1@example.com` etc., password `DemoPassword123`) and a supervisor portal link you can open directly, no login required.

For a fuller demo (students spread across every phase, several companies, completed internships with scores), run the extended seed once the backend is already running (it goes through the real API, not direct database writes):

```bash
cd backend
npm run seed:demo:extended
```

## What's here

- **Companies** — registry with CRM fields (partnership status, visits)
- **Internship campaigns** — coordinator-managed cohorts per class/academic year, with student enrollment
- **Internships** — the placement record: company info, supervisors, weekly activity logs, bilateral assessment (teacher + supervisor), placement checklist, applications, and document uploads
- **Supervisor portal** — token-based, no account required — the external company supervisor updates their own details and acknowledges logs via a link, nothing else
- Local email/password auth out of the box; Microsoft Entra ID and Google sign-in work once an administrator adds real OAuth credentials to `.env` (see `.env.example`)
- Multi-language UI — English, Dutch, French, German, Spanish, switchable per user from the header

## Self-hosting with Docker

```bash
docker compose up
```

Starts Postgres, backend (port 4100), and frontend (port 8080) together — the backend runs pending migrations automatically on startup. To load the demo dataset once containers are up:

```bash
docker compose exec backend npm run seed:demo
```

## License

[AGPL-3.0](LICENSE) — chosen so anyone can self-host and modify freely, but running it as a network service requires releasing modifications too.
