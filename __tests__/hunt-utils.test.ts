import { describe, it, expect } from "vitest";
import {
  SELECTIVITY_CEILING,
  SCORE_GRACE_SECONDS,
  MAX_TIME_PENALTY,
  searchableText,
  renderRow,
  validateQuerySyntax,
  executeQueryOnData,
  parseKqlCondition,
  executeKql,
  executeSqlLite,
  surfacedArtifacts,
  calculateHuntScore,
  maskSensitiveData,
} from "../src/lib/hunt-utils";

const LOGS = [
  { ts: "2026-08-09T09:14:02Z", host: "WS-014", user: "j.patel", process: "outlook.exe", dest: "" },
  { ts: "2026-08-09T09:21:47Z", host: "WS-014", user: "j.patel", process: "powershell.exe", dest: "185.62.188.4" },
  { ts: "2026-08-09T09:33:10Z", host: "WS-014", user: "j.patel", process: "rundll32.exe", dest: "185.62.188.4" },
  { ts: "2026-08-09T10:02:55Z", host: "SRV-FILE01", user: "svc_backup", process: "robocopy.exe", dest: "" },
];

const KEY = ["IP:185.62.188.4", "PROCESS:rundll32.exe", "USER:svc_backup"];

describe("searchableText", () => {
  it("covers values but not field names", () => {
    const text = searchableText(LOGS[1]);
    expect(text).toContain("powershell.exe");
    // Grepping a log line should not match because the record happens to have a
    // field called "process".
    expect(text).not.toContain("process");
  });

  it("renders null and undefined as empty rather than the words", () => {
    expect(searchableText({ a: null, b: undefined, c: "x" })).not.toMatch(/null|undefined/);
  });
});

describe("renderRow", () => {
  it("renders key=value pairs", () => {
    expect(renderRow({ host: "WS-014", user: "j.patel" })).toBe("host=WS-014 user=j.patel");
  });
});

describe("validateQuerySyntax", () => {
  it("rejects an empty query", () => {
    expect(() => validateQuerySyntax("   ", "GREP")).toThrow(/empty/i);
  });

  it("rejects an invalid regex", () => {
    expect(() => validateQuerySyntax("(unclosed", "REGEX")).toThrow(/invalid regex/i);
  });

  // JS cannot interrupt a running regex, so the pattern has to be refused up front.
  it("rejects nested quantifiers that can backtrack exponentially", () => {
    expect(() => validateQuerySyntax("(a+)+$", "REGEX")).toThrow(/exponential/i);
    expect(() => validateQuerySyntax("(x*)*", "REGEX")).toThrow(/exponential/i);
  });

  it("still allows ordinary regexes", () => {
    expect(() => validateQuerySyntax("rundll32\\.exe", "REGEX")).not.toThrow();
    expect(() => validateQuerySyntax("185\\.62\\.\\d+\\.\\d+", "REGEX")).not.toThrow();
  });

  it("rejects SQL mutations as whole words", () => {
    expect(() => validateQuerySyntax("SELECT * FROM logs WHERE x=1; DROP TABLE logs", "SQL_LITE")).toThrow(/read-only/i);
  });

  // The old substring check rejected any hunt mentioning process creation.
  it("allows words that merely contain a forbidden keyword", () => {
    expect(() => validateQuerySyntax("SELECT * FROM logs WHERE created_at = '2026-08-09'", "SQL_LITE")).not.toThrow();
    expect(() => validateQuerySyntax("SELECT * FROM logs WHERE event = 'ProcessCreate'", "SQL_LITE")).not.toThrow();
  });

  it("catches unbalanced quotes and parens in KQL", () => {
    expect(() => validateQuerySyntax('process:"cmd.exe', "KQL")).toThrow(/quotes/i);
    expect(() => validateQuerySyntax("(process:cmd.exe", "KQL")).toThrow(/parenthes/i);
  });
});

describe("parseKqlCondition", () => {
  // split(":") used to truncate every value containing a colon.
  it("splits at the first colon only, so timestamps survive", () => {
    expect(parseKqlCondition("ts:09:14:02")).toEqual({ field: "ts", value: "09:14:02" });
  });

  it("strips surrounding quotes", () => {
    expect(parseKqlCondition('process:"rundll32.exe"')).toEqual({ field: "process", value: "rundll32.exe" });
  });

  it("returns null for a pattern with no field", () => {
    expect(parseKqlCondition(":orphan")).toBeNull();
    expect(parseKqlCondition("nocolon")).toBeNull();
  });
});

describe("executeKql", () => {
  it("ANDs conditions", () => {
    expect(executeKql(LOGS, "host:WS-014 AND process:rundll32")).toHaveLength(1);
  });

  // OR was documented but unimplemented; an OR query silently matched wrongly.
  it("ORs conditions", () => {
    const rows = executeKql(LOGS, "process:rundll32.exe OR process:robocopy.exe");
    expect(rows).toHaveLength(2);
  });

  it("gives AND tighter binding than OR", () => {
    const rows = executeKql(LOGS, "host:WS-014 AND process:outlook.exe OR user:svc_backup");
    expect(rows.map((r) => r.process).sort()).toEqual(["outlook.exe", "robocopy.exe"]);
  });

  it("matches a value containing colons", () => {
    expect(executeKql(LOGS, "ts:09:14:02")).toHaveLength(1);
  });

  it("returns nothing for an unparseable query rather than everything", () => {
    expect(executeKql(LOGS, "just some words")).toEqual([]);
  });
});

describe("executeSqlLite", () => {
  it("filters on equality", () => {
    expect(executeSqlLite(LOGS, "SELECT * FROM logs WHERE host = 'SRV-FILE01'")).toHaveLength(1);
  });

  it("supports LIKE with wildcards", () => {
    expect(executeSqlLite(LOGS, "SELECT * FROM logs WHERE process LIKE '%dll%'")).toHaveLength(1);
  });

  it("supports negation", () => {
    expect(executeSqlLite(LOGS, "SELECT * FROM logs WHERE host != 'WS-014'")).toHaveLength(1);
  });

  // Half of the old answer-key leak: SELECT * returned the whole dataset.
  it("returns nothing when there is no WHERE clause", () => {
    expect(executeSqlLite(LOGS, "SELECT * FROM logs")).toEqual([]);
  });

  it("does not let an unparseable condition pass silently", () => {
    expect(executeSqlLite(LOGS, "SELECT * FROM logs WHERE gibberish")).toEqual([]);
  });
});

describe("executeQueryOnData", () => {
  it("greps values", () => {
    expect(executeQueryOnData(LOGS, "185.62.188.4", "GREP")).toHaveLength(2);
  });

  it("does not let grep match on field names", () => {
    expect(executeQueryOnData(LOGS, "host", "GREP")).toHaveLength(0);
  });

  it("matches regex case-insensitively", () => {
    expect(executeQueryOnData(LOGS, "RUNDLL32", "REGEX")).toHaveLength(1);
  });

  it("treats natural language as a case-insensitive substring", () => {
    expect(executeQueryOnData(LOGS, "SVC_BACKUP", "NATURAL_LANGUAGE")).toHaveLength(1);
  });
});

describe("surfacedArtifacts", () => {
  it("credits every artifact visible in a selective result set", () => {
    const rows = executeQueryOnData(LOGS, "rundll32.exe", "GREP");
    // The matching row also carries the C2 address, so the hunter has genuinely
    // surfaced both — one good query is allowed to open two leads.
    expect(surfacedArtifacts(rows, LOGS.length, KEY).sort()).toEqual([
      "IP:185.62.188.4",
      "PROCESS:rundll32.exe",
    ]);
  });

  it("credits only what the results actually show", () => {
    const rows = executeQueryOnData(LOGS, "robocopy.exe", "GREP");
    expect(surfacedArtifacts(rows, LOGS.length, KEY)).toEqual(["USER:svc_backup"]);
  });

  // THE exploit: `.` matched every row, every expected value appeared somewhere
  // in the results, and one request credited the whole answer key.
  it("credits nothing for a query that returns the entire dataset", () => {
    const everything = executeQueryOnData(LOGS, ".", "REGEX");
    expect(everything).toHaveLength(LOGS.length);
    expect(surfacedArtifacts(everything, LOGS.length, KEY)).toEqual([]);
  });

  it("credits nothing above the selectivity ceiling", () => {
    const size = 100;
    const tooBroad = new Array(Math.floor(size * SELECTIVITY_CEILING) + 1).fill(LOGS[2]);
    expect(surfacedArtifacts(tooBroad, size, KEY)).toEqual([]);
  });

  it("credits at exactly the ceiling", () => {
    const size = 100;
    const atLimit = new Array(size * SELECTIVITY_CEILING).fill(LOGS[2]);
    expect(surfacedArtifacts(atLimit, size, KEY)).toContain("PROCESS:rundll32.exe");
  });

  it("credits nothing for an empty result set", () => {
    expect(surfacedArtifacts([], LOGS.length, KEY)).toEqual([]);
  });

  it("ignores a malformed key entry rather than crediting it", () => {
    expect(surfacedArtifacts([LOGS[2]], LOGS.length, ["NOCOLON", "PROCESS:"])).toEqual([]);
  });
});

describe("calculateHuntScore", () => {
  it("rewards a fast, accurate, economical hunt", () => {
    expect(calculateHuntScore(100, 5, 600)).toBeGreaterThan(80);
  });

  // The old formula was (seconds - 300)/60 uncapped against a max accuracy of
  // 100, so a two-hour hunt scored zero no matter how good it was.
  it("does not zero out a long but perfect investigation", () => {
    expect(calculateHuntScore(100, 10, 7200)).toBeGreaterThan(50);
  });

  it("caps the time penalty", () => {
    const atCap = calculateHuntScore(100, 0, SCORE_GRACE_SECONDS + MAX_TIME_PENALTY * 60);
    const wayOver = calculateHuntScore(100, 0, SCORE_GRACE_SECONDS + 10_000 * 60);
    expect(atCap).toBe(wayOver);
  });

  it("charges nothing inside the grace period", () => {
    expect(calculateHuntScore(100, 0, SCORE_GRACE_SECONDS)).toBe(calculateHuntScore(100, 0, 0));
  });

  it("never goes negative", () => {
    expect(calculateHuntScore(0, 500, 999_999)).toBe(0);
  });

  it("floors the query-economy multiplier at half", () => {
    expect(calculateHuntScore(100, 10_000, 0)).toBe(50);
  });

  it("clamps accuracy to 0-100", () => {
    expect(calculateHuntScore(500, 0, 0)).toBe(100);
    expect(calculateHuntScore(-5, 0, 0)).toBe(0);
  });
});

describe("maskSensitiveData", () => {
  it("masks card and national insurance numbers", () => {
    expect(maskSensitiveData("card 4111 1111 1111 1111")).toContain("****-****-****-****");
    expect(maskSensitiveData("ssn 123-45-6789")).toContain("***-**-****");
  });

  it("masks credentials", () => {
    expect(maskSensitiveData('{"password":"hunter2"}')).not.toContain("hunter2");
    expect(maskSensitiveData('{"api_key":"sk-live-abc"}')).not.toContain("sk-live-abc");
  });

  // Email addresses are frequently the indicator; masking them made phishing
  // and BEC datasets unsolvable.
  it("leaves email addresses intact", () => {
    expect(maskSensitiveData("from: invoices@acme-billing.co")).toContain("invoices@acme-billing.co");
  });
});
