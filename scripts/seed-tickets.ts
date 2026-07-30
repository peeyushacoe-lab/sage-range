/**
 * Seed script: Ticket Queue Simulator test data
 *
 * Generates:
 * - 5 SOC shifts (Mon-Fri)
 * - 15-20 realistic tickets per shift
 * - Sample triage decisions with grades for demo
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Realistic alert payload templates
const ALERT_TEMPLATES = {
  MALWARE: {
    timestamp: "{{ISO_TIMESTAMP}}",
    source: "Endpoint Detection Response",
    eventType: "malware_detected",
    processName: "svchost.exe",
    commandLine: "svchost.exe -k netsvcs",
    parentProcess: "services.exe",
    fileHash: "5d41402abc4b2a76b9719d911017c592",
    fileName: "malware.exe",
    filePath: "C:\\Windows\\System32\\malware.exe",
    threat: "Trojan.Generic",
    severity: "CRITICAL",
  },
  NETWORK_ANOMALY: {
    timestamp: "{{ISO_TIMESTAMP}}",
    source: "IDS/IPS",
    eventType: "suspicious_traffic",
    srcIp: "192.168.1.100",
    dstIp: "203.0.113.42",
    srcPort: 54321,
    dstPort: 443,
    protocol: "TCP",
    bytesTransferred: 1024000,
    packetsCount: 512,
    signature: "ET MALWARE Win32/Generic suspicious traffic pattern",
    riskLevel: "HIGH",
  },
  COMPLIANCE: {
    timestamp: "{{ISO_TIMESTAMP}}",
    source: "Security Information Event Management",
    eventType: "compliance_violation",
    eventCode: "4688",
    userId: "DOMAIN\\user123",
    computerName: "WORKSTATION-01",
    commandLine: "sqlcmd -S servername -U sa",
    action: "Process Creation",
    category: "Privilege Elevation Attempt",
  },
  FALSE_POSITIVE: {
    timestamp: "{{ISO_TIMESTAMP}}",
    source: "Antivirus Engine",
    eventType: "file_scanned",
    fileName: "installer.exe",
    filePath: "C:\\Downloads\\software_installer.exe",
    scanResult: "Suspicious behavior detected (AI heuristics)",
    fileSize: 5242880,
    detectionMethod: "Heuristic analysis",
    confidence: 35,
    action: "Quarantined",
  },
  DATA_EXFIL: {
    timestamp: "{{ISO_TIMESTAMP}}",
    source: "Data Loss Prevention",
    eventType: "suspicious_data_transfer",
    srcUser: "john.doe@company.com",
    transferSize: 2147483648,
    destination: "external-storage.cloud.com",
    fileCount: 1523,
    sensitiveDataDetected: ["SSN", "credit_card_numbers", "employee_pii"],
    encryptionStatus: "Unencrypted",
  },
};

// Alert descriptions for UI
const ALERT_DESCRIPTIONS: Record<string, string> = {
  MALWARE:
    "Malware signature detected on endpoint. Trojan-class threat attempting to establish persistence.",
  NETWORK_ANOMALY:
    "Suspicious network traffic detected. Large data transfer to external IP during off-hours.",
  COMPLIANCE:
    "Privileged operation attempted by standard user account. Potential lateral movement or privilege escalation.",
  FALSE_POSITIVE:
    "Alert triggered by AI-based anomaly detection. Likely benign software installer.",
  DATA_EXFIL:
    "Significant data transfer detected to cloud storage. Possible unauthorized data exfiltration.",
};

const ALERT_CATEGORIES = ["MALWARE", "NETWORK_ANOMALY", "COMPLIANCE", "FALSE_POSITIVE", "DATA_EXFIL"];

async function seedTicketData() {
  console.log("🌱 Seeding Ticket Queue Simulator data...");

  try {
    // Create 5 SOC shifts (Mon-Fri)
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const shifts = [];

    for (let i = 0; i < 5; i++) {
      const shift = await db.socShift.create({
        data: {
          slug: `soc-shift-week-${i + 1}`,
          title: `SOC Shift - ${weekDays[i]}`,
          briefing: `This is a ${weekDays[i]} night shift. You have 45 minutes to triage all alerts and escalate high-priority threats. Focus on accuracy and speed.`,
          timeLimitSec: 2700, // 45 minutes
          published: true,
        },
      });
      shifts.push(shift);
      console.log(`✓ Created shift: ${shift.title}`);
    }

    // Create 15-20 tickets per shift
    let totalTickets = 0;
    for (const shift of shifts) {
      const ticketCount = Math.floor(Math.random() * 6) + 15; // 15-20 tickets

      for (let i = 0; i < ticketCount; i++) {
        const category = ALERT_CATEGORIES[Math.floor(Math.random() * ALERT_CATEGORIES.length)];
        const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
        const severity = severities[Math.floor(Math.random() * severities.length)];

        // Bias towards more medium/low severity
        const severityDist = Math.random();
        const finalSeverity =
          severityDist < 0.1
            ? "CRITICAL"
            : severityDist < 0.3
              ? "HIGH"
              : severityDist < 0.7
                ? "MEDIUM"
                : "LOW";

        const now = new Date();
        const template = ALERT_TEMPLATES[category as keyof typeof ALERT_TEMPLATES];
        const alertPayload = {
          ...template,
          timestamp: now.toISOString(),
        };

        const ticket = await db.shiftTicket.create({
          data: {
            shiftId: shift.id,
            queuePosition: i + 1,
            severity: finalSeverity,
            category,
            title: `${category} - Alert ${i + 1}`,
            description: ALERT_DESCRIPTIONS[category],
            rawAlert: alertPayload,
            slaMinutes:
              finalSeverity === "CRITICAL"
                ? 60
                : finalSeverity === "HIGH"
                  ? 240
                  : finalSeverity === "MEDIUM"
                    ? 480
                    : 1440,
          },
        });

        totalTickets++;
      }

      console.log(
        `✓ Created ${ticketCount} tickets for ${shift.title}`,
      );
    }

    // Create sample user and attempt for demo
    const demoUser = await db.user.create({
      data: {
        email: `demo-analyst-${Date.now()}@example.com`,
        displayName: "Demo SOC Analyst",
        role: "STUDENT",
      },
    });
    console.log(`✓ Created demo user: ${demoUser.displayName}`);

    // Create attempt on first shift
    const firstShift = shifts[0];
    const attempt = await db.socShiftAttempt.create({
      data: {
        userId: demoUser.id,
        shiftId: firstShift.id,
        startedAt: new Date(Date.now() - 900000), // Started 15 min ago
      },
    });
    console.log(`✓ Created demo attempt for first shift`);

    // Create sample triages with some graded submissions
    const tickets = await db.shiftTicket.findMany({
      where: { shiftId: firstShift.id },
      take: 5,
    });

    const userActions = ["CLOSED", "ESCALATED", "RESOLVED", "IGNORED", "MONITOR"];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const userAction = userActions[Math.floor(Math.random() * userActions.length)];
      const confidence = Math.floor(Math.random() * 41) + 60; // 60-100

      const triage = await db.shiftTicketTriage.create({
        data: {
          ticketId: ticket.id,
          attemptId: attempt.id,
          userAction,
          confidence,
          resolution: `Analyzed alert: determined ${userAction.toLowerCase()} action appropriate`,
          triageTime: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
          isCorrect: Math.random() > 0.3 ? true : false, // 70% correct
          pointsAward: Math.random() > 0.3 ? 300 : 50, // 70% full points
        },
      });

      // Mark ticket as resolved
      await db.shiftTicket.update({
        where: { id: ticket.id },
        data: { resolvedAt: new Date() },
      });
    }

    console.log(`✓ Created 5 sample triage decisions`);

    // Create leaderboard entry for demo user
    await db.ticketQueueLeaderboard.create({
      data: {
        shiftId: firstShift.id,
        userId: demoUser.id,
        scope: "ALL_TIME",
        completedAt: new Date(),
        accuracy: 80,
        speed: 75.5,
        slaViolations: 0,
        falsePositives: 1,
        missedCritical: 0,
        score: 1150,
        rank: 1,
        rankUpdatedAt: new Date(),
      },
    });

    console.log(`✓ Created leaderboard entry for demo user`);

    console.log(`\n✅ Successfully seeded ${totalTickets} tickets across ${shifts.length} shifts!`);
    console.log(`📊 Demo user credentials: ${demoUser.email}`);
    console.log(
      `🎯 Sample data ready for testing at: /api/tickets/queue/${firstShift.id}`,
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

seedTicketData().catch((err) => {
  console.error(err);
  process.exit(1);
});
