import { WelcomeCtf } from "./welcome-ctf";
import { SqlInjection101 } from "./sql-injection-101";
import { SocAlertInvestigation } from "./soc-alert-investigation";
import { NetworkForensics101 } from "./network-forensics-101";
import { PrivilegeEscalation } from "./privilege-escalation";
import { OsintInvestigation } from "./osint-investigation";
import { WindowsLogAnalysis } from "./windows-log-analysis";
import { MalwareTriage } from "./malware-triage";
import { XssFundamentals } from "./xss-fundamentals";
import { SsrfAttack } from "./ssrf-attack";
import { ActiveDirectory101 } from "./active-directory-101";
import { PhishingAnalysis } from "./phishing-analysis";
import { MemoryForensics } from "./memory-forensics";
import { WebRecon } from "./web-recon";
import { LinuxAuthInvestigation } from "./linux-auth-investigation";
import { WebServerLogAnalysis } from "./web-server-log-analysis";
import { DnsExfiltrationDetection } from "./dns-exfiltration-detection";
import { PowershellAttackDetection } from "./powershell-attack-detection";
import { RdpAttackInvestigation } from "./rdp-attack-investigation";
import { MitreAttackMapping } from "./mitre-attack-mapping";
import { PromptInjection } from "./prompt-injection";
import { SigmaRuleCreation } from "./sigma-rule-creation";
import { YaraRuleBasics } from "./yara-rule-basics";
import { IocHunting } from "./ioc-hunting";
import { InsiderThreatInvestigation } from "./insider-threat-investigation";
import { PersistenceDetection } from "./persistence-detection";
import { PasswordSpraying } from "./password-spraying";
import { FileUploadBypass } from "./file-upload-bypass";
import { IdorHunting } from "./idor-hunting";
import { JwtExploitation } from "./jwt-exploitation";
import { XxeInjection } from "./xxe-injection";
import { DetectionTuning } from "./detection-tuning";
import { SigmaToSplunk } from "./sigma-to-splunk";
import { LlmJailbreaking } from "./llm-jailbreaking";
import { AiDataLeakage } from "./ai-data-leakage";
import { WindowsRegistryAnalysis } from "./windows-registry-analysis";
import { BrowserForensics } from "./browser-forensics";
import { CloudIamMisconfiguration } from "./cloud-iam-misconfiguration";
import { CloudtrailAnalysis } from "./cloudtrail-analysis";
import { VirustotalInvestigation } from "./virustotal-investigation";
import { PhishingClickIncident } from "./phishing-click-incident";

export type LabContentProps = { labId: string; userId: string };

type LabContent = (props: LabContentProps) => React.ReactNode | Promise<React.ReactNode>;

const REGISTRY: Record<string, LabContent> = {
  "welcome-ctf": WelcomeCtf,
  "sql-injection-101": SqlInjection101,
  "soc-alert-investigation": SocAlertInvestigation,
  "network-forensics-101": NetworkForensics101,
  "privilege-escalation": PrivilegeEscalation,
  "osint-investigation": OsintInvestigation,
  "windows-log-analysis": WindowsLogAnalysis,
  "malware-triage": MalwareTriage,
  "xss-fundamentals": XssFundamentals,
  "ssrf-attack": SsrfAttack,
  "active-directory-101": ActiveDirectory101,
  "phishing-analysis": PhishingAnalysis,
  "memory-forensics": MemoryForensics,
  "web-recon": WebRecon,
  "linux-auth-investigation": LinuxAuthInvestigation,
  "web-server-log-analysis": WebServerLogAnalysis,
  "dns-exfiltration-detection": DnsExfiltrationDetection,
  "powershell-attack-detection": PowershellAttackDetection,
  "rdp-attack-investigation": RdpAttackInvestigation,
  "mitre-attack-mapping": MitreAttackMapping,
  "prompt-injection": PromptInjection,
  "sigma-rule-creation": SigmaRuleCreation,
  "yara-rule-basics": YaraRuleBasics,
  "ioc-hunting": IocHunting,
  "insider-threat-investigation": InsiderThreatInvestigation,
  "persistence-detection": PersistenceDetection,
  "password-spraying": PasswordSpraying,
  "file-upload-bypass": FileUploadBypass,
  "idor-hunting": IdorHunting,
  "jwt-exploitation": JwtExploitation,
  "xxe-injection": XxeInjection,
  "detection-tuning": DetectionTuning,
  "sigma-to-splunk": SigmaToSplunk,
  "llm-jailbreaking": LlmJailbreaking,
  "ai-data-leakage": AiDataLeakage,
  "windows-registry-analysis": WindowsRegistryAnalysis,
  "browser-forensics": BrowserForensics,
  "cloud-iam-misconfiguration": CloudIamMisconfiguration,
  "cloudtrail-analysis": CloudtrailAnalysis,
  "virustotal-investigation": VirustotalInvestigation,
  "phishing-click-incident": PhishingClickIncident,
};

export const TASK_STAGES: Record<string, string[]> = {
  "welcome-ctf": ["task_1", "task_2", "task_3"],
  "sql-injection-101": ["task_1", "task_2", "task_3"],
  "soc-alert-investigation": ["investigation", "task_2", "task_3"],
  "network-forensics-101": ["task_1", "task_2", "task_3"],
  "privilege-escalation": ["task_1", "task_2", "task_3"],
  "osint-investigation": ["task_1", "task_2", "task_3"],
  "windows-log-analysis": ["task_1", "task_2", "task_3"],
  "malware-triage": ["task_1", "task_2", "task_3"],
  "xss-fundamentals": ["task_1", "task_2", "task_3"],
  "ssrf-attack": ["task_1", "task_2", "task_3"],
  "active-directory-101": ["task_1", "task_2", "task_3"],
  "phishing-analysis": ["task_1", "task_2", "task_3"],
  "memory-forensics": ["task_1", "task_2", "task_3"],
  "web-recon": ["task_1", "task_2", "task_3"],
  "linux-auth-investigation": ["task_1", "task_2", "task_3"],
  "web-server-log-analysis": ["task_1", "task_2", "task_3"],
  "dns-exfiltration-detection": ["task_1", "task_2", "task_3"],
  "powershell-attack-detection": ["task_1", "task_2", "task_3"],
  "rdp-attack-investigation": ["task_1", "task_2", "task_3"],
  "mitre-attack-mapping": ["task_1", "task_2", "task_3"],
  "prompt-injection": ["task_1", "task_2", "task_3"],
  "sigma-rule-creation": ["task_1", "task_2", "task_3"],
  "yara-rule-basics": ["task_1", "task_2", "task_3"],
  "ioc-hunting": ["task_1", "task_2", "task_3"],
  "insider-threat-investigation": ["task_1", "task_2", "task_3"],
  "persistence-detection": ["task_1", "task_2", "task_3"],
  "password-spraying": ["task_1", "task_2", "task_3"],
  "file-upload-bypass": ["task_1", "task_2", "task_3"],
  "idor-hunting": ["task_1", "task_2", "task_3"],
  "jwt-exploitation": ["task_1", "task_2", "task_3"],
  "xxe-injection": ["task_1", "task_2", "task_3"],
  "detection-tuning": ["task_1", "task_2", "task_3"],
  "sigma-to-splunk": ["task_1", "task_2", "task_3"],
  "llm-jailbreaking": ["task_1", "task_2", "task_3"],
  "ai-data-leakage": ["task_1", "task_2", "task_3"],
  "windows-registry-analysis": ["task_1", "task_2", "task_3"],
  "browser-forensics": ["task_1", "task_2", "task_3"],
  "cloud-iam-misconfiguration": ["task_1", "task_2", "task_3"],
  "cloudtrail-analysis": ["task_1", "task_2", "task_3"],
  "virustotal-investigation": ["task_1", "task_2", "task_3"],
  "phishing-click-incident": ["task_1", "task_2", "task_3"],
};

export function getLabContent(slug: string): LabContent | null {
  return REGISTRY[slug] ?? null;
}
