import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  getCurrentWeeklyCase,
  getWeeklyCaseById,
  getWeeklyLeaderboard,
  getUserWeeklyProgress,
  ensureWeeklyLeaderboardEntry,
  updateWeeklyLeaderboardEntry,
  computeWeeklyLeaderboardRanks,
  getUserWeeklyCertificate,
  issueWeeklyCertificates,
} from "@/lib/weekly-incidents";
import type { Difficulty } from "@prisma/client";

describe("Weekly Incidents API", () => {
  let testUser: any;
  let testIncident: any;
  let testCase: any;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `test-weekly-${Date.now()}@test.com`,
        role: "STUDENT",
      },
    });

    // Create test incident simulation
    const testCompany = await db.companyEnvironment.create({
      data: {
        name: "Test Company",
        slug: `test-company-${Date.now()}`,
        industry: "TECHNOLOGY",
        employeeCount: 500,
        description: "Test company for weekly incidents",
      },
    });

    testIncident = await db.incidentSimulation.create({
      data: {
        slug: `test-incident-${Date.now()}`,
        codename: "TEST-INC",
        title: "Test Incident",
        companyId: testCompany.id,
        briefing: "Test briefing",
        difficulty: "EASY" as Difficulty,
        estimatedMinutes: 120,
        points: 1000,
        published: true,
      },
    });

    // Create test weekly case
    const now = new Date();
    const monday = new Date(now);
    monday.setUTCDate(monday.getUTCDate() - monday.getUTCDay() + 1);
    monday.setUTCHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 0, 0);

    testCase = await db.weeklyIncidentCase.create({
      data: {
        season: now.getUTCFullYear(),
        weekNumber: Math.ceil(((now.getUTCDate() - now.getUTCDay() + 1) - new Date(now.getUTCFullYear(), 0, 1).getDate()) / 7) + 1,
        weekStartUTC: monday,
        incidentSlug: testIncident.slug,
        difficulty: "EASY" as Difficulty,
        points: 1000,
        releaseTime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Released yesterday
        deadlineTime: sunday,
        published: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.weeklyIncidentLeaderboard.deleteMany({ where: { caseId: testCase.id } });
    await db.weeklyIncidentCase.delete({ where: { id: testCase.id } });
    await db.incidentSimulation.delete({ where: { id: testIncident.id } });
    await db.companyEnvironment.deleteMany({ where: { name: "Test Company" } });
    await db.user.delete({ where: { id: testUser.id } });
  });

  describe("getCurrentWeeklyCase", () => {
    it("should return the current active case", async () => {
      const case_ = await getCurrentWeeklyCase();
      expect(case_).toBeDefined();
      expect(case_?.id).toBe(testCase.id);
      expect(case_?.published).toBe(true);
    });

    it("should return null if no active case", async () => {
      // Archive the test case
      await db.weeklyIncidentCase.update({
        where: { id: testCase.id },
        data: { archivedAt: new Date() },
      });

      const case_ = await getCurrentWeeklyCase();
      expect(case_).toBeNull();

      // Restore it
      await db.weeklyIncidentCase.update({
        where: { id: testCase.id },
        data: { archivedAt: null },
      });
    });
  });

  describe("getUserWeeklyProgress", () => {
    it("should return user progress with leaderboard entry", async () => {
      // Ensure entry exists
      await ensureWeeklyLeaderboardEntry(testUser.id, testCase.id);

      const progress = await getUserWeeklyProgress(testUser.id, testCase.id);

      expect(progress.case?.id).toBe(testCase.id);
      expect(progress.completedAt).toBeNull();
      expect(progress.score).toBe(0);
      expect(progress.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it("should initialize leaderboard entry if not exist", async () => {
      const user2 = await db.user.create({
        data: {
          email: `test-weekly-2-${Date.now()}@test.com`,
          role: "STUDENT",
        },
      });

      await getUserWeeklyProgress(user2.id, testCase.id);

      const entry = await db.weeklyIncidentLeaderboard.findUnique({
        where: { caseId_userId: { caseId: testCase.id, userId: user2.id } },
      });

      expect(entry).toBeDefined();

      // Cleanup
      await db.weeklyIncidentLeaderboard.delete({ where: { id: entry!.id } });
      await db.user.delete({ where: { id: user2.id } });
    });
  });

  describe("updateWeeklyLeaderboardEntry", () => {
    it("should update score and completion status", async () => {
      await ensureWeeklyLeaderboardEntry(testUser.id, testCase.id);

      const completionTime = new Date(testCase.releaseTime.getTime() + 60 * 60 * 1000); // 1 hour after release
      const timeTaken = 60;

      const updated = await updateWeeklyLeaderboardEntry(testUser.id, testCase.id, {
        completedAt: completionTime,
        timeTakenMin: timeTaken,
        evidenceBoardScore: 85,
        reportScore: 90,
        score: 175,
      });

      expect(updated.score).toBe(175);
      expect(updated.completedAt).toBeDefined();
      expect(updated.timeTakenMin).toBe(60);
      expect(updated.evidenceBoardScore).toBe(85);
      expect(updated.reportScore).toBe(90);
    });

    it("should not mark completed if after deadline", async () => {
      const user2 = await db.user.create({
        data: {
          email: `test-weekly-late-${Date.now()}@test.com`,
          role: "STUDENT",
        },
      });

      await ensureWeeklyLeaderboardEntry(user2.id, testCase.id);

      const afterDeadline = new Date(testCase.deadlineTime.getTime() + 24 * 60 * 60 * 1000);

      const updated = await updateWeeklyLeaderboardEntry(user2.id, testCase.id, {
        completedAt: afterDeadline,
        timeTakenMin: 120,
        score: 100,
      });

      expect(updated.completedAt).toBeNull();
      expect(updated.score).toBe(100);

      // Cleanup
      await db.weeklyIncidentLeaderboard.deleteMany({ where: { userId: user2.id } });
      await db.user.delete({ where: { id: user2.id } });
    });
  });

  describe("computeWeeklyLeaderboardRanks", () => {
    it("should rank entries by score then time", async () => {
      // Create multiple test users with different scores
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await db.user.create({
          data: {
            email: `test-rank-${i}-${Date.now()}@test.com`,
            role: "STUDENT",
          },
        });
        users.push(user);

        await ensureWeeklyLeaderboardEntry(user.id, testCase.id);
        await updateWeeklyLeaderboardEntry(user.id, testCase.id, {
          score: 1000 - i * 100,
          timeTakenMin: 30 + i * 10,
          completedAt: new Date(testCase.releaseTime.getTime() + (30 + i * 10) * 60 * 1000),
        });
      }

      const rankCount = await computeWeeklyLeaderboardRanks(testCase.id);
      expect(rankCount).toBeGreaterThan(0);

      // Verify ranks are assigned
      for (let i = 0; i < users.length; i++) {
        const entry = await db.weeklyIncidentLeaderboard.findUnique({
          where: { caseId_userId: { caseId: testCase.id, userId: users[i].id } },
        });
        expect(entry?.rank).toBeDefined();
        expect(entry?.rank).toBeGreaterThan(0);
      }

      // Cleanup
      for (const user of users) {
        await db.weeklyIncidentLeaderboard.deleteMany({ where: { userId: user.id } });
        await db.user.delete({ where: { id: user.id } });
      }
    });
  });

  describe("getWeeklyLeaderboard", () => {
    it("should return top entries with limit", async () => {
      // Create test user and entry
      const user = await db.user.create({
        data: {
          email: `test-leaderboard-${Date.now()}@test.com`,
          role: "STUDENT",
          displayName: "Test User",
        },
      });

      await ensureWeeklyLeaderboardEntry(user.id, testCase.id);
      await updateWeeklyLeaderboardEntry(user.id, testCase.id, {
        score: 950,
        timeTakenMin: 45,
        completedAt: new Date(testCase.releaseTime.getTime() + 45 * 60 * 1000),
      });

      const leaderboard = await getWeeklyLeaderboard(testCase.id, 10);

      expect(leaderboard.length).toBeGreaterThan(0);
      expect(leaderboard[0].user.id).toBeDefined();
      expect(leaderboard[0].score).toBeGreaterThanOrEqual(0);

      // Cleanup
      await db.weeklyIncidentLeaderboard.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    });
  });

  describe("getUserWeeklyCertificate", () => {
    it("should return null if not completed", async () => {
      const result = await getUserWeeklyCertificate(testUser.id, testCase.id);
      expect(result.earned).toBe(false);
      expect(result.certificate).toBeNull();
    });

    it("should return certificate if completed on time", async () => {
      const completionTime = new Date(testCase.releaseTime.getTime() + 60 * 60 * 1000);

      await updateWeeklyLeaderboardEntry(testUser.id, testCase.id, {
        completedAt: completionTime,
        timeTakenMin: 60,
        score: 950,
      });

      // Issue certificate
      await issueWeeklyCertificates(testCase.id);

      const result = await getUserWeeklyCertificate(testUser.id, testCase.id);
      expect(result.earned).toBe(true);
      expect(result.certificate).toBeDefined();
      expect(result.certificate?.certCode).toMatch(/^WIC-\d{4}-W\d{2}-/);
    });
  });
});
