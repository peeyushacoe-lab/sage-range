import { describe, it, expect } from "vitest";
import {
  PHASE_ORDER,
  PHASE_POINTS,
  MAX_SCORE,
  OZH_OPENS_AT,
  OZH_CLOSES_AT,
  RUN_MINUTES,
  effectiveDeadline,
  secondsRemaining,
  lastFullRunStart,
  windowStateAt,
  allocate,
  normalise,
  gradeTriage,
  gradeFindings,
  gradeHunt,
  gradeReconstruction,
  gradeResponse,
  gradeReport,
  totalRun,
  rankRuns,
  decideAwards,
  ozhCertCode,
  NARRATIVE_MIN_CHARS,
  type TriageKey,
  type ResponseKey,
  type ReportKey,
  type OzhPhase,
} from "@/lib/ozh-engine";

describe("phase points", () => {
  it("sums to the advertised maximum", () => {
    const total = PHASE_ORDER.reduce((sum, p) => sum + PHASE_POINTS[p], 0);
    expect(total).toBe(MAX_SCORE);
  });

  it("matches the published split", () => {
    expect(PHASE_POINTS).toEqual({
      TRIAGE: 150,
      INVESTIGATION: 200,
      HUNT: 250,
      RECONSTRUCTION: 150,
      RESPONSE: 150,
      REPORT: 100,
    });
  });
});

describe("allocate", () => {
  it("distributes a pool exactly, with no rounding drift", () => {
    for (const [pool, count] of [
      [75, 15],
      [250, 8],
      [200, 7],
      [30, 15],
      [100, 3],
    ] as const) {
      const shares = allocate(pool, count);
      expect(shares).toHaveLength(count);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(pool);
    }
  });

  it("returns nothing for an empty set", () => {
    expect(allocate(100, 0)).toEqual([]);
  });
});

describe("competition window", () => {
  // 10 Aug 00:00 IST and 12 Aug 20:00 IST, the times the interns are given.
  it("opens and closes at the scheduled IST instants", () => {
    expect(OZH_OPENS_AT.toISOString()).toBe("2026-08-09T18:30:00.000Z");
    expect(OZH_CLOSES_AT.toISOString()).toBe("2026-08-12T14:30:00.000Z");
  });

  it("gives a run started early its full three hours", () => {
    const start = new Date("2026-08-10T06:00:00Z");
    expect(effectiveDeadline(start).getTime()).toBe(start.getTime() + RUN_MINUTES * 60_000);
  });

  it("hard-stops a late run at the deadline rather than extending past it", () => {
    // 18:30 IST on the final day — three hours would run to 21:30 IST.
    const start = new Date("2026-08-12T13:00:00Z");
    expect(effectiveDeadline(start).getTime()).toBe(OZH_CLOSES_AT.getTime());
    expect(secondsRemaining(start, new Date("2026-08-12T14:00:00Z"))).toBe(1800);
  });

  it("never reports negative time remaining", () => {
    const start = new Date("2026-08-10T06:00:00Z");
    expect(secondsRemaining(start, new Date("2026-08-11T00:00:00Z"))).toBe(0);
  });

  it("identifies the last start that still buys a full run", () => {
    expect(lastFullRunStart().toISOString()).toBe("2026-08-12T11:30:00.000Z");
  });

  it("reports the window state", () => {
    expect(windowStateAt(new Date("2026-08-08T00:00:00Z"))).toBe("BEFORE");
    expect(windowStateAt(new Date("2026-08-11T00:00:00Z"))).toBe("OPEN");
    expect(windowStateAt(new Date("2026-08-13T00:00:00Z"))).toBe("CLOSED");
    // The boundaries themselves: open is inclusive, close is not.
    expect(windowStateAt(OZH_OPENS_AT)).toBe("OPEN");
    expect(windowStateAt(OZH_CLOSES_AT)).toBe("CLOSED");
  });
});

describe("normalise", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(normalise("  WS-044 ")).toBe("ws-044");
    expect(normalise("net group  Domain   Admins")).toBe("net group domain admins");
  });
});

describe("gradeTriage", () => {
  const key: TriageKey[] = [
    { alertId: "A1", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: "WS-01" },
    { alertId: "A2", verdict: "BENIGN", severity: "INFO", priority: "P4", asset: "SRV-01" },
  ];

  it("awards full marks for a perfect submission", () => {
    const score = gradeTriage(key, key);
    expect(score.points).toBe(PHASE_POINTS.TRIAGE);
    expect(score.correct).toBe(score.total);
  });

  it("scores nothing for an empty submission", () => {
    expect(gradeTriage([], key).points).toBe(0);
  });

  it("gives half credit for a severity one step out", () => {
    const near = gradeTriage(
      [{ alertId: "A1", verdict: "MALICIOUS", severity: "HIGH", priority: "P1", asset: "WS-01" }],
      [key[0]],
    );
    const exact = gradeTriage([key[0]], [key[0]]);
    expect(near.points).toBeLessThan(exact.points);
    expect(near.points).toBeGreaterThan(0);
  });

  it("gives no credit for a severity far out", () => {
    const far = gradeTriage(
      [{ alertId: "A1", verdict: "MALICIOUS", severity: "INFO", priority: "P1", asset: "WS-01" }],
      [key[0]],
    );
    const noSeverity = gradeTriage(
      [{ alertId: "A1", verdict: "MALICIOUS", priority: "P1", asset: "WS-01" }],
      [key[0]],
    );
    expect(far.points).toBe(noSeverity.points);
  });

  it("matches assets case-insensitively", () => {
    const score = gradeTriage(
      [{ alertId: "A1", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: "ws-01" }],
      [key[0]],
    );
    expect(score.points).toBe(gradeTriage([key[0]], [key[0]]).points);
  });
});

describe("gradeFindings", () => {
  const key = [
    { id: "q1", question: "one", accept: ["alpha", "alpha-alt"] },
    { id: "q2", question: "two", accept: ["beta"] },
  ];

  it("accepts any listed alternative", () => {
    const a = gradeFindings([{ id: "q1", value: "alpha" }], key, "INVESTIGATION");
    const b = gradeFindings([{ id: "q1", value: "ALPHA-ALT" }], key, "INVESTIGATION");
    expect(a.points).toBe(b.points);
    expect(a.points).toBeGreaterThan(0);
  });

  it("reaches the phase maximum when everything is right", () => {
    const score = gradeFindings(
      key.map((k) => ({ id: k.id, value: k.accept[0] })),
      key,
      "INVESTIGATION",
    );
    expect(score.points).toBe(PHASE_POINTS.INVESTIGATION);
  });

  it("reports what was missed", () => {
    const score = gradeFindings([], key, "INVESTIGATION");
    expect(score.missed).toHaveLength(2);
  });
});

describe("gradeHunt", () => {
  const key = [
    { id: "h1", tactic: "Execution", technique: "T1059.001", accept: ["powershell.exe"], label: "Exec" },
    { id: "h2", tactic: "Collection", technique: "T1560.001", accept: ["data.7z"], label: "Collect" },
  ];

  it("weights the indicator above the technique", () => {
    const indicatorOnly = gradeHunt([{ id: "h1", indicator: "powershell.exe" }], key);
    const techniqueOnly = gradeHunt([{ id: "h1", technique: "T1059.001" }], key);
    expect(indicatorOnly.points).toBeGreaterThan(techniqueOnly.points);
  });

  it("credits a correct indicator even when the technique is wrong", () => {
    const score = gradeHunt([{ id: "h1", indicator: "powershell.exe", technique: "T1078" }], key);
    expect(score.points).toBeGreaterThan(0);
    expect(score.correct).toBe(1);
  });

  it("reaches the phase maximum when everything is right", () => {
    const score = gradeHunt(
      key.map((k) => ({ id: k.id, technique: k.technique, indicator: k.accept[0] })),
      key,
    );
    expect(score.points).toBe(PHASE_POINTS.HUNT);
  });
});

describe("gradeReconstruction", () => {
  const key = {
    order: ["a", "b", "c", "d"],
    tactics: { a: "Initial Access", b: "Execution", c: "Persistence", d: "Exfiltration" },
  };

  it("awards full marks for the correct order and labels", () => {
    const score = gradeReconstruction({ order: [...key.order], tactics: key.tactics }, key);
    expect(score.points).toBe(PHASE_POINTS.RECONSTRUCTION);
  });

  it("scores adjacent pairs, so one misplacement does not cascade", () => {
    // "a" moved to the end: three of three ordering pairs among b,c,d survive.
    const shifted = gradeReconstruction({ order: ["b", "c", "d", "a"] }, key);
    const reversed = gradeReconstruction({ order: ["d", "c", "b", "a"] }, key);
    expect(shifted.points).toBeGreaterThan(reversed.points);
  });

  it("gives no ordering credit for a fully reversed timeline", () => {
    const score = gradeReconstruction({ order: ["d", "c", "b", "a"] }, key);
    expect(score.points).toBe(0);
  });

  it("ignores event ids that are not in the key", () => {
    const score = gradeReconstruction({ order: ["a", "zzz", "b", "c", "d"], tactics: key.tactics }, key);
    expect(score.points).toBe(PHASE_POINTS.RECONSTRUCTION);
  });
});

describe("gradeResponse", () => {
  const key: ResponseKey[] = [
    { actionId: "good1", grade: "CORRECT", weight: 2, label: "Isolate", rationale: "" },
    { actionId: "good2", grade: "CORRECT", weight: 1, label: "Preserve", rationale: "" },
    { actionId: "bad1", grade: "HARMFUL", weight: 3, label: "Shut down the DC", rationale: "outage" },
    { actionId: "meh", grade: "NEUTRAL", weight: 0, label: "Reset unrelated", rationale: "" },
  ];

  it("awards full marks for the correct set", () => {
    expect(gradeResponse(["good1", "good2"], key).points).toBe(PHASE_POINTS.RESPONSE);
  });

  it("penalises harmful actions so selecting everything scores worse", () => {
    const all = gradeResponse(["good1", "good2", "bad1", "meh"], key).points;
    const correct = gradeResponse(["good1", "good2"], key).points;
    expect(all).toBeLessThan(correct);
  });

  it("never returns a negative score", () => {
    expect(gradeResponse(["bad1"], key).points).toBe(0);
  });

  it("treats neutral actions as neither help nor harm", () => {
    expect(gradeResponse(["good1", "good2", "meh"], key).points).toBe(
      gradeResponse(["good1", "good2"], key).points,
    );
  });

  it("credits correctly avoiding a harmful action", () => {
    const avoided = gradeResponse(["good1", "good2"], key);
    const taken = gradeResponse(["good1", "good2", "bad1"], key);
    expect(avoided.correct).toBeGreaterThan(taken.correct);
  });
});

describe("gradeReport", () => {
  const key: ReportKey = {
    severity: "Critical",
    iocs: ["1.1.1.1", "evil.example"],
    assets: ["WS-01", "svc-backup"],
    techniques: ["T1566.001", "T1059.001"],
    containment: ["Isolate WS-01"],
  };
  const prose = "x".repeat(NARRATIVE_MIN_CHARS + 10);
  const full = {
    severity: key.severity,
    iocs: key.iocs,
    assets: key.assets,
    techniques: key.techniques,
    containment: key.containment,
    executiveSummary: prose,
    impact: prose,
    remediation: prose,
    recommendations: prose,
  };

  it("awards full marks for a complete, correct report", () => {
    expect(gradeReport(full, key).points).toBe(PHASE_POINTS.REPORT);
  });

  it("penalises entries that cannot be evidenced", () => {
    const padded = gradeReport({ ...full, iocs: [...key.iocs, "9.9.9.9", "8.8.8.8"] }, key);
    expect(padded.points).toBeLessThan(gradeReport(full, key).points);
  });

  it("scores narrative sections on being written, not on wording", () => {
    const short = gradeReport({ ...full, executiveSummary: "too short" }, key);
    expect(short.points).toBeLessThan(gradeReport(full, key).points);
  });

  it("scores nothing for an empty report", () => {
    expect(gradeReport({}, key).points).toBe(0);
  });
});

describe("totalRun", () => {
  it("caps at the maximum and computes accuracy across phases", () => {
    const totals = totalRun([
      { phase: "TRIAGE", points: 150, maxPoints: 150, correct: 60, total: 60, missed: [] },
      { phase: "REPORT", points: 50, maxPoints: 100, correct: 10, total: 30, missed: [] },
    ]);
    expect(totals.score).toBe(200);
    expect(totals.accuracy).toBe(Math.round((70 / 90) * 100));
  });

  it("reports zero accuracy rather than dividing by zero", () => {
    expect(totalRun([]).accuracy).toBe(0);
  });
});

describe("rankRuns", () => {
  it("ranks by score first", () => {
    const ranked = rankRuns([
      { userId: "low", score: 800, accuracy: 99, elapsedSeconds: 100 },
      { userId: "high", score: 900, accuracy: 70, elapsedSeconds: 9000 },
    ]);
    expect(ranked[0].userId).toBe("high");
  });

  it("prefers accuracy over speed at equal score", () => {
    const ranked = rankRuns([
      { userId: "fast_sloppy", score: 900, accuracy: 80, elapsedSeconds: 7000 },
      { userId: "slow_sharp", score: 900, accuracy: 95, elapsedSeconds: 9600 },
    ]);
    expect(ranked[0].userId).toBe("slow_sharp");
  });

  it("falls back to time only when score and accuracy tie", () => {
    const ranked = rankRuns([
      { userId: "slower", score: 900, accuracy: 90, elapsedSeconds: 9000 },
      { userId: "faster", score: 900, accuracy: 90, elapsedSeconds: 7000 },
    ]);
    expect(ranked[0].userId).toBe("faster");
  });

  it("gives genuinely identical runs the same rank", () => {
    const ranked = rankRuns([
      { userId: "a", score: 900, accuracy: 90, elapsedSeconds: 7000 },
      { userId: "b", score: 900, accuracy: 90, elapsedSeconds: 7000 },
      { userId: "c", score: 800, accuracy: 90, elapsedSeconds: 7000 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("is stable regardless of input order", () => {
    const runs = [
      { userId: "a", score: 900, accuracy: 90, elapsedSeconds: 7000 },
      { userId: "b", score: 900, accuracy: 90, elapsedSeconds: 7000 },
    ];
    expect(rankRuns(runs).map((r) => r.userId)).toEqual(
      rankRuns([...runs].reverse()).map((r) => r.userId),
    );
  });
});

describe("decideAwards", () => {
  const zero = Object.fromEntries(PHASE_ORDER.map((p) => [p, 0])) as Record<OzhPhase, number>;

  it("awards the champion to the top-ranked run", () => {
    const awards = decideAwards([
      { userId: "win", score: 900, accuracy: 90, elapsedSeconds: 7000, phaseScores: { ...zero, HUNT: 200 } },
      { userId: "lose", score: 500, accuracy: 60, elapsedSeconds: 6000, phaseScores: { ...zero, HUNT: 100 } },
    ]);
    expect(awards.find((a) => a.kind === "CHAMPION")?.userId).toBe("win");
    expect(awards.find((a) => a.kind === "TOP_THREAT_HUNTER")?.userId).toBe("win");
  });

  it("does not give Fastest Analyst to a fast, empty run", () => {
    const awards = decideAwards([
      { userId: "quitter", score: 60, accuracy: 100, elapsedSeconds: 200, phaseScores: zero },
      { userId: "finisher", score: 800, accuracy: 85, elapsedSeconds: 9000, phaseScores: zero },
    ]);
    expect(awards.find((a) => a.kind === "FASTEST_ANALYST")?.userId).toBe("finisher");
  });

  it("issues nothing for an empty field", () => {
    expect(decideAwards([])).toEqual([]);
  });

  it("gives no champion when nobody scored", () => {
    const awards = decideAwards([
      { userId: "a", score: 0, accuracy: 0, elapsedSeconds: 100, phaseScores: zero },
    ]);
    expect(awards.find((a) => a.kind === "CHAMPION")).toBeUndefined();
  });
});

describe("ozhCertCode", () => {
  it("excludes characters that are ambiguous when read aloud", () => {
    const code = ozhCertCode(1, () => 0.999999);
    expect(code).toMatch(/^OZH-2026-1-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(code.slice(10)).not.toMatch(/[IO01]/);
  });
});
