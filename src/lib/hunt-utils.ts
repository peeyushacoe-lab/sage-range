import { db } from "@/lib/db";

/**
 * Threat-hunt query engine.
 *
 * Runs a learner's query against an embedded log dataset and decides how much
 * of the intrusion it surfaced. Everything below the DB call is pure and
 * exported, because these functions decide a score and gate an answer key —
 * the same reason src/lib/ozh-engine.ts is pure.
 *
 * Two rules govern this file:
 *
 *   1. The expected artifacts are the answer key. They are matched here and
 *      counted here; their values never leave the server. A hunter learns that
 *      a query was productive, not what it found — noticing the indicator in
 *      the rows is the exercise.
 *   2. Credit requires selectivity. A query that returns most of the dataset
 *      has not found anything, however many indicators sit inside its results.
 */

export type QueryLanguage = "GREP" | "REGEX" | "KQL" | "SQL_LITE" | "NATURAL_LANGUAGE";

export interface QueryResult {
  /** Total matches, which may exceed the rows returned. */
  resultCount: number;
  /** Expected artifacts this query surfaced. Server-side only — never serialised to the client. */
  matchedIocs: string[];
  /** The rendered rows, capped at MAX_SAMPLE_ROWS. */
  sampleResults: Array<{ lineNumber: number; content: string }>;
}

export const MAX_SAMPLE_ROWS = 100;

/**
 * A query returning more than this share of the dataset earns no artifact
 * credit.
 *
 * Without it, `.` as a regex matches every row, every expected value appears
 * somewhere in that result set, and one request credits the entire answer key.
 * That was the actual behaviour before this gate existed.
 */
export const SELECTIVITY_CEILING = 0.5;

/** Rows scanned per query. Beyond this the engine truncates rather than stalling the request. */
export const MAX_SCANNED_ROWS = 200_000;

export async function executeHuntQuery(
  datasetId: string,
  query: string,
  language: QueryLanguage,
  expectedArtifacts: string[],
): Promise<QueryResult> {
  const dataset = await db.huntDataset.findUnique({ where: { id: datasetId } });
  if (!dataset) throw new Error("Dataset not found");

  validateQuerySyntax(query, language);

  let data: Array<Record<string, unknown>> = [];
  if (dataset.dataEmbedded) {
    try {
      const parsed = JSON.parse(dataset.dataEmbedded);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      data = parsed;
    } catch {
      throw new Error("Invalid embedded dataset");
    }
  } else if (dataset.dataUrl) {
    throw new Error("Large dataset streaming not yet implemented");
  }

  const matches = executeQueryOnData(data, query, language);
  const matchedIocs = surfacedArtifacts(matches, data.length, expectedArtifacts);

  return {
    resultCount: matches.length,
    matchedIocs,
    sampleResults: matches.slice(0, MAX_SAMPLE_ROWS).map((row, idx) => ({
      lineNumber: idx,
      content: renderRow(row),
    })),
  };
}

// ── Query text ──────────────────────────────────────────────────────────────

/**
 * The text a free-text query searches: values only, never field names.
 *
 * Searching `JSON.stringify(row)` made every key matchable, so grepping for
 * "process" hit every row carrying a `process` field rather than every row
 * mentioning a process. Values-only is both what grep does to a log line and
 * far harder to accidentally match everything with.
 */
export function searchableText(row: Record<string, unknown>): string {
  return Object.values(row)
    .map((v) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)))
    .join(" ");
}

/** How a row is shown to the hunter. Stable, greppable, and not JSON noise. */
export function renderRow(row: Record<string, unknown>): string {
  return Object.entries(row)
    .map(([k, v]) => `${k}=${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(" ");
}

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Regex features that can backtrack catastrophically.
 *
 * JavaScript cannot interrupt a running regex, so a pattern like `(a+)+$` over
 * a large dataset pins the request until the platform kills it. There is no
 * timeout to fall back on — the pattern has to be refused before it runs.
 */
const NESTED_QUANTIFIER = /(\([^)]*[+*]\)|\[[^\]]*\][+*]|\)[+*])\s*[+*]/;

export function validateQuerySyntax(query: string, language: QueryLanguage): void {
  if (!query || query.trim().length === 0) throw new Error("Query cannot be empty");
  if (query.length > 10_000) throw new Error("Query too long (max 10000 characters)");

  switch (language) {
    case "GREP":
      if (query.includes(";") || query.includes("|")) {
        throw new Error("Grep queries cannot contain pipes or semicolons");
      }
      break;

    case "REGEX":
      try {
        new RegExp(query);
      } catch (e) {
        throw new Error(`Invalid regex: ${e instanceof Error ? e.message : "unknown error"}`);
      }
      if (NESTED_QUANTIFIER.test(query)) {
        throw new Error(
          "This pattern nests one quantifier inside another, which can take exponential time. Rewrite it without the nesting.",
        );
      }
      break;

    case "KQL":
      if ((query.match(/\(/g) || []).length !== (query.match(/\)/g) || []).length) {
        throw new Error("Unbalanced parentheses in KQL query");
      }
      if ((query.match(/"/g) || []).length % 2 !== 0) {
        throw new Error("Unbalanced quotes in KQL query");
      }
      break;

    case "SQL_LITE": {
      // Whole words only. Matching substrings rejected any hunt touching
      // "process creation", a `created_at` field, or the literal string
      // "UPDATE" in a log line — all legitimate, none of them mutations.
      // Nothing here reaches a real database in any case; this only keeps the
      // dialect honest about being read-only.
      const forbidden = /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|EXEC)\b/i;
      const match = query.match(forbidden);
      if (match) throw new Error(`This dialect is read-only — ${match[0].toUpperCase()} is not supported`);
      break;
    }

    case "NATURAL_LANGUAGE":
      if (query.trim().length < 3) throw new Error("Natural language query too short");
      break;
  }
}

// ── Execution ───────────────────────────────────────────────────────────────

export function executeQueryOnData(
  data: Array<Record<string, unknown>>,
  query: string,
  language: QueryLanguage,
): Array<Record<string, unknown>> {
  const rows = data.length > MAX_SCANNED_ROWS ? data.slice(0, MAX_SCANNED_ROWS) : data;

  switch (language) {
    case "GREP": {
      const needle = query.trim();
      return rows.filter((row) => searchableText(row).includes(needle));
    }

    case "REGEX": {
      const regex = new RegExp(query, "i");
      return rows.filter((row) => regex.test(searchableText(row)));
    }

    case "KQL":
      return executeKql(rows, query);

    case "SQL_LITE":
      return executeSqlLite(rows, query);

    case "NATURAL_LANGUAGE": {
      const needle = query.trim().toLowerCase();
      return rows.filter((row) => searchableText(row).toLowerCase().includes(needle));
    }
  }
}

type Condition = { field: string; value: string };

/**
 * Split `field:value` at the FIRST colon only.
 *
 * `split(":")` destructured to [key, value] silently truncated every value
 * containing a colon — timestamps (`09:14:02` became `09`), IPv6 addresses and
 * URLs all matched the wrong thing while looking like they worked.
 */
export function parseKqlCondition(pattern: string): Condition | null {
  const trimmed = pattern.trim();
  const idx = trimmed.indexOf(":");
  if (idx <= 0) return null;
  const field = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, "");
  if (!field || !value) return null;
  return { field, value };
}

/**
 * KQL: `field:value`, joined by AND and OR.
 *
 * OR was documented but never implemented — the old parser split on AND alone,
 * so an OR query was treated as one literal pattern and quietly returned the
 * wrong rows. AND binds tighter than OR, as it does everywhere else.
 */
export function executeKql(
  data: Array<Record<string, unknown>>,
  query: string,
): Array<Record<string, unknown>> {
  const orGroups = query
    .split(/\s+OR\s+/i)
    .map((group) => group.split(/\s+AND\s+/i).map(parseKqlCondition).filter((c): c is Condition => c !== null))
    .filter((group) => group.length > 0);

  if (orGroups.length === 0) return [];

  const satisfies = (row: Record<string, unknown>, c: Condition) =>
    String(row[c.field] ?? "").toLowerCase().includes(c.value.toLowerCase());

  return data.filter((row) => orGroups.some((group) => group.every((c) => satisfies(row, c))));
}

/**
 * SQL-lite: `... WHERE field = 'x' [AND field LIKE '%y%']`.
 *
 * A query with no WHERE clause returns nothing rather than the whole dataset.
 * `SELECT *` returning everything was the other half of the answer-key leak:
 * combined with ungated artifact matching it credited every indicator at once.
 * Refusing it is also the more useful lesson — an unfiltered select is not a hunt.
 */
export function executeSqlLite(
  data: Array<Record<string, unknown>>,
  query: string,
): Array<Record<string, unknown>> {
  const whereMatch = query.match(/\bWHERE\b\s+(.*)/is);
  if (!whereMatch) return [];

  const conditions = whereMatch[1].split(/\s+AND\s+/i);

  return data.filter((row) =>
    conditions.every((condition) => {
      const like = condition.match(/^(.+?)\s+LIKE\s+(.+)$/i);
      if (like) {
        const field = like[1].trim();
        const value = like[2].trim().replace(/^'|'$/g, "").replace(/%/g, "");
        return String(row[field] ?? "").toLowerCase().includes(value.toLowerCase());
      }
      const eq = condition.match(/^(.+?)\s*(!?=)\s*(.+)$/);
      if (eq) {
        const field = eq[1].trim();
        const negate = eq[2] === "!=";
        const value = eq[3].trim().replace(/^'|'$/g, "");
        const equal = String(row[field] ?? "") === value;
        return negate ? !equal : equal;
      }
      // An unparseable condition must not silently pass.
      return false;
    }),
  );
}

// ── Scoring the find ────────────────────────────────────────────────────────

/**
 * Which expected artifacts this query actually surfaced.
 *
 * Two gates, both load-bearing:
 *
 *   1. Selectivity. A result set covering more than SELECTIVITY_CEILING of the
 *      dataset credits nothing. Returning everything is not finding anything.
 *   2. Value matching against the rendered rows, so an artifact counts only
 *      when its value is visible in what the hunter got back.
 */
export function surfacedArtifacts(
  results: Array<Record<string, unknown>>,
  datasetSize: number,
  expectedArtifacts: string[],
): string[] {
  if (results.length === 0 || expectedArtifacts.length === 0) return [];
  if (datasetSize > 0 && results.length / datasetSize > SELECTIVITY_CEILING) return [];

  const haystack = results.map(searchableText).join("\n").toLowerCase();

  return expectedArtifacts.filter((artifact) => {
    const idx = artifact.indexOf(":");
    if (idx <= 0) return false;
    const value = artifact.slice(idx + 1).trim().toLowerCase();
    return value.length > 0 && haystack.includes(value);
  });
}

/**
 * Session score from accuracy, query economy and time.
 *
 * The time penalty is capped. It was `(seconds - 300) / 60` uncapped against a
 * maximum accuracy of 100, so a two-hour investigation carried a 115-point
 * penalty and scored zero however good it was — the formula punished exactly
 * the careful, patient work a blue-team platform exists to teach. A hunt is
 * allowed to take an hour.
 */
export const SCORE_GRACE_SECONDS = 1800;
export const MAX_TIME_PENALTY = 25;
export const QUERY_ECONOMY_BASELINE = 50;

export function calculateHuntScore(
  accuracyPercent: number,
  queriesUsed: number,
  sessionDurationSeconds: number,
): number {
  const accuracy = Math.min(100, Math.max(0, accuracyPercent));

  // Fewer queries is better, but never worth less than half — a hunter who
  // needed thirty queries and found everything still beats one who found nothing.
  const economy = Math.max(0.5, 1 - Math.max(0, queriesUsed) / QUERY_ECONOMY_BASELINE);

  const overtimeMinutes = Math.max(0, sessionDurationSeconds - SCORE_GRACE_SECONDS) / 60;
  const timePenalty = Math.min(MAX_TIME_PENALTY, overtimeMinutes);

  return Math.max(0, Math.round(accuracy * economy - timePenalty));
}

// ── Output hygiene ──────────────────────────────────────────────────────────

/**
 * Redact what a hunter must never need, and nothing else.
 *
 * Email addresses used to be masked here. In a threat hunt they are frequently
 * the indicator — the phishing sender, the compromised account — so redacting
 * them made phishing and BEC datasets unsolvable. Card numbers, national
 * insurance numbers and credentials stay masked because no hunt turns on them.
 */
export function maskSensitiveData(content: string): string {
  return content
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "****-****-****-****")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****")
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"[REDACTED]"')
    .replace(/"api[_-]?key"\s*:\s*"[^"]*"/gi, '"api_key":"[REDACTED]"');
}
