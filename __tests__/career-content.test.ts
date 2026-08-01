import { describe, it, expect } from "vitest";
import { CAREER_ASSESSMENTS } from "@/content/career-assessments";
import {
  CAREER_ROLES,
  CAREER_INTERVIEW_KITS,
  CAREER_JOBS,
} from "@/content/career-library";
import { gradeAssessment } from "@/lib/assessment-grading";

/**
 * Content checks. These failures are all silent: an answer index outside the
 * options list, or a paper with nothing gradeable, produces an assessment that
 * loads and runs but can never be passed.
 */
describe("career assessments", () => {
  it("has unique slugs", () => {
    const slugs = CAREER_ASSESSMENTS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(CAREER_ASSESSMENTS.map((a) => [a.slug, a] as const))(
    "%s is well-formed",
    (_slug, assessment) => {
      const ids = assessment.questions.map((q) => q.id);
      expect(new Set(ids).size, "duplicate question ids").toBe(ids.length);

      for (const q of assessment.questions) {
        if (q.type === "TEXT") {
          expect(q.answer, `${q.id} TEXT must not carry an answer`).toBeUndefined();
          continue;
        }

        expect(q.options, `${q.id} needs options`).toBeDefined();
        const optionCount = q.options!.length;
        expect(optionCount, `${q.id} needs at least two options`).toBeGreaterThanOrEqual(2);

        // The failure this exists to catch: an index pointing past the end of
        // the options array marks every correct answer wrong.
        const indices = Array.isArray(q.answer) ? q.answer : [q.answer];
        for (const i of indices) {
          expect(typeof i, `${q.id} answer must be numeric`).toBe("number");
          expect(i as number, `${q.id} answer out of range`).toBeGreaterThanOrEqual(0);
          expect(i as number, `${q.id} answer out of range`).toBeLessThan(optionCount);
        }

        if (q.type === "SINGLE") {
          expect(Array.isArray(q.answer), `${q.id} SINGLE takes one index`).toBe(false);
        }
        if (q.type === "MULTI") {
          expect(Array.isArray(q.answer), `${q.id} MULTI takes an array`).toBe(true);
          expect((q.answer as number[]).length, `${q.id} MULTI needs an answer`).toBeGreaterThan(0);
          const set = new Set(q.answer as number[]);
          expect(set.size, `${q.id} MULTI has duplicate indices`).toBe(
            (q.answer as number[]).length,
          );
        }
      }
    },
  );

  it.each(CAREER_ASSESSMENTS.map((a) => [a.slug, a] as const))(
    "%s is passable by answering correctly",
    (_slug, assessment) => {
      const responses: Record<string, unknown> = {};
      for (const q of assessment.questions) {
        if (q.type === "TEXT") continue;
        responses[q.id] = q.answer;
      }

      const graded = gradeAssessment(
        assessment.questions.map((q) => ({
          id: q.id,
          type: q.type,
          answer: q.answer,
          points: q.points,
        })),
        responses,
        assessment.passingScore,
      );

      expect(graded.score, "a perfect paper must score 100").toBe(100);
      expect(graded.passed, "a perfect paper must pass").toBe(true);
    },
  );

  it.each(CAREER_ASSESSMENTS.map((a) => [a.slug, a] as const))(
    "%s is failable by answering nothing",
    (_slug, assessment) => {
      const graded = gradeAssessment(
        assessment.questions.map((q) => ({
          id: q.id,
          type: q.type,
          answer: q.answer,
          points: q.points,
        })),
        {},
        assessment.passingScore,
      );
      expect(graded.passed).toBe(false);
    },
  );

  it("has enough auto-gradeable content to reach the pass mark", () => {
    for (const a of CAREER_ASSESSMENTS) {
      const gradeable = a.questions.filter((q) => q.type !== "TEXT");
      // A paper that is mostly free text cannot be auto-passed, so the
      // credential would never issue.
      expect(gradeable.length, `${a.slug} has too few gradeable questions`).toBeGreaterThanOrEqual(3);
    }
  });

  it("sets a sane time limit and pass mark", () => {
    for (const a of CAREER_ASSESSMENTS) {
      expect(a.timeLimitSec, a.slug).toBeGreaterThanOrEqual(600);
      expect(a.passingScore, a.slug).toBeGreaterThan(0);
      expect(a.passingScore, a.slug).toBeLessThanOrEqual(100);
    }
  });
});

describe("career roles", () => {
  it("has unique slugs", () => {
    const slugs = CAREER_ROLES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("states achievable tactic requirements", () => {
    for (const role of CAREER_ROLES) {
      const entries = Object.entries(role.requiredTactics);
      expect(entries.length, `${role.slug} needs requirements`).toBeGreaterThan(0);
      for (const [tactic, need] of entries) {
        expect(need, `${role.slug}/${tactic}`).toBeGreaterThan(0);
        // A requirement nobody can reach makes every learner read as unqualified.
        expect(need, `${role.slug}/${tactic} is unreachably high`).toBeLessThanOrEqual(10);
        expect(tactic).toMatch(/^[A-Z_]+$/);
      }
    }
  });

  it("recommends at least one learning path", () => {
    for (const role of CAREER_ROLES) {
      expect(role.recommendedPathSlugs.length, role.slug).toBeGreaterThan(0);
    }
  });
});

describe("interview kits", () => {
  it("has unique slugs", () => {
    const slugs = CAREER_INTERVIEW_KITS.map((k) => k.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every question a positive weight and ideal points", () => {
    for (const kit of CAREER_INTERVIEW_KITS) {
      const ids = kit.questions.map((q) => q.id);
      expect(new Set(ids).size, `${kit.slug} duplicate ids`).toBe(ids.length);

      for (const q of kit.questions) {
        expect(q.weight, `${kit.slug}/${q.id}`).toBeGreaterThan(0);
        // Ideal points are what the reviewer scores against; without them the
        // kit gives a grader nothing to work from.
        expect(q.idealPoints.length, `${kit.slug}/${q.id}`).toBeGreaterThanOrEqual(3);
        expect(q.prompt.length, `${kit.slug}/${q.id}`).toBeGreaterThan(30);
      }
    }
  });
});

describe("job postings", () => {
  it("has unique slugs", () => {
    const slugs = CAREER_JOBS.map((j) => j.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("quotes a coherent salary band", () => {
    for (const job of CAREER_JOBS) {
      expect(job.salaryMin, job.slug).toBeGreaterThan(0);
      expect(job.salaryMax, job.slug).toBeGreaterThanOrEqual(job.salaryMin);
    }
  });

  it("includes entry-level openings, not only senior ones", () => {
    const junior = CAREER_JOBS.filter((j) => j.seniority === "JUNIOR");
    expect(junior.length).toBeGreaterThanOrEqual(2);
  });

  it("describes the role in more than a sentence", () => {
    for (const job of CAREER_JOBS) {
      expect(job.description.length, job.slug).toBeGreaterThan(80);
      expect(job.tags.length, job.slug).toBeGreaterThan(0);
    }
  });
});
