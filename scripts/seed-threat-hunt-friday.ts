// Seeds "Threat Hunt Friday" — a Competitive Mode built on the Detection
// Validation Engine (see src/lib/detection-engine.ts), themed as a
// large-telemetry hunt: sift through network flow records to find C2
// beaconing hidden among legitimate polling traffic that looks almost
// identical on the wire (a real, well-known detection engineering problem).
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-threat-hunt-friday.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Ev = { id: string; raw: string; fields: Record<string, string>; isMalicious: boolean };

function mkFlow(
  id: string,
  host: string,
  destIp: string,
  destPort: string,
  sni: string,
  bytesOut: string,
  intervalSec: string,
  isMalicious: boolean
): Ev {
  return {
    id,
    raw: `Flow — Host: ${host} | Dest: ${destIp}:${destPort} | SNI: ${sni} | BytesOut/session: ${bytesOut} | Interval: ~${intervalSec}s`,
    fields: { host, destIp, destPort, sni, bytesOut, intervalSec },
    isMalicious,
  };
}

const EVENTS: Ev[] = [
  // ── Malicious: C2 beacon, consistent 60s cadence, 244 bytes/session ──────
  mkFlow("m01", "FIN-WKS-031", "185.220.101.12", "443", "telemetry-sync-01.io", "244", "60", true),
  mkFlow("m02", "OPS-WKS-118", "185.220.101.12", "443", "telemetry-sync-02.io", "244", "60", true),
  mkFlow("m03", "HR-WKS-062", "91.203.44.9", "443", "telemetry-sync-03.io", "244", "60", true),
  mkFlow("m04", "REC-WKS-214", "91.203.44.9", "443", "telemetry-sync-04.io", "244", "60", true),
  mkFlow("m05", "ADM-WKS-340", "185.220.101.12", "443", "telemetry-sync-05.io", "244", "60", true),
  mkFlow("m06", "CLN-WKS-447", "91.203.44.9", "443", "telemetry-sync-06.io", "244", "60", true),

  // ── False-positive traps ─────────────────────────────────────────────────
  // Legit auto-updater: identical port/interval/byte profile — genuinely
  // indistinguishable from the beacon using only these fields, same as a
  // real detection engineer would face.
  mkFlow("fp01", "FIN-WKS-090", "20.42.65.92", "443", "updates.corpvendor.com", "244", "60", false),
  // Internal monitoring heartbeat: different port.
  mkFlow("fp02", "IT-MON-01", "10.10.4.4", "8443", "monitoring.internal.corp", "180", "60", false),
  // Legit analytics vendor whose domain also contains "sync": different byte/interval profile.
  mkFlow("fp03", "OPS-WKS-155", "34.120.10.5", "443", "cloud-sync-vendor.com", "900", "300", false),

  // ── True negatives: unrelated benign traffic ────────────────────────────
  mkFlow("tn01", "FIN-WKS-031", "8.8.8.8", "53", "-", "64", "irregular", false),
  mkFlow("tn02", "OPS-WKS-118", "162.159.200.1", "123", "ntp.pool.example", "48", "1024", false),
  mkFlow("tn03", "HR-WKS-062", "142.250.72.14", "443", "www.google.com", "182000", "irregular", false),
  mkFlow("tn04", "REC-WKS-214", "13.107.42.14", "443", "outlook.office365.com", "45000", "irregular", false),
  mkFlow("tn05", "ADM-WKS-340", "104.16.132.229", "443", "cdn.streamingservice.example", "2400000", "irregular", false),
  mkFlow("tn06", "CLN-WKS-447", "40.90.4.1", "443", "login.microsoftonline.com", "5200", "irregular", false),
  mkFlow("tn07", "FIN-WKS-090", "17.253.5.203", "443", "gateway.icloud.example", "3100", "irregular", false),
  mkFlow("tn08", "IT-MON-01", "10.10.4.20", "22", "-", "1200", "irregular", false),
  mkFlow("tn09", "OPS-WKS-155", "52.96.4.10", "443", "outlook.office365.com", "38000", "irregular", false),
  mkFlow("tn10", "FIN-WKS-031", "151.101.1.140", "443", "www.wikipedia.org", "62000", "irregular", false),
  mkFlow("tn11", "HR-WKS-062", "199.232.4.133", "443", "raw.githubusercontent.com", "8200", "irregular", false),
];

async function main() {
  await db.detectionChallenge.upsert({
    where: { slug: "threat-hunt-friday-beacon-hunt" },
    update: {
      title: "Threat Hunt Friday: Find the Beacon",
      description:
        "20 network flow records were pulled from a week of telemetry across the fleet. Somewhere in here is a C2 " +
        "beacon holding a steady cadence — and at least one legitimate service that looks almost identical on the " +
        "wire. Build a rule that separates them using host, destIp, destPort, sni, bytesOut, and intervalSec. You " +
        "need 80% precision and 80% recall to pass — this one has an irreducible false positive baked in, just " +
        "like a real hunt would.",
      difficulty: "INSANE",
      points: 420,
      published: true,
      events: EVENTS,
    },
    create: {
      slug: "threat-hunt-friday-beacon-hunt",
      title: "Threat Hunt Friday: Find the Beacon",
      description:
        "20 network flow records were pulled from a week of telemetry across the fleet. Somewhere in here is a C2 " +
        "beacon holding a steady cadence — and at least one legitimate service that looks almost identical on the " +
        "wire. Build a rule that separates them using host, destIp, destPort, sni, bytesOut, and intervalSec. You " +
        "need 80% precision and 80% recall to pass — this one has an irreducible false positive baked in, just " +
        "like a real hunt would.",
      difficulty: "INSANE",
      points: 420,
      published: true,
      events: EVENTS,
    },
  });

  console.log(`✓ Threat Hunt Friday seeded: threat-hunt-friday-beacon-hunt (${EVENTS.length} events).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
