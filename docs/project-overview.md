# Sage Range — Project Overview

## What Is This

**Sage Range** is an AI-driven cybersecurity training, assessment, and recruitment platform. It lets students practice real-world security skills through labs, simulations, and competitions, while instructors manage classrooms and recruiters discover talent.

---

## What Has Been Built

### Authentication & Users
- Clerk-based sign-in / sign-up (`/sign-in`, `/sign-up`)
- Role system: `STUDENT`, `INSTRUCTOR`, `RECRUITER`, `ADMIN`
- Profile pages with LinkedIn, GitHub, university fields
- Institution membership (join via code)

### Dashboard
- Auth-gated dashboard showing skill score, XP, labs solved
- Certification progress card
- Recent attempt history

### Labs
- Browse page with filter by type (CTF / Blue Team / Red Team) and difficulty
- Per-lab detail page with challenge content + flag submission UI
- Hint system (reveal hints, tracked per user)
- AI evaluation for open-ended responses
- **Labs shipped:**
  - `welcome-ctf` — flag hidden in HTML comment (intro to View Source)
  - `sql-injection-101` — fake vulnerable login form (SQLi payloads)
  - `soc-alert-investigation` — SOC log investigation
  - `phishing-analysis` — phishing email triage
  - `xss-fundamentals` — cross-site scripting basics
  - `network-forensics-101` — PCAP/network analysis
  - `memory-forensics` — memory dump investigation
  - `malware-triage` — malware sample analysis
  - `osint-investigation` — open-source intelligence
  - `web-recon` — web reconnaissance
  - `ssrf-attack` — server-side request forgery
  - `privilege-escalation` — Linux privesc
  - `active-directory-101` — AD enumeration
  - `windows-log-analysis` — Windows event log analysis

### Leaderboard
- Overall + per-type tabs (CTF / Blue Team / Red Team)

### Learning Paths
- Enroll in curated lab paths
- Track progress, earn certificates on completion
- Certificate page with LinkedIn share + print buttons
- Public certificate verification at `/verify/[certId]`

### Classroom (Instructor Feature)
- Create classrooms, invite students via code
- Assign labs to a classroom
- CSV bulk-import students
- Classroom report / progress view with print support

### Competitions
- Browse and join competitions
- Slug-based competition pages

### Simulation (Incident Response War Game)
- Start a new simulation session (solo or team)
- Choose from scenario templates: phishing/ransomware, data breach, insider threat, cloud misconfiguration, supply chain attack
- Real-time war-room UI — make decisions under pressure
- AI-driven: dynamic narrative, executive pressure, social contagion, consequence engine, coaching feedback
- Post-simulation debrief with gap analysis and copy-able report
- Team play: create/join team sessions, lobby, role assignments

### Recruiter Portal
- Job posting management (create, edit, delete)
- Browse and bookmark candidate profiles

### Admin Panel
- Manage users (role assignment)
- Manage labs (publish/unpublish toggle)
- Manage learning path templates (enable/disable)
- Manage institutions (active toggle, copy join code)
- Create competitions

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Auth | Clerk |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Validation | Zod |
| AI | OpenAI SDK (`openai` package) |
| Dev server | Custom `scripts/dev.js` with proxy (`src/proxy.ts`) |

---

## APIs Built

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/labs/submit` | Validate flag, record attempt, award points |
| POST | `/api/labs/hint` | Reveal a hint (deducts points) |
| POST | `/api/labs/response` | Submit open-ended lab response |
| POST | `/api/ai/evaluate` | AI evaluation of a lab response |
| POST | `/api/paths/[slug]/enroll` | Enroll in a learning path |
| GET | `/api/cert/check` | Check certificate eligibility |
| POST | `/api/classroom/create` | Create a classroom |
| POST | `/api/classroom/join` | Join a classroom via code |
| POST | `/api/classroom/[id]/assign` | Assign labs to classroom |
| POST | `/api/classroom/[id]/import` | Bulk import students via CSV |
| POST | `/api/competitions/[slug]/join` | Join a competition |
| POST | `/api/institution/join` | Join an institution via code |
| POST | `/api/profile` | Update user profile |
| POST | `/api/simulation/start` | Start a simulation session |
| GET/POST | `/api/simulation/[sessionId]` | Get/update simulation state |
| POST | `/api/simulation/[sessionId]/action` | Submit a decision in a simulation |
| POST | `/api/team/create` | Create a team session |
| POST | `/api/team/join` | Join a team |
| POST | `/api/team/[id]/launch` | Launch team simulation |
| PATCH | `/api/team/[id]/role` | Update member role |
| DELETE | `/api/team/[id]` | Delete team |
| POST | `/api/recruiter/postings` | Create job posting |
| PATCH/DELETE | `/api/recruiter/postings/[id]` | Edit/delete posting |
| POST | `/api/recruiter/bookmark` | Bookmark a candidate |
| PATCH | `/api/admin/user/[id]` | Change user role |
| PATCH | `/api/admin/lab/[id]` | Toggle lab published |
| PATCH | `/api/admin/template/[id]` | Toggle path template |
| POST | `/api/admin/competition` | Create competition |
| PATCH | `/api/admin/competition/[id]` | Update competition |
| POST | `/api/admin/institution` | Create institution |
| PATCH | `/api/admin/institution/[id]` | Update institution |

---

## Database Models

`User`, `Lab`, `Flag`, `Attempt`, `LabResponse`, `AIEvaluation`, `LearningPath`, `PathLab`, `UserPathProgress`, `IRCertification`, `Classroom`, `ClassroomEnrollment`, `ClassroomLabAssignment`, `SimulationSession`, `TeamSession`, `TeamMember`, `JobPosting`, `CandidateBookmark`, `LabHint`, `UsedHint`, `Competition`, `CompetitionEntry`, `Institution`, `InstitutionMember`

---

## External Services Used

| Service | Purpose |
|---------|---------|
| **Clerk** | Authentication, user sessions, JWT |
| **Supabase** | Managed PostgreSQL hosting |
| **OpenAI API** | AI evaluation of lab responses, simulation narration, coaching, executive pressure, debrief reports |

---

## Dev Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema to DB (no migration file)
npm run db:migrate   # Create and apply migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed starter labs
```
