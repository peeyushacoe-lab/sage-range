import { describe, it, expect } from "vitest";
import { ATTACK_CHAINS, type ChainContext } from "@/content/incident-chains";
import { buildIncidentCatalogue, COMPANY_PAIRINGS } from "@/content/incident-catalogue";

const ctx: ChainContext = {
  company: "Test Org",
  domain: "test-org.uk",
  crownJewel: "primary file share",
  user: "a.tester",
  host: "WKS-TEST-001",
};

describe.each(ATTACK_CHAINS.map((c) => [c.key, c] as const))("chain %s", (_key, chain) => {
  const artifacts = chain.artifacts(ctx);
  const tasks = chain.tasks(ctx);
  const haystack = artifacts.map((a) => a.title + "\n" + a.content).join("\n");

  it("produces artifacts and tasks", () => {
    expect(artifacts.length).toBeGreaterThanOrEqual(3);
    expect(tasks.length).toBeGreaterThanOrEqual(4);
  });

  it("writes a briefing that sets a goal", () => {
    expect(chain.briefing(ctx).length).toBeGreaterThan(120);
  });

  /**
   * The check this file exists for. A free-text answer that appears nowhere in
   * the evidence is unsolvable, and the failure is silent — the incident loads
   * and plays, and every learner simply gets it wrong.
   */
  it("has every extractable free-text answer present in an artifact", () => {
    for (const t of tasks) {
      if (t.answerType !== "FREE_TEXT") continue;
      // Inference questions ask the learner to name a technique they have
      // deduced; printing the answer in the evidence would give it away.
      if (t.inferred) continue;
      expect(
        haystack.toLowerCase().includes(t.correctAnswer.toLowerCase()),
        `${chain.key}: answer "${t.correctAnswer}" for "${t.title}" is not in any artifact`,
      ).toBe(true);
    }
  });

  it("keeps inference questions to a minority, so most work is evidence-led", () => {
    const inferred = tasks.filter((t) => t.inferred).length;
    expect(inferred).toBeLessThan(tasks.length / 2);
  });

  it("gives every radio task options that include its answer", () => {
    for (const t of tasks) {
      if (t.answerType !== "RADIO") continue;
      expect(t.options, `${chain.key}/${t.title} has no options`).toBeDefined();
      expect(t.options!.length, `${chain.key}/${t.title}`).toBeGreaterThanOrEqual(3);
      expect(
        t.options!.includes(t.correctAnswer),
        `${chain.key}/${t.title}: correct answer is not among its options`,
      ).toBe(true);
      expect(new Set(t.options!).size, `${chain.key}/${t.title} has duplicate options`).toBe(
        t.options!.length,
      );
    }
  });

  it("never leaves a free-text task with options, or vice versa", () => {
    for (const t of tasks) {
      if (t.answerType === "FREE_TEXT") {
        expect(t.options ?? [], `${chain.key}/${t.title}`).toHaveLength(0);
      }
    }
  });

  it("gives every task positive points", () => {
    for (const t of tasks) {
      expect(t.points, `${chain.key}/${t.title}`).toBeGreaterThan(0);
    }
  });

  it("has task points that sum to roughly the chain total", () => {
    const sum = tasks.reduce((n, t) => n + t.points, 0);
    // Allowed to differ, but not wildly — the chain figure is what the
    // leaderboard weights, so a large mismatch misprices the incident.
    expect(sum).toBeGreaterThan(chain.points * 0.5);
    expect(sum).toBeLessThanOrEqual(chain.points * 1.5);
  });

  it("gives every artifact meaningful content", () => {
    for (const a of artifacts) {
      expect(a.content.length, `${chain.key}/${a.title}`).toBeGreaterThan(80);
      expect(a.title.length).toBeGreaterThan(5);
    }
  });

  it("maps at least one artifact onto an Evidence Board tactic", () => {
    // Only one per chain is required: a denial-of-service incident honestly
    // lands entirely under IMPACT, and forcing a second tactic would mean
    // mis-tagging evidence to satisfy a test. Breadth is asserted across the
    // whole catalogue instead, which is where it actually matters.
    const tactics = new Set(artifacts.map((a) => a.tactic).filter(Boolean));
    expect(tactics.size).toBeGreaterThanOrEqual(1);
  });

  it("substitutes the company context rather than hardcoding one org", () => {
    const other: ChainContext = { ...ctx, user: "z.other", host: "WKS-OTHER-999" };
    const a = chain.artifacts(ctx).map((x) => x.content).join("");
    const b = chain.artifacts(other).map((x) => x.content).join("");
    // Chains that reference the user must vary; chains that do not are fine.
    if (a.includes(ctx.user)) expect(a).not.toBe(b);
  });
});

describe("incident catalogue", () => {
  const catalogue = buildIncidentCatalogue();

  it("produces at least 40 incidents", () => {
    expect(catalogue.length).toBeGreaterThanOrEqual(40);
  });

  it("has unique slugs", () => {
    const slugs = catalogue.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("references only chains that exist", () => {
    const keys = new Set(ATTACK_CHAINS.map((c) => c.key));
    for (const pairing of COMPANY_PAIRINGS) {
      for (const key of pairing.chains) {
        expect(keys.has(key), `${pairing.slug} references unknown chain "${key}"`).toBe(true);
      }
    }
  });

  it("spreads difficulty rather than clustering", () => {
    const byDifficulty = new Map<string, number>();
    for (const c of catalogue) {
      byDifficulty.set(c.chain.difficulty, (byDifficulty.get(c.chain.difficulty) ?? 0) + 1);
    }
    // Every band represented, so progression is possible.
    expect(byDifficulty.size).toBeGreaterThanOrEqual(3);
    expect(byDifficulty.get("INSANE") ?? 0).toBeGreaterThan(0);
    expect(byDifficulty.get("EASY") ?? 0).toBeGreaterThan(0);
  });

  it("gives each company several distinct incidents", () => {
    for (const pairing of COMPANY_PAIRINGS) {
      const mine = catalogue.filter((c) => c.companySlug === pairing.slug);
      expect(mine.length, pairing.slug).toBeGreaterThanOrEqual(4);
      expect(new Set(mine.map((c) => c.chain.key)).size).toBe(mine.length);
    }
  });

  it("covers most Evidence Board tactics across the catalogue", () => {
    const tactics = new Set<string>();
    for (const c of catalogue) {
      for (const a of c.chain.artifacts(c.context)) {
        if (a.tactic) tactics.add(a.tactic);
      }
    }
    // A learner working through the catalogue should meet nearly every bucket
    // the board can show, or the heatmap stays permanently half-empty.
    expect(tactics.size).toBeGreaterThanOrEqual(5);
  });

  it("titles each incident with its chain and company", () => {
    for (const c of catalogue) {
      expect(c.title).toContain(c.chain.name);
      expect(c.codename).toMatch(/^[A-Z]+-[A-Z]+$/);
    }
  });
});
