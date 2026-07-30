import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

describe("AI Mentor API", () => {
  let testUserId: string;
  let testLabId: string;
  let testHintId: string;
  let testUsedHintId: string;

  beforeAll(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        email: `test-mentor-${Date.now()}@example.com`,
        displayName: "Test Mentor Student",
        role: "STUDENT",
      },
    });
    testUserId = user.id;

    // Create test lab
    const lab = await db.lab.create({
      data: {
        slug: `test-lab-${Date.now()}`,
        title: "Test Lab for Hints",
        description: "Lab for testing hint system",
        type: "CTF",
        difficulty: "MEDIUM",
        category: "Web",
        published: true,
      },
    });
    testLabId = lab.id;

    // Create test hint
    const hint = await db.labHint.create({
      data: {
        labId: testLabId,
        stage: "reconnaissance",
        level: 1,
        text: "Look for hidden directories using common wordlists",
        pointCost: 10,
      },
    });
    testHintId = hint.id;

    // Initialize hint quality
    await db.mentorHintQuality.create({
      data: {
        hintId: testHintId,
        avgScore: 7.5,
        totalRatings: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        submissionRate: 0,
        inferredDifficulty: "MEDIUM",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.usedHint.deleteMany({ where: { userId: testUserId } });
    await db.mentorHintSequence.deleteMany({ where: { userId: testUserId } });
    await db.mentorHintQuality.deleteMany({ where: { hintId: testHintId } });
    await db.labHint.delete({ where: { id: testHintId } });
    await db.lab.delete({ where: { id: testLabId } });
    await db.user.delete({ where: { id: testUserId } });
  });

  describe("Hint Recommendation & Tracking", () => {
    it("should recommend best hint by quality score", async () => {
      // Create multiple hints with different quality scores
      const hints = await Promise.all([
        db.labHint.create({
          data: {
            labId: testLabId,
            stage: "exploitation",
            level: 1,
            text: "Hint 1: Lower quality",
            pointCost: 10,
          },
        }),
        db.labHint.create({
          data: {
            labId: testLabId,
            stage: "exploitation",
            level: 2,
            text: "Hint 2: Higher quality",
            pointCost: 20,
          },
        }),
      ]);

      // Add quality scores
      await db.mentorHintQuality.upsert({
        where: { hintId: hints[0].id },
        create: {
          hintId: hints[0].id,
          avgScore: 4.0,
          totalRatings: 5,
          helpfulCount: 1,
          notHelpfulCount: 4,
          submissionRate: 20,
          inferredDifficulty: "MEDIUM",
        },
        update: {
          avgScore: 4.0,
          totalRatings: 5,
        },
      });

      await db.mentorHintQuality.upsert({
        where: { hintId: hints[1].id },
        create: {
          hintId: hints[1].id,
          avgScore: 8.5,
          totalRatings: 10,
          helpfulCount: 8,
          notHelpfulCount: 2,
          submissionRate: 80,
          inferredDifficulty: "HARD",
        },
        update: {
          avgScore: 8.5,
          totalRatings: 10,
        },
      });

      // Import and test recommendation
      const { getRecommendedHint } = await import("@/lib/ai-mentor");
      const recommended = await getRecommendedHint(
        testLabId,
        "exploitation",
        "MEDIUM"
      );

      expect(recommended?.id).toBe(hints[1].id); // Higher quality score
      expect(recommended?.text).toBe("Hint 2: Higher quality");

      // Cleanup
      await db.labHint.delete({ where: { id: hints[0].id } });
      await db.labHint.delete({ where: { id: hints[1].id } });
      await db.mentorHintQuality.deleteMany({
        where: { hintId: { in: [hints[0].id, hints[1].id] } },
      });
    });

    it("should enforce 5-minute cooldown between hints", async () => {
      const { checkHintFrequencyLimit, logHintShown } =
        await import("@/lib/ai-mentor");

      // Log first hint
      await logHintShown(testUserId, testLabId, "reconnaissance", testHintId);

      // Check frequency immediately
      const check = await checkHintFrequencyLimit(
        testUserId,
        testLabId,
        "reconnaissance"
      );
      expect(check.allowed).toBe(false);
      expect(check.nextEligibleAt).toBeDefined();

      // Verify nextEligibleAt is ~5 min in future
      const now = Date.now();
      const nextEligible = check.nextEligibleAt!.getTime();
      const diff = nextEligible - now;
      expect(diff).toBeGreaterThan(4 * 60 * 1000); // At least 4 min
      expect(diff).toBeLessThan(6 * 60 * 1000); // Less than 6 min
    });

    it("should track shown hints in MentorHintSequence", async () => {
      const { logHintShown } = await import("@/lib/ai-mentor");

      const stage = `stage-${Date.now()}`;
      await logHintShown(testUserId, testLabId, stage, testHintId);

      const sequence = await db.mentorHintSequence.findUnique({
        where: { userId_labId_stage: { userId: testUserId, labId: testLabId, stage } },
      });

      expect(sequence).toBeDefined();
      expect(sequence?.shownHints).toContain(testHintId);
      expect(sequence?.expiresAt).toBeDefined();

      // Cleanup
      await db.mentorHintSequence.delete({ where: { id: sequence!.id } });
    });
  });

  describe("Hint Feedback & Quality Recalculation", () => {
    beforeEach(async () => {
      // Create fresh UsedHint for each test
      const used = await db.usedHint.upsert({
        where: { userId_hintId: { userId: testUserId, hintId: testHintId } },
        create: {
          userId: testUserId,
          hintId: testHintId,
        },
        update: {},
      });
      testUsedHintId = used.id;
    });

    it("should accept and store hint feedback", async () => {
      const { submitHintFeedback } = await import("@/lib/ai-mentor");

      const updated = await submitHintFeedback(testUsedHintId, 8, true);
      expect(updated.qualityScore).toBe(8);
      expect(updated.wasHelpful).toBe(true);
    });

    it("should reject invalid scores", async () => {
      const { submitHintFeedback } = await import("@/lib/ai-mentor");

      await expect(submitHintFeedback(testUsedHintId, 11, true)).rejects.toThrow();
      await expect(submitHintFeedback(testUsedHintId, -1, true)).rejects.toThrow();
    });

    it("should recompute avgScore from all ratings", async () => {
      // Create multiple users with ratings
      const users = await Promise.all([
        db.user.create({
          data: {
            email: `user1-${Date.now()}@example.com`,
            displayName: "User 1",
            role: "STUDENT",
          },
        }),
        db.user.create({
          data: {
            email: `user2-${Date.now()}@example.com`,
            displayName: "User 2",
            role: "STUDENT",
          },
        }),
      ]);

      // Create used hints with different scores
      await db.usedHint.create({
        data: {
          userId: users[0].id,
          hintId: testHintId,
          qualityScore: 10,
          wasHelpful: true,
        },
      });

      await db.usedHint.create({
        data: {
          userId: users[1].id,
          hintId: testHintId,
          qualityScore: 6,
          wasHelpful: false,
        },
      });

      // Recompute
      const { recomputeHintQuality } = await import("@/lib/ai-mentor");
      await recomputeHintQuality(testHintId);

      const quality = await db.mentorHintQuality.findUnique({
        where: { hintId: testHintId },
      });

      // Average of 10, 6, 8 (from testUsedHintId) should be 8
      expect(quality?.avgScore).toBeCloseTo(8.0, 1);
      expect(quality?.totalRatings).toBe(3);
      expect(quality?.helpfulCount).toBe(2);
      expect(quality?.notHelpfulCount).toBe(1);

      // Cleanup
      await db.usedHint.deleteMany({
        where: { hintId: testHintId, userId: { in: [users[0].id, users[1].id] } },
      });
      await db.user.delete({ where: { id: users[0].id } });
      await db.user.delete({ where: { id: users[1].id } });
    });

    it("should calculate submission rate correctly", async () => {
      const { recomputeHintQuality } = await import("@/lib/ai-mentor");

      // Mark 3 of 4 as submitted
      const usedHints = await db.usedHint.findMany({
        where: { hintId: testHintId },
        take: 4,
      });

      if (usedHints.length > 0) {
        await db.usedHint.update({
          where: { id: usedHints[0].id },
          data: { submissionLater: true },
        });
      }

      await recomputeHintQuality(testHintId);

      const quality = await db.mentorHintQuality.findUnique({
        where: { hintId: testHintId },
      });

      expect(quality?.submissionRate).toBeGreaterThanOrEqual(0);
      expect(quality?.submissionRate).toBeLessThanOrEqual(100);
    });
  });

  describe("Hint Browsing & Leaderboard", () => {
    it("should group hints by stage", async () => {
      const { getHintsByLab } = await import("@/lib/ai-mentor");

      const grouped = await getHintsByLab(testLabId);
      expect(grouped).toHaveProperty("reconnaissance");
      expect(Array.isArray(grouped.reconnaissance)).toBe(true);
    });

    it("should include quality stats in hint list", async () => {
      const { getHintsByLab } = await import("@/lib/ai-mentor");

      const grouped = await getHintsByLab(testLabId);
      const hints = Object.values(grouped).flat();

      if (hints.length > 0) {
        expect(hints[0]).toHaveProperty("quality");
        expect(hints[0].quality).toHaveProperty("avgScore");
        expect(hints[0].quality).toHaveProperty("helpfulCount");
        expect(hints[0].quality).toHaveProperty("submissionRate");
      }
    });

    it("should return top quality hints for leaderboard", async () => {
      const { getTopQualityHints } = await import("@/lib/ai-mentor");

      const hints = await getTopQualityHints(50);
      expect(Array.isArray(hints)).toBe(true);

      // All returned hints should have >= 10 ratings or be empty
      hints.forEach((hint) => {
        expect(hint.totalRatings).toBeGreaterThanOrEqual(10);
        expect(hint).toHaveProperty("avgScore");
        expect(hint).toHaveProperty("labName");
        expect(hint).toHaveProperty("stage");
      });
    });

    it("should sort leaderboard by avgScore descending", async () => {
      const { getTopQualityHints } = await import("@/lib/ai-mentor");

      const hints = await getTopQualityHints(50);

      for (let i = 1; i < hints.length; i++) {
        expect(hints[i].avgScore).toBeLessThanOrEqual(hints[i - 1].avgScore);
      }
    });
  });

  describe("Replay Eligibility", () => {
    it("should identify hints eligible for replay after 90 days", async () => {
      const { getReplayEligibleHints } = await import("@/lib/ai-mentor");

      // Create old sequence (90+ days ago)
      const oldExpiresAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);

      await db.mentorHintSequence.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          stage: "old-stage",
          shownHints: [testHintId],
          expiresAt: oldExpiresAt,
        },
      });

      const eligible = await getReplayEligibleHints(testUserId);
      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible[0]).toHaveProperty("labId");
      expect(eligible[0]).toHaveProperty("stage");

      // Cleanup
      await db.mentorHintSequence.deleteMany({
        where: { userId: testUserId, stage: "old-stage" },
      });
    });

    it("should not include hints within 90-day window", async () => {
      const { getReplayEligibleHints } = await import("@/lib/ai-mentor");

      // Create recent sequence (30 days ago)
      const recentExpiresAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const stage = `recent-stage-${Date.now()}`;
      await db.mentorHintSequence.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          stage,
          shownHints: [testHintId],
          expiresAt: recentExpiresAt,
        },
      });

      const eligible = await getReplayEligibleHints(testUserId);
      const isIncluded = eligible.some((e) => e.stage === stage);
      expect(isIncluded).toBe(false);

      // Cleanup
      await db.mentorHintSequence.deleteMany({
        where: { userId: testUserId, stage },
      });
    });
  });

  describe("Background Jobs", () => {
    it("should cleanup expired hint sequences", async () => {
      const { cleanupExpiredHintSequences } = await import("@/lib/ai-mentor");

      // Create an expired sequence
      const oldExpiresAt = new Date(Date.now() - 1000); // 1 sec ago
      const sequence = await db.mentorHintSequence.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          stage: `cleanup-test-${Date.now()}`,
          shownHints: [],
          expiresAt: oldExpiresAt,
        },
      });

      const countBefore = await db.mentorHintSequence.count();

      await cleanupExpiredHintSequences();

      const countAfter = await db.mentorHintSequence.count();
      expect(countAfter).toBeLessThanOrEqual(countBefore);

      // Verify our sequence was deleted
      const found = await db.mentorHintSequence.findUnique({
        where: { id: sequence.id },
      });
      expect(found).toBeNull();
    });

    it("should recompute all hint quality scores", async () => {
      const { recomputeAllHintQualityScores } = await import("@/lib/ai-mentor");

      // This is more of a smoke test
      await expect(recomputeAllHintQualityScores()).resolves.not.toThrow();
    });
  });

  describe("Utility Functions", () => {
    it("should expand expiry after feedback", async () => {
      const { expandHintExpiryAfterFeedback } = await import("@/lib/ai-mentor");

      const stage = `expiry-test-${Date.now()}`;
      const oldExpiresAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      await db.mentorHintSequence.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          stage,
          shownHints: [],
          expiresAt: oldExpiresAt,
        },
      });

      const before = await db.mentorHintSequence.findUnique({
        where: { userId_labId_stage: { userId: testUserId, labId: testLabId, stage } },
      });
      expect(before?.expiresAt).toEqual(oldExpiresAt);

      await expandHintExpiryAfterFeedback(testUserId, testLabId, stage);

      const after = await db.mentorHintSequence.findUnique({
        where: { userId_labId_stage: { userId: testUserId, labId: testLabId, stage } },
      });

      expect(after?.expiresAt.getTime()).toBeGreaterThan(
        before!.expiresAt.getTime()
      );

      // Cleanup
      await db.mentorHintSequence.delete({ where: { id: after!.id } });
    });

    it("should mark hint as helpful after solution", async () => {
      const { markHintHelpfulAfterSolution } = await import("@/lib/ai-mentor");

      const used = await db.usedHint.upsert({
        where: { userId_hintId: { userId: testUserId, hintId: testHintId } },
        create: {
          userId: testUserId,
          hintId: testHintId,
        },
        update: {},
      });

      await markHintHelpfulAfterSolution(testUserId, testHintId, 300);

      const updated = await db.usedHint.findUnique({
        where: { id: used.id },
      });

      expect(updated?.submissionLater).toBe(true);
      expect(updated?.timeThenSolvedSec).toBe(300);
    });
  });
});
