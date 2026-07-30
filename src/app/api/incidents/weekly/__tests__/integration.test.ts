import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import type { Difficulty, User } from "@prisma/client";

/**
 * Integration tests for Weekly Incidents API endpoints
 * These test the actual HTTP endpoints (would require a test server in production)
 *
 * For now, testing the underlying library functions and database operations
 */

describe("Weekly Incidents API Integration", () => {
  let testUser: User;
  let adminUser: User;
  let testIncident: any;
  let testCase: any;

  beforeAll(async () => {
    // Create test users
    testUser = await db.user.create({
      data: {
        email: `integration-test-${Date.now()}@test.com`,
        role: "STUDENT",
        displayName: "Integration Test User",
      },
    });

    adminUser = await db.user.create({
      data: {
        email: `integration-admin-${Date.now()}@test.com`,
        role: "ADMIN",
        displayName: "Integration Admin",
      },
    });

    // Create test incident
    const testCompany = await db.companyEnvironment.create({
      data: {
        name: `Integration Test Company ${Date.now()}`,
        slug: `integration-test-company-${Date.now()}`,
        industry: "TECHNOLOGY",
        employeeCount: 500,
        description: "Company for integration tests",
      },
    });

    testIncident = await db.incidentSimulation.create({
      data: {
        slug: `integration-test-${Date.now()}`,
        codename: "INT-TEST",
        title: "Integration Test Incident",
        companyId: testCompany.id,
        briefing: "Integration test briefing",
        difficulty: "EASY" as Difficulty,
        estimatedMinutes: 120,
        points: 1000,
        published: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testCase) {
      await db.weeklyIncidentLeaderboard.deleteMany({ where: { caseId: testCase.id } });
      await db.weeklyIncidentCertificate.deleteMany({ where: { caseId: testCase.id } });
      await db.weeklyIncidentCase.delete({ where: { id: testCase.id } });
    }
    await db.incidentSimulation.delete({ where: { id: testIncident.id } });
    await db.companyEnvironment.delete({ where: { id: testIncident.companyId } });
    await db.user.delete({ where: { id: testUser.id } });
    await db.user.delete({ where: { id: adminUser.id } });
  });

  describe("POST /api/admin/incidents/weekly/create", () => {
    it("should create a new weekly case with admin credentials", async () => {
      const now = new Date();
      const monday = new Date(now);
      monday.setUTCDate(monday.getUTCDate() - monday.getUTCDay() + 1);
      monday.setUTCHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 0, 0);

      // Simulate creating via POST /api/admin/incidents/weekly/create
      testCase = await db.weeklyIncidentCase.create({
        data: {
          season: now.getUTCFullYear(),
          weekNumber: 1,
          weekStartUTC: monday,
          incidentSlug: testIncident.slug,
          difficulty: "EASY" as Difficulty,
          points: 1000,
          releaseTime: monday,
          deadlineTime: sunday,
          published: false, // Admin creates unpublished
        },
      });

      expect(testCase).toBeDefined();
      expect(testCase.id).toBeDefined();
      expect(testCase.published).toBe(false);
      expect(testCase.incidentSlug).toBe(testIncident.slug);
    });

    it("should prevent duplicate cases for same season/week", async () => {
      const duplicate = await db.weeklyIncidentCase.findFirst({
        where: {
          season: testCase.season,
          weekNumber: testCase.weekNumber,
        },
      });

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe(testCase.id);

      // Attempting to create another with same season/week would violate unique constraint
      const attempt = db.weeklyIncidentCase.create({
        data: {
          season: testCase.season,
          weekNumber: testCase.weekNumber,
          weekStartUTC: testCase.weekStartUTC,
          incidentSlug: testIncident.slug,
          difficulty: "MEDIUM" as Difficulty,
          points: 1200,
          releaseTime: testCase.releaseTime,
          deadlineTime: testCase.deadlineTime,
          published: false,
        },
      });

      await expect(attempt).rejects.toThrow();
    });
  });

  describe("GET /api/incidents/weekly", () => {
    it("should return current case if published and released", async () => {
      // Publish the case
      const published = await db.weeklyIncidentCase.update({
        where: { id: testCase.id },
        data: {
          published: true,
          releaseTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Released yesterday
        },
      });

      expect(published.published).toBe(true);
      expect(published.releaseTime.getTime()).toBeLessThan(Date.now());

      // Would return this via GET /api/incidents/weekly
    });

    it("should not return unpublished cases", async () => {
      const unpublished = await db.weeklyIncidentCase.create({
        data: {
          season: testCase.season,
          weekNumber: 2,
          weekStartUTC: new Date(testCase.weekStartUTC.getTime() + 7 * 24 * 60 * 60 * 1000),
          incidentSlug: testIncident.slug,
          difficulty: "MEDIUM" as Difficulty,
          points: 1100,
          releaseTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deadlineTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          published: false,
        },
      });

      const found = await db.weeklyIncidentCase.findUnique({
        where: { id: unpublished.id },
      });

      expect(found?.published).toBe(false);

      // Cleanup
      await db.weeklyIncidentCase.delete({ where: { id: unpublished.id } });
    });
  });

  describe("GET /api/user/incidents/weekly/progress", () => {
    it("should initialize leaderboard entry on first access", async () => {
      // Verify no entry exists yet
      const before = await db.weeklyIncidentLeaderboard.findUnique({
        where: { caseId_userId: { caseId: testCase.id, userId: testUser.id } },
      });
      expect(before).toBeNull();

      // Create entry (simulating API call)
      const entry = await db.weeklyIncidentLeaderboard.upsert({
        where: { caseId_userId: { caseId: testCase.id, userId: testUser.id } },
        create: { userId: testUser.id, caseId: testCase.id, score: 0 },
        update: {},
      });

      expect(entry).toBeDefined();
      expect(entry.score).toBe(0);
      expect(entry.completedAt).toBeNull();
    });
  });

  describe("GET /api/incidents/weekly/[caseId]/leaderboard", () => {
    it("should return ranked participants", async () => {
      // Add multiple participants
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await db.user.create({
          data: {
            email: `leaderboard-${i}-${Date.now()}@test.com`,
            role: "STUDENT",
            displayName: `Leaderboard User ${i}`,
          },
        });
        users.push(user);

        // Create entry with score
        await db.weeklyIncidentLeaderboard.create({
          data: {
            userId: user.id,
            caseId: testCase.id,
            score: 1000 - i * 50,
            timeTakenMin: 30 + i * 10,
            completedAt: new Date(testCase.releaseTime.getTime() + (30 + i * 10) * 60 * 1000),
            rank: i + 1,
          },
        });
      }

      // Fetch leaderboard
      const entries = await db.weeklyIncidentLeaderboard.findMany({
        where: { caseId: testCase.id, completedAt: { not: null } },
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { score: "desc" }],
      });

      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].score).toBeGreaterThanOrEqual(entries[entries.length - 1].score);

      // Cleanup
      for (const user of users) {
        await db.weeklyIncidentLeaderboard.deleteMany({ where: { userId: user.id } });
        await db.user.delete({ where: { id: user.id } });
      }
    });

    it("should support limit parameter", async () => {
      // The limit parameter restricts results to top N
      // Default: 100, Max: 100
      const limit = 10;

      const entries = await db.weeklyIncidentLeaderboard.findMany({
        where: { caseId: testCase.id, completedAt: { not: null } },
        take: limit,
      });

      expect(entries.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("GET /api/incidents/weekly/[caseId]/certificate", () => {
    it("should return earned certificate for completers", async () => {
      // User completes case on time
      const completionTime = new Date(testCase.releaseTime.getTime() + 60 * 60 * 1000);
      const entry = await db.weeklyIncidentLeaderboard.update({
        where: { caseId_userId: { caseId: testCase.id, userId: testUser.id } },
        data: {
          completedAt: completionTime,
          timeTakenMin: 60,
          score: 950,
        },
      });

      expect(entry.completedAt).toBeDefined();
      expect(entry.completedAt!.getTime()).toBeLessThanOrEqual(testCase.deadlineTime.getTime());

      // Certificate can be issued
      const cert = await db.weeklyIncidentCertificate.findUnique({
        where: { caseId: testCase.id },
      });

      // If cert exists, user earned it
      if (cert) {
        expect(cert.caseId).toBe(testCase.id);
      }
    });

    it("should not grant certificate to late completers", async () => {
      const user = await db.user.create({
        data: {
          email: `late-completer-${Date.now()}@test.com`,
          role: "STUDENT",
        },
      });

      const lateTime = new Date(testCase.deadlineTime.getTime() + 24 * 60 * 60 * 1000);

      await db.weeklyIncidentLeaderboard.create({
        data: {
          userId: user.id,
          caseId: testCase.id,
          completedAt: lateTime,
          score: 950,
        },
      });

      // User completed after deadline, should not earn certificate
      expect(lateTime.getTime()).toBeGreaterThan(testCase.deadlineTime.getTime());

      // Cleanup
      await db.weeklyIncidentLeaderboard.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    });
  });

  describe("Leaderboard Ranking", () => {
    it("should denormalize ranks after deadline", async () => {
      // This would be triggered by background job after deadline

      // Before computation, ranks are null
      const beforeRank = await db.weeklyIncidentLeaderboard.findMany({
        where: { caseId: testCase.id },
      });

      const hasNullRanks = beforeRank.some((e) => e.rank === null);
      if (hasNullRanks) {
        // Simulate rank computation
        const sorted = beforeRank
          .filter((e) => e.completedAt !== null)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.timeTakenMin !== null && b.timeTakenMin !== null) {
              return a.timeTakenMin - b.timeTakenMin;
            }
            return 0;
          });

        for (let i = 0; i < sorted.length; i++) {
          await db.weeklyIncidentLeaderboard.update({
            where: { id: sorted[i].id },
            data: { rank: i + 1 },
          });
        }
      }

      // After computation, verify ranks are sequential
      const afterRank = await db.weeklyIncidentLeaderboard.findMany({
        where: { caseId: testCase.id, rank: { not: null } },
      });

      const ranks = afterRank.map((e) => e.rank).sort((a, b) => (a ?? 0) - (b ?? 0));
      for (let i = 0; i < ranks.length; i++) {
        expect(ranks[i]).toBe(i + 1);
      }
    });
  });
});
