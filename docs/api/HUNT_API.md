# Threat Hunt Sandbox API

Comprehensive API for threat hunting investigations with multiple query languages, artifact tracking, and competitive leaderboards.

## Overview

The Threat Hunt Sandbox API provides endpoints for:
- Browsing and discovering hunt datasets
- Starting investigation sessions
- Executing multi-language queries against datasets
- Reporting and validating discovered artifacts
- Ranking sessions by accuracy and speed

## Authentication

All endpoints require authentication via Clerk or custom auth headers. Include credentials in request headers.

## Dataset Endpoints

### GET `/api/hunts/datasets`

List available hunt datasets with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 50) - Results per page
- `difficulty` (enum) - Filter by difficulty: `EASY`, `MEDIUM`, `HARD`, `INSANE`
- `category` (string) - Filter by category: `SYSMON`, `APACHE`, `NETWORK`, `DNS`, `FIREWALL`, `WINDOWS_EVENTS`

**Response:**
```json
{
  "datasets": [
    {
      "id": "cuid",
      "slug": "sysmon-apt29-easy",
      "name": "Sysmon Logs - APT29 Indicators",
      "description": "Identify APT29 patterns in Sysmon logs",
      "difficulty": "EASY",
      "category": "SYSMON",
      "logCount": 5000,
      "formatType": "JSON",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `401` - Unauthorized

---

### GET `/api/hunts/datasets/:slug`

Retrieve detailed information about a specific dataset.

**Path Parameters:**
- `slug` (string) - Dataset slug identifier

**Response:**
```json
{
  "dataset": {
    "id": "cuid",
    "slug": "sysmon-apt29-easy",
    "name": "Sysmon Logs - APT29 Indicators",
    "description": "Identify APT29 patterns...",
    "difficulty": "EASY",
    "category": "SYSMON",
    "logCount": 5000,
    "formatType": "JSON",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "hasActiveSession": false
}
```

**Notes:**
- `expectedArtifacts` and hints are NOT included in student responses
- `hasActiveSession` indicates if user has an ongoing hunt for this dataset

**Status Codes:**
- `200` - Success
- `404` - Dataset not found
- `401` - Unauthorized

---

## Session Endpoints

### POST `/api/hunts/start`

Begin a new threat hunting investigation session.

**Request Body:**
```json
{
  "datasetSlug": "sysmon-apt29-easy"
}
```

**Response:**
```json
{
  "sessionId": "cuid",
  "datasetName": "Sysmon Logs - APT29 Indicators",
  "alreadyExists": false
}
```

**Behavior:**
- Creates a new session for the specified dataset
- Returns existing session if one is already active for this dataset
- Awards 10 coins for starting a hunt
- Rate limited to 10 sessions per user per 24 hours

**Status Codes:**
- `200` - Session created or already exists
- `400` - Invalid dataset or bad request
- `404` - Dataset not found
- `429` - Rate limited
- `401` - Unauthorized

---

### GET `/api/hunts/:sessionId`

Retrieve current session details, progress, and recent queries.

**Path Parameters:**
- `sessionId` (string) - Session ID

**Response:**
```json
{
  "session": {
    "id": "cuid",
    "status": "ACTIVE",
    "startedAt": "2025-01-15T14:20:00Z",
    "endedAt": null,
    "duration": 1200,
    "score": 0
  },
  "dataset": {
    "id": "cuid",
    "slug": "sysmon-apt29-easy",
    "name": "Sysmon Logs - APT29 Indicators",
    "difficulty": "EASY",
    "category": "SYSMON",
    "logCount": 5000,
    "expectedArtifacts": ["PROCESS:cmd.exe", "IP:192.168.1.100", "DOMAIN:evil.com"]
  },
  "progress": {
    "queriesCount": 5,
    "artifactsFound": 2,
    "expectedArtifacts": 3,
    "accuracy": 67
  },
  "recentQueries": [
    {
      "id": "cuid",
      "query": "cmd.exe",
      "language": "GREP",
      "resultCount": 42,
      "matchedIocs": ["PROCESS:cmd.exe"],
      "executedAt": "2025-01-15T14:25:00Z"
    }
  ],
  "artifacts": [
    {
      "id": "cuid",
      "artifactId": "PROCESS:cmd.exe",
      "type": "PROCESS",
      "value": "cmd.exe",
      "confidence": 95,
      "foundAt": "2025-01-15T14:25:30Z"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `403` - Session belongs to different user
- `404` - Session not found
- `401` - Unauthorized

---

## Query Execution Endpoints

### POST `/api/hunts/:sessionId/query`

Execute a search query against the dataset using multiple query languages.

**Path Parameters:**
- `sessionId` (string) - Session ID

**Request Body:**
```json
{
  "query": "cmd.exe",
  "language": "GREP"
}
```

**Query Languages:**

#### GREP
Simple substring matching (case-insensitive)
```json
{ "query": "cmd.exe", "language": "GREP" }
```

#### REGEX
Full regular expression support
```json
{ "query": "\\b\\d+\\.\\d+\\.\\d+\\.\\d+\\b", "language": "REGEX" }
```

#### KQL
Simplified Kusto Query Language for key:value pairs
```json
{ "query": "ProcessName:cmd.exe AND Domain:evil.com", "language": "KQL" }
```

#### SQL_LITE
Simplified SQL WHERE clauses (no destructive operations)
```json
{ "query": "WHERE ProcessName = 'cmd.exe' AND SourceIp LIKE '192.168%'", "language": "SQL_LITE" }
```

#### NATURAL_LANGUAGE
Case-insensitive substring matching with common phrases
```json
{ "query": "suspicious powershell execution", "language": "NATURAL_LANGUAGE" }
```

**Response:**
```json
{
  "queryId": "cuid",
  "resultCount": 42,
  "matchedIocs": ["PROCESS:cmd.exe"],
  "results": [
    {
      "lineNumber": 0,
      "content": "{\"EventID\":1,\"ProcessName\":\"cmd.exe\",...}"
    }
  ],
  "isEffective": true,
  "executedAt": "2025-01-15T14:25:00Z"
}
```

**Features:**
- Validates query syntax before execution
- Masks sensitive data (credit cards, SSNs, emails, API keys)
- Returns up to 100 matching results
- Tracks which expected artifacts were matched
- Logs all queries for analytics
- Rate limited to 100 queries per session per 24 hours

**Query Validation Rules:**
- Max 10,000 characters
- GREP: No pipes or semicolons
- REGEX: Valid regex syntax required
- KQL: Balanced parentheses required
- SQL_LITE: No DROP, DELETE, TRUNCATE, ALTER, CREATE keywords
- All: Minimum 3 characters

**Status Codes:**
- `200` - Query executed successfully
- `400` - Invalid query syntax or bad request
- `403` - Session belongs to different user
- `404` - Session not found
- `429` - Rate limited
- `401` - Unauthorized

---

### POST `/api/hunts/:sessionId/report-artifact`

Submit a discovered artifact for validation.

**Path Parameters:**
- `sessionId` (string) - Session ID

**Request Body:**
```json
{
  "artifactId": "PROCESS:cmd.exe",
  "type": "PROCESS",
  "value": "cmd.exe",
  "confidence": 95
}
```

**Artifact Types:**
- `PROCESS` - Process name or command
- `IP` - IP address
- `DOMAIN` - Domain name
- `FILE` - File path
- `REGISTRY` - Registry key
- `HASH` - MD5/SHA1/SHA256 hash
- `USER` - User account
- `EMAIL` - Email address
- `PORT` - Network port

**Response (Success):**
```json
{
  "id": "cuid",
  "isCorrect": true,
  "message": "Artifact successfully submitted!",
  "artifact": {
    "id": "cuid",
    "artifactId": "PROCESS:cmd.exe",
    "type": "PROCESS",
    "value": "cmd.exe",
    "confidence": 95,
    "foundAt": "2025-01-15T14:25:30Z"
  }
}
```

**Response (Already Submitted):**
```json
{
  "error": "duplicate_artifact",
  "message": "This artifact has already been submitted in this session.",
  "isCorrect": true
}
```

**Response (Invalid Artifact):**
```json
{
  "error": "invalid_artifact",
  "message": "This artifact does not match the expected findings for this dataset.",
  "isCorrect": false
}
```

**Validation:**
- Artifact must match one of the expected artifacts in the dataset
- Confidence score must be 0-100
- Each artifact can only be submitted once per session
- Session must be active (not completed/abandoned)
- Rate limited to 50 submissions per session per 24 hours

**Status Codes:**
- `200` - Artifact accepted
- `400` - Invalid artifact or parameters
- `403` - Session belongs to different user
- `404` - Session not found
- `409` - Artifact already submitted
- `429` - Rate limited
- `401` - Unauthorized

---

## Leaderboard Endpoints

### GET `/api/hunts/:sessionId/leaderboard`

Retrieve leaderboard rankings for a hunt dataset.

**Path Parameters:**
- `sessionId` (string) - Session ID (used to identify dataset)

**Query Parameters:**
- `limit` (number, default: 50, max: 100) - Number of top entries to return
- `sortBy` (enum, default: "score") - Sort criteria:
  - `score` - Overall hunt score (default)
  - `accuracy` - Percentage of artifacts found
  - `speed` - Number of queries used (fewer is better)
  - `time` - Total session duration (faster is better)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "cuid",
      "userName": "HunterPro",
      "score": 8750,
      "accuracy": 100,
      "queriesUsed": 8,
      "artifactsFound": 5,
      "expectedArtifacts": 5,
      "duration": 420,
      "completedAt": "2025-01-15T15:30:00Z"
    },
    {
      "rank": 2,
      "userId": "cuid",
      "userName": "SecurityExpert",
      "score": 7820,
      "accuracy": 80,
      "queriesUsed": 12,
      "artifactsFound": 4,
      "expectedArtifacts": 5,
      "duration": 600,
      "completedAt": "2025-01-15T14:55:00Z"
    }
  ],
  "metadata": {
    "total": 42,
    "sortedBy": "score",
    "userRank": {
      "rank": 5,
      "userName": "CurrentUser",
      "score": 6500,
      "accuracy": 60
    }
  }
}
```

**Scoring Algorithm:**

```
speedBonus = max(0.5, 1 - queriesUsed / 50)
timePenalty = max(0, (durationSeconds - 300) / 60)
score = round(accuracy * speedBonus - timePenalty)
```

- **Accuracy**: Percentage of expected artifacts found (0-100%)
- **Speed Bonus**: Decreases with more queries (max 50 queries as baseline)
- **Time Penalty**: Bonus for sessions under 5 minutes, penalty for longer
- **Final Score**: Accuracy × speedBonus - timePenalty (minimum 0)

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `404` - Session not found
- `401` - Unauthorized

---

## Data Privacy & Security

### Sensitive Data Masking

Query results automatically mask:
- **Credit Cards**: `4532-1234-5678-9012` → `****-****-****-****`
- **SSNs**: `123-45-6789` → `***-**-****`
- **Emails**: `user@example.com` → `[REDACTED_EMAIL]`
- **API Keys**: `"api_key": "secret123"` → `"api_key": "[REDACTED]"`
- **Passwords**: `"password": "pass123"` → `"password": "[REDACTED]"`
- **Tokens**: `"token": "xyz789"` → `"token": "[REDACTED]"`

### Session Lifecycle

- **Active**: User is currently hunting (0-4 weeks)
- **Completed**: User finished investigation (0-4 weeks)
- **Archived**: Session soft-deleted after 4 weeks (no longer queryable)

### Audit Trail

All actions are logged for analytics:
- Session start/completion
- All queries executed
- Artifact submissions
- Score calculations

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {} // Optional additional context
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `bad_request` | 400 | Invalid request parameters |
| `query_error` | 400 | Query validation or execution failed |
| `invalid_artifact` | 400 | Artifact doesn't match expected findings |
| `duplicate_artifact` | 409 | Artifact already submitted in session |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | User lacks permission (owns wrong session) |
| `not_found` | 404 | Resource not found |
| `rate_limited` | 429 | Too many requests |
| `session_inactive` | 400 | Session is not active |
| `session_not_found` | 404 | Session not found |
| `dataset_not_found` | 404 | Dataset not found |

---

## Rate Limiting

### Limits per User per 24 Hours

- **Session Creation**: 10 sessions
- **Query Execution**: 100 queries per session
- **Artifact Submissions**: 50 artifacts per session

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

When rate limited (429):
- Response includes `Retry-After` header
- Typically 3600 seconds (1 hour) for queries
- 86400 seconds (24 hours) for session creation

---

## Examples

### Complete Hunt Workflow

```bash
# 1. List datasets
GET /api/hunts/datasets?difficulty=EASY

# 2. Get dataset details
GET /api/hunts/datasets/sysmon-apt29-easy

# 3. Start hunting session
POST /api/hunts/start
{ "datasetSlug": "sysmon-apt29-easy" }
# Response: sessionId = "abc123"

# 4. Execute queries
POST /api/hunts/abc123/query
{ "query": "cmd.exe", "language": "GREP" }

POST /api/hunts/abc123/query
{ "query": "\\b\\d+\\.\\d+\\.\\d+\\.\\d+\\b", "language": "REGEX" }

# 5. Report discovered artifacts
POST /api/hunts/abc123/report-artifact
{
  "artifactId": "PROCESS:cmd.exe",
  "type": "PROCESS",
  "value": "cmd.exe",
  "confidence": 95
}

# 6. Check progress
GET /api/hunts/abc123

# 7. View leaderboard
GET /api/hunts/abc123/leaderboard?sortBy=score&limit=10
```

---

## Integration Notes

- Endpoints return JSON unless otherwise specified
- All timestamps are ISO 8601 format
- IDs use CUID format (compatible with Prisma)
- Difficulty enum: `EASY` | `MEDIUM` | `HARD` | `INSANE`
- Session status enum: `ACTIVE` | `COMPLETED` | `ABANDONED`
