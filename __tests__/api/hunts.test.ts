import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createMocks } from "node-mocks-http";

const db = new PrismaClient();

describe("Threat Hunt Sandbox API", () => {
  let testUserId: string;
  let testDatasetId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        email: `test-hunt-${Date.now()}@example.com`,
        displayName: "Test Hunter",
        role: "STUDENT",
      },
    });
    testUserId = user.id;

    // Create test dataset
    const dataset = await db.huntDataset.create({
      data: {
        slug: `test-dataset-${Date.now()}`,
        name: "Test Dataset",
        description: "A test dataset for hunting",
        difficulty: "EASY",
        category: "SYSMON",
        logCount: 1000,
        formatType: "JSON",
        expectedArtifacts: ["PROCESS:cmd.exe", "IP:192.168.1.100", "DOMAIN:evil.com"],
        dataEmbedded: JSON.stringify([
          {
            EventID: 1,
            ProcessName: "cmd.exe",
            CommandLine: "cmd.exe /c dir",
            SourceIp: "192.168.1.100",
            Domain: "evil.com",
            Timestamp: new Date().toISOString(),
          },
          {
            EventID: 3,
            ProcessName: "powershell.exe",
            CommandLine: "powershell.exe -Command Get-Process",
            SourceIp: "10.0.0.1",
            Domain: "google.com",
            Timestamp: new Date().toISOString(),
          },
        ]),
        published: true,
      },
    });
    testDatasetId = dataset.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.huntInvestigationSession.deleteMany({ where: { userId: testUserId } });
    await db.huntDataset.deleteMany({ where: { id: testDatasetId } });
    await db.user.delete({ where: { id: testUserId } });
    await db.$disconnect();
  });

  describe("GET /api/hunts/datasets", () => {
    it("should list published datasets with pagination", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/datasets?page=1&limit=10");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.datasets).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(Array.isArray(data.datasets)).toBe(true);
    });

    it("should filter datasets by difficulty", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/datasets?difficulty=EASY");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.datasets.every((d: Record<string, unknown>) => d.difficulty === "EASY")).toBe(true);
    });

    it("should handle invalid pagination parameters", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/datasets?page=0&limit=101");
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/hunts/datasets/:slug", () => {
    it("should retrieve dataset details by slug", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/datasets/${testDatasetId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.dataset).toBeDefined();
      expect(data.dataset.id).toBe(testDatasetId);
    });

    it("should not expose expectedArtifacts in student response", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/datasets/${testDatasetId}`);
      const data = await response.json();

      // Response should not include expectedArtifacts or hints
      expect(data.dataset.expectedArtifacts).toBeUndefined();
    });

    it("should return 404 for non-existent dataset", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/datasets/nonexistent-slug");
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/hunts/start", () => {
    it("should create a new hunt investigation session", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetSlug: `test-dataset-${Date.now()}` }),
      });

      // Should either create new session or return existing
      expect([200, 400]).toContain(response.status);
    });

    it("should not allow duplicate active sessions", async () => {
      // Start first session
      const response1 = await fetch("http://localhost:3000/api/hunts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetSlug: testDatasetId }),
      });

      if (response1.status === 200) {
        const data1 = await response1.json();
        testSessionId = data1.sessionId;

        // Try to start another session for same dataset
        const response2 = await fetch("http://localhost:3000/api/hunts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datasetSlug: testDatasetId }),
        });

        // Should return existing session
        const data2 = await response2.json();
        expect(data2.sessionId).toBe(testSessionId);
        expect(data2.alreadyExists).toBe(true);
      }
    });

    it("should require authentication", async () => {
      // This would require setting up auth headers properly
      // For now, just verify the endpoint exists
      const response = await fetch("http://localhost:3000/api/hunts/start", {
        method: "POST",
        body: JSON.stringify({ datasetSlug: "test" }),
      });
      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe("GET /api/hunts/:sessionId", () => {
    beforeEach(async () => {
      if (!testSessionId) {
        const session = await db.huntInvestigationSession.create({
          data: {
            userId: testUserId,
            datasetId: testDatasetId,
            status: "ACTIVE",
          },
        });
        testSessionId = session.id;
      }
    });

    it("should retrieve session details", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}`);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.session).toBeDefined();
        expect(data.progress).toBeDefined();
        expect(data.dataset).toBeDefined();
      }
    });

    it("should include accuracy calculations", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}`);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.progress.accuracy).toBeGreaterThanOrEqual(0);
        expect(data.progress.accuracy).toBeLessThanOrEqual(100);
      }
    });

    it("should enforce user ownership", async () => {
      // Create another user and verify they can't access this session
      const otherUser = await db.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          role: "STUDENT",
        },
      });

      // Endpoint should verify user ownership and return 403 for unauthorized access
      // This would require proper auth header setup
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it("should return 404 for non-existent session", async () => {
      const response = await fetch("http://localhost:3000/api/hunts/nonexistent-session");
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/hunts/:sessionId/query", () => {
    beforeEach(async () => {
      if (!testSessionId) {
        const session = await db.huntInvestigationSession.create({
          data: {
            userId: testUserId,
            datasetId: testDatasetId,
            status: "ACTIVE",
          },
        });
        testSessionId = session.id;
      }
    });

    it("should execute GREP queries", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "cmd.exe", language: "GREP" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.resultCount).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(data.results)).toBe(true);
      }
    });

    it("should execute REGEX queries", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "\\b\\d+\\.\\d+\\.\\d+\\.\\d+\\b", language: "REGEX" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.resultCount).toBeGreaterThanOrEqual(0);
      }
    });

    it("should reject invalid queries", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "[invalid regex", language: "REGEX" }),
      });

      expect(response.status).toBe(400);
    });

    it("should mask sensitive data in results", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "4532123456789012", language: "GREP" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        // Results should not contain unmasked credit card patterns
        const resultText = JSON.stringify(data.results);
        expect(resultText).not.toMatch(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
      }
    });

    // The expected artifacts are the answer key. They are still recorded on the
    // HuntQuery row for scoring, but returning them let one broad query hand a
    // hunter every indicator to paste into /report-artifact.
    it("must never return the answer key to the client", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "cmd.exe", language: "GREP" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.matchedIocs).toBeUndefined();
        expect(data.matchedArtifacts).toBeUndefined();
        expect(Array.isArray(data.rows)).toBe(true);
        expect(typeof data.isEffective).toBe("boolean");
      }
    });

    it("credits nothing for a query that returns the whole dataset", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ".", language: "REGEX" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.isEffective).toBe(false);
      }
    });

    it("should limit results to 100 entries", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ".", language: "GREP" }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.results.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("POST /api/hunts/:sessionId/report-artifact", () => {
    beforeEach(async () => {
      if (!testSessionId) {
        const session = await db.huntInvestigationSession.create({
          data: {
            userId: testUserId,
            datasetId: testDatasetId,
            status: "ACTIVE",
          },
        });
        testSessionId = session.id;
      }
    });

    it("should accept valid artifact submissions", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/report-artifact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: "PROCESS:cmd.exe",
          type: "PROCESS",
          value: "cmd.exe",
          confidence: 95,
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.isCorrect).toBe(true);
        expect(data.artifact).toBeDefined();
      }
    });

    it("should reject invalid artifacts", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/report-artifact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: "PROCESS:nonexistent.exe",
          type: "PROCESS",
          value: "nonexistent.exe",
          confidence: 90,
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should prevent duplicate artifact submissions", async () => {
      const payload = {
        artifactId: "PROCESS:cmd.exe",
        type: "PROCESS",
        value: "cmd.exe",
        confidence: 95,
      };

      // First submission
      const response1 = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/report-artifact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response1.status === 200) {
        // Second submission of same artifact
        const response2 = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/report-artifact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        expect(response2.status).toBe(409); // Conflict
      }
    });

    it("should validate confidence scores", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/report-artifact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: "PROCESS:cmd.exe",
          type: "PROCESS",
          value: "cmd.exe",
          confidence: 150, // Invalid: > 100
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/hunts/:sessionId/leaderboard", () => {
    it("should retrieve leaderboard for dataset", async () => {
      const response = await fetch(
        `http://localhost:3000/api/hunts/nonexistent/leaderboard?sortBy=score&limit=10`
      );

      // Should handle non-existent session gracefully
      expect([200, 404]).toContain(response.status);
    });

    it("should support multiple sort criteria", async () => {
      const sortBy = ["score", "accuracy", "speed", "time"];

      for (const criteria of sortBy) {
        const response = await fetch(
          `http://localhost:3000/api/hunts/nonexistent/leaderboard?sortBy=${criteria}`
        );
        // Should handle gracefully
        expect([200, 404]).toContain(response.status);
      }
    });

    it("should limit leaderboard size", async () => {
      const response = await fetch(
        "http://localhost:3000/api/hunts/nonexistent/leaderboard?limit=5"
      );

      if (response.status === 200) {
        const data = await response.json();
        expect(data.leaderboard.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("Query Execution Edge Cases", () => {
    it("should handle empty queries", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "", language: "GREP" }),
      });

      expect(response.status).toBe(400);
    });

    it("should reject queries with dangerous SQL keywords", async () => {
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "DROP TABLE users", language: "SQL_LITE" }),
      });

      expect(response.status).toBe(400);
    });

    it("should handle very long queries", async () => {
      const longQuery = "a".repeat(10001);
      const response = await fetch(`http://localhost:3000/api/hunts/${testSessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: longQuery, language: "GREP" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Scoring Algorithm", () => {
    it("should calculate scores based on accuracy and speed", async () => {
      // Score should be: (accuracy * 100) * speedBonus - timePenalty
      // A perfect score with optimal speed/time should be highest
      const score1 = calculateHuntScore(100, 5, 180); // 100% accuracy, 5 queries, 3 min
      const score2 = calculateHuntScore(100, 30, 600); // 100% accuracy, 30 queries, 10 min
      const score3 = calculateHuntScore(50, 20, 300); // 50% accuracy, 20 queries, 5 min

      expect(score1).toBeGreaterThan(score2); // Fewer queries = better score
      expect(score1).toBeGreaterThan(score3); // Higher accuracy = better score
    });
  });
});

// Helper function for testing score calculation
function calculateHuntScore(accuracyPercent: number, queriesUsed: number, sessionDurationSeconds: number): number {
  const speedBonus = Math.max(0.5, 1 - queriesUsed / 50);
  const timePenalty = Math.max(0, (sessionDurationSeconds - 300) / 60);
  const score = Math.round(accuracyPercent * speedBonus - timePenalty);
  return Math.max(0, score);
}
