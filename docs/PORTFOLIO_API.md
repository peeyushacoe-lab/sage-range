# Career Portfolio API

## Overview

The Career Portfolio API provides endpoints for users to view and manage their public cybersecurity achievement profile. It aggregates achievements from labs, incident simulations, competitions, certificates, and detection rules.

**Base URL:** `/api/portfolio`

## Endpoints

### 1. GET /api/portfolio

Retrieve the current authenticated user's portfolio (private view with edit options).

**Request:**
```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Cookie: [auth-cookie]"
```

**Response (200):**
```json
{
  "id": "cuid",
  "userId": "user-id",
  "slug": "alice-smith",
  "visibility": "PRIVATE",
  "bio": "Cybersecurity analyst specializing in incident response",
  "totalLabsSolved": 42,
  "totalIncidentsSolved": 8,
  "totalWeeklyCerts": 5,
  "totalCompetitionsWon": 2,
  "totalRulesShared": 3,
  "huntsCompleted": 4,
  "mitreTopTactics": ["PERSISTENCE", "EXFILTRATION", "LATERAL_MOVEMENT"],
  "achievements": [
    {
      "id": "ach-123",
      "type": "LAB_SOLVED",
      "title": "Solved: Advanced XSS",
      "description": "Completed Advanced XSS lab at difficulty HARD",
      "icon": "⚡",
      "relatedId": "advanced-xss",
      "earnedAt": "2026-07-28T10:30:00Z",
      "displayOrder": 5
    }
  ],
  "mitreCoverage": {
    "heatmap": {
      "INITIAL_ACCESS": 2,
      "PERSISTENCE": 5,
      "PRIVILEGE_ESCALATION": 3,
      "LATERAL_MOVEMENT": 4,
      "COMMAND_AND_CONTROL": 1,
      "EXFILTRATION": 3,
      "IMPACT": 2
    }
  },
  "lastUpdatedAt": "2026-07-28T15:00:00Z",
  "lastComputedAt": "2026-07-28T14:55:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid request parameters

---

### 2. GET /api/portfolio/[userId]

Retrieve a user's public portfolio (respects visibility settings).

**Request:**
```bash
curl -X GET http://localhost:3000/api/portfolio/user-123 \
  -H "Cookie: [auth-cookie]"
```

**Response (200 - Public Portfolio):**
```json
{
  "id": "portfolio-id",
  "slug": "alice-smith",
  "visibility": "PUBLIC",
  "bio": "Cybersecurity analyst...",
  "totalLabsSolved": 42,
  "totalIncidentsSolved": 8,
  "mitreTopTactics": ["PERSISTENCE", "EXFILTRATION"],
  "achievements": [
    {
      "type": "LAB_SOLVED",
      "title": "Solved: Advanced XSS",
      "icon": "⚡",
      "earnedAt": "2026-07-28T10:30:00Z"
    }
  ],
  "mitreCoverage": {...},
  "user": {
    "displayName": "Alice Smith",
    "avatarUrl": "https://...",
    "university": "MIT",
    "company": "CyberCorp",
    "jobTitle": "Security Engineer",
    "linkedIn": "https://linkedin.com/in/alice-smith",
    "github": "https://github.com/alice"
  }
}
```

**Visibility Rules:**
- `PRIVATE` → Returns 403 Forbidden (only owner can view)
- `PUBLIC` → Anyone can view (with or without authentication)
- `RECRUITER_ONLY` → Only authenticated recruiters can view (403 for non-recruiters)

**Error Responses:**
- `404 Not Found` - Portfolio does not exist
- `403 Forbidden` - Portfolio exists but visibility prevents access
- `400 Bad Request` - Invalid user ID format

**Note:** Anonymous portfolio views are logged to `PortfolioVisitorLog` (when owner has enabled visibility).

---

### 3. PATCH /api/portfolio/visibility

Toggle portfolio visibility (PRIVATE / PUBLIC / RECRUITER_ONLY).

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/portfolio/visibility \
  -H "Content-Type: application/json" \
  -H "Cookie: [auth-cookie]" \
  -d '{
    "visibility": "PUBLIC"
  }'
```

**Valid Visibility Values:**
- `PRIVATE` - Only visible to owner (default)
- `PUBLIC` - Discoverable in recruiter directory, shareable via link
- `RECRUITER_ONLY` - Visible to logged-in recruiters only

**Response (200):**
```json
{
  "id": "portfolio-id",
  "userId": "user-id",
  "slug": "alice-smith",
  "visibility": "PUBLIC",
  "bio": "...",
  "totalLabsSolved": 42,
  ...
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid visibility value (must be one of the three listed above)

---

### 4. PATCH /api/portfolio/bio

Update portfolio biography.

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/portfolio \
  -H "Content-Type: application/json" \
  -H "Cookie: [auth-cookie]" \
  -d '{
    "bio": "Cybersecurity professional with 5+ years in incident response and forensics."
  }'
```

**Constraints:**
- Maximum 5000 characters
- Can be set to `null` to clear biography
- Markdown supported (sanitized server-side)

**Response (200):**
```json
{
  "id": "portfolio-id",
  "userId": "user-id",
  "slug": "alice-smith",
  "visibility": "PRIVATE",
  "bio": "Cybersecurity professional with 5+ years in incident response and forensics.",
  ...
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Bio exceeds 5000 characters or invalid input

---

## Background Job

### Portfolio Aggregation Job

**Endpoint:** `POST /api/cron/portfolio-aggregation`

Runs portfolio aggregation for all users. Should be called every 5 minutes by an external cron service (e.g., EasyCron, cron-job.org, AWS Lambda, or Vercel Cron Functions).

**Authentication:**
Requires `Authorization: Bearer <CRON_SECRET>` header. The secret should be set in environment variable `CRON_SECRET`.

**Request:**
```bash
curl -X POST http://localhost:3000/api/cron/portfolio-aggregation \
  -H "Authorization: Bearer your-cron-secret-here"
```

**Response (200):**
```json
{
  "success": true,
  "processed": 1250,
  "errors": 3,
  "durationMs": 4230,
  "errorDetails": [
    "User user-123: Database timeout",
    "User user-456: Invalid data state"
  ]
}
```

**What the Job Does:**

1. **Detects New Achievements** since last computation:
   - Labs solved (new SOLVED attempts)
   - Incidents completed (new IncidentSimProgress entries)
   - Weekly certificates issued
   - Competition entries completed
   - Hunt investigation sessions completed
   - Detection rules shared

2. **Creates Achievement Records** for each new achievement:
   - CareerPortfolioAchievement rows inserted
   - Type: LAB_SOLVED, INCIDENT_COMPLETED, WEEKLY_CERT, etc.
   - Tracks earned timestamp and related resource ID

3. **Updates Aggregates:**
   - `totalLabsSolved` - COUNT(Attempt WHERE status=SOLVED)
   - `totalIncidentsSolved` - COUNT distinct IncidentSimulation completed
   - `totalWeeklyCerts` - COUNT(WeeklyIncidentLeaderboard WHERE completedAt!=null)
   - `totalCompetitionsWon` - COUNT(CompetitionEntry WHERE completedAt!=null)
   - `totalRulesShared` - COUNT(DetectionRuleShareAcl)
   - `huntsCompleted` - COUNT(HuntInvestigationSession WHERE status=COMPLETED)

4. **Computes MITRE Coverage Heatmap:**
   - Joins incident tasks with MITRE tactics
   - Returns heatmap: `{ PERSISTENCE: 5, PRIVILEGE_ESCALATION: 3, ... }`
   - Extracts top 5 tactics by frequency

5. **Updates Timestamp:**
   - Sets `lastComputedAt` to prevent re-processing

**Error Handling:**
- Returns 401 if `Authorization` header missing or invalid
- Returns 500 if `CRON_SECRET` environment variable not set
- Continues processing other users if one user fails
- Returns error details for debugging

**Performance:**
- Batch processes all users in ~4-5 seconds (typical)
- Uses database indexes: `(visibility, lastUpdatedAt)`, `(userId)`
- Safe to run every 5 minutes without overload

**Environment Setup:**

Create or update `.env.local`:
```
CRON_SECRET=your-super-secret-cron-token-here
```

Configure external cron service to call:
```
POST https://yourdomain.com/api/cron/portfolio-aggregation
Headers: Authorization: Bearer your-super-secret-cron-token-here
Interval: Every 5 minutes
```

Example with cron-job.org:
- URL: `https://yourdomain.com/api/cron/portfolio-aggregation`
- Headers: `Authorization: Bearer your-super-secret-cron-token-here`
- Schedule: `*/5 * * * *` (every 5 minutes)

---

## Data Models

### CareerPortfolio
```prisma
model CareerPortfolio {
  id                  String   @id @default(cuid())
  userId              String   @unique
  slug                String   @unique // URL-safe: "alice-smith"
  visibility          String   @default("PRIVATE") // PRIVATE, PUBLIC, RECRUITER_ONLY
  bio                 String?  @db.Text
  profileHtml         String?  @db.Text // Pre-rendered HTML (optional)
  
  // Denormalized aggregates (updated by background job)
  totalLabsSolved     Int     @default(0)
  totalIncidentsSolved Int     @default(0)
  totalWeeklyCerts    Int     @default(0)
  totalCompetitionsWon Int    @default(0)
  totalRulesShared    Int     @default(0)
  huntsCompleted      Int     @default(0)
  mitreTopTactics     String[] // Top 5: ["PERSISTENCE", "PRIVILEGE_ESCALATION", ...]
  
  lastUpdatedAt       DateTime @default(now())
  lastComputedAt      DateTime? // When aggregation job ran
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievements CareerPortfolioAchievement[]
  mitreCoverage CareerPortfolioMitreCoverage?
  visitorLog PortfolioVisitorLog[]
}
```

### CareerPortfolioAchievement
```prisma
model CareerPortfolioAchievement {
  id            String   @id @default(cuid())
  portfolioId   String
  type          String   // LAB_SOLVED, INCIDENT_COMPLETED, WEEKLY_CERT, COMPETITION_COMPLETED, HUNT_COMPLETED, RULES_SHARED
  title         String   // "Solved: Advanced XSS"
  description   String   @db.Text
  icon          String?  // "⚡", "🏆", etc.
  relatedId     String?  // Lab slug, Incident slug, Cert ID, etc.
  earnedAt      DateTime // When achievement was unlocked
  displayOrder  Int      @default(0)
  
  portfolio CareerPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
}
```

### CareerPortfolioMitreCoverage
```prisma
model CareerPortfolioMitreCoverage {
  id          String   @id @default(cuid())
  portfolioId String   @unique
  heatmap     Json     @default("{}") // { INITIAL_ACCESS: 5, PERSISTENCE: 8, ... }
  lastUpdated DateTime @updatedAt
  
  portfolio CareerPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
}
```

### PortfolioVisitorLog (Optional)
```prisma
model PortfolioVisitorLog {
  id          String   @id @default(cuid())
  portfolioId String
  visitorId   String?  // Null for anonymous viewers
  viewedAt    DateTime @default(now())
  
  portfolio CareerPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  visitor   User?          @relation(fields: [visitorId], references: [id], onDelete: SetNull)
}
```

---

## Slug Generation

Portfolio slugs are auto-generated from user's `displayName` on first access:

**Rules:**
1. Lowercase the display name
2. Remove special characters (keep only alphanumeric, spaces, hyphens)
3. Replace spaces with hyphens
4. Remove leading/trailing hyphens

**Examples:**
- `Alice Smith` → `alice-smith`
- `Bob O'Brien-Jones` → `bob-obrien-jones`
- `Dr. Maria González` → `dr-maria-gonzlez`

**Collision Handling:**
If slug already exists, append counter: `alice-smith-2`, `alice-smith-3`, etc.

**Immutability:**
Slugs are generated once and never changed (for stable shareable URLs).

---

## Rank Badges

Portfolios can display rank badges based on achievements:

- **Top 1% Labs** - Solved more labs than 99% of users
- **Weekly Champion** - Won weekly incident leaderboard
- **Hunting Master** - Completed 10+ threat hunt sessions
- **MITRE Expert** - Covered 5+ MITRE tactics
- **Rule Architect** - Shared 5+ detection rules

(Computed and cached by aggregation job)

---

## Performance Considerations

- **Portfolio Render:** <100ms (cached JSON response)
- **Aggregation Job:** <5 seconds per user (batch processing)
- **Database Indexes:**
  - `CareerPortfolio (visibility, lastUpdatedAt)` - for recruiter discovery
  - `CareerPortfolio (userId)` - for lookups
  - `CareerPortfolioAchievement (portfolioId, displayOrder)` - for achievement ordering
  - `PortfolioVisitorLog (portfolioId, viewedAt)` - for visitor tracking

---

## Testing

Run tests:
```bash
npm test -- portfolio
```

Test files:
- `src/app/api/portfolio/__tests__/portfolio.test.ts` - Aggregation logic
- `src/app/api/portfolio/__tests__/endpoints.test.ts` - Endpoint behavior

---

## Future Enhancements

1. **Redis Caching** - Cache portfolio JSON with 30min TTL
2. **Portfolio Themes** - Let users customize visual appearance
3. **Social Features** - Follow portfolios, comment on achievements
4. **Resume Export** - Generate PDF resume from portfolio
5. **LinkedIn Integration** - Sync portfolio to LinkedIn profile
6. **Achievement Badges** - Animated badges and trophy display
7. **Leaderboard Integration** - Link to public rankings
