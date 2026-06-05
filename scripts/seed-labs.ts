import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.lab.upsert({
    where: { slug: "network-forensics-101" },
    update: {
      title: "Network Forensics 101",
      description:
        "Analyze captured network traffic to identify C2 communication, extract IoCs, and attribute the attack.",
      type: "BLUE_TEAM",
      difficulty: "MEDIUM",
      category: "Network Analysis",
      points: 150,
      published: true,
    },
    create: {
      slug: "network-forensics-101",
      title: "Network Forensics 101",
      description:
        "Analyze captured network traffic to identify C2 communication, extract IoCs, and attribute the attack.",
      type: "BLUE_TEAM",
      difficulty: "MEDIUM",
      category: "Network Analysis",
      points: 150,
      published: true,
    },
  });
  console.log("Upserted: network-forensics-101");

  await db.lab.upsert({
    where: { slug: "privilege-escalation" },
    update: {
      title: "Linux Privilege Escalation",
      description:
        "You have a low-privilege shell. Find misconfigurations to escalate to root and read the flag.",
      type: "RED_TEAM",
      difficulty: "MEDIUM",
      category: "Linux Security",
      points: 200,
      published: true,
    },
    create: {
      slug: "privilege-escalation",
      title: "Linux Privilege Escalation",
      description:
        "You have a low-privilege shell. Find misconfigurations to escalate to root and read the flag.",
      type: "RED_TEAM",
      difficulty: "MEDIUM",
      category: "Linux Security",
      points: 200,
      published: true,
    },
  });
  console.log("Upserted: privilege-escalation");

  await db.lab.upsert({
    where: { slug: "osint-investigation" },
    update: {
      title: "OSINT: Follow the Trail",
      description:
        "A phishing email arrived. Use open-source intelligence techniques to trace the attacker's infrastructure.",
      type: "CTF",
      difficulty: "EASY",
      category: "OSINT",
      points: 100,
      published: true,
    },
    create: {
      slug: "osint-investigation",
      title: "OSINT: Follow the Trail",
      description:
        "A phishing email arrived. Use open-source intelligence techniques to trace the attacker's infrastructure.",
      type: "CTF",
      difficulty: "EASY",
      category: "OSINT",
      points: 100,
      published: true,
    },
  });
  console.log("Upserted: osint-investigation");

  await db.lab.upsert({
    where: { slug: "windows-log-analysis" },
    update: {
      title: "Windows Log Analysis",
      description:
        "Parse Windows Security and Sysmon event logs to reconstruct a lateral movement attack chain.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Log Analysis",
      points: 250,
      published: true,
    },
    create: {
      slug: "windows-log-analysis",
      title: "Windows Log Analysis",
      description:
        "Parse Windows Security and Sysmon event logs to reconstruct a lateral movement attack chain.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Log Analysis",
      points: 250,
      published: true,
    },
  });
  console.log("Upserted: windows-log-analysis");

  await db.lab.upsert({
    where: { slug: "malware-triage" },
    update: {
      title: "Malware Triage",
      description:
        "Perform static and behavioral analysis on a suspicious executable to determine its capabilities and family.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Malware Analysis",
      points: 300,
      published: true,
    },
    create: {
      slug: "malware-triage",
      title: "Malware Triage",
      description:
        "Perform static and behavioral analysis on a suspicious executable to determine its capabilities and family.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Malware Analysis",
      points: 300,
      published: true,
    },
  });
  console.log("Upserted: malware-triage");

  await db.lab.upsert({
    where: { slug: "xss-fundamentals" },
    update: {
      title: "XSS Fundamentals",
      description:
        "Discover and exploit Cross-Site Scripting vulnerabilities — reflected, stored, and CSP bypass.",
      type: "CTF",
      difficulty: "EASY",
      category: "Web Security",
      points: 100,
      published: true,
    },
    create: {
      slug: "xss-fundamentals",
      title: "XSS Fundamentals",
      description:
        "Discover and exploit Cross-Site Scripting vulnerabilities — reflected, stored, and CSP bypass.",
      type: "CTF",
      difficulty: "EASY",
      category: "Web Security",
      points: 100,
      published: true,
    },
  });
  console.log("Upserted: xss-fundamentals");

  await db.lab.upsert({
    where: { slug: "ssrf-attack" },
    update: {
      title: "SSRF Attack",
      description:
        "Exploit Server-Side Request Forgery to pivot from a web app to internal infrastructure and cloud metadata.",
      type: "RED_TEAM",
      difficulty: "MEDIUM",
      category: "Web Security",
      points: 200,
      published: true,
    },
    create: {
      slug: "ssrf-attack",
      title: "SSRF Attack",
      description:
        "Exploit Server-Side Request Forgery to pivot from a web app to internal infrastructure and cloud metadata.",
      type: "RED_TEAM",
      difficulty: "MEDIUM",
      category: "Web Security",
      points: 200,
      published: true,
    },
  });
  console.log("Upserted: ssrf-attack");

  await db.lab.upsert({
    where: { slug: "active-directory-101" },
    update: {
      title: "Active Directory 101",
      description:
        "Enumerate a Windows domain, identify Kerberoastable accounts, and perform Pass-the-Hash lateral movement.",
      type: "RED_TEAM",
      difficulty: "HARD",
      category: "Active Directory",
      points: 250,
      published: true,
    },
    create: {
      slug: "active-directory-101",
      title: "Active Directory 101",
      description:
        "Enumerate a Windows domain, identify Kerberoastable accounts, and perform Pass-the-Hash lateral movement.",
      type: "RED_TEAM",
      difficulty: "HARD",
      category: "Active Directory",
      points: 250,
      published: true,
    },
  });
  console.log("Upserted: active-directory-101");

  await db.lab.upsert({
    where: { slug: "phishing-analysis" },
    update: {
      title: "Phishing Email Analysis",
      description:
        "Analyze a suspicious email to identify spoofing, obfuscated URLs, and malicious macro behavior.",
      type: "BLUE_TEAM",
      difficulty: "EASY",
      category: "Email Security",
      points: 100,
      published: true,
    },
    create: {
      slug: "phishing-analysis",
      title: "Phishing Email Analysis",
      description:
        "Analyze a suspicious email to identify spoofing, obfuscated URLs, and malicious macro behavior.",
      type: "BLUE_TEAM",
      difficulty: "EASY",
      category: "Email Security",
      points: 100,
      published: true,
    },
  });
  console.log("Upserted: phishing-analysis");

  await db.lab.upsert({
    where: { slug: "memory-forensics" },
    update: {
      title: "Memory Forensics",
      description:
        "Use Volatility-style analysis to identify malicious processes, network connections, and code injection in a memory dump.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Memory Analysis",
      points: 300,
      published: true,
    },
    create: {
      slug: "memory-forensics",
      title: "Memory Forensics",
      description:
        "Use Volatility-style analysis to identify malicious processes, network connections, and code injection in a memory dump.",
      type: "BLUE_TEAM",
      difficulty: "HARD",
      category: "Memory Analysis",
      points: 300,
      published: true,
    },
  });
  console.log("Upserted: memory-forensics");

  await db.lab.upsert({
    where: { slug: "web-recon" },
    update: {
      title: "Web Reconnaissance",
      description:
        "Gather intelligence on a target web application using passive and active reconnaissance techniques.",
      type: "CTF",
      difficulty: "EASY",
      category: "Reconnaissance",
      points: 100,
      published: true,
    },
    create: {
      slug: "web-recon",
      title: "Web Reconnaissance",
      description:
        "Gather intelligence on a target web application using passive and active reconnaissance techniques.",
      type: "CTF",
      difficulty: "EASY",
      category: "Reconnaissance",
      points: 100,
      published: true,
    },
  });
  console.log("Upserted: web-recon");

  console.log("Done seeding labs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
