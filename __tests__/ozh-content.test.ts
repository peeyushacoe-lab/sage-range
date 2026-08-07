import { describe, it, expect } from "vitest";
import {
  buildAnswerKey,
  buildPhasePayload,
  buildBriefing,
  deriveEvidence,
} from "@/content/ozh-scenario";
import { alerts, assetList } from "@/content/ozh-alerts";
import { evidenceRecords, investigationQuestions } from "@/content/ozh-investigation";
import { huntDataset, TECHNIQUE_OPTIONS } from "@/content/ozh-hunt";
import { timelineEvents, timelineSlots, TACTIC_OPTIONS } from "@/content/ozh-timeline";
import { responseActions, reportOptions } from "@/content/ozh-response";
import {
  PHASE_ORDER,
  PHASE_POINTS,
  MAX_SCORE,
  gradeTriage,
  gradeFindings,
  gradeHunt,
  gradeReconstruction,
  gradeResponse,
  gradeReport,
  totalRun,
  NARRATIVE_MIN_CHARS,
} from "@/lib/ozh-engine";

/** A representative field of interns. */
const USERS = [
  "u_alpha", "u_bravo", "u_charlie", "u_delta", "u_echo", "u_foxtrot",
  "u_golf", "u_hotel", "u_india", "u_juliet", "u_kilo", "u_lima",
  "u_mike", "u_november", "u_oscar", "u_papa", "u_quebec", "u_romeo",
];

/** Answer every phase perfectly for one intern. */
function perfectRun(userId: string) {
  const k = buildAnswerKey(userId);
  const prose = "x".repeat(NARRATIVE_MIN_CHARS + 20);
  return [
    gradeTriage(
      k.TRIAGE.map((t) => ({
        alertId: t.alertId,
        verdict: t.verdict,
        severity: t.severity,
        priority: t.priority,
        asset: t.asset,
      })),
      k.TRIAGE,
    ),
    gradeFindings(
      k.INVESTIGATION.map((f) => ({ id: f.id, value: f.accept[0] })),
      k.INVESTIGATION,
      "INVESTIGATION",
    ),
    gradeHunt(
      k.HUNT.map((h) => ({ id: h.id, technique: h.technique, indicator: h.accept[0] })),
      k.HUNT,
    ),
    gradeReconstruction(
      { order: [...k.RECONSTRUCTION.order], tactics: k.RECONSTRUCTION.tactics },
      k.RECONSTRUCTION,
    ),
    gradeResponse(
      k.RESPONSE.filter((r) => r.grade === "CORRECT").map((r) => r.actionId),
      k.RESPONSE,
    ),
    gradeReport(
      {
        severity: k.REPORT.severity,
        iocs: k.REPORT.iocs,
        assets: k.REPORT.assets,
        techniques: k.REPORT.techniques,
        containment: k.REPORT.containment,
        executiveSummary: prose,
        impact: prose,
        remediation: prose,
        recommendations: prose,
      },
      k.REPORT,
    ),
  ];
}

describe("scoring reaches the advertised maximum", () => {
  it.each(USERS.slice(0, 6))("a perfect run by %s scores exactly 1000", (userId) => {
    const totals = totalRun(perfectRun(userId));
    expect(totals.score).toBe(MAX_SCORE);
    expect(totals.accuracy).toBe(100);
  });

  it("an empty run scores zero", () => {
    const k = buildAnswerKey("u_alpha");
    const totals = totalRun([
      gradeTriage([], k.TRIAGE),
      gradeFindings([], k.INVESTIGATION, "INVESTIGATION"),
      gradeHunt([], k.HUNT),
      gradeReconstruction({ order: [] }, k.RECONSTRUCTION),
      gradeResponse([], k.RESPONSE),
      gradeReport({}, k.REPORT),
    ]);
    expect(totals.score).toBe(0);
  });
});

describe("determinism", () => {
  it("derives the same evidence for the same intern every time", () => {
    expect(deriveEvidence("u_alpha")).toEqual(deriveEvidence("u_alpha"));
    expect(JSON.stringify(buildAnswerKey("u_alpha"))).toBe(
      JSON.stringify(buildAnswerKey("u_alpha")),
    );
  });

  it("keeps the hunt corpus stable across reloads", () => {
    const e = deriveEvidence("u_bravo");
    expect(huntDataset(e, "u_bravo")).toEqual(huntDataset(e, "u_bravo"));
  });

  it("keeps the shuffled timeline pool stable across re-renders", () => {
    const e = deriveEvidence("u_bravo");
    expect(timelineEvents(e, "u_bravo").map((x) => x.id)).toEqual(
      timelineEvents(e, "u_bravo").map((x) => x.id),
    );
  });
});

describe("per-intern evidence is individual", () => {
  it("gives no two interns the same answer key", () => {
    const seen = new Map<string, string>();
    for (const userId of USERS) {
      const e = deriveEvidence(userId);
      const sig = [
        e.victimUser, e.victimHost, e.c2Ip, e.c2Domain,
        e.attachment, e.taskName, e.archiveName, e.fileServer,
      ].join("|");
      expect(seen.has(sig), `${userId} collides with ${seen.get(sig)}`).toBe(false);
      seen.set(sig, userId);
    }
  });

  it("gives no two interns the same C2 address", () => {
    const ips = USERS.map((u) => deriveEvidence(u).c2Ip);
    expect(new Set(ips).size).toBe(ips.length);
  });

  it("never reuses the C2 address as the password-spray source", () => {
    // The whole scenario turns on these being different actors' infrastructure.
    for (const userId of USERS) {
      const e = deriveEvidence(userId);
      expect(e.c2Ip).not.toBe(e.sprayIp);
      expect(e.victimUser).not.toBe(e.sprayTarget);
    }
  });

  it("keeps attacker infrastructure inside documentation ranges", () => {
    // Teaching an intern to block a real routable address is a liability.
    const documented = /^(198\.51\.100|203\.0\.113|192\.0\.2|198\.18\.\d+)\./;
    for (const userId of USERS) {
      const e = deriveEvidence(userId);
      expect(e.c2Ip).toMatch(documented);
      expect(e.sprayIp).toMatch(documented);
    }
  });
});

describe("every answer is reachable from the evidence", () => {
  it.each(USERS.slice(0, 8))("%s can find every hunt indicator in the corpus", (userId) => {
    const k = buildAnswerKey(userId);
    const corpus = huntDataset(k.evidence, userId)
      .map((l) => `${l.line} ${l.host} ${l.user}`)
      .join("\n")
      .toLowerCase();
    for (const finding of k.HUNT) {
      const present = finding.accept.some((a) => corpus.includes(a.toLowerCase()));
      expect(present, `${finding.label}: "${finding.accept[0]}" is not in the corpus`).toBe(true);
    }
  });

  it.each(USERS.slice(0, 8))("%s is offered every investigation answer", (userId) => {
    const k = buildAnswerKey(userId);
    const questions = investigationQuestions(k.evidence);
    for (const finding of k.INVESTIGATION) {
      const question = questions.find((q) => q.id === finding.id);
      expect(question, `no question rendered for ${finding.id}`).toBeDefined();
      expect(question!.options).toContain(finding.accept[0]);
    }
  });

  it.each(USERS.slice(0, 8))("%s is offered every report answer", (userId) => {
    const k = buildAnswerKey(userId);
    const options = reportOptions(k.evidence);
    expect(options.severity).toContain(k.REPORT.severity);
    for (const v of k.REPORT.iocs) expect(options.iocs).toContain(v);
    for (const v of k.REPORT.assets) expect(options.assets).toContain(v);
    for (const v of k.REPORT.techniques) expect(options.techniques).toContain(v);
    for (const v of k.REPORT.containment) expect(options.containment).toContain(v);
  });
});

describe("content integrity", () => {
  const e = deriveEvidence("u_alpha");

  it("triages exactly fifteen alerts, each with a key entry", () => {
    const k = buildAnswerKey("u_alpha");
    const ids = alerts(e).map((a) => a.id);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(k.TRIAGE.map((t) => t.alertId).sort()).toEqual([...ids].sort());
  });

  it("attributes every alert to an asset the intern can pick", () => {
    const k = buildAnswerKey("u_alpha");
    const assets = assetList(e);
    for (const t of k.TRIAGE) expect(assets).toContain(t.asset);
  });

  it("includes benign and false-positive alerts, so triage is a real decision", () => {
    const verdicts = buildAnswerKey("u_alpha").TRIAGE.map((t) => t.verdict);
    expect(verdicts).toContain("BENIGN");
    expect(verdicts).toContain("FALSE_POSITIVE");
    expect(verdicts).toContain("SUSPICIOUS");
    expect(verdicts).toContain("MALICIOUS");
  });

  it("grades every response action, and offers every graded action", () => {
    const k = buildAnswerKey("u_alpha");
    const offered = responseActions(e).map((a) => a.id).sort();
    const graded = k.RESPONSE.map((r) => r.actionId).sort();
    expect(graded).toEqual(offered);
  });

  it("includes harmful response options, so the phase can be failed", () => {
    const grades = buildAnswerKey("u_alpha").RESPONSE.map((r) => r.grade);
    expect(grades.filter((g) => g === "HARMFUL").length).toBeGreaterThanOrEqual(5);
    expect(grades).toContain("NEUTRAL");
  });

  it("matches timeline slots to timeline events one for one", () => {
    const k = buildAnswerKey("u_alpha");
    expect(timelineSlots()).toHaveLength(k.RECONSTRUCTION.order.length);
    const pool = timelineEvents(e, "u_alpha").map((x) => x.id).sort();
    expect(pool).toEqual([...k.RECONSTRUCTION.order].sort());
  });

  it("labels every timeline event with a tactic the intern can pick", () => {
    const k = buildAnswerKey("u_alpha");
    for (const id of k.RECONSTRUCTION.order) {
      expect(TACTIC_OPTIONS).toContain(k.RECONSTRUCTION.tactics[id]);
    }
  });

  it("offers every hunt technique in the picker", () => {
    const k = buildAnswerKey("u_alpha");
    const offered = TECHNIQUE_OPTIONS.map((t) => t.id);
    for (const h of k.HUNT) expect(offered).toContain(h.technique);
  });

  it("hides the timestamp inside every timeline event description", () => {
    // Phase 4 shows the slots; embedding the time in the description would
    // turn ordering into matching.
    for (const event of timelineEvents(e, "u_alpha")) {
      expect(event.description).not.toMatch(/\b\d{2}:\d{2}\b/);
    }
  });

  it("ships a corpus large enough that hunting is not skimming", () => {
    expect(huntDataset(e, "u_alpha").length).toBeGreaterThan(500);
  });

  it("provides enough evidence records for the investigation to require filtering", () => {
    expect(evidenceRecords(e).length).toBeGreaterThanOrEqual(20);
  });
});

describe("the scenario's central trap", () => {
  it("does not name the password spray as initial access", () => {
    const k = buildAnswerKey("u_alpha");
    const initialAccess = k.INVESTIGATION.find((f) => f.id === "initial-access");
    expect(initialAccess?.accept[0]).toBe("Phishing email with a macro-enabled attachment");
  });

  it("records the spray as failed", () => {
    const k = buildAnswerKey("u_alpha");
    const outcome = k.INVESTIGATION.find((f) => f.id === "spray-outcome");
    expect(outcome?.accept[0]).toMatch(/^No —/);
  });

  it("puts the mail delivery before the spray as the first malicious event", () => {
    const k = buildAnswerKey("u_alpha");
    expect(k.INVESTIGATION.find((f) => f.id === "first-malicious")?.accept[0]).toBe("EV-MAIL-01");
  });

  it("excludes the sprayed account from the compromised assets", () => {
    // It was attacked and held. Naming it would misstate the breach scope.
    const k = buildAnswerKey("u_alpha");
    expect(k.REPORT.assets).not.toContain(k.evidence.sprayTarget);
    expect(k.REPORT.assets).toContain(k.evidence.victimUser);
  });

  it("requires both persistence mechanisms, not just the scheduled task", () => {
    const k = buildAnswerKey("u_alpha");
    expect(k.REPORT.iocs).toContain(k.evidence.taskName);
    expect(k.REPORT.iocs).toContain(k.evidence.runKeyName);
    expect(k.HUNT.filter((h) => h.tactic === "Persistence")).toHaveLength(2);
  });
});

describe("answer safety", () => {
  it.each(USERS.slice(0, 4))("no phase payload for %s carries the answer key", (userId) => {
    for (const phase of PHASE_ORDER) {
      const json = JSON.stringify(buildPhasePayload(userId, phase));
      expect(json).not.toMatch(/correctAnswer|"accept"|answerKey/i);
    }
  });

  it("does not reveal which response actions are harmful", () => {
    const json = JSON.stringify(buildPhasePayload("u_alpha", "RESPONSE"));
    expect(json).not.toMatch(/HARMFUL|CORRECT|NEUTRAL|rationale/);
  });

  it("does not mark the signal lines in the hunt corpus", () => {
    // Scoped to the log lines themselves — the prompts alongside them do say
    // "attacker", which is the question being asked, not a giveaway.
    const payload = buildPhasePayload("u_alpha", "HUNT") as {
      dataset: { line: string; source: string }[];
    };
    const corpus = payload.dataset.map((l) => `${l.source} ${l.line}`).join("\n");
    expect(corpus).not.toMatch(/signal|malicious|attacker|suspicious|implant|c2\b/i);
  });

  it("does not leak the correct order in the reconstruction payload", () => {
    const k = buildAnswerKey("u_alpha");
    const payload = buildPhasePayload("u_alpha", "RECONSTRUCTION");
    const rendered = (payload as { events: { id: string }[] }).events.map((x) => x.id);
    // A pool that happened to arrive pre-sorted would hand over the answer.
    expect(rendered).not.toEqual(k.RECONSTRUCTION.order);
  });

  it("ships each phase separately rather than as one bundle", () => {
    // Fetching Phase 1 must not disclose Phase 3's corpus.
    const triage = JSON.stringify(buildPhasePayload("u_alpha", "TRIAGE"));
    expect(triage).not.toContain("dataset");
    expect(triage).not.toContain("EVT-");
  });
});

describe("briefing", () => {
  it("states the rules the competition is run under", () => {
    const brief = buildBriefing();
    expect(brief.rules.join(" ")).toMatch(/One attempt/i);
    expect(brief.rules.join(" ")).toMatch(/Three-hour/i);
    expect(brief.company.employees).toBe(240);
  });

  it("advertises a phase for every scored phase", () => {
    expect(PHASE_ORDER).toHaveLength(6);
    expect(Object.keys(PHASE_POINTS).sort()).toEqual([...PHASE_ORDER].sort());
  });
});
