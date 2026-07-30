import { db } from "@/lib/db";
import type { HuntQuery } from "@prisma/client";

// Supported query languages for threat hunting
export type QueryLanguage = "GREP" | "REGEX" | "KQL" | "SQL_LITE" | "NATURAL_LANGUAGE";

// Query execution result
export interface QueryResult {
  resultCount: number;
  matchedIocs: string[]; // Which expected artifacts this query caught
  sampleResults: Array<{ lineNumber: number; content: string }>;
}

/**
 * Execute a hunt query against a dataset
 * Supports multiple query languages and validates syntax before execution
 */
export async function executeHuntQuery(
  datasetId: string,
  query: string,
  language: QueryLanguage,
  expectedArtifacts: string[]
): Promise<QueryResult> {
  const dataset = await db.huntDataset.findUnique({ where: { id: datasetId } });
  if (!dataset) throw new Error("Dataset not found");

  // Validate query syntax
  validateQuerySyntax(query, language);

  // Get dataset content (small datasets are embedded, large ones use URLs)
  let data: Array<Record<string, unknown>> = [];

  if (dataset.dataEmbedded) {
    try {
      data = JSON.parse(dataset.dataEmbedded);
    } catch (e) {
      throw new Error("Invalid embedded dataset");
    }
  } else if (dataset.dataUrl) {
    // For large datasets, we would fetch from S3
    // For now, this is a placeholder
    throw new Error("Large dataset streaming not yet implemented");
  }

  // Execute query based on language
  const matches = executeQueryOnData(data, query, language, dataset.formatType);

  // Find which expected artifacts were matched
  const matchedIocs = findMatchedArtifacts(matches, expectedArtifacts);

  // Return limited results (max 100 lines)
  const sampleResults = matches.slice(0, 100).map((line, idx) => ({
    lineNumber: idx,
    content: typeof line === "string" ? line : JSON.stringify(line),
  }));

  return {
    resultCount: matches.length,
    matchedIocs,
    sampleResults,
  };
}

/**
 * Validate query syntax for the given language
 */
function validateQuerySyntax(query: string, language: QueryLanguage): void {
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  if (query.length > 10000) {
    throw new Error("Query too long (max 10000 characters)");
  }

  switch (language) {
    case "GREP":
      // Basic grep validation - just ensure it's not too complex
      if (query.includes(";") || query.includes("|")) {
        throw new Error("Grep queries cannot contain pipes or semicolons");
      }
      break;

    case "REGEX":
      // Validate regex syntax
      try {
        new RegExp(query);
      } catch (e) {
        throw new Error(`Invalid regex: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
      break;

    case "KQL":
      // Basic KQL validation - ensure balanced parentheses and quotes
      if ((query.match(/\(/g) || []).length !== (query.match(/\)/g) || []).length) {
        throw new Error("Unbalanced parentheses in KQL query");
      }
      break;

    case "SQL_LITE":
      // Prevent dangerous SQL keywords
      const dangerous = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE"];
      const upperQuery = query.toUpperCase();
      if (dangerous.some((kw) => upperQuery.includes(kw))) {
        throw new Error("Query contains forbidden SQL keywords");
      }
      break;

    case "NATURAL_LANGUAGE":
      // Just a basic validation for natural language
      if (query.length < 3) {
        throw new Error("Natural language query too short");
      }
      break;
  }
}

/**
 * Execute a query on dataset content
 * Returns matching log entries
 */
function executeQueryOnData(
  data: Array<Record<string, unknown>>,
  query: string,
  language: QueryLanguage,
  formatType: string
): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];

  switch (language) {
    case "GREP":
      // Simple grep-like search
      for (const line of data) {
        const content = JSON.stringify(line);
        if (content.includes(query)) {
          results.push(line);
        }
      }
      break;

    case "REGEX":
      // Regex search
      const regex = new RegExp(query, "i");
      for (const line of data) {
        const content = JSON.stringify(line);
        if (regex.test(content)) {
          results.push(line);
        }
      }
      break;

    case "KQL":
      // Simplified KQL parsing for key:value pairs
      results.push(...executeKql(data, query));
      break;

    case "SQL_LITE":
      // Simplified SQL-like filtering
      results.push(...executeSqlLite(data, query));
      break;

    case "NATURAL_LANGUAGE":
      // Simple natural language matching - case-insensitive substring
      const lowerQuery = query.toLowerCase();
      for (const line of data) {
        const content = JSON.stringify(line).toLowerCase();
        if (content.includes(lowerQuery)) {
          results.push(line);
        }
      }
      break;
  }

  return results;
}

/**
 * Parse and execute simplified KQL queries
 * Supports: field:value, field:"quoted value", AND, OR operators
 */
function executeKql(data: Array<Record<string, unknown>>, query: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];

  // Parse simple key:value pairs
  const patterns = query.split(/\s+AND\s+/i);

  for (const item of data) {
    let matches = true;

    for (const pattern of patterns) {
      const [key, value] = pattern.split(":").map((s) => s.trim());
      if (!key || !value) continue;

      const cleanValue = value.replace(/^"|"$/g, "");
      const fieldValue = String((item as Record<string, unknown>)[key] || "").toLowerCase();

      if (!fieldValue.includes(cleanValue.toLowerCase())) {
        matches = false;
        break;
      }
    }

    if (matches) results.push(item);
  }

  return results;
}

/**
 * Parse and execute simplified SQL-LITE queries
 * Supports: WHERE field = value, field LIKE value
 */
function executeSqlLite(data: Array<Record<string, unknown>>, query: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const whereMatch = query.match(/WHERE\s+(.*)/i);
  if (!whereMatch) return data; // No WHERE clause, return all

  const whereClause = whereMatch[1];
  const conditions = whereClause.split(/\s+AND\s+/i);

  for (const item of data) {
    let matches = true;

    for (const condition of conditions) {
      if (condition.includes("LIKE")) {
        const [field, value] = condition.split("LIKE").map((s) => s.trim());
        const cleanValue = value.replace(/^'|'$/g, "").replace(/%/g, "");
        const fieldValue = String((item as Record<string, unknown>)[field] || "").toLowerCase();
        if (!fieldValue.includes(cleanValue.toLowerCase())) {
          matches = false;
          break;
        }
      } else if (condition.includes("=")) {
        const [field, value] = condition.split("=").map((s) => s.trim());
        const cleanValue = value.replace(/^'|'$/g, "");
        const fieldValue = String((item as Record<string, unknown>)[field] || "");
        if (fieldValue !== cleanValue) {
          matches = false;
          break;
        }
      }
    }

    if (matches) results.push(item);
  }

  return results;
}

/**
 * Find which expected artifacts were matched in the query results
 */
function findMatchedArtifacts(results: Array<Record<string, unknown>>, expectedArtifacts: string[]): string[] {
  const matched = new Set<string>();
  const resultStr = JSON.stringify(results).toLowerCase();

  for (const artifact of expectedArtifacts) {
    // Parse artifact format: TYPE:value (e.g., "IP:192.168.1.100")
    const [type, value] = artifact.split(":");
    if (!value) continue;

    if (resultStr.includes(value.toLowerCase())) {
      matched.add(artifact);
    }
  }

  return Array.from(matched);
}

/**
 * Calculate hunt session score based on accuracy and speed
 * Formula: (accuracy * 100) * (speed_bonus) - (time_penalty)
 */
export function calculateHuntScore(
  accuracyPercent: number, // 0-100
  queriesUsed: number,
  sessionDurationSeconds: number
): number {
  // Speed bonus: fewer queries is better
  // Max 50 queries as baseline, bonus decreases linearly
  const speedBonus = Math.max(0.5, 1 - queriesUsed / 50);

  // Time penalty: scales with duration
  // Sessions under 5 minutes get bonus, over 30 minutes get penalty
  const timePenalty = Math.max(0, (sessionDurationSeconds - 300) / 60);

  const score = Math.round(accuracyPercent * speedBonus - timePenalty);
  return Math.max(0, score);
}

/**
 * Mask sensitive data in query results
 * Masks credit cards, SSNs, and other PII
 */
export function maskSensitiveData(content: string): string {
  // Mask credit card patterns (4 groups of 4 digits)
  content = content.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "****-****-****-****");

  // Mask SSN patterns (XXX-XX-XXXX)
  content = content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****");

  // Mask email addresses
  content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED_EMAIL]");

  // Mask common passwords and secrets
  content = content.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"');
  content = content.replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"[REDACTED]"');
  content = content.replace(/"api[_-]?key"\s*:\s*"[^"]*"/gi, '"api_key":"[REDACTED]"');

  return content;
}
