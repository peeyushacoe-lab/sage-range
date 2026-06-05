# Sage Range

AI-driven cybersecurity training, assessment, and recruitment platform.

This repo currently covers the **Week 1 vertical slice**: auth, dashboard, DB schema, and a working CTF flag-submission endpoint with a leaderboard.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Clerk (auth)
- Prisma + PostgreSQL
- Zod (validation)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure env (Supabase)

Copy `.env.example` to `.env` and fill in:

**Supabase Postgres** — go to your Supabase project → Project Settings → Database → Connection string. You need **two** URLs:

- `DATABASE_URL` — the **pooled** connection (PgBouncer, port `6543`). Append `?pgbouncer=true&connection_limit=1` to the URL. This is what the app uses at runtime — the pooler is required for Next.js / serverless because it reuses connections across requests.
- `DIRECT_URL` — the **direct** connection (port `5432`). Prisma uses this for migrations and `db push` (PgBouncer can't handle prepared statements that schema operations need).

**Clerk** — from <https://dashboard.clerk.com> → your app → API Keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### 3. Set up the database

```bash
npm run db:push     # uses DIRECT_URL to create tables from schema.prisma
npm run db:seed     # loads 3 starter labs
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## What's built

- `/` — marketing landing page
- `/sign-in`, `/sign-up` — Clerk-hosted auth
- `/dashboard` — auth-gated, shows skill score, XP, labs solved, recent attempts, lab cards with ✓ solved indicators
- `/labs` — browse all labs, filter by type (CTF / Blue Team / Red Team), solved status badges
- `/labs/[slug]` — lab detail page with per-lab challenge content + flag submission UI
- `/leaderboard` — overall + per-type tabs (CTF / Blue Team / Red Team)
- `POST /api/labs/submit` — validates a flag, records the attempt, awards points atomically

Lab challenge content shipped:

- `welcome-ctf` — flag hidden in HTML comment (intro to View Source)
- `sql-injection-101` — fake vulnerable login form that responds to classic SQLi payloads
- `soc-alert-investigation` — Week 3 stub with a sample log excerpt; flag submission works

## Roadmap

| Week | Focus |
| --- | --- |
| 1 | Auth + dashboard + DB schema + flag submission ✅ |
| 2 | Lab pages, full CTF UX, scoring polish ✅ |
| 3 | Blue-team SOC lab (PCAP/log upload, scoring engine) |
| 4 | AI evaluation + internship dashboard |

## Notes on isolation

Lab containers (Docker → later Firecracker / Proxmox) are not yet wired up. **Never** expose unrestricted outbound or real infra in any lab environment. See the MVP plan for the isolation strategy.
