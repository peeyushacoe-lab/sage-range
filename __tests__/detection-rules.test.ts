import { describe, it, expect } from "vitest";
import {
  canAccessRule,
  validateRuleSyntax,
  calculateF1Score,
  getVersionDiff,
  type RuleType,
} from "@/lib/detection-rules";

describe("Detection Rule Validation", () => {
  describe("SIGMA rule validation", () => {
    it("should validate a valid SIGMA rule", () => {
      const rule = {
        title: "Process Creation Monitoring",
        detection: {
          selection: {
            Image: "*cmd.exe",
            CommandLine: "*whoami*",
          },
          condition: "selection",
        },
      };

      const result = validateRuleSyntax("SIGMA", rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.f1Score).toBeGreaterThan(0.5);
    });

    it("should reject SIGMA rule without title", () => {
      const rule = {
        detection: {
          selection: {},
          condition: "selection",
        },
      };

      const result = validateRuleSyntax("SIGMA", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "title")).toBe(true);
    });

    it("should reject SIGMA rule without detection block", () => {
      const rule = {
        title: "Test Rule",
      };

      const result = validateRuleSyntax("SIGMA", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "detection")).toBe(true);
    });

    it("should reject SIGMA rule without condition", () => {
      const rule = {
        title: "Test Rule",
        detection: {
          selection: {},
        },
      };

      const result = validateRuleSyntax("SIGMA", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "detection.condition")).toBe(true);
    });
  });

  describe("KQL rule validation", () => {
    it("should validate a valid KQL rule", () => {
      const rule = {
        query: 'process.name:"cmd.exe" | where command_line contains "whoami"',
      };

      const result = validateRuleSyntax("KQL", rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject KQL rule without query", () => {
      const rule = {};

      const result = validateRuleSyntax("KQL", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "query")).toBe(true);
    });

    it("should warn about KQL rule without pipe operator", () => {
      const rule = {
        query: 'process.name:"cmd.exe"',
      };

      const result = validateRuleSyntax("KQL", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "query")).toBe(true);
    });
  });

  describe("SPLUNK rule validation", () => {
    it("should validate a valid SPLUNK rule", () => {
      const rule = {
        search: 'process.name="cmd.exe" | stats count by CommandLine',
      };

      const result = validateRuleSyntax("SPLUNK", rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject SPLUNK rule without search", () => {
      const rule = {};

      const result = validateRuleSyntax("SPLUNK", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "search")).toBe(true);
    });
  });

  describe("ELASTIC rule validation", () => {
    it("should validate a valid ELASTIC rule with match query", () => {
      const rule = {
        query: {
          bool: {
            must: [{ match: { "process.name": "cmd.exe" } }],
          },
        },
      };

      const result = validateRuleSyntax("ELASTIC", rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject ELASTIC rule without query", () => {
      const rule = {};

      const result = validateRuleSyntax("ELASTIC", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "query")).toBe(true);
    });
  });

  describe("YARA rule validation", () => {
    it("should validate a valid YARA rule", () => {
      const rule = {
        rule_name: "detect_evil",
        strings: {
          s1: "evil.exe",
        },
        condition: "s1",
      };

      const result = validateRuleSyntax("YARA", rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject YARA rule without rule_name", () => {
      const rule = {
        strings: { s1: "test" },
        condition: "s1",
      };

      const result = validateRuleSyntax("YARA", rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule_name")).toBe(true);
    });
  });

  describe("Invalid rule type", () => {
    it("should reject unknown rule type", () => {
      const rule = { test: "data" };

      const result = validateRuleSyntax("UNKNOWN" as RuleType, rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "ruleType")).toBe(true);
    });
  });

  describe("Invalid rule object", () => {
    it("should reject null rule", () => {
      const result = validateRuleSyntax("SIGMA", null as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule")).toBe(true);
    });

    it("should reject non-object rule", () => {
      const result = validateRuleSyntax("SIGMA", "not an object" as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule")).toBe(true);
    });
  });
});

describe("F1 Score Calculation", () => {
  it("should have base score of 0.5", () => {
    const rule = {};
    const score = calculateF1Score(rule);
    expect(score).toBe(0.5);
  });

  it("should add 0.1 for high filter count", () => {
    const rule = {
      filter1: "test",
      filter2: "test",
      filter3: "test",
      filter4: "test",
      filter5: "test",
      filter6: "test",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should add 0.1 for process hierarchy indicators", () => {
    const rule = {
      process: "cmd.exe",
      parent_process: "explorer.exe",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should add 0.1 for network indicators", () => {
    const rule = {
      destination_ip: "192.168.1.1",
      destination_port: "443",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should add 0.1 for file detection", () => {
    const rule = {
      file_path: "C:\\Windows\\temp\\",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should add 0.1 for registry detection", () => {
    const rule = {
      registry_key: "HKLM\\Software\\Microsoft\\Windows",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should cap score at 1.0", () => {
    const rule = {
      filter1: "test",
      filter2: "test",
      filter3: "test",
      filter4: "test",
      filter5: "test",
      filter6: "test",
      process: "cmd.exe",
      parent_process: "explorer.exe",
      destination_ip: "192.168.1.1",
      file_path: "test",
      registry_key: "test",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("should combine multiple indicators", () => {
    const rule = {
      conditions: "many",
      process: "cmd.exe",
      destination_ip: "192.168.1.1",
      file_path: "test",
    };
    const score = calculateF1Score(rule);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe("Version Diff", () => {
  it("should detect changes in top-level keys", () => {
    const v1 = {
      title: "Old Title",
      value: 100,
    };

    const v2 = {
      title: "New Title",
      value: 100,
    };

    const diff = getVersionDiff(v1, v2);
    expect(diff.title).toBeDefined();
    expect(diff.title.old).toBe("Old Title");
    expect(diff.title.new).toBe("New Title");
    expect(diff.value).toBeUndefined();
  });

  it("should detect added keys", () => {
    const v1 = {
      title: "Test",
    };

    const v2 = {
      title: "Test",
      newField: "Added",
    };

    const diff = getVersionDiff(v1, v2);
    expect(diff.newField).toBeDefined();
    expect(diff.newField.old).toBeUndefined();
    expect(diff.newField.new).toBe("Added");
  });

  it("should detect removed keys", () => {
    const v1 = {
      title: "Test",
      oldField: "Removed",
    };

    const v2 = {
      title: "Test",
    };

    const diff = getVersionDiff(v1, v2);
    expect(diff.oldField).toBeDefined();
    expect(diff.oldField.old).toBe("Removed");
    expect(diff.oldField.new).toBeUndefined();
  });

  it("should handle nested object changes", () => {
    const v1 = {
      detection: {
        selection: { field: "value1" },
      },
    };

    const v2 = {
      detection: {
        selection: { field: "value2" },
      },
    };

    const diff = getVersionDiff(v1, v2);
    expect(diff.detection).toBeDefined();
  });

  it("should return empty diff for identical versions", () => {
    const v1 = {
      title: "Test",
      value: 100,
    };

    const v2 = {
      title: "Test",
      value: 100,
    };

    const diff = getVersionDiff(v1, v2);
    expect(Object.keys(diff)).toHaveLength(0);
  });
});

describe("Rule access control", () => {
  const owner = "user-owner";
  const other = "user-other";

  it("denies a rule with no ACL row to non-owners (fail closed)", () => {
    // Regression: `shareAcl?.accessType === "PRIVATE"` was false for a missing
    // row, so freshly created rules were readable by anyone.
    expect(canAccessRule({ userId: owner, shareAcl: null }, other)).toBe(false);
  });

  it("denies a rule with no ACL row to anonymous callers", () => {
    expect(canAccessRule({ userId: owner, shareAcl: null }, undefined)).toBe(false);
  });

  it("always allows the owner, even with no ACL row", () => {
    expect(canAccessRule({ userId: owner, shareAcl: null }, owner)).toBe(true);
  });

  it("denies an explicitly PRIVATE rule to non-owners", () => {
    expect(
      canAccessRule({ userId: owner, shareAcl: { accessType: "PRIVATE" } }, other),
    ).toBe(false);
  });

  it("allows the owner to read their own PRIVATE rule", () => {
    expect(
      canAccessRule({ userId: owner, shareAcl: { accessType: "PRIVATE" } }, owner),
    ).toBe(true);
  });

  it("allows COMMUNITY rules to anyone, including anonymous", () => {
    expect(
      canAccessRule({ userId: owner, shareAcl: { accessType: "COMMUNITY" } }, other),
    ).toBe(true);
    expect(
      canAccessRule({ userId: owner, shareAcl: { accessType: "COMMUNITY" } }, undefined),
    ).toBe(true);
  });

  it("allows RECRUITER_ONLY rules past the share gate", () => {
    expect(
      canAccessRule({ userId: owner, shareAcl: { accessType: "RECRUITER_ONLY" } }, other),
    ).toBe(true);
  });
});
