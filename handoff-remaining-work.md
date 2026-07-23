# Sage Vault — Handoff: Remaining Work

Status as of 2026-07-23. This doc exists so work can continue on another machine or by another person without re-deriving context. Two independent workstreams are covered below: (A) the lab curriculum roadmap, (B) the org-lead / admin visibility feature that was mid-build when this doc was requested.

---

## A. Lab Curriculum — What's Built vs What's Left

### Currently live (41 published labs)

**CTF (5)** — category in parens
- `welcome-ctf` (Misc), `osint-investigation` (OSINT), `web-recon` (Reconnaissance), `sql-injection-101` (Web Security), `xss-fundamentals` (Web Security)

**Blue Team (25)**
- AI Security: `prompt-injection`, `llm-jailbreaking`, `ai-data-leakage`
- Cloud Security: `cloud-iam-misconfiguration`, `cloudtrail-analysis`
- Detection Engineering: `sigma-rule-creation`, `sigma-to-splunk`, `detection-tuning`
- DFIR: `windows-registry-analysis`, `browser-forensics`
- Email Security: `phishing-analysis`
- Incident Response: `phishing-click-incident`
- Insider Threat: `insider-threat-investigation`
- Log Analysis: `persistence-detection`, `rdp-attack-investigation`, `web-server-log-analysis`, `powershell-attack-detection`, `dns-exfiltration-detection`, `linux-auth-investigation`, `windows-log-analysis`
- Malware Analysis: `yara-rule-basics`, `malware-triage`
- Memory Analysis: `memory-forensics`
- Network Analysis: `network-forensics-101`
- SOC: `mitre-attack-mapping`, `soc-alert-investigation`
- Threat Intelligence: `virustotal-investigation`, `ioc-hunting`

**Red Team (11)**
- Active Directory: `active-directory-101`
- Linux Security: `privilege-escalation`
- Web Security: `password-spraying`, `idor-hunting`, `file-upload-bypass`, `jwt-exploitation`, `xxe-injection`, `ssrf-attack`

Each lab lives as a slug-registered pair (`_content/<slug>.tsx` + `_components/<slug>-client.tsx`) in [src/app/labs/[slug]/_content/index.tsx](src/app/labs/[slug]/_content/index.tsx), which is the only place a new lab needs to be wired in — `/api/labs/response` is fully generic and reads `TASK_STAGES` dynamically, so adding labs is purely additive.

### What's thin or missing, per the original 8-category roadmap

The original pasted roadmap (8 categories + Weekly Competitions + Vault Progression tiers) is not reproduced verbatim here — refer back to that source doc for exact lab-by-lab detail. Cross-referencing against what's live:

| Roadmap category | Current coverage | Gap |
|---|---|---|
| Advanced Blue Team | Log Analysis, SOC, Malware, Memory are reasonably covered | Needs more advanced/HARD-tier scenarios; most current labs are EASY/MEDIUM |
| Red Team | Only Web Security + AD 101 + Linux privesc | Missing: full AD attack chains (Kerberoasting, DCSync, Golden Ticket), lateral movement, C2 frameworks, evasion techniques |
| Detection Engineering | Sigma creation/conversion, tuning | Missing: correlation rule building, SOAR playbooks, alert triage at scale, false-positive reduction |
| AI + Modern Security | prompt-injection, jailbreaking, data leakage | Missing: AI supply-chain attacks, model extraction, adversarial inputs, RAG poisoning |
| DFIR | Registry, browser forensics | Missing: full disk forensics, timeline analysis, ransomware recovery, cloud forensics |
| Cloud Security | IAM/S3 misconfig, CloudTrail | Missing: container/K8s security, serverless attack surface, multi-cloud IAM chains, Azure/GCP-specific labs (current 2 are AWS-only) |
| Threat Intelligence | VirusTotal, IOC hunting | Missing: threat actor profiling, campaign tracking, STIX/TAXII, intel report writing |
| Real World Mini Incidents | `phishing-click-incident` only | This category is the least built out — needs more full-chain "here's what actually happened" incident labs like the phishing one |

**Weekly Competition / gamification system** — entirely unbuilt. 10 formats were proposed: SOC League (ranks + coins), Daily Hunt, Detection Championship, Threat Hunting Race, IOC Olympics, Phishing Detective, Reverse Engineering Sprint, Incident Response Challenge, SOC Bingo, Cyber Olympics. None have schema, UI, or scoring logic yet. The existing `Competition`/`CompetitionEntry` models are a plain "join a competition" system, not this gamified layer — building this would likely need new models for streaks/coins/seasonal ranks distinct from `skillScore`/`xp`.

**Vault Progression (8-tier, ~100-120 labs)** — a suggested structure to organize all labs (built + roadmap) into a gated tier system (must complete tier N to unlock tier N+1). Not implemented; currently all published labs are simply browsable with no gating.

### How to add a new lab (reference for whoever continues)

1. Add `Lab` + `Flag` + `LabHint` rows via an idempotent seed script (`db.lab.upsert()` by slug, then `deleteMany`+`createMany` for Flag/LabHint — see `scripts/seed-batch-3.ts` for the pattern).
2. Create `_content/<slug>.tsx` (server wrapper reading `LabResponse` rows) + `_components/<slug>-client.tsx` (client UI, per-task `TaskShell` from `lab-ui.tsx`, radio/`MonoInput` validation, `saveStage()` POST to `/api/labs/response`).
3. Register both in `REGISTRY` and `TASK_STAGES` in `src/app/labs/[slug]/_content/index.tsx`.
4. **Known gotcha**: if using `checkFlag(value, expected)`, make sure the `expected` string passed to `checkFlag` is IDENTICAL to whatever leetspeak/plain string you show in the "Correct!" success message — mismatches here were the single most common bug this session (fixed ~9 instances after the fact via grep audit).
5. No changes needed anywhere else — scoring, XP, competition point awards, and webhooks all read the registry dynamically.

---

## B. Org-Lead & Admin Visibility Feature (in progress, uncommitted)

### The ask

1. Admin should be able to see who's enrolled in Academy courses and their progress (currently zero visibility anywhere).
2. Org leads (`OrganizationMember.isLead`) should get a unified per-member view: skills radar, MITRE ATT&CK mapping, achievements, and stats — today these four exist only as self-only pages (`/mitre`, `/skills`, `/achievements`, `/stats`), each hardcoded to `getOrCreateAppUser()`'s own id with no way to view a teammate.

### Design decided

Rather than duplicating ~800 lines of computation + SVG rendering across a self-view page and a new org-lead view, the plan is to extract each self-only page's data computation into `src/lib/insights/*.ts` (pure functions parameterized by `userId`) and its rendering into `src/components/insights/*.tsx` (pure components taking the computed data as props). Both the existing self-service pages and the new org-lead page then consume the same source of truth — no drift risk.

### Already done (local, uncommitted — not yet pushed anywhere)

- `src/lib/insights/mitre.ts` — `ALL_TACTICS`, `LAB_TECHNIQUES` map, `computeMitreCoverage(userId)` → `MitreCoverage`
- `src/components/insights/mitre-tactic-grid.tsx` — `MitreTacticGrid` (kill-chain bar + tactic cards + gap callout) and `MitreCoverageHeader`, both taking `coverage: MitreCoverage`
- `src/app/mitre/page.tsx` — refactored to a thin wrapper calling the above; **this one is fully done and working**, same UI as before
- `src/lib/insights/skills.ts` — `computeSkillRadar(userId)` → `{ skills: SkillDimension[], overallScore }`
- `src/components/insights/skill-radar-chart.tsx` — `SkillRadarChart` (pure SVG radar) and `SkillBreakdownCards`, both taking `skills: SkillDimension[]` — **created but not yet wired into `/skills/page.tsx`**

### Still to do, in order

1. **Refactor `/skills/page.tsx`** to call `computeSkillRadar` + render `<SkillRadarChart>` / `<SkillBreakdownCards>` instead of its inline copies (source for the original inline version: git history / current file, since it hasn't been touched yet).
2. **Extract `src/lib/insights/achievements.ts`** — move the `Achievement` type, the `ACHIEVEMENTS` array builder, and `calcStreak` helper out of `src/app/achievements/page.tsx` into `computeAchievements(userId)` → `{ achievements, earned, locked, earnPct }`.
3. **Extract `src/components/insights/achievements-grid.tsx`** — the by-category grouped card grid, taking `achievements: Achievement[]`.
4. **Refactor `/achievements/page.tsx`** to use both.
5. **Build `src/lib/insights/academy.ts`** with two exports:
   - `getUserAcademyProgress(userId)` — per-course enrollment + lesson completion count + quiz pass count + certificate issued, for one user (needed by the org member page below)
   - `getAllAcademyEnrollments()` — every enrollment across every user/course with computed progress %, for the admin-wide table. Schema reference: `AcademyEnrollment` → `AcademyCourse` → `AcademyModule` → `AcademyLesson`/`AcademyQuiz`; completion tracked via `AcademyLessonProgress.completedAt` and `AcademyQuizAttempt.passed`; `AcademyCertificate` marks course completion. See `prisma/schema.prisma` lines ~1165-1370 for full model shapes — already read and confirmed during this session, no surprises expected.
6. **Build `src/lib/org-access.ts`** — `canViewOrgMember(viewerId, targetUserId)`: viewer must have an `OrganizationMember` row with `isLead: true` whose `organizationId` matches one of the target's `OrganizationMember.organizationId` rows (also allow `role === "ADMIN"` to bypass, for convenience). Redirect/403 if false.
7. **Build `src/app/organization/member/[userId]/page.tsx`** — the actual unified view. Sections: header (name/email/role/rank via `getRankInfo`), lab+sim stat cards (same per-member calc pattern already used in `src/app/organization/page.tsx`'s `memberStats`, just scoped to one user instead of the whole org), `<SkillRadarChart>`/`<SkillBreakdownCards>`, `<MitreTacticGrid>`, `<AchievementsGrid>`, and an Academy progress section from `getUserAcademyProgress`. Gate the whole page with `canViewOrgMember`.
8. **Wire links**: in `src/app/organization/page.tsx`'s leaderboard table (~line 286-313), add a "Details →" link per row pointing at `/organization/member/{userId}` (keep the existing `/profile/{userId}` link too — they serve different audiences).
9. **Build `src/app/admin/academy/enrollments/page.tsx`** — admin-wide table using `getAllAcademyEnrollments()`: user, course, enrolled date, lesson progress %, quiz pass count, completed date. Support a `?courseId=` filter.
10. **Wire link**: in `src/app/admin/academy/page.tsx`, make each course row's "Enrolled" count (currently plain text, ~line 80) a link to `/admin/academy/enrollments?courseId={course.id}`, plus an "Enrollments" nav link near the "+ New Course" button.
11. **Run `npm run build`** to confirm no type errors — nothing here touches `/api/labs/response` or scoring, so risk is contained to these new/refactored files.
12. **Commit once, push once, deploy** — per this project's established workflow (build everything first, single push/deploy cycle at the end, not one per file).

### Important caveat

Steps already marked "done" above exist only as uncommitted local files on the machine this was built on (`git status` will show them as untracked/modified). If continuing on a different machine, these files need to be recreated from this spec (they're small and the exact content is described precisely enough to reproduce) — they were never committed or pushed.
