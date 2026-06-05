import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const welcomeLab = await db.lab.findUnique({ where: { slug: "welcome-ctf" } });
  const sqlLab = await db.lab.findUnique({ where: { slug: "sql-injection-101" } });
  const socLab = await db.lab.findUnique({ where: { slug: "soc-alert-investigation" } });

  if (!welcomeLab) throw new Error("Lab not found: welcome-ctf");
  if (!sqlLab) throw new Error("Lab not found: sql-injection-101");
  if (!socLab) throw new Error("Lab not found: soc-alert-investigation");

  const hints = [
    // welcome-ctf task_1
    { labId: welcomeLab.id, stage: "task_1", level: 1, pointCost: 10, text: "The flag is hidden in the page markup, not in visible text." },
    { labId: welcomeLab.id, stage: "task_1", level: 2, pointCost: 20, text: "Open browser DevTools (F12) → Elements tab and inspect the HTML structure." },
    { labId: welcomeLab.id, stage: "task_1", level: 3, pointCost: 30, text: "Search for an HTML comment `<!-- -->` — it contains the flag." },
    // welcome-ctf task_2
    { labId: welcomeLab.id, stage: "task_2", level: 1, pointCost: 10, text: "This string uses only letters, numbers, and `=` padding — a common encoding pattern." },
    { labId: welcomeLab.id, stage: "task_2", level: 2, pointCost: 20, text: "Run `atob('paste-string-here')` in the browser console (F12 → Console)." },
    { labId: welcomeLab.id, stage: "task_2", level: 3, pointCost: 30, text: "The decoded output starts with `SAGE{b4se...`" },
    // welcome-ctf task_3
    { labId: welcomeLab.id, stage: "task_3", level: 1, pointCost: 10, text: "Green `+` lines in a git diff show what was added to the file." },
    { labId: welcomeLab.id, stage: "task_3", level: 2, pointCost: 20, text: "Look for a constant named `SECRET_TOKEN` in the added lines." },
    { labId: welcomeLab.id, stage: "task_3", level: 3, pointCost: 30, text: "The flag is the string value assigned to `SECRET_TOKEN`." },
    // sql-injection-101 task_1
    { labId: sqlLab.id, stage: "task_1", level: 1, pointCost: 10, text: "SQL injection in the username field can break the query's logic." },
    { labId: sqlLab.id, stage: "task_1", level: 2, pointCost: 20, text: "Try entering `' OR '1'='1` as the username with any password." },
    { labId: sqlLab.id, stage: "task_1", level: 3, pointCost: 30, text: "Use `admin'--` to comment out the password check entirely." },
    // sql-injection-101 task_2
    { labId: sqlLab.id, stage: "task_2", level: 1, pointCost: 10, text: "A UNION SELECT can append extra columns to the original query result." },
    { labId: sqlLab.id, stage: "task_2", level: 2, pointCost: 20, text: "You need to match the number of columns in the original SELECT." },
    { labId: sqlLab.id, stage: "task_2", level: 3, pointCost: 30, text: "Try `1 UNION SELECT username,password FROM users--` in the ID field." },
    // sql-injection-101 task_3
    { labId: sqlLab.id, stage: "task_3", level: 1, pointCost: 10, text: "If the app returns different responses for true vs false conditions, you can extract data bit by bit." },
    { labId: sqlLab.id, stage: "task_3", level: 2, pointCost: 20, text: "Compare `1 AND 1=1--` (always true) vs `1 AND 1=2--` (always false) and observe the difference." },
    { labId: sqlLab.id, stage: "task_3", level: 3, pointCost: 30, text: "Use `1 AND SUBSTRING(password,1,1)='a'--` to test individual characters of the password." },
    // soc-alert-investigation investigation (task 1)
    { labId: socLab.id, stage: "investigation", level: 1, pointCost: 10, text: "Analyze the IOCs listed — what IP address appears in both the phishing email and the SIEM alert?" },
    { labId: socLab.id, stage: "investigation", level: 2, pointCost: 20, text: "The affected machine's hostname appears in the log. Look for the `src_host` field." },
    { labId: socLab.id, stage: "investigation", level: 3, pointCost: 30, text: "The flag is the malicious source IP from the SIEM log." },
    // soc-alert-investigation task_2
    { labId: socLab.id, stage: "task_2", level: 1, pointCost: 10, text: "Think about what must happen BEFORE you clean the system (evidence preservation is critical)." },
    { labId: socLab.id, stage: "task_2", level: 2, pointCost: 20, text: "You cannot re-image the workstation before doing forensics — that destroys evidence." },
    { labId: socLab.id, stage: "task_2", level: 3, pointCost: 30, text: "The correct order: isolate from network → preserve memory → notify IR team. Then remediate." },
    // soc-alert-investigation task_3
    { labId: socLab.id, stage: "task_3", level: 1, pointCost: 10, text: "Look at the lateral movement logs — which host did the attacker successfully move to?" },
    { labId: socLab.id, stage: "task_3", level: 2, pointCost: 20, text: "WMI (Windows Management Instrumentation) is a common lateral movement technique. Look for WMI connections." },
    { labId: socLab.id, stage: "task_3", level: 3, pointCost: 30, text: "The pivot target hostname is all-caps and appears after the WMI connection in the logs." },
  ];

  for (const hint of hints) {
    await db.labHint.upsert({
      where: { labId_stage_level: { labId: hint.labId, stage: hint.stage, level: hint.level } },
      create: hint,
      update: { text: hint.text, pointCost: hint.pointCost },
    });
  }

  console.log(`Seeded ${hints.length} hints.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
