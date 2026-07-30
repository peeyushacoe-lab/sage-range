// Detection Rule Builder Library
// Handles rule validation, versioning, sharing, and testing

import { db } from "@/lib/db";

export type RuleType = "SIGMA" | "KQL" | "SPLUNK" | "ELASTIC" | "YARA";

export interface ValidationError {
  field: string;
  message: string;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: ValidationError[];
  f1Score: number;
}

export interface DetectionRuleDTO {
  submissionId: string;
  version: number;
  ruleType: RuleType;
  rule: Record<string, unknown>;
  f1Score: number;
  validationErrors: ValidationError[];
  isPublic: boolean;
  shareAcl?: {
    accessType: string;
    sharedBy: string;
    sharedAt: Date;
  };
}

export interface VersionHistoryEntry {
  version: number;
  f1Score: number;
  notes?: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

export function validateRuleSyntax(ruleType: RuleType, rule: unknown): RuleValidationResult {
  const errors: ValidationError[] = [];

  if (!rule || typeof rule !== "object") {
    errors.push({ field: "rule", message: "Rule must be a valid object" });
    return { valid: false, errors, f1Score: 0 };
  }

  const ruleObj = rule as Record<string, unknown>;

  switch (ruleType) {
    case "SIGMA":
      return validateSigmaRule(ruleObj, errors);
    case "KQL":
      return validateKqlRule(ruleObj, errors);
    case "SPLUNK":
      return validateSplunkRule(ruleObj, errors);
    case "ELASTIC":
      return validateElasticRule(ruleObj, errors);
    case "YARA":
      return validateYaraRule(ruleObj, errors);
    default:
      errors.push({ field: "ruleType", message: `Unknown rule type: ${ruleType}` });
      return { valid: false, errors, f1Score: 0 };
  }
}

function validateSigmaRule(rule: Record<string, unknown>, errors: ValidationError[]): RuleValidationResult {
  // Check for required SIGMA fields
  if (!rule.title || typeof rule.title !== "string") {
    errors.push({ field: "title", message: "SIGMA rule must have a title" });
  }

  if (!rule.detection || typeof rule.detection !== "object") {
    errors.push({ field: "detection", message: "SIGMA rule must have a detection block" });
  } else {
    const detection = rule.detection as Record<string, unknown>;
    if (!detection.condition || typeof detection.condition !== "string") {
      errors.push({ field: "detection.condition", message: "Detection block must have a condition" });
    }
  }

  const f1Score = calculateF1Score(rule);
  return {
    valid: errors.length === 0,
    errors,
    f1Score,
  };
}

function validateKqlRule(rule: Record<string, unknown>, errors: ValidationError[]): RuleValidationResult {
  // KQL rules should have query field
  if (!rule.query || typeof rule.query !== "string") {
    errors.push({ field: "query", message: "KQL rule must have a query string" });
  } else {
    const query = rule.query as string;
    // Basic validation: check for pipe operators
    if (!query.includes("|")) {
      errors.push({ field: "query", message: "KQL query should contain at least one pipe operator" });
    }
  }

  const f1Score = calculateF1Score(rule);
  return {
    valid: errors.length === 0,
    errors,
    f1Score,
  };
}

function validateSplunkRule(rule: Record<string, unknown>, errors: ValidationError[]): RuleValidationResult {
  // Splunk searches should have search field
  if (!rule.search || typeof rule.search !== "string") {
    errors.push({ field: "search", message: "Splunk rule must have a search string" });
  } else {
    const search = rule.search as string;
    if (!search.includes("|")) {
      errors.push({ field: "search", message: "Splunk search should contain at least one pipe operator" });
    }
  }

  const f1Score = calculateF1Score(rule);
  return {
    valid: errors.length === 0,
    errors,
    f1Score,
  };
}

function validateElasticRule(rule: Record<string, unknown>, errors: ValidationError[]): RuleValidationResult {
  // Elastic rules should have query field with DSL structure
  if (!rule.query || typeof rule.query !== "object") {
    errors.push({ field: "query", message: "Elastic rule must have a query object (DSL)" });
  } else {
    const query = rule.query as Record<string, unknown>;
    // Check for common DSL clauses
    const hasValidClause = query.bool || query.match || query.match_all || query.range || query.term;
    if (!hasValidClause) {
      errors.push({ field: "query", message: "Query must contain a valid DSL clause (bool, match, term, etc.)" });
    }
  }

  const f1Score = calculateF1Score(rule);
  return {
    valid: errors.length === 0,
    errors,
    f1Score,
  };
}

function validateYaraRule(rule: Record<string, unknown>, errors: ValidationError[]): RuleValidationResult {
  // YARA rules should have rule block and strings
  if (!rule.rule_name || typeof rule.rule_name !== "string") {
    errors.push({ field: "rule_name", message: "YARA rule must have a rule_name" });
  }

  if (!rule.strings || typeof rule.strings !== "object") {
    errors.push({ field: "strings", message: "YARA rule must have a strings section" });
  }

  if (!rule.condition || typeof rule.condition !== "string") {
    errors.push({ field: "condition", message: "YARA rule must have a condition" });
  }

  const f1Score = calculateF1Score(rule);
  return {
    valid: errors.length === 0,
    errors,
    f1Score,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// F1 Score Estimation
// ─────────────────────────────────────────────────────────────────────────────

export function calculateF1Score(ruleJson: Record<string, unknown>): number {
  let score = 0.5; // Base score

  const ruleString = JSON.stringify(ruleJson).toLowerCase();

  // +0.1 if >5 filters (specificity)
  const filterCount = (ruleString.match(/filter|condition|match|where/g) || []).length;
  if (filterCount > 5) score += 0.1;

  // +0.1 if uses process/parent process (process hierarchy)
  if (ruleString.includes("process") || ruleString.includes("parent_process")) score += 0.1;

  // +0.1 if uses network indicators (IP, port, domain)
  if (
    ruleString.includes("ip") ||
    ruleString.includes("port") ||
    ruleString.includes("domain") ||
    ruleString.includes("destination")
  )
    score += 0.1;

  // +0.1 if uses file paths (file detection)
  if (ruleString.includes("file") || ruleString.includes("path") || ruleString.includes("image")) score += 0.1;

  // +0.1 if uses registry keys (persistence detection)
  if (ruleString.includes("registry") || ruleString.includes("regkey") || ruleString.includes("hkey")) score += 0.1;

  return Math.min(score, 1.0); // Cap at 1.0
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function createDetectionRule(
  userId: string,
  challengeId: string,
  name: string,
  description: string,
  ruleType: RuleType,
  rule: Record<string, unknown>,
  testDataset?: string
) {
  // Validate the rule
  const validation = validateRuleSyntax(ruleType, rule);

  if (!validation.valid) {
    return {
      success: false,
      error: "Invalid rule syntax",
      validationErrors: validation.errors,
    };
  }

  // Create submission (new or update)
  const submission = await db.detectionSubmission.create({
    data: {
      userId,
      challengeId,
      rule: rule as object,
      ruleType,
      version: 1,
      isPublic: false,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: validation.f1Score,
      score: 0,
      passed: false,
    },
  });

  // Create version history entry
  await db.detectionRuleVersion.create({
    data: {
      submissionId: submission.id,
      version: 1,
      rule: rule as object,
      ruleType,
      f1: validation.f1Score,
      notes: "Initial submission",
    },
  });

  // Materialise the PRIVATE default rather than relying on an absent row.
  await db.detectionRuleShareAcl.create({
    data: {
      submissionId: submission.id,
      accessType: "PRIVATE",
      sharedBy: userId,
    },
  });

  return {
    success: true,
    submissionId: submission.id,
    version: 1,
    f1Score: validation.f1Score,
    validationErrors: [],
  };
}

export async function updateDetectionRule(submissionId: string, rule: Record<string, unknown>, ruleType: RuleType, notes?: string) {
  // Get current submission
  const submission = await db.detectionSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: "Submission not found" };
  }

  // Validate new rule
  const validation = validateRuleSyntax(ruleType, rule);

  if (!validation.valid) {
    return {
      success: false,
      error: "Invalid rule syntax",
      validationErrors: validation.errors,
    };
  }

  // Increment version
  const newVersion = submission.version + 1;

  // Update submission
  const updated = await db.detectionSubmission.update({
    where: { id: submissionId },
    data: {
      rule: rule as object,
      ruleType,
      version: newVersion,
      f1: validation.f1Score,
      updatedAt: new Date(),
    },
  });

  // Create version history entry
  await db.detectionRuleVersion.create({
    data: {
      submissionId: submissionId,
      version: newVersion,
      rule: rule as object,
      ruleType,
      f1: validation.f1Score,
      notes: notes || `Updated to version ${newVersion}`,
    },
  });

  return {
    success: true,
    submissionId: updated.id,
    version: newVersion,
    f1Score: validation.f1Score,
    validationErrors: [],
  };
}

/**
 * Fail closed: a submission with no DetectionRuleShareAcl row has never been
 * shared, so it is PRIVATE. Reading `accessType` off a missing row yields
 * undefined, which must not be mistaken for "not private".
 */
export function canAccessRule(
  submission: { userId: string; shareAcl: { accessType: string } | null },
  userId?: string,
): boolean {
  if (userId && submission.userId === userId) return true;
  return submission.shareAcl != null && submission.shareAcl.accessType !== "PRIVATE";
}

export async function getRuleById(submissionId: string, userId?: string) {
  const submission = await db.detectionSubmission.findUnique({
    where: { id: submissionId },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
      shareAcl: true,
    },
  });

  if (!submission) {
    return { success: false, error: "Rule not found" };
  }

  if (!canAccessRule(submission, userId)) {
    return { success: false, error: "Access denied", statusCode: 403 };
  }

  const latestVersion = submission.versions[0];

  return {
    success: true,
    data: {
      submissionId: submission.id,
      version: submission.version,
      ruleType: submission.ruleType as RuleType,
      rule: submission.rule,
      f1Score: submission.f1,
      isPublic: submission.isPublic,
      shareAcl: submission.shareAcl
        ? {
            accessType: submission.shareAcl.accessType,
            sharedBy: submission.shareAcl.sharedBy,
            sharedAt: submission.shareAcl.sharedAt,
          }
        : null,
      versions: submission.versions.map((v) => ({
        version: v.version,
        f1Score: v.f1,
        notes: v.notes,
        createdAt: v.createdAt,
      })),
    },
  };
}

export async function getRuleVersions(submissionId: string, userId?: string) {
  // Version history is the rule body over time — gate it exactly like the rule.
  const submission = await db.detectionSubmission.findUnique({
    where: { id: submissionId },
    select: { userId: true, shareAcl: { select: { accessType: true } } },
  });

  if (!submission) {
    return { success: false, error: "Rule not found", statusCode: 404 };
  }

  if (!canAccessRule(submission, userId)) {
    return { success: false, error: "Access denied", statusCode: 403 };
  }

  const versions = await db.detectionRuleVersion.findMany({
    where: { submissionId },
    orderBy: { version: "asc" },
  });

  if (versions.length === 0) {
    return { success: false, error: "No versions found", statusCode: 404 };
  }

  const withDiffs = versions.map((v, idx) => ({
    version: v.version,
    f1Score: v.f1,
    notes: v.notes,
    createdAt: v.createdAt,
    diff:
      idx > 0
        ? getVersionDiff(versions[idx - 1].rule as Record<string, unknown>, v.rule as Record<string, unknown>)
        : null,
  }));

  return { success: true, versions: withDiffs };
}

export async function shareRule(submissionId: string, userId: string, accessType: "PRIVATE" | "COMMUNITY" | "RECRUITER_ONLY") {
  const submission = await db.detectionSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: "Submission not found" };
  }

  if (submission.userId !== userId) {
    return { success: false, error: "Only the rule owner can share it", statusCode: 403 };
  }

  // Create or update ACL
  const acl = await db.detectionRuleShareAcl.upsert({
    where: { submissionId },
    create: {
      submissionId,
      accessType,
      sharedBy: userId,
    },
    update: {
      accessType,
      sharedAt: new Date(),
    },
  });

  // Update isPublic flag
  await db.detectionSubmission.update({
    where: { id: submissionId },
    data: {
      isPublic: accessType !== "PRIVATE",
    },
  });

  return {
    success: true,
    acl: {
      accessType: acl.accessType,
      sharedBy: acl.sharedBy,
      sharedAt: acl.sharedAt,
    },
  };
}

export async function getCommunityRules(limit: number = 20, offset: number = 0, sortBy: string = "createdAt") {
  const orderBy: Record<string, string> = {};

  switch (sortBy) {
    case "score":
      orderBy.f1 = "desc";
      break;
    case "popularity":
      // For now, sort by f1 as a proxy for popularity
      orderBy.f1 = "desc";
      break;
    case "createdAt":
    default:
      orderBy.updatedAt = "desc";
  }

  const rules = await db.detectionSubmission.findMany({
    where: {
      shareAcl: {
        accessType: "COMMUNITY",
      },
      isPublic: true,
    },
    select: {
      id: true,
      userId: true,
      ruleType: true,
      f1: true,
      version: true,
      updatedAt: true,
      user: {
        select: {
          displayName: true,
          id: true,
        },
      },
    },
    orderBy,
    take: limit,
    skip: offset,
  });

  const total = await db.detectionSubmission.count({
    where: {
      shareAcl: {
        accessType: "COMMUNITY",
      },
      isPublic: true,
    },
  });

  return {
    success: true,
    rules: rules.map((r) => ({
      submissionId: r.id,
      authorName: r.user.displayName || r.user.id,
      ruleType: r.ruleType,
      f1Score: r.f1,
      version: r.version,
      createdAt: r.updatedAt,
    })),
    total,
    limit,
    offset,
  };
}

export async function testRuleAgainstDataset(
  rule: Record<string, unknown>,
  ruleType: RuleType,
  testData: string,
  maxResults: number = 100
) {
  // For now, return a placeholder result
  // In production, this would execute the rule against test data
  const lines = testData.split("\n").filter((l) => l.trim());

  return {
    success: true,
    matches: lines.slice(0, maxResults).map((line, idx) => ({
      line: idx + 1,
      content: line,
    })),
    executionTimeMs: Math.random() * 100,
    errors: [] as string[],
  };
}

export function getVersionDiff(
  v1: Record<string, unknown>,
  v2: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  // Simple JSON diff: check top-level keys
  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);

  for (const key of allKeys) {
    if (JSON.stringify(v1[key]) !== JSON.stringify(v2[key])) {
      diff[key] = {
        old: v1[key],
        new: v2[key],
      };
    }
  }

  return diff;
}
