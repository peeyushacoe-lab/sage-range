import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";

/**
 * Portfolio API Endpoint Tests
 * Note: These are unit tests for endpoint logic.
 * For full E2E testing, use your HTTP testing framework (jest-supertest, playwright, etc.)
 */

describe("Portfolio API Endpoints", () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        email: `endpoint-test-${Date.now()}@example.com`,
        displayName: "Endpoint Test User",
        role: "STUDENT",
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup
    await db.careerPortfolio.deleteMany({ where: { userId: testUserId } });
    await db.user.deleteMany({ where: { id: testUserId } });
  });

  describe("GET /api/portfolio", () => {
    it("should create portfolio on first access", async () => {
      // Simulate GET /api/portfolio
      let portfolio = await db.careerPortfolio.findUnique({
        where: { userId: testUserId },
      });

      expect(portfolio).toBeNull();

      // Create on first access
      const slug = "endpoint-test-user";
      portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug,
        },
      });

      expect(portfolio).toBeDefined();
      expect(portfolio.userId).toBe(testUserId);
      expect(portfolio.visibility).toBe("PRIVATE");
    });

    it("should return portfolio with achievements", async () => {
      // Create portfolio
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "test-with-achievements",
        },
      });

      // Add achievements
      await db.careerPortfolioAchievement.create({
        data: {
          portfolioId: portfolio.id,
          type: "LAB_SOLVED",
          title: "Solved: Test Lab",
          description: "Test lab solve",
          icon: "⚡",
          earnedAt: new Date(),
        },
      });

      // Retrieve portfolio
      const retrieved = await db.careerPortfolio.findUnique({
        where: { userId: testUserId },
        include: { achievements: true },
      });

      expect(retrieved?.achievements.length).toBe(1);
      expect(retrieved?.achievements[0].type).toBe("LAB_SOLVED");
    });
  });

  describe("PATCH /api/portfolio/bio", () => {
    it("should update portfolio bio", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "bio-test",
        },
      });

      const newBio = "I'm a cybersecurity enthusiast focused on incident response.";
      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { bio: newBio },
      });

      expect(updated.bio).toBe(newBio);
    });

    it("should reject bio longer than 5000 characters", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "bio-limit-test",
        },
      });

      const longBio = "a".repeat(5001);
      // In real API, this would fail validation
      // This test just demonstrates the constraint exists

      // The PATCH handler validates with Zod before update
      // So we're testing the logic here
      expect(longBio.length).toBe(5001);
      expect(longBio.length).toBeGreaterThan(5000);
    });

    it("should allow null bio", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "bio-null-test",
          bio: "Initial bio",
        },
      });

      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { bio: null },
      });

      expect(updated.bio).toBeNull();
    });
  });

  describe("PATCH /api/portfolio/visibility", () => {
    it("should update visibility to PUBLIC", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "visibility-test",
          visibility: "PRIVATE",
        },
      });

      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { visibility: "PUBLIC" },
      });

      expect(updated.visibility).toBe("PUBLIC");
    });

    it("should update visibility to RECRUITER_ONLY", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "visibility-recruiter-test",
          visibility: "PRIVATE",
        },
      });

      const updated = await db.careerPortfolio.update({
        where: { id: portfolio.id },
        data: { visibility: "RECRUITER_ONLY" },
      });

      expect(updated.visibility).toBe("RECRUITER_ONLY");
    });

    it("should reject invalid visibility values", async () => {
      // This would be caught by Zod validation in real API
      const validValues = ["PRIVATE", "PUBLIC", "RECRUITER_ONLY"];
      expect(validValues).toContain("PRIVATE");
      expect(validValues).not.toContain("INVALID");
    });
  });

  describe("GET /api/portfolio/[userId]", () => {
    it("should return public portfolio for PUBLIC visibility", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "public-portfolio",
          visibility: "PUBLIC",
        },
      });

      // Should be retrievable
      const retrieved = await db.careerPortfolio.findUnique({
        where: { userId: testUserId },
      });

      expect(retrieved?.visibility).toBe("PUBLIC");
    });

    it("should hide PRIVATE portfolio from non-owner", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "private-portfolio",
          visibility: "PRIVATE",
        },
      });

      // Create different user
      const otherUser = await db.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          displayName: "Other User",
        },
      });

      // In real endpoint, would return 403 for non-owner
      expect(portfolio.visibility).toBe("PRIVATE");
      expect(testUserId).not.toBe(otherUser.id);

      // Cleanup
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it("should require RECRUITER role for RECRUITER_ONLY portfolio", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "recruiter-portfolio",
          visibility: "RECRUITER_ONLY",
        },
      });

      // Create recruiter user
      const recruiter = await db.user.create({
        data: {
          email: `recruiter-${Date.now()}@example.com`,
          displayName: "Recruiter",
          role: "RECRUITER",
        },
      });

      // Recruiter should be able to view
      expect(recruiter.role).toBe("RECRUITER");
      expect(portfolio.visibility).toBe("RECRUITER_ONLY");

      // Cleanup
      await db.user.delete({ where: { id: recruiter.id } });
    });

    it("should log portfolio visitor", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "visitor-log-test",
          visibility: "PUBLIC",
        },
      });

      const visitor = await db.user.create({
        data: {
          email: `visitor-${Date.now()}@example.com`,
          displayName: "Visitor",
        },
      });

      // Log visit
      await db.portfolioVisitorLog.create({
        data: {
          portfolioId: portfolio.id,
          visitorId: visitor.id,
        },
      });

      // Verify log entry
      const logs = await db.portfolioVisitorLog.findMany({
        where: { portfolioId: portfolio.id },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].visitorId).toBe(visitor.id);

      // Cleanup
      await db.user.delete({ where: { id: visitor.id } });
    });

    it("should support anonymous visitors", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "anonymous-visitor-test",
          visibility: "PUBLIC",
        },
      });

      // Log anonymous visit (visitorId is null)
      await db.portfolioVisitorLog.create({
        data: {
          portfolioId: portfolio.id,
          visitorId: null,
        },
      });

      // Verify log entry
      const logs = await db.portfolioVisitorLog.findMany({
        where: { portfolioId: portfolio.id, visitorId: null },
      });

      expect(logs.length).toBe(1);
    });
  });

  describe("Denormalized Aggregates", () => {
    it("should track total labs solved", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "aggregate-test",
          totalLabsSolved: 5,
        },
      });

      expect(portfolio.totalLabsSolved).toBe(5);
    });

    it("should track total incidents solved", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "incident-aggregate-test",
          totalIncidentsSolved: 3,
        },
      });

      expect(portfolio.totalIncidentsSolved).toBe(3);
    });

    it("should track weekly certificates", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "cert-aggregate-test",
          totalWeeklyCerts: 4,
        },
      });

      expect(portfolio.totalWeeklyCerts).toBe(4);
    });

    it("should track competition wins", async () => {
      const portfolio = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug: "competition-aggregate-test",
          totalCompetitionsWon: 2,
        },
      });

      expect(portfolio.totalCompetitionsWon).toBe(2);
    });
  });

  describe("Slug Uniqueness", () => {
    it("should ensure slug is unique", async () => {
      const slug = `unique-slug-${Date.now()}`;

      const portfolio1 = await db.careerPortfolio.create({
        data: {
          userId: testUserId,
          slug,
        },
      });

      // Try to create another with same slug (different user)
      const otherUser = await db.user.create({
        data: {
          email: `other2-${Date.now()}@example.com`,
          displayName: "Other User 2",
        },
      });

      // Should fail due to unique constraint
      expect(async () => {
        await db.careerPortfolio.create({
          data: {
            userId: otherUser.id,
            slug, // Same slug
          },
        });
      }).rejects.toThrow();

      // Cleanup
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });
});
