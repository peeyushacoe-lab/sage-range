import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db";
import { updatePortfolioAggregates } from "@/lib/portfolio-aggregation";

/**
 * Portfolio API Tests
 * Tests for Career Portfolio endpoints and aggregation job
 */

describe("Career Portfolio", () => {
  let testUserId: string;
  let testLabId: string;
  // The slug is generated per run; asserting a literal never matched.
  let testLabSlug: string;

  beforeEach(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        displayName: "Test User",
      },
    });
    testUserId = user.id;

    // Create test lab
    testLabSlug = `test-lab-${Date.now()}`;
    const lab = await db.lab.create({
      data: {
        slug: testLabSlug,
        title: "Test Lab",
        description: "Test lab for portfolio",
        type: "CTF",
        difficulty: "MEDIUM",
        category: "Web Security",
      },
    });
    testLabId = lab.id;
  });

  afterEach(async () => {
    // Cleanup
    await db.careerPortfolio.deleteMany({ where: { userId: testUserId } });
    await db.user.deleteMany({ where: { id: testUserId } });
    await db.lab.deleteMany({ where: { id: testLabId } });
  });

  describe("Portfolio Creation & Slug Generation", () => {
    it("should create portfolio with unique slug on first access", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);

      expect(portfolio).toBeDefined();
      expect(portfolio.userId).toBe(testUserId);
      expect(portfolio.slug).toBe("test-user");
      expect(portfolio.visibility).toBe("PRIVATE");
    });

    it("should handle slug collisions", async () => {
      // Create first portfolio
      const user1 = await db.user.create({
        data: {
          email: `alice-${Date.now()}@example.com`,
          displayName: "Alice Smith",
        },
      });

      const portfolio1 = await updatePortfolioAggregates(user1.id);
      expect(portfolio1.slug).toBe("alice-smith");

      // Create second portfolio with same name
      const user2 = await db.user.create({
        data: {
          email: `alice2-${Date.now()}@example.com`,
          displayName: "Alice Smith",
        },
      });

      const portfolio2 = await updatePortfolioAggregates(user2.id);
      expect(portfolio2.slug).toBe("alice-smith-2");

      // Cleanup
      await db.careerPortfolio.deleteMany({ where: { userId: user1.id } });
      await db.careerPortfolio.deleteMany({ where: { userId: user2.id } });
      await db.user.deleteMany({ where: { id: user1.id } });
      await db.user.deleteMany({ where: { id: user2.id } });
    });

    it("should handle special characters in display name", async () => {
      const user = await db.user.create({
        data: {
          email: `special-${Date.now()}@example.com`,
          displayName: "Bob O'Brien-Jones",
        },
      });

      const portfolio = await updatePortfolioAggregates(user.id);
      expect(portfolio.slug).toMatch(/^bob-obrien-jones/);

      // Cleanup
      await db.careerPortfolio.deleteMany({ where: { userId: user.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    });
  });

  describe("Achievement Tracking", () => {
    it("should add LAB_SOLVED achievement when lab is solved", async () => {
      // Create initial portfolio
      await updatePortfolioAggregates(testUserId);

      // Record lab solve
      const attempt = await db.attempt.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          status: "SOLVED",
          solvedAt: new Date(),
          score: 100,
        },
      });

      // Run aggregation
      const portfolio = await updatePortfolioAggregates(testUserId);

      // Verify achievement was added
      expect(portfolio.totalLabsSolved).toBe(1);

      const achievements = await db.careerPortfolioAchievement.findMany({
        where: { portfolioId: portfolio.id },
      });

      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements[0].type).toBe("LAB_SOLVED");
      expect(achievements[0].relatedId).toBe(testLabSlug);

      // Cleanup
      await db.attempt.delete({ where: { id: attempt.id } });
    });

    it("should not duplicate achievements on re-run", async () => {
      // Create portfolio and achievement
      await updatePortfolioAggregates(testUserId);

      const attempt = await db.attempt.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          status: "SOLVED",
          solvedAt: new Date(),
          score: 100,
        },
      });

      await updatePortfolioAggregates(testUserId);

      // Run aggregation again
      const portfolio = await updatePortfolioAggregates(testUserId);

      const achievements = await db.careerPortfolioAchievement.findMany({
        where: { portfolioId: portfolio.id, type: "LAB_SOLVED" },
      });

      // Should have exactly 1, not duplicated
      expect(achievements.length).toBe(1);

      // Cleanup
      await db.attempt.delete({ where: { id: attempt.id } });
    });

    it("should track multiple achievement types", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);

      // Create various achievements
      await db.attempt.create({
        data: {
          userId: testUserId,
          labId: testLabId,
          status: "SOLVED",
          solvedAt: new Date(),
          score: 100,
        },
      });

      // Create competition entry
      const competition = await db.competition.create({
        data: {
          name: "Test Competition",
          slug: `comp-${Date.now()}`,
          description: "Test",
          labSlugs: [],
          startDate: new Date(),
          endDate: new Date(),
        },
      });

      await db.competitionEntry.create({
        data: {
          competitionId: competition.id,
          userId: testUserId,
          completedAt: new Date(),
          score: 500,
        },
      });

      // Run aggregation
      const updated = await updatePortfolioAggregates(testUserId);

      expect(updated.totalLabsSolved).toBe(1);
      expect(updated.totalCompetitionsWon).toBe(1);

      // Cleanup
      await db.competitionEntry.deleteMany({ where: { userId: testUserId } });
      await db.competition.delete({ where: { id: competition.id } });
    });
  });

  describe("MITRE Coverage Heatmap", () => {
    it("should compute MITRE tactic coverage from incidents", async () => {
      // Create company and incident simulation
      const company = await db.companyEnvironment.create({
        data: {
          slug: `company-${Date.now()}`,
          name: "Test Company",
          industry: "TECHNOLOGY",
          description: "Test",
          employeeCount: 100,
        },
      });

      const incident = await db.incidentSimulation.create({
        data: {
          slug: `incident-${Date.now()}`,
          codename: "TEST-001",
          title: "Test Incident",
          companyId: company.id,
          briefing: "Test briefing",
          difficulty: "MEDIUM",
        },
      });

      // Create artifact with tactic
      await db.incidentSimArtifact.create({
        data: {
          simulationId: incident.id,
          type: "EVENT_LOG",
          title: "System logs",
          content: "logs",
          order: 1,
          tactic: "PERSISTENCE",
        },
      });

      // Progress references a task by foreign key, so one has to exist —
      // "dummy" failed the constraint before the assertion was ever reached.
      const taskA = await db.incidentSimTask.create({
        data: {
          simulationId: incident.id,
          order: 1,
          title: "Identify persistence",
          prompt: "Which mechanism was used?",
          answerType: "FREE_TEXT",
          correctAnswer: "scheduled task",
          options: [],
        },
      });

      await db.incidentSimProgress.create({
        data: {
          userId: testUserId,
          simulationId: incident.id,
          taskId: taskA.id,
        },
      });

      // Run aggregation
      const portfolio = await updatePortfolioAggregates(testUserId);

      expect(portfolio.mitreTopTactics).toContain("PERSISTENCE");

      // Check coverage heatmap
      const coverage = await db.careerPortfolioMitreCoverage.findUnique({
        where: { portfolioId: portfolio.id },
      });

      expect(coverage).toBeDefined();
      expect((coverage?.heatmap as Record<string, number>).PERSISTENCE).toBeGreaterThan(0);

      // Cleanup
      await db.incidentSimProgress.deleteMany({ where: { userId: testUserId } });
      await db.incidentSimArtifact.deleteMany({ where: { simulationId: incident.id } });
      await db.incidentSimulation.delete({ where: { id: incident.id } });
      await db.companyEnvironment.delete({ where: { id: company.id } });
    });

    it("should return top 5 tactics", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);

      // Create company and incident
      const company = await db.companyEnvironment.create({
        data: {
          slug: `company-${Date.now()}`,
          name: "Test Company",
          industry: "TECHNOLOGY",
          description: "Test",
          employeeCount: 100,
        },
      });

      const incident = await db.incidentSimulation.create({
        data: {
          slug: `incident-${Date.now()}`,
          codename: "TEST-002",
          title: "Test Incident",
          companyId: company.id,
          briefing: "Test briefing",
          difficulty: "MEDIUM",
        },
      });

      // Create multiple artifacts with different tactics
      const tactics = [
        "INITIAL_ACCESS",
        "PERSISTENCE",
        "PRIVILEGE_ESCALATION",
        "LATERAL_MOVEMENT",
        "EXFILTRATION",
        "COMMAND_AND_CONTROL",
      ];

      for (const tactic of tactics) {
        await db.incidentSimArtifact.create({
          data: {
            simulationId: incident.id,
            type: "EVENT_LOG",
            title: `Artifact for ${tactic}`,
            content: "logs",
            order: 1,
            tactic: tactic as any,
          },
        });
      }

      // Create progress
      const taskB = await db.incidentSimTask.create({
        data: {
          simulationId: incident.id,
          order: 1,
          title: "Identify tactic",
          prompt: "Which tactic does this map to?",
          answerType: "FREE_TEXT",
          correctAnswer: "persistence",
          options: [],
        },
      });

      await db.incidentSimProgress.create({
        data: {
          userId: testUserId,
          simulationId: incident.id,
          taskId: taskB.id,
        },
      });

      // Run aggregation
      const updated = await updatePortfolioAggregates(testUserId);

      expect(updated.mitreTopTactics.length).toBeLessThanOrEqual(5);
      expect(updated.mitreTopTactics.length).toBeGreaterThan(0);

      // Cleanup
      await db.incidentSimProgress.deleteMany({ where: { userId: testUserId } });
      await db.incidentSimArtifact.deleteMany({ where: { simulationId: incident.id } });
      await db.incidentSimulation.delete({ where: { id: incident.id } });
      await db.companyEnvironment.delete({ where: { id: company.id } });
    });
  });

  describe("Visibility & Permissions", () => {
    it("should default to PRIVATE visibility", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);
      expect(portfolio.visibility).toBe("PRIVATE");
    });

    it("should support PUBLIC visibility", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);

      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { visibility: "PUBLIC" },
      });

      expect(updated.visibility).toBe("PUBLIC");
    });

    it("should support RECRUITER_ONLY visibility", async () => {
      const portfolio = await updatePortfolioAggregates(testUserId);

      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { visibility: "RECRUITER_ONLY" },
      });

      expect(updated.visibility).toBe("RECRUITER_ONLY");
    });
  });

  describe("Performance", () => {
    it("should complete aggregation in reasonable time", async () => {
      const startTime = Date.now();
      await updatePortfolioAggregates(testUserId);
      const duration = Date.now() - startTime;

      // Should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
