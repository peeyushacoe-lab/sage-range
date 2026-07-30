/**
 * Threat hunt dataset generation.
 *
 * Produces a believable benign baseline with a deliberately planted attack
 * chain running through it. The point is that every expected artifact is
 * genuinely discoverable by querying the logs — an earlier version emitted
 * random field values, so there was no signal to hunt and the exercise could
 * not be solved by reasoning.
 *
 * Determinism matters: a seeded PRNG means the same dataset slug always
 * produces the same logs, so a hint or walkthrough stays accurate.
 */

/** Small deterministic PRNG (mulberry32) so datasets are reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length)];

const BENIGN_PROCESSES = [
  "explorer.exe", "chrome.exe", "outlook.exe", "teams.exe", "notepad.exe",
  "svchost.exe", "OneDrive.exe", "Code.exe", "excel.exe", "winword.exe",
] as const;

const BENIGN_DOMAINS = [
  "outlook.office365.com", "teams.microsoft.com", "github.com",
  "update.microsoft.com", "cdn.jsdelivr.net", "corp-intranet.local",
] as const;

const USERS = [
  "CORP\\a.patel", "CORP\\j.smith", "CORP\\l.okafor", "CORP\\m.eriksson",
  "CORP\\d.mensah", "CORP\\h.silva", "CORP\\r.novak",
] as const;

const WORKSTATIONS = [
  "WKS-FIN-114", "WKS-ENG-207", "WKS-HR-052", "WKS-MKT-089", "WKS-SUP-023",
] as const;

export type HuntLog = Record<string, unknown>;

export type GeneratedDataset = {
  logs: HuntLog[];
  /** Artifacts the hunter is expected to surface, in the schema the API uses. */
  expectedArtifacts: string[];
};

function isoAt(base: Date, minutesOffset: number): string {
  return new Date(base.getTime() + minutesOffset * 60_000).toISOString();
}

/**
 * Sysmon dataset: phishing attachment leads to encoded PowerShell, a scheduled
 * task for persistence, and beaconing to a single external host.
 *
 * The chain is chronological, so a hunter who finds any one stage can pivot on
 * the host or user to recover the rest.
 */
export function generateSysmonIntrusion(logCount: number, seed = 1337): GeneratedDataset {
  const r = rng(seed);
  const logs: HuntLog[] = [];
  const start = new Date("2026-03-11T08:00:00Z");

  const victim = "WKS-FIN-114";
  const victimUser = "CORP\\a.patel";
  const c2 = "45.87.212.9";
  const c2Domain = "cdn-telemetry-sync.net";
  const payload = "C:\\Users\\a.patel\\AppData\\Local\\Temp\\invoice_scan.exe";
  const taskName = "\\Microsoft\\Windows\\Maintenance\\SystemHealthCheck";

  // Benign baseline across the working day.
  for (let i = 0; i < logCount; i++) {
    const minute = Math.floor(r() * 600);
    logs.push({
      EventID: 1,
      UtcTime: isoAt(start, minute),
      Computer: pick(r, WORKSTATIONS),
      User: pick(r, USERS),
      Image: `C:\\Program Files\\${pick(r, BENIGN_PROCESSES)}`,
      ProcessName: pick(r, BENIGN_PROCESSES),
      ParentImage: "C:\\Windows\\explorer.exe",
      CommandLine: "",
      DestinationHostname: pick(r, BENIGN_DOMAINS),
    });
  }

  // ── Planted chain ────────────────────────────────────────────────────────
  logs.push({
    EventID: 1,
    UtcTime: isoAt(start, 143),
    Computer: victim,
    User: victimUser,
    Image: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    ProcessName: "winword.exe",
    ParentImage: "C:\\Windows\\explorer.exe",
    CommandLine: '"WINWORD.EXE" /n "C:\\Users\\a.patel\\Downloads\\Invoice_4471.docm"',
    DestinationHostname: "",
  });

  logs.push({
    EventID: 1,
    UtcTime: isoAt(start, 144),
    Computer: victim,
    User: victimUser,
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ProcessName: "powershell.exe",
    ParentImage: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    CommandLine:
      "powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQA",
    DestinationHostname: "",
  });

  logs.push({
    EventID: 3,
    UtcTime: isoAt(start, 145),
    Computer: victim,
    User: victimUser,
    ProcessName: "powershell.exe",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    DestinationIp: c2,
    DestinationHostname: c2Domain,
    DestinationPort: 443,
    CommandLine: "",
    ParentImage: "",
  });

  logs.push({
    EventID: 11,
    UtcTime: isoAt(start, 146),
    Computer: victim,
    User: victimUser,
    ProcessName: "powershell.exe",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    TargetFilename: payload,
    CommandLine: "",
    ParentImage: "",
    DestinationHostname: "",
  });

  logs.push({
    EventID: 1,
    UtcTime: isoAt(start, 148),
    Computer: victim,
    User: victimUser,
    Image: payload,
    ProcessName: "invoice_scan.exe",
    ParentImage: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    CommandLine: `"${payload}"`,
    DestinationHostname: "",
  });

  logs.push({
    EventID: 1,
    UtcTime: isoAt(start, 151),
    Computer: victim,
    User: victimUser,
    Image: "C:\\Windows\\System32\\schtasks.exe",
    ProcessName: "schtasks.exe",
    ParentImage: payload,
    CommandLine: `schtasks /create /tn "${taskName}" /tr "${payload}" /sc onlogon /rl highest`,
    DestinationHostname: "",
  });

  // Beaconing: a fixed cadence a hunter can spot by grouping on destination.
  for (let b = 0; b < 40; b++) {
    logs.push({
      EventID: 3,
      UtcTime: isoAt(start, 155 + b * 10),
      Computer: victim,
      User: victimUser,
      ProcessName: "invoice_scan.exe",
      Image: payload,
      DestinationIp: c2,
      DestinationHostname: c2Domain,
      DestinationPort: 443,
      CommandLine: "",
      ParentImage: "",
    });
  }

  logs.sort((a, b) => String(a.UtcTime).localeCompare(String(b.UtcTime)));

  return {
    logs,
    expectedArtifacts: [
      `IP:${c2}`,
      `DOMAIN:${c2Domain}`,
      "PROCESS:invoice_scan.exe",
      `FILE:${payload}`,
      "PROCESS:powershell.exe",
      `USER:${victimUser}`,
    ],
  };
}

/**
 * Apache dataset: reconnaissance, a web shell upload, then command execution
 * through it. Status codes tell the story — 404s while probing, then 200s once
 * the shell lands.
 */
export function generateApacheWebshell(logCount: number, seed = 4242): GeneratedDataset {
  const r = rng(seed);
  const logs: HuntLog[] = [];
  const start = new Date("2026-04-02T00:00:00Z");

  const attacker = "203.0.113.77";
  const shellPath = "/uploads/img_20260402.php";
  const benignPaths = ["/", "/index.html", "/products", "/api/v2/catalogue", "/static/app.js"];

  for (let i = 0; i < logCount; i++) {
    const minute = Math.floor(r() * 1440);
    logs.push({
      clientIp: `198.51.100.${Math.floor(r() * 250) + 1}`,
      timestamp: isoAt(start, minute),
      method: r() > 0.2 ? "GET" : "POST",
      path: pick(r, benignPaths),
      status: r() > 0.05 ? 200 : 404,
      bytes: Math.floor(r() * 8000) + 200,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  }

  // Recon: directory probing, mostly 404.
  const probes = ["/admin", "/phpmyadmin", "/.git/config", "/wp-login.php", "/uploads/"];
  probes.forEach((p, i) => {
    logs.push({
      clientIp: attacker,
      timestamp: isoAt(start, 600 + i),
      method: "GET",
      path: p,
      status: p === "/uploads/" ? 200 : 404,
      bytes: 512,
      userAgent: "curl/8.4.0",
    });
  });

  // Upload, then repeated command execution through the shell.
  logs.push({
    clientIp: attacker,
    timestamp: isoAt(start, 612),
    method: "POST",
    path: "/upload.php",
    status: 200,
    bytes: 18244,
    userAgent: "curl/8.4.0",
  });

  for (let i = 0; i < 15; i++) {
    logs.push({
      clientIp: attacker,
      timestamp: isoAt(start, 615 + i * 3),
      method: "POST",
      path: shellPath,
      status: 200,
      bytes: 1200 + Math.floor(r() * 4000),
      userAgent: "curl/8.4.0",
    });
  }

  logs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  return {
    logs,
    expectedArtifacts: [`IP:${attacker}`, `FILE:${shellPath}`, "FILE:/upload.php"],
  };
}

/**
 * DNS dataset: algorithmically generated domains among ordinary lookups.
 * The DGA domains share a suffix and a uniform length, which is what makes
 * them separable from the baseline.
 */
export function generateDnsDga(logCount: number, seed = 909): GeneratedDataset {
  const r = rng(seed);
  const logs: HuntLog[] = [];
  const start = new Date("2026-05-19T00:00:00Z");
  const victim = "WKS-MKT-089";
  const dgaSuffix = ".dyn-resolve.info";

  for (let i = 0; i < logCount; i++) {
    logs.push({
      timestamp: isoAt(start, Math.floor(r() * 1440)),
      client: pick(r, WORKSTATIONS),
      query: pick(r, BENIGN_DOMAINS),
      queryType: "A",
      responseCode: "NOERROR",
    });
  }

  // 60 fixed-length random-looking labels, nearly all failing to resolve.
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const dgaDomains: string[] = [];
  for (let i = 0; i < 60; i++) {
    let label = "";
    for (let c = 0; c < 12; c++) label += alphabet[Math.floor(r() * 26)];
    const domain = label + dgaSuffix;
    dgaDomains.push(domain);
    logs.push({
      timestamp: isoAt(start, 480 + i * 5),
      client: victim,
      query: domain,
      queryType: "A",
      responseCode: i % 10 === 0 ? "NOERROR" : "NXDOMAIN",
    });
  }

  logs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  return {
    logs,
    expectedArtifacts: [
      `DOMAIN:${dgaSuffix.slice(1)}`,
      `USER:${victim}`,
      `DOMAIN:${dgaDomains[0]}`,
    ],
  };
}
