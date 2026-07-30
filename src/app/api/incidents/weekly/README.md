# Weekly Incident Cases API

Sprint 1 P0 implementation: Automated weekly incident releases with leaderboard rankings and certificates.

## Overview

The Weekly Incidents API provides:
- **Weekly Case Release**: Every Monday 00:00 UTC, a new incident case becomes available
- **Leaderboard Rankings**: Track top 100 participants with score and time-based ranking
- **Certificates**: Award completion certificates to users who finish on time
- **User Progress**: Real-time tracking of user progress vs. deadline
- **Admin Management**: Create and manage weekly cases

## Data Model

### WeeklyIncidentCase
```typescript
{
  id: string;                    // Primary key
  season: number;                // Year (e.g., 2026)
  weekNumber: number;            // 1-52
  weekStartUTC: DateTime;        // Monday 00:00 UTC
  incidentSlug: string;          // Soft ref to IncidentSimulation.slug
  difficulty: Difficulty;        // EASY | MEDIUM | HARD | INSANE
  points: number;                // Award for completion
  releaseTime: DateTime;         // When case goes live
  deadlineTime: DateTime;        // Sunday 23:59 UTC
  published: boolean;            // Is case released?
  archivedAt: DateTime | null;   // Soft delete after 8 weeks
}
```

### WeeklyIncidentLeaderboard
```typescript
{
  id: string;
  caseId: string;                // FK to WeeklyIncidentCase
  userId: string;                // FK to User
  completedAt: DateTime | null;  // When user finished (null if not completed)
  timeTakenMin: number | null;   // Minutes from release to completion
  score: number;                 // evidenceBoardScore + reportScore
  rank: number | null;           // 1-N, computed after deadline
  rankUpdatedAt: DateTime | null;
  evidenceBoardScore: number | null;  // Accuracy of evidence board (0-100)
  reportScore: number | null;         // Admin review score (0-100)
}
```

### WeeklyIncidentCertificate
```typescript
{
  id: string;
  caseId: string;                // FK to WeeklyIncidentCase
  season: number;
  weekNumber: number;
  certCode: string;              // e.g., WIC-2026-W01-ABC123DEF
  issuedAt: DateTime;
  publishedAt: DateTime | null;  // When announced
}
```

## API Endpoints

### 1. GET `/api/incidents/weekly`
Get the current active weekly case (if published and released).

**Response (200):**
```json
{
  "case": {
    "id": "cuid_...",
    "weekStartUTC": "2026-01-05T00:00:00Z",
    "weekNumber": 1,
    "season": 2026,
    "incidentSlug": "phishing-click-incident",
    "difficulty": "EASY",
    "points": 1000,
    "releaseTime": "2026-01-05T00:00:00Z",
    "deadlineTime": "2026-01-12T23:59:00Z",
    "published": true
  }
}
```

**Response (204):** No active case.

---

### 2. GET `/api/incidents/weekly/[caseId]/leaderboard`
Get top 100 participants ranked by score (then time for tiebreaker).

**Query Parameters:**
- `limit?: number` (default: 100, max: 100)

**Response (200):**
```json
{
  "case": {
    "id": "cuid_...",
    "weekNumber": 1,
    "season": 2026,
    "difficulty": "EASY",
    "deadlineTime": "2026-01-12T23:59:00Z"
  },
  "leaderboard": [
    {
      "rank": 1,
      "userId": "cuid_...",
      "displayName": "Alice",
      "email": "alice@example.com",
      "score": 950,
      "timeTakenMin": 45,
      "completedAt": "2026-01-10T14:30:00Z",
      "evidenceBoardScore": 85,
      "reportScore": 90
    },
    {
      "rank": 2,
      "userId": "cuid_...",
      "displayName": "Bob",
      "email": "bob@example.com",
      "score": 920,
      "timeTakenMin": 52,
      "completedAt": "2026-01-10T15:00:00Z",
      "evidenceBoardScore": 82,
      "reportScore": 88
    }
  ]
}
```

**Response (404):** Case not found.

---

### 3. GET `/api/incidents/weekly/[caseId]/certificate`
Get the weekly certificate earned by the authenticated user (if any).

**Authentication Required:** Yes

**Response (200):**
```json
{
  "earned": true,
  "certificate": {
    "id": "cuid_...",
    "certCode": "WIC-2026-W01-ABC123DEF",
    "season": 2026,
    "weekNumber": 1,
    "issuedAt": "2026-01-13T02:00:00Z"
  }
}
```

**Response (200):** If not earned:
```json
{
  "earned": false,
  "certificate": null
}
```

**Response (401):** Not authenticated.
**Response (404):** Case not found.

---

### 4. GET `/api/user/incidents/weekly/progress`
Get the authenticated user's real-time progress on the current week's case.

**Authentication Required:** Yes

**Query Parameters:**
- `caseId?: string` (defaults to current case)

**Response (200):**
```json
{
  "case": {
    "id": "cuid_...",
    "weekNumber": 1,
    "season": 2026,
    "incidentSlug": "phishing-click-incident",
    "difficulty": "EASY",
    "releaseTime": "2026-01-05T00:00:00Z",
    "deadlineTime": "2026-01-12T23:59:00Z"
  },
  "progress": {
    "completed": false,
    "completedAt": null,
    "score": 0,
    "rank": null,
    "daysRemaining": 7,
    "evidenceBoardScore": null,
    "reportScore": null
  }
}
```

**Response (200):** No active case:
```json
{
  "case": null,
  "progress": null
}
```

**Response (401):** Not authenticated.

---

### 5. POST `/api/admin/incidents/weekly/create`
Create a new weekly incident case (admin only).

**Authentication Required:** Yes (ADMIN role only)

**Request Body:**
```json
{
  "season": 2026,
  "weekNumber": 1,
  "incidentSlug": "phishing-click-incident",
  "difficulty": "EASY",
  "points": 1000,
  "releaseTime": "2026-01-05T00:00:00Z",
  "deadlineTime": "2026-01-12T23:59:00Z",
  "published": false
}
```

**Response (201):**
```json
{
  "id": "cuid_...",
  "season": 2026,
  "weekNumber": 1,
  "incidentSlug": "phishing-click-incident",
  "difficulty": "EASY",
  "points": 1000,
  "releaseTime": "2026-01-05T00:00:00Z",
  "deadlineTime": "2026-01-12T23:59:00Z",
  "published": false
}
```

**Response (400):** Invalid request or incident doesn't exist.
**Response (403):** Not an admin.
**Response (409):** Case already exists for season/week.

---

## Background Jobs (Defined, Not Scheduled Yet)

### `releaseWeeklyIncident()`
Runs: Every Monday 00:00 UTC

Publishes the next unpublished case that's scheduled to release.

```typescript
export async function releaseWeeklyIncident(): Promise<{ released: boolean; caseId?: string; error?: string }>
```

### `computeWeeklyLeaderboardRanksJob()`
Runs: Every Monday 01:00 UTC (1 hour after release)

Computes final rankings for the previous week's case (now that deadline has passed).

```typescript
export async function computeWeeklyLeaderboardRanksJob(): Promise<{ processed: number; caseId?: string }>
```

Ranking algorithm:
1. Sort all completers by `score DESC, timeTakenMin ASC`
2. Assign rank 1-N to each entry
3. Store rank in `WeeklyIncidentLeaderboard.rank`

### `issueWeeklyCertificatesJob()`
Runs: Every Monday 02:00 UTC (2 hours after release)

Issues certificates to all users who completed the previous week's case on time.

```typescript
export async function issueWeeklyCertificatesJob(): Promise<{ issued: number; caseId?: string }>
```

Certificate format: `WIC-{SEASON}-W{WEEKNUMBER:2d}-{RANDOM:9d}`

---

## Scoring

Score = `evidenceBoardScore` + `reportScore`

- **evidenceBoardScore**: Accuracy % of evidence board categorization (0-100)
  - Pulled from `IncidentSimEvidenceBoard.accuracyPct` after user submits
  - Reflects how well the user mapped artifacts to MITRE tactics

- **reportScore**: Admin review of executive report (0-100)
  - Pulled from admin grading system (future phase)
  - For now, defaults to null; will be graded post-deadline

**Speed Bonus:** (Future enhancement)
- Early completions (within first 25% of week) could receive small bonus
- Stored in `timeTakenMin` for tiebreaker ranking

---

## Integration Points

1. **Evidence Board**: After user submits evidence board, trigger score update
   ```typescript
   await updateWeeklyLeaderboardEntry(userId, caseId, {
     evidenceBoardScore: board.accuracyPct,
     score: (board.accuracyPct ?? 0) + (reportScore ?? 0)
   });
   ```

2. **Report Submission**: After user submits report, mark completion
   ```typescript
   await updateWeeklyLeaderboardEntry(userId, caseId, {
     completedAt: new Date(),
     timeTakenMin: Math.floor((Date.now() - case.releaseTime) / 60000),
     reportScore: 0, // Will be graded by admin
   });
   ```

3. **Existing IncidentSimulation Model**: Weekly cases reference existing incidents via `incidentSlug`
   - No FK constraint (simulations can be deleted; cases remain)
   - UI must gracefully handle missing incident

---

## Testing

### Seed Data
```bash
npx ts-node scripts/seed-weekly-incidents.ts
```

Creates W1-W8 test cases with progressive difficulty:
- W1-2: EASY (1000 pts)
- W3-4: MEDIUM (1200 pts)
- W5-6: HARD (1500 pts)
- W7-8: INSANE (2000 pts)

Each uses a cycling selection from existing incident simulations.

### Run Tests
```bash
npm test -- src/app/api/incidents/weekly/__tests__/
```

Tests cover:
- `getCurrentWeeklyCase()` — fetches published, released case
- `getUserWeeklyProgress()` — tracks completion status
- `getWeeklyLeaderboard()` — ranks top 100
- `computeWeeklyLeaderboardRanks()` — denormalizes rankings
- `getUserWeeklyCertificate()` — returns earned certs
- `issueWeeklyCertificates()` — batch certificate issuance
- API endpoints (200, 400, 401, 404, 409 responses)

---

## Caching Strategy

**Redis Caching** (future enhancement):
- Leaderboard snapshots (1h TTL) for `/incidents/weekly/[caseId]/leaderboard`
  - Key: `wic:leaderboard:{caseId}:{limit}`
  - Invalidated when a user completes

- Current case (24h TTL) for `/incidents/weekly`
  - Key: `wic:current`
  - Invalidated when a new case releases

---

## Future Enhancements

1. **Speed Bonuses**: Reward early completions (within first 25% of week)
2. **Streaks**: Track consecutive week completion streaks
3. **Leaderboard Filters**: Filter by difficulty, season, or user organization
4. **Analytics Dashboard**: Admin view of completion rates, average scores
5. **Discord/Slack Webhooks**: Announce weekly winners
6. **Global Leaderboard**: Cross-season rankings
7. **Weekly Missions**: Related micro-challenges within the case

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "details": {} // Optional validation details
}
```

**Error Codes:**
- `unauthorized` (401): User not authenticated
- `forbidden` (403): User lacks required role (e.g., ADMIN)
- `bad_request` (400): Invalid input or missing incident
- `case_not_found` (404): Case doesn't exist
- `incident_not_found` (400): Referenced incident doesn't exist
- `conflict` (409): Case already exists for season/week

---

## Rate Limiting

- **Progress endpoint**: 30 requests per 10 minutes per user
- **Leaderboard endpoint**: 60 requests per 10 minutes per user
- **Certificate endpoint**: 60 requests per 10 minutes per user
- **Create endpoint**: 1 request per minute per admin

Implemented via `rateLimit()` utility (DB-backed for serverless).

---

## Audit Logging

All admin mutations logged via `audit()` utility:

```typescript
audit({
  actorId: user.id,
  action: "INCIDENT_WEEKLY_CREATE", // or others
  target: case.id,
  req,
  meta: { season, weekNumber, difficulty, published }
});
```
