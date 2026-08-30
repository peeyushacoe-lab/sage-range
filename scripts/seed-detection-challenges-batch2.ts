// Adds 2 more Detection Challenges — there were only 2 published, both from
// the original seed. Each challenge is graded algorithmically (precision and
// recall >= 80% against a hidden field/operator/value rule the student
// builds), so unlike prose content, a wrong design here means the challenge
// is literally unsolvable or trivially broken. This script verifies each
// challenge's intended solution rule against the real scoring engine before
// printing success, using the exact same evaluateRule/isPassing functions
// the live submit route uses.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-detection-challenges-batch2.ts

import { PrismaClient } from "@prisma/client";
import { evaluateRule, isPassing, type DatasetEvent, type Rule } from "../src/lib/detection-engine";

const db = new PrismaClient();

type Challenge = {
  slug: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  points: number;
  events: DatasetEvent[];
  solutionRule: Rule; // verified against evaluateRule before seeding, not stored
};

const CHALLENGES: Challenge[] = [
  {
    slug: "scheduled-task-persistence",
    title: "Detect: Scheduled Task Persistence",
    description:
      "Twenty-two schtasks.exe events were pulled from fleet telemetry after an intrusion was confirmed elsewhere " +
      "on the network. Most are routine IT/vendor scheduled-task activity — patch management, backup jobs, real " +
      "vendor updaters. A handful are an attacker planting persistence under a folder built to look like a system " +
      "path. Build a rule that flags the malicious ones while minimizing false positives on the legitimate task " +
      "activity around them. Available fields: host, user, process, parent, commandline. You need precision and " +
      "recall at 80% or higher to pass.",
    difficulty: "MEDIUM",
    points: 250,
    solutionRule: { logic: "OR", conditions: [{ field: "commandline", operator: "contains", value: "ProgramData\\SvcHost" }] },
    events: [
      { id: "t01", isMalicious: true, raw: "schtasks /create /tn \"MicrosoftEdgeUpdateTaskMachine\" /tr \"C:\\ProgramData\\SvcHost\\svchost32.exe\" /sc onlogon /ru SYSTEM", fields: { host: "WKS-018", user: "t.brandt", process: "schtasks.exe", parent: "powershell.exe", commandline: "schtasks /create /tn \"MicrosoftEdgeUpdateTaskMachine\" /tr \"C:\\ProgramData\\SvcHost\\svchost32.exe\" /sc onlogon /ru SYSTEM" } },
      { id: "t02", isMalicious: true, raw: "schtasks /create /tn \"OneDriveSyncHelper\" /tr \"C:\\ProgramData\\SvcHost\\sync.exe\" /sc onlogon", fields: { host: "WKS-044", user: "r.fabbri", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /create /tn \"OneDriveSyncHelper\" /tr \"C:\\ProgramData\\SvcHost\\sync.exe\" /sc onlogon" } },
      { id: "t03", isMalicious: true, raw: "schtasks /create /tn \"WindowsDefenderScanTask\" /tr \"C:\\ProgramData\\SvcHost\\defender_upd.exe\" /sc minute /mo 30", fields: { host: "WKS-091", user: "k.dahl", process: "schtasks.exe", parent: "powershell.exe", commandline: "schtasks /create /tn \"WindowsDefenderScanTask\" /tr \"C:\\ProgramData\\SvcHost\\defender_upd.exe\" /sc minute /mo 30" } },
      { id: "t04", isMalicious: true, raw: "schtasks /create /tn \"AdobeAcrobatUpdate\" /tr \"C:\\ProgramData\\SvcHost\\acro_helper.exe\" /sc onlogon /ru SYSTEM", fields: { host: "WKS-112", user: "j.oyelaran", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /create /tn \"AdobeAcrobatUpdate\" /tr \"C:\\ProgramData\\SvcHost\\acro_helper.exe\" /sc onlogon /ru SYSTEM" } },
      { id: "t05", isMalicious: true, raw: "schtasks /create /tn \"GoogleUpdateTaskMachineCore\" /tr \"C:\\programdata\\svchost\\gupdate32.exe\" /sc hourly", fields: { host: "WKS-057", user: "m.silveira", process: "schtasks.exe", parent: "powershell.exe", commandline: "schtasks /create /tn \"GoogleUpdateTaskMachineCore\" /tr \"C:\\programdata\\svchost\\gupdate32.exe\" /sc hourly" } },
      { id: "t06", isMalicious: true, raw: "schtasks /create /tn \"IntelGraphicsUpdate\" /tr \"C:\\ProgramData\\SvcHost\\igfx_upd.exe\" /sc onstart", fields: { host: "WKS-076", user: "p.enescu", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /create /tn \"IntelGraphicsUpdate\" /tr \"C:\\ProgramData\\SvcHost\\igfx_upd.exe\" /sc onstart" } },
      { id: "t07", isMalicious: true, raw: "schtasks /create /tn \"NvidiaTelemetryContainer\" /tr \"C:\\ProgramData\\SvcHost\\nv_tel.exe\" /sc onlogon", fields: { host: "WKS-133", user: "d.kowalczyk", process: "schtasks.exe", parent: "powershell.exe", commandline: "schtasks /create /tn \"NvidiaTelemetryContainer\" /tr \"C:\\ProgramData\\SvcHost\\nv_tel.exe\" /sc onlogon" } },
      { id: "t08", isMalicious: true, raw: "schtasks /create /tn \"JavaUpdateSched\" /tr \"C:\\ProgramData\\SvcHost\\jusched32.exe\" /sc daily /st 03:00", fields: { host: "WKS-029", user: "f.moutinho", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /create /tn \"JavaUpdateSched\" /tr \"C:\\ProgramData\\SvcHost\\jusched32.exe\" /sc daily /st 03:00" } },

      { id: "t09", isMalicious: false, raw: "schtasks /create /tn \"WindowsUpdateOrchestrator\" /tr \"C:\\Windows\\System32\\usoclient.exe StartScan\" /sc daily /st 02:00", fields: { host: "WKS-002", user: "sccm-deploy", process: "schtasks.exe", parent: "CcmExec.exe", commandline: "schtasks /create /tn \"WindowsUpdateOrchestrator\" /tr \"C:\\Windows\\System32\\usoclient.exe StartScan\" /sc daily /st 02:00" } },
      { id: "t10", isMalicious: false, raw: "schtasks /create /tn \"CCM_CacheClean\" /tr \"C:\\Windows\\CCM\\CleanCache.exe\" /sc weekly", fields: { host: "WKS-004", user: "sccm-deploy", process: "schtasks.exe", parent: "CcmExec.exe", commandline: "schtasks /create /tn \"CCM_CacheClean\" /tr \"C:\\Windows\\CCM\\CleanCache.exe\" /sc weekly" } },
      { id: "t11", isMalicious: false, raw: "schtasks /create /tn \"Adobe Acrobat Update Task\" /tr \"C:\\Program Files (x86)\\Common Files\\Adobe\\ARM\\1.0\\AdobeARM.exe\" /sc onlogon", fields: { host: "WKS-015", user: "g.ferreira", process: "schtasks.exe", parent: "AdobeARM.exe", commandline: "schtasks /create /tn \"Adobe Acrobat Update Task\" /tr \"C:\\Program Files (x86)\\Common Files\\Adobe\\ARM\\1.0\\AdobeARM.exe\" /sc onlogon" } },
      { id: "t12", isMalicious: false, raw: "schtasks /create /tn \"OneDrive Standalone Update Task\" /tr \"C:\\Users\\l.marsh\\AppData\\Local\\Microsoft\\OneDrive\\OneDriveStandaloneUpdater.exe\" /sc onlogon", fields: { host: "WKS-021", user: "l.marsh", process: "schtasks.exe", parent: "explorer.exe", commandline: "schtasks /create /tn \"OneDrive Standalone Update Task\" /tr \"C:\\Users\\l.marsh\\AppData\\Local\\Microsoft\\OneDrive\\OneDriveStandaloneUpdater.exe\" /sc onlogon" } },
      { id: "t13", isMalicious: false, raw: "schtasks /create /tn \"GoogleUpdateTaskMachineUA\" /tr \"C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe /ua\" /sc hourly", fields: { host: "WKS-033", user: "n.abrantes", process: "schtasks.exe", parent: "msiexec.exe", commandline: "schtasks /create /tn \"GoogleUpdateTaskMachineUA\" /tr \"C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe /ua\" /sc hourly" } },
      { id: "t14", isMalicious: false, raw: "schtasks /create /tn \"SunJavaUpdateSched\" /tr \"C:\\Program Files (x86)\\Common Files\\Java\\Java Update\\jusched.exe\" /sc daily", fields: { host: "WKS-045", user: "installer-svc", process: "schtasks.exe", parent: "msiexec.exe", commandline: "schtasks /create /tn \"SunJavaUpdateSched\" /tr \"C:\\Program Files (x86)\\Common Files\\Java\\Java Update\\jusched.exe\" /sc daily" } },
      { id: "t15", isMalicious: false, raw: "schtasks /delete /tn \"LegacyBackupJob\" /f", fields: { host: "WKS-006", user: "it-admin", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /delete /tn \"LegacyBackupJob\" /f" } },
      { id: "t16", isMalicious: false, raw: "schtasks /query /fo LIST /v", fields: { host: "WKS-006", user: "it-admin", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /query /fo LIST /v" } },
      { id: "t17", isMalicious: false, raw: "schtasks /create /tn \"MonthlySecurityPatch\" /tr \"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -File C:\\Windows\\System32\\GPO\\PatchNow.ps1\" /sc monthly", fields: { host: "WKS-009", user: "gpo-deploy", process: "schtasks.exe", parent: "gpscript.exe", commandline: "schtasks /create /tn \"MonthlySecurityPatch\" /tr \"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -File C:\\Windows\\System32\\GPO\\PatchNow.ps1\" /sc monthly" } },
      { id: "t18", isMalicious: false, raw: "schtasks /create /tn \"VeeamBackupJob_Nightly\" /tr \"C:\\Program Files\\Veeam\\Backup and Replication\\Console\\Veeam.Backup.Shell.exe -job nightly\" /sc daily /st 23:00", fields: { host: "SRV-BKP-01", user: "svc_veeam", process: "schtasks.exe", parent: "services.exe", commandline: "schtasks /create /tn \"VeeamBackupJob_Nightly\" /tr \"C:\\Program Files\\Veeam\\Backup and Replication\\Console\\Veeam.Backup.Shell.exe -job nightly\" /sc daily /st 23:00" } },
      { id: "t19", isMalicious: false, raw: "schtasks /create /tn \"PrintSpoolerCleanup\" /tr \"C:\\Windows\\System32\\spool\\tools\\clearqueue.exe\" /sc weekly", fields: { host: "PRINT-SRV-02", user: "it-admin", process: "schtasks.exe", parent: "cmd.exe", commandline: "schtasks /create /tn \"PrintSpoolerCleanup\" /tr \"C:\\Windows\\System32\\spool\\tools\\clearqueue.exe\" /sc weekly" } },
      { id: "t20", isMalicious: false, raw: "schtasks /create /tn \"Windows Defender Scheduled Scan\" /tr \"C:\\Program Files\\Windows Defender\\MpCmdRun.exe -Scan -ScanType 2\" /sc weekly", fields: { host: "WKS-062", user: "SYSTEM", process: "schtasks.exe", parent: "MsMpEng.exe", commandline: "schtasks /create /tn \"Windows Defender Scheduled Scan\" /tr \"C:\\Program Files\\Windows Defender\\MpCmdRun.exe -Scan -ScanType 2\" /sc weekly" } },
      { id: "t21", isMalicious: false, raw: "schtasks /create /tn \"NightlyLogArchive\" /tr \"C:\\Scripts\\Maintenance\\archive_logs.ps1\" /sc daily /st 01:00", fields: { host: "SRV-LOG-01", user: "it-admin", process: "schtasks.exe", parent: "powershell.exe", commandline: "schtasks /create /tn \"NightlyLogArchive\" /tr \"C:\\Scripts\\Maintenance\\archive_logs.ps1\" /sc daily /st 01:00" } },
      { id: "t22", isMalicious: false, raw: "schtasks /create /tn \"PersonalPhotoBackup\" /tr \"C:\\Users\\c.reddy\\Documents\\Scripts\\backup_photos.bat\" /sc daily", fields: { host: "WKS-088", user: "c.reddy", process: "schtasks.exe", parent: "explorer.exe", commandline: "schtasks /create /tn \"PersonalPhotoBackup\" /tr \"C:\\Users\\c.reddy\\Documents\\Scripts\\backup_photos.bat\" /sc daily" } },
    ],
  },
  {
    slug: "lsass-credential-dump-comsvcs",
    title: "Detect: LSASS Credential Dumping via comsvcs.dll",
    description:
      "Twenty-two process-creation events were collected after EDR flagged unusual LSASS memory access on one host. " +
      "rundll32.exe abusing comsvcs.dll's MiniDump export is a well-known LOLBin technique for dumping credentials " +
      "without dropping a separate tool — but rundll32.exe and legitimate crash-dumping tools both show up in " +
      "normal fleet telemetry too. Build a rule that isolates the real credential-dumping activity. Available " +
      "fields: host, user, process, parent, commandline. You need precision and recall at 80% or higher to pass.",
    difficulty: "HARD",
    points: 350,
    solutionRule: { logic: "OR", conditions: [{ field: "commandline", operator: "contains", value: "MiniDump" }] },
    events: [
      { id: "d01", isMalicious: true, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 2884 C:\\Windows\\Temp\\a1.dmp full", fields: { host: "DC-02", user: "SYSTEM", process: "rundll32.exe", parent: "cmd.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 2884 C:\\Windows\\Temp\\a1.dmp full" } },
      { id: "d02", isMalicious: true, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 692 C:\\Windows\\Temp\\lsass_bak.dmp full", fields: { host: "WKS-208", user: "j.okonjo", process: "rundll32.exe", parent: "powershell.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 692 C:\\Windows\\Temp\\lsass_bak.dmp full" } },
      { id: "d03", isMalicious: true, raw: "rundll32.exe %windir%\\System32\\comsvcs.dll, MiniDump 692 C:\\ProgramData\\dump1.tmp full", fields: { host: "WKS-208", user: "j.okonjo", process: "rundll32.exe", parent: "powershell.exe", commandline: "rundll32.exe %windir%\\System32\\comsvcs.dll, MiniDump 692 C:\\ProgramData\\dump1.tmp full" } },
      { id: "d04", isMalicious: true, raw: "rundll32.exe C:\\WINDOWS\\system32\\comsvcs.dll MiniDump 1440 C:\\Users\\Public\\svc.dmp full", fields: { host: "SRV-APP-04", user: "svc_apppool", process: "rundll32.exe", parent: "cmd.exe", commandline: "rundll32.exe C:\\WINDOWS\\system32\\comsvcs.dll MiniDump 1440 C:\\Users\\Public\\svc.dmp full" } },
      { id: "d05", isMalicious: true, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 812 \\\\127.0.0.1\\ADMIN$\\temp\\out.bin full", fields: { host: "DC-02", user: "SYSTEM", process: "rundll32.exe", parent: "powershell.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 812 \\\\127.0.0.1\\ADMIN$\\temp\\out.bin full" } },
      { id: "d06", isMalicious: true, raw: "cmd.exe /c rundll32 comsvcs.dll, MiniDump 692 C:\\perflogs\\p.log full", fields: { host: "WKS-311", user: "m.abioye", process: "rundll32.exe", parent: "cmd.exe", commandline: "cmd.exe /c rundll32 comsvcs.dll, MiniDump 692 C:\\perflogs\\p.log full" } },
      { id: "d07", isMalicious: true, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,MiniDump 692 C:\\Windows\\Temp\\update.log full", fields: { host: "SRV-FILE-02", user: "svc_backup", process: "rundll32.exe", parent: "powershell.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,MiniDump 692 C:\\Windows\\Temp\\update.log full" } },

      { id: "d08", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\shell32.dll,Control_RunDLL C:\\Windows\\System32\\desk.cpl", fields: { host: "WKS-014", user: "r.dvorak", process: "rundll32.exe", parent: "explorer.exe", commandline: "rundll32.exe C:\\Windows\\System32\\shell32.dll,Control_RunDLL C:\\Windows\\System32\\desk.cpl" } },
      { id: "d09", isMalicious: false, raw: "rundll32.exe printui.dll,PrintUIEntry /in /n \\\\PRINT-SRV-02\\Finance-Floor2", fields: { host: "WKS-027", user: "s.balogun", process: "rundll32.exe", parent: "explorer.exe", commandline: "rundll32.exe printui.dll,PrintUIEntry /in /n \\\\PRINT-SRV-02\\Finance-Floor2" } },
      { id: "d10", isMalicious: false, raw: "C:\\Tools\\Sysinternals\\procdump.exe -ma 4210 C:\\Dumps\\appcrash.dmp", fields: { host: "SRV-APP-09", user: "it-admin", process: "procdump.exe", parent: "cmd.exe", commandline: "C:\\Tools\\Sysinternals\\procdump.exe -ma 4210 C:\\Dumps\\appcrash.dmp" } },
      { id: "d11", isMalicious: false, raw: "C:\\Windows\\System32\\WerFault.exe -u -p 3388 -s 812", fields: { host: "WKS-051", user: "d.tavares", process: "WerFault.exe", parent: "svchost.exe", commandline: "C:\\Windows\\System32\\WerFault.exe -u -p 3388 -s 812" } },
      { id: "d12", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-CoInitialize", fields: { host: "SRV-APP-04", user: "svc_apppool", process: "rundll32.exe", parent: "w3wp.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-CoInitialize" } },
      { id: "d13", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\advpack.dll,LaunchINFSectionEx C:\\Drivers\\install.inf,DefaultInstall,,4,N", fields: { host: "WKS-063", user: "it-deploy", process: "rundll32.exe", parent: "msiexec.exe", commandline: "rundll32.exe C:\\Windows\\System32\\advpack.dll,LaunchINFSectionEx C:\\Drivers\\install.inf,DefaultInstall,,4,N" } },
      { id: "d14", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\keymgr.dll,PRShowSaveWizardExW", fields: { host: "WKS-072", user: "p.henriksen", process: "rundll32.exe", parent: "explorer.exe", commandline: "rundll32.exe C:\\Windows\\System32\\keymgr.dll,PRShowSaveWizardExW" } },
      { id: "d15", isMalicious: false, raw: "C:\\Program Files\\Windows Defender\\MpCmdRun.exe -Scan -ScanType 1", fields: { host: "WKS-085", user: "SYSTEM", process: "MpCmdRun.exe", parent: "MsMpEng.exe", commandline: "C:\\Program Files\\Windows Defender\\MpCmdRun.exe -Scan -ScanType 1" } },
      { id: "d16", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\sysdm.cpl,EditEnvironmentVariables", fields: { host: "WKS-019", user: "it-admin", process: "rundll32.exe", parent: "explorer.exe", commandline: "rundll32.exe C:\\Windows\\System32\\sysdm.cpl,EditEnvironmentVariables" } },
      { id: "d17", isMalicious: false, raw: "C:\\Tools\\Sysinternals\\procdump.exe -ma -e 1 C:\\Dumps\\svc_watchdog.dmp -p 5124", fields: { host: "SRV-APP-11", user: "it-admin", process: "procdump.exe", parent: "powershell.exe", commandline: "C:\\Tools\\Sysinternals\\procdump.exe -ma -e 1 C:\\Dumps\\svc_watchdog.dmp -p 5124" } },
      { id: "d18", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-DispatchOle32", fields: { host: "SRV-APP-06", user: "svc_apppool", process: "rundll32.exe", parent: "w3wp.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-DispatchOle32" } },
      { id: "d19", isMalicious: false, raw: "C:\\Windows\\System32\\WerFault.exe -pr -p 6600 -s 452", fields: { host: "WKS-096", user: "n.laurentiis", process: "WerFault.exe", parent: "svchost.exe", commandline: "C:\\Windows\\System32\\WerFault.exe -pr -p 6600 -s 452" } },
      { id: "d20", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\shell32.dll,SHHelpShortcuts_RunDLL Update", fields: { host: "WKS-102", user: "e.castellanos", process: "rundll32.exe", parent: "explorer.exe", commandline: "rundll32.exe C:\\Windows\\System32\\shell32.dll,SHHelpShortcuts_RunDLL Update" } },
      { id: "d21", isMalicious: false, raw: "C:\\Program Files\\Veeam\\Endpoint Backup\\Veeam.Agent.exe --job-status nightly", fields: { host: "WKS-037", user: "svc_veeam", process: "Veeam.Agent.exe", parent: "services.exe", commandline: "C:\\Program Files\\Veeam\\Endpoint Backup\\Veeam.Agent.exe --job-status nightly" } },
      { id: "d22", isMalicious: false, raw: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-AutoBalanceListener", fields: { host: "SRV-APP-04", user: "svc_apppool", process: "rundll32.exe", parent: "w3wp.exe", commandline: "rundll32.exe C:\\Windows\\System32\\comsvcs.dll,-AutoBalanceListener" } },
    ],
  },
];

async function main() {
  for (const c of CHALLENGES) {
    // Verify the intended solution actually passes against the live scoring
    // engine before writing anything — a wrong design here means the
    // challenge is unsolvable or trivially broken, not just badly written.
    const result = evaluateRule(c.solutionRule, c.events);
    const malCount = c.events.filter((e) => e.isMalicious).length;
    console.log(
      `${c.title}: ${c.events.length} events (${malCount} malicious) — solution rule precision=${result.precision.toFixed(2)} recall=${result.recall.toFixed(2)} f1=${result.f1.toFixed(2)}`
    );
    if (!isPassing(result)) {
      throw new Error(`REFUSING TO SEED "${c.slug}" — its own intended solution rule doesn't pass (precision/recall must both be >= 0.80).`);
    }

    await db.detectionChallenge.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, difficulty: c.difficulty, points: c.points, events: c.events as object, published: true },
      create: { slug: c.slug, title: c.title, description: c.description, difficulty: c.difficulty, points: c.points, events: c.events as object, published: true },
    });
  }
  console.log(`\nDone — ${CHALLENGES.length} new challenges seeded and verified solvable.`);
  process.exit(0);
}

main();
