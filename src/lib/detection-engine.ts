// Detection Validation Engine — a constrained, Sigma-inspired rule matcher.
//
// This is deliberately NOT a full Sigma parser. Students build a rule out of
// field/operator/value conditions (AND/OR), and we evaluate it against a
// fixed, pre-labeled synthetic event log entirely server-side, computing
// precision/recall/F1 the same way a real detection engineering exercise
// would be graded. Keeping the rule language small keeps grading exact and
// avoids running arbitrary regex or code against user input.

export type RuleOperator = "equals" | "contains" | "not_contains" | "starts_with";

export type RuleCondition = {
  field: string;
  operator: RuleOperator;
  value: string;
};

export type Rule = {
  logic: "AND" | "OR";
  conditions: RuleCondition[];
};

export type DatasetEvent = {
  id: string;
  raw: string;
  fields: Record<string, string>;
  isMalicious: boolean;
};

export type EvaluationResult = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  matchedEventIds: string[];
};

function matchesCondition(fields: Record<string, string>, cond: RuleCondition): boolean {
  const raw = fields[cond.field];
  if (raw === undefined) return false;
  const a = raw.toLowerCase();
  const b = cond.value.toLowerCase();
  switch (cond.operator) {
    case "equals":
      return a === b;
    case "contains":
      return a.includes(b);
    case "not_contains":
      return !a.includes(b);
    case "starts_with":
      return a.startsWith(b);
    default:
      return false;
  }
}

export function matchesRule(fields: Record<string, string>, rule: Rule): boolean {
  if (rule.conditions.length === 0) return false;
  return rule.logic === "AND"
    ? rule.conditions.every((c) => matchesCondition(fields, c))
    : rule.conditions.some((c) => matchesCondition(fields, c));
}

export function evaluateRule(rule: Rule, events: DatasetEvent[]): EvaluationResult {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  const matchedEventIds: string[] = [];

  for (const ev of events) {
    const matched = matchesRule(ev.fields, rule);
    if (matched) matchedEventIds.push(ev.id);
    if (matched && ev.isMalicious) truePositives++;
    else if (matched && !ev.isMalicious) falsePositives++;
    else if (!matched && ev.isMalicious) falseNegatives++;
    else trueNegatives++;
  }

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { truePositives, falsePositives, falseNegatives, trueNegatives, precision, recall, f1, matchedEventIds };
}

/** Passing threshold used to decide whether a submission earns the challenge's points. */
export function isPassing(result: EvaluationResult): boolean {
  return result.precision >= 0.8 && result.recall >= 0.8;
}
