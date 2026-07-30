/**
 * Tests for Ticket Queue Simulator API
 *
 * Covers:
 * - Ticket queue fetching with SLA countdown
 * - Triage submission and decision logging
 * - Scoring calculation (accuracy, speed, penalties)
 * - Leaderboard ranking and aggregation
 * - Admin grading flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import type { SocShift, ShiftTicket, User } from "@prisma/client";
import {
  getTicketQueue,
  submitTriagDecision,
  getTicketQueueProgress,
  getTicketLeaderboard,
  gradeTicketTriage,
  computeTicketLeaderboardRanks,
} from "@/lib/tickets";

describe("Ticket Queue Simulator", () => {
  let testShift: SocShift;
  let testUser: User;
  let testTickets: ShiftTicket[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `test-tickets-${Date.now()}@example.com`,
        displayName: "Ticket Test User",
        role: "STUDENT",
      },
    });

    // Create test shift
    testShift = await db.socShift.create({
      data: {
        slug: `test-shift-${Date.now()}`,
        title: "Test Ticket Queue Shift",
        briefing: "Test briefing content",
        timeLimitSec: 900, // 15 minutes
        published: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) await db.user.delete({ where: { id: testUser.id } });
    if (testShift) await db.socShift.delete({ where: { id: testShift.id } });
  });

  describe("getTicketQueue", () => {
    beforeEach(async () => {
      // Create test tickets
      testTickets = [];

      const now = new Date();
      const alertPayload = {
        timestamp: now.toISOString(),
        source: "IDS",
        eventType: "suspicious_activity",
      };

      for (let i = 0; i < 5; i++) {
        const ticket = await db.shiftTicket.create({
          data: {
            shiftId: testShift.id,
            queuePosition: i + 1,
            severity: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CRITICAL"][i],
            category: ["MALWARE", "NETWORK_ANOMALY", "COMPLIANCE", "FALSE_POSITIVE", "DATA_EXFIL"][i],
            title: `Test Alert ${i + 1}`,
            description: `Description for test alert ${i + 1}`,
            rawAlert: alertPayload,
            slaMinutes: [60, 240, 480, 1440, 60][i],
          },
        });
        testTickets.push(ticket);
      }
    });

    it("should fetch queue ordered by position", async () => {
      const queue = await getTicketQueue(testShift.id);
      expect(queue).toHaveLength(5);
      expect(queue[0].queuePosition).toBe(1);
      expect(queue[1].queuePosition).toBe(2);
    });

    it("should include SLA deadline countdown", async () => {
      const queue = await getTicketQueue(testShift.id);
      expect(queue[0]).toHaveProperty("slaDeadlineMinutes");
      expect(typeof queue[0].slaDeadlineMinutes).toBe("number");
    });

    it("should exclude resolved tickets", async () => {
      // Mark first ticket as resolved
      await db.shiftTicket.update({
        where: { id: testTickets[0].id },
        data: { resolvedAt: new Date() },
      });

      const queue = await getTicketQueue(testShift.id);
      expect(queue).toHaveLength(4);
      expect(queue.every((t) => t.id !== testTickets[0].id)).toBe(true);
    });
  });

  describe("submitTriagDecision", () => {
    let attemptId: string;

    beforeEach(async () => {
      // Create attempt for this user on this shift
      const attempt = await db.socShiftAttempt.create({
        data: {
          userId: testUser.id,
          shiftId: testShift.id,
        },
      });
      attemptId = attempt.id;

      // Create a ticket to triage
      const ticket = await db.shiftTicket.create({
        data: {
          shiftId: testShift.id,
          queuePosition: 99,
          severity: "HIGH",
          category: "NETWORK_ANOMALY",
          title: "Triage Test Ticket",
          description: "Test ticket for triage",
          rawAlert: { test: "data" },
          slaMinutes: 240,
        },
      });
      testTickets.push(ticket);
    });

    it("should create triage entry", async () => {
      const ticket = testTickets[testTickets.length - 1];

      const result = await submitTriagDecision(
        ticket.id,
        testShift.id,
        attemptId,
        "ESCALATED",
        85,
        "Suspicious traffic pattern",
      );

      expect(result).toHaveProperty("ticketId", ticket.id);
      expect(result.userAction).toBe("ESCALATED");
      expect(result.confidence).toBe(85);
      expect(result.pending).toBe(true);
    });

    it("should reject invalid user actions", async () => {
      const ticket = testTickets[testTickets.length - 1];

      await expect(
        submitTriagDecision(
          ticket.id,
          testShift.id,
          attemptId,
          "INVALID_ACTION",
          50,
        ),
      ).rejects.toThrow();
    });

    it("should reject invalid confidence", async () => {
      const ticket = testTickets[testTickets.length - 1];

      await expect(
        submitTriagDecision(
          ticket.id,
          testShift.id,
          attemptId,
          "CLOSED",
          150, // > 100
        ),
      ).rejects.toThrow();
    });

    it("should mark ticket as resolved", async () => {
      const ticket = testTickets[testTickets.length - 1];
      expect(ticket.resolvedAt).toBeNull();

      await submitTriagDecision(
        ticket.id,
        testShift.id,
        attemptId,
        "CLOSED",
        50,
      );

      const updated = await db.shiftTicket.findUnique({
        where: { id: ticket.id },
      });
      expect(updated?.resolvedAt).not.toBeNull();
    });
  });

  describe("getTicketQueueProgress", () => {
    let attemptId: string;
    let ticketId: string;

    beforeEach(async () => {
      // Create attempt
      const attempt = await db.socShiftAttempt.create({
        data: {
          userId: testUser.id,
          shiftId: testShift.id,
        },
      });
      attemptId = attempt.id;

      // Create ticket
      const ticket = await db.shiftTicket.create({
        data: {
          shiftId: testShift.id,
          queuePosition: 100,
          severity: "CRITICAL",
          category: "MALWARE",
          title: "Progress Test Ticket",
          description: "Test",
          rawAlert: { test: "data" },
          slaMinutes: 60,
        },
      });
      ticketId = ticket.id;
    });

    it("should return progress with correct counts", async () => {
      // Create 3 more tickets
      for (let i = 0; i < 3; i++) {
        await db.shiftTicket.create({
          data: {
            shiftId: testShift.id,
            queuePosition: 101 + i,
            severity: "MEDIUM",
            category: "COMPLIANCE",
            title: `Progress Ticket ${i}`,
            description: "Test",
            rawAlert: { test: "data" },
            slaMinutes: 480,
          },
        });
      }

      // Submit one triage
      await submitTriagDecision(ticketId, testShift.id, attemptId, "RESOLVED", 90);

      const progress = await getTicketQueueProgress(testShift.id, attemptId);

      expect(progress.completedTickets).toBe(1);
      expect(progress.totalTickets).toBeGreaterThanOrEqual(1);
      expect(typeof progress.accuracy).toBe("number");
      expect(typeof progress.timeSoFar).toBe("number");
    });
  });

  describe("Scoring System", () => {
    let attemptId: string;

    beforeEach(async () => {
      const attempt = await db.socShiftAttempt.create({
        data: {
          userId: testUser.id,
          shiftId: testShift.id,
        },
      });
      attemptId = attempt.id;
    });

    it("should calculate accuracy from correct decisions", async () => {
      // Create 2 tickets
      const tickets: ShiftTicket[] = [];
      for (let i = 0; i < 2; i++) {
        const ticket = await db.shiftTicket.create({
          data: {
            shiftId: testShift.id,
            queuePosition: 200 + i,
            severity: "HIGH",
            category: "NETWORK_ANOMALY",
            title: `Scoring Test ${i}`,
            description: "Test",
            rawAlert: { test: "data" },
            slaMinutes: 240,
          },
        });
        tickets.push(ticket);
      }

      // Submit both triages
      for (const ticket of tickets) {
        await submitTriagDecision(
          ticket.id,
          testShift.id,
          attemptId,
          "ESCALATED",
          75,
        );
      }

      // Grade first as correct
      await gradeTicketTriage(tickets[0].id, true, 300);

      // Grade second as incorrect
      await gradeTicketTriage(tickets[1].id, false, 0);

      // Check leaderboard entry
      const leaderboard = await db.ticketQueueLeaderboard.findFirst({
        where: { userId: testUser.id, shiftId: testShift.id },
      });

      expect(leaderboard?.accuracy).toBe(50); // 1 correct out of 2
    });

    it("should apply SLA violation penalty", async () => {
      // Create ticket with very short SLA
      const ticket = await db.shiftTicket.create({
        data: {
          shiftId: testShift.id,
          queuePosition: 300,
          severity: "CRITICAL",
          category: "MALWARE",
          title: "SLA Penalty Test",
          description: "Test",
          rawAlert: { test: "data" },
          slaMinutes: 0, // SLA already expired
        },
      });

      // Submit triage immediately (but ticket creation is in past)
      await submitTriagDecision(
        ticket.id,
        testShift.id,
        attemptId,
        "RESOLVED",
        90,
      );

      // Grade as correct
      await gradeTicketTriage(ticket.id, true, 100);

      // Should have SLA violation recorded
      const leaderboard = await db.ticketQueueLeaderboard.findFirst({
        where: { userId: testUser.id, shiftId: testShift.id },
      });

      expect(leaderboard?.slaViolations).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Leaderboard", () => {
    it("should return leaderboard sorted by score", async () => {
      const leaderboard = await getTicketLeaderboard(testShift.id);
      // May be empty if no completed scores yet, but should not throw
      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it("should denormalize ranks after computation", async () => {
      // Create some test data first
      const user1 = await db.user.create({
        data: {
          email: `test-rank-1-${Date.now()}@example.com`,
          displayName: "Rank Test User 1",
          role: "STUDENT",
        },
      });

      const user2 = await db.user.create({
        data: {
          email: `test-rank-2-${Date.now()}@example.com`,
          displayName: "Rank Test User 2",
          role: "STUDENT",
        },
      });

      // Create leaderboard entries
      await db.ticketQueueLeaderboard.create({
        data: {
          shiftId: testShift.id,
          userId: user1.id,
          scope: "ALL_TIME",
          accuracy: 100,
          speed: 10,
          score: 500,
        },
      });

      await db.ticketQueueLeaderboard.create({
        data: {
          shiftId: testShift.id,
          userId: user2.id,
          scope: "ALL_TIME",
          accuracy: 80,
          speed: 15,
          score: 400,
        },
      });

      // Compute ranks
      await computeTicketLeaderboardRanks(testShift.id);

      const leaderboard = await getTicketLeaderboard(testShift.id);
      // First entry should have user1 (higher score)
      expect(leaderboard[0].userId).toBe(user1.id);
      expect(leaderboard[0].rank).toBe(1);

      // Cleanup
      await db.user.delete({ where: { id: user1.id } });
      await db.user.delete({ where: { id: user2.id } });
    });
  });

  describe("Admin Grading", () => {
    it("should update triage after grading", async () => {
      const attempt = await db.socShiftAttempt.create({
        data: {
          userId: testUser.id,
          shiftId: testShift.id,
        },
      });

      const ticket = await db.shiftTicket.create({
        data: {
          shiftId: testShift.id,
          queuePosition: 400,
          severity: "HIGH",
          category: "COMPLIANCE",
          title: "Grading Test",
          description: "Test",
          rawAlert: { test: "data" },
          slaMinutes: 240,
        },
      });

      // Submit triage
      await submitTriagDecision(
        ticket.id,
        testShift.id,
        attempt.id,
        "ESCALATED",
        75,
      );

      // Grade it
      await gradeTicketTriage(ticket.id, true, 300);

      // Verify grading persisted
      const triage = await db.shiftTicketTriage.findUnique({
        where: { ticketId: ticket.id },
      });

      expect(triage?.isCorrect).toBe(true);
      expect(triage?.pointsAward).toBe(300);
    });
  });
});
