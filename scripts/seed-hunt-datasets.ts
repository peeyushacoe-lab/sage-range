import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Seed datasets with different difficulties and categories
const datasets = [
  {
    slug: "sysmon-apt29-easy",
    name: "Sysmon Logs - APT29 Indicators (Easy)",
    description: "Identify APT29 command execution patterns in Sysmon logs. Look for suspicious process creation chains and file access patterns.",
    difficulty: "EASY" as const,
    category: "SYSMON",
    logCount: 5000,
    formatType: "JSON",
    expectedArtifacts: [
      "PROCESS:cmd.exe",
      "PROCESS:powershell.exe",
      "IP:192.168.1.100",
      "DOMAIN:evil.com",
      "FILE:C:\\Windows\\Temp\\payload.exe",
    ],
    dataEmbedded: JSON.stringify(generateSysmonLogs(5000, ["cmd.exe", "powershell.exe", "192.168.1.100", "evil.com"])),
  },
  {
    slug: "apache-webshell-medium",
    name: "Apache Access Logs - Webshell Detection (Medium)",
    description: "Detect webshell uploads and exploitation attempts in Apache web server logs. Identify suspicious HTTP patterns and file access.",
    difficulty: "MEDIUM" as const,
    category: "APACHE",
    logCount: 50000,
    formatType: "CSV",
    expectedArtifacts: [
      "IP:192.168.50.200",
      "FILE:.php",
      "USER:admin",
      "DOMAIN:attacker.net",
      "FILE:shell.php",
    ],
    dataEmbedded: JSON.stringify(generateApacheLogs(50000, ["shell.php", "192.168.50.200", "attacker.net"])),
  },
  {
    slug: "windows-eventlog-insider-hard",
    name: "Windows Event Logs - Insider Threat (Hard)",
    description: "Investigate suspicious account activities, data exfiltration attempts, and privilege escalation in Windows Event Logs. Multiple false positives included.",
    difficulty: "HARD" as const,
    category: "WINDOWS_EVENTS",
    logCount: 500000,
    formatType: "EVTX",
    expectedArtifacts: [
      "USER:suspicious_user",
      "IP:10.0.0.50",
      "PROCESS:tasklist.exe",
      "REGISTRY:HKCU\\Software\\Microsoft\\Windows\\CurrentVersion",
      "PROCESS:net.exe",
      "FILE:\\\\fileserver\\sensitive",
    ],
    dataEmbedded: JSON.stringify(generateWindowsEventLogs(50000, [
      "suspicious_user",
      "10.0.0.50",
      "tasklist.exe",
      "net.exe",
    ])),
  },
  {
    slug: "dns-dga-detection-medium",
    name: "DNS Query Logs - DGA Detection (Medium)",
    description: "Identify Domain Generation Algorithm (DGA) patterns in DNS query logs. Find botnet C2 communications.",
    difficulty: "MEDIUM" as const,
    category: "DNS",
    logCount: 100000,
    formatType: "JSON",
    expectedArtifacts: [
      "DOMAIN:xjkdlsfjlksd.com",
      "DOMAIN:qpwoieruty.net",
      "IP:203.0.113.1",
      "USER:bot_client_1",
    ],
    dataEmbedded: JSON.stringify(generateDNSLogs(100000, [
      "xjkdlsfjlksd.com",
      "qpwoieruty.net",
      "203.0.113.1",
    ])),
  },
  {
    slug: "firewall-lateral-movement-hard",
    name: "Firewall Logs - Lateral Movement (Hard)",
    description: "Detect lateral movement attempts and network reconnaissance. Identify unusual inter-VLAN traffic and suspicious port scanning.",
    difficulty: "HARD" as const,
    category: "FIREWALL",
    logCount: 300000,
    formatType: "CSV",
    expectedArtifacts: [
      "IP:10.20.0.0",
      "IP:10.30.0.100",
      "PORT:445",
      "PORT:3389",
      "PROCESS:mimikatz",
      "DOMAIN:internal.corp",
    ],
    dataEmbedded: JSON.stringify(generateFirewallLogs(50000, [
      "10.20.0.0",
      "10.30.0.100",
      "192.168.100.5",
    ])),
  },
];

async function seedDatasets() {
  try {
    for (const dataset of datasets) {
      const existing = await db.huntDataset.findUnique({
        where: { slug: dataset.slug },
      });

      if (existing) {
        console.log(`✓ Dataset already exists: ${dataset.slug}`);
        continue;
      }

      await db.huntDataset.create({
        data: {
          ...dataset,
          published: true,
        },
      });

      console.log(`✓ Created dataset: ${dataset.slug}`);
    }

    console.log("\n✓ Hunt datasets seeded successfully!");
  } catch (error) {
    console.error("Error seeding datasets:", error);
  } finally {
    await db.$disconnect();
  }
}

// Helper functions to generate realistic log data

function generateSysmonLogs(count: number, keywords: string[]): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const processes = ["cmd.exe", "powershell.exe", "notepad.exe", "calc.exe", "explorer.exe", ...keywords];
  const domains = ["google.com", "microsoft.com", "evil.com", "attacker.net"];
  const ips = ["192.168.1.1", "192.168.1.100", "10.0.0.1", "8.8.8.8"];

  for (let i = 0; i < count; i++) {
    const isAnomaly = Math.random() < 0.15; // 15% anomalies
    logs.push({
      EventID: Math.floor(Math.random() * 30),
      ProcessName: isAnomaly ? keywords[0] : processes[Math.floor(Math.random() * processes.length)],
      CommandLine: isAnomaly
        ? `-EncodedCommand JABkbGwgPSAn${Math.random().toString(36)}'`
        : `${processes[Math.floor(Math.random() * processes.length)]} /c dir`,
      SourceIp: ips[Math.floor(Math.random() * ips.length)],
      Domain: domains[Math.floor(Math.random() * domains.length)],
      Timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      User: `Domain\\user${Math.floor(Math.random() * 100)}`,
      TargetFilename: isAnomaly ? "C:\\Windows\\Temp\\payload.exe" : `C:\\Users\\user${Math.floor(Math.random() * 100)}\\file.txt`,
    });
  }
  return logs;
}

function generateApacheLogs(count: number, keywords: string[]): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const methods = ["GET", "POST", "PUT", "DELETE"];
  const paths = ["/index.html", "/admin/", "/api/users", "/upload.php", "/shell.php", "/config.php"];
  const statusCodes = [200, 301, 302, 404, 500, 403];
  const ips = ["192.168.50.1", "192.168.50.200", "10.0.0.1", "203.0.113.1"];

  for (let i = 0; i < count; i++) {
    const isAnomaly = Math.random() < 0.1; // 10% anomalies
    logs.push({
      ip: ips[Math.floor(Math.random() * ips.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      method: methods[Math.floor(Math.random() * methods.length)],
      path: isAnomaly ? paths[4] : paths[Math.floor(Math.random() * paths.length)],
      statusCode: isAnomaly ? 200 : statusCodes[Math.floor(Math.random() * statusCodes.length)],
      userAgent: isAnomaly ? "curl/7.64.0" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      responseSize: Math.floor(Math.random() * 10000),
      referrer: isAnomaly ? "attacker.net" : "https://example.com",
      user: isAnomaly ? "admin" : `-`,
    });
  }
  return logs;
}

function generateWindowsEventLogs(count: number, keywords: string[]): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const eventIds = [1, 3, 4624, 4688, 4720, 4732, 5142, 5145];
  const users = ["SYSTEM", "LOCAL SERVICE", "NETWORK SERVICE", "suspicious_user", "admin"];
  const processes = ["tasklist.exe", "net.exe", "powershell.exe", "cmd.exe", "regedit.exe"];

  for (let i = 0; i < count; i++) {
    const isAnomaly = Math.random() < 0.08; // 8% anomalies
    logs.push({
      EventID: eventIds[Math.floor(Math.random() * eventIds.length)],
      ComputerName: `SERVER${Math.floor(Math.random() * 20)}`,
      EventTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      User: isAnomaly ? keywords[0] : users[Math.floor(Math.random() * users.length)],
      Process: isAnomaly ? keywords[2] : processes[Math.floor(Math.random() * processes.length)],
      LogonType: Math.floor(Math.random() * 13),
      IpAddress: isAnomaly ? keywords[1] : `10.0.0.${Math.floor(Math.random() * 255)}`,
      RegistryKey: isAnomaly ? "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion" : `HKEY_LOCAL_MACHINE\\Software`,
      SharePath: isAnomaly ? "\\\\fileserver\\sensitive" : "\\\\fileserver\\public",
    });
  }
  return logs;
}

function generateDNSLogs(count: number, keywords: string[]): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const legit_domains = ["google.com", "microsoft.com", "github.com", "stackoverflow.com"];
  const responseTypes = ["NOERROR", "NXDOMAIN", "SERVFAIL"];

  for (let i = 0; i < count; i++) {
    const isAnomaly = Math.random() < 0.05; // 5% anomalies
    const domain = isAnomaly
      ? keywords[Math.floor(Math.random() * keywords.length)]
      : legit_domains[Math.floor(Math.random() * legit_domains.length)];

    logs.push({
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      client_ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      query: domain,
      query_type: ["A", "AAAA", "CNAME", "MX"][Math.floor(Math.random() * 4)],
      response: isAnomaly ? responseTypes[2] : responseTypes[0],
      response_ip: keywords[2] || "8.8.8.8",
      ttl: Math.floor(Math.random() * 3600),
      user: isAnomaly ? "bot_client_1" : `user${Math.floor(Math.random() * 100)}`,
    });
  }
  return logs;
}

function generateFirewallLogs(count: number, keywords: string[]): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const actions = ["ALLOW", "DENY"];
  const protocols = ["TCP", "UDP"];

  for (let i = 0; i < count; i++) {
    const isAnomaly = Math.random() < 0.12; // 12% anomalies
    logs.push({
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      source_ip: isAnomaly ? keywords[0] : `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      dest_ip: isAnomaly ? keywords[1] : `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      source_port: Math.floor(Math.random() * 65535),
      dest_port: isAnomaly ? 445 : Math.floor(Math.random() * 65535),
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      action: isAnomaly ? "ALLOW" : actions[Math.floor(Math.random() * actions.length)],
      bytes: Math.floor(Math.random() * 1000000),
      zone: isAnomaly ? "DMZ-to-Internal" : `Zone${Math.floor(Math.random() * 5)}`,
    });
  }
  return logs;
}

seedDatasets();
