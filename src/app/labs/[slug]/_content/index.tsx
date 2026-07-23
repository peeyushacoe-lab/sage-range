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
import { AlienvaultOtxPulse } from "./alienvault-otx-pulse";
import { AbuseipdbInvestigation } from "./abuseipdb-investigation";
import { UrlscanInvestigation } from "./urlscan-investigation";
import { DfirTimelineCreation } from "./dfir-timeline-creation";
import { MftAnalysis } from "./mft-analysis";
import { AzureRbacMisconfiguration } from "./azure-rbac-misconfiguration";
import { GcpIamPermissions } from "./gcp-iam-permissions";
import { RansomwareIncident } from "./ransomware-incident";
import { PrefetchAnalysis } from "./prefetch-analysis";
import { UsbArtefacts } from "./usb-artefacts";
import { EventCorrelation } from "./event-correlation";
import { SigmaToSentinel } from "./sigma-to-sentinel";
import { IocFeedIntegration } from "./ioc-feed-integration";
import { DetectionLogicBuilding } from "./detection-logic-building";
import { DetectionValidation } from "./detection-validation";
import { SplunkDetectionHunt } from "./splunk-detection-hunt";
import { UsbForensics } from "./usb-forensics";
import { IncidentSeverityClassification } from "./incident-severity-classification";
import { HydraAdvanced } from "./hydra-advanced";
import { ApiPentesting } from "./api-pentesting";
import { PostExploitationBasics } from "./post-exploitation-basics";
import { BurpSuiteWorkflow } from "./burp-suite-workflow";
import { AdvancedSqlInjection } from "./advanced-sql-injection";
import { AdvancedXss } from "./advanced-xss";
import { Kerberoasting } from "./kerberoasting";
import { DcsyncAttack } from "./dcsync-attack";
import { GoldenTicketAttack } from "./golden-ticket-attack";
import { LateralMovementTechniques } from "./lateral-movement-techniques";
import { SecureAiApis } from "./secure-ai-apis";
import { AiThreatModeling } from "./ai-threat-modeling";
import { AiHallucinationRisks } from "./ai-hallucination-risks";
import { AiSecurityAssessment } from "./ai-security-assessment";
import { DetectAiGeneratedPhishing } from "./detect-ai-generated-phishing";
import { AiAssistedThreatHunting } from "./ai-assisted-threat-hunting";
import { AiDetectionEvaluation } from "./ai-detection-evaluation";
import { WhoisAnalysis } from "./whois-analysis";
import { IocCorrelation } from "./ioc-correlation";
import { ThreatActorProfiling } from "./threat-actor-profiling";
import { MitreNavigator } from "./mitre-navigator";
import { MalwareFamilyResearch } from "./malware-family-research";
import { CampaignAttribution } from "./campaign-attribution";
import { AzureLogsAnalysis } from "./azure-logs-analysis";
import { CloudIncidentResponse } from "./cloud-incident-response";
import { KubernetesBasics } from "./kubernetes-basics";
import { DockerSecurity } from "./docker-security";
import { ContainerEscapeTheory } from "./container-escape-theory";
import { ThreatHuntingLateralMovement } from "./threat-hunting-lateral-movement";
import { MalwareTimelineAnalysis } from "./malware-timeline-analysis";
import { InsiderDataTheft } from "./insider-data-theft";
import { BusinessEmailCompromise } from "./business-email-compromise";
import { DdosAttackIncident } from "./ddos-attack-incident";
import { SupplyChainCompromise } from "./supply-chain-compromise";
import { CloudDataBreach } from "./cloud-data-breach";
import { CredentialStuffingAttack } from "./credential-stuffing-attack";
import { ZeroDayExploitation } from "./zero-day-exploitation";
import { RogueWirelessAp } from "./rogue-wireless-ap";
import { PaymentCardSkimmer } from "./payment-card-skimmer";
import { ThirdPartyVendorCompromise } from "./third-party-vendor-compromise";

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
  "alienvault-otx-pulse": AlienvaultOtxPulse,
  "abuseipdb-investigation": AbuseipdbInvestigation,
  "urlscan-investigation": UrlscanInvestigation,
  "dfir-timeline-creation": DfirTimelineCreation,
  "mft-analysis": MftAnalysis,
  "azure-rbac-misconfiguration": AzureRbacMisconfiguration,
  "gcp-iam-permissions": GcpIamPermissions,
  "ransomware-incident": RansomwareIncident,
  "prefetch-analysis": PrefetchAnalysis,
  "usb-artefacts": UsbArtefacts,
  "event-correlation": EventCorrelation,
  "sigma-to-sentinel": SigmaToSentinel,
  "ioc-feed-integration": IocFeedIntegration,
  "detection-logic-building": DetectionLogicBuilding,
  "detection-validation": DetectionValidation,
  "splunk-detection-hunt": SplunkDetectionHunt,
  "usb-forensics": UsbForensics,
  "incident-severity-classification": IncidentSeverityClassification,
  "hydra-advanced": HydraAdvanced,
  "api-pentesting": ApiPentesting,
  "post-exploitation-basics": PostExploitationBasics,
  "burp-suite-workflow": BurpSuiteWorkflow,
  "advanced-sql-injection": AdvancedSqlInjection,
  "advanced-xss": AdvancedXss,
  "kerberoasting": Kerberoasting,
  "dcsync-attack": DcsyncAttack,
  "golden-ticket-attack": GoldenTicketAttack,
  "lateral-movement-techniques": LateralMovementTechniques,
  "secure-ai-apis": SecureAiApis,
  "ai-threat-modeling": AiThreatModeling,
  "ai-hallucination-risks": AiHallucinationRisks,
  "ai-security-assessment": AiSecurityAssessment,
  "detect-ai-generated-phishing": DetectAiGeneratedPhishing,
  "ai-assisted-threat-hunting": AiAssistedThreatHunting,
  "ai-detection-evaluation": AiDetectionEvaluation,
  "whois-analysis": WhoisAnalysis,
  "ioc-correlation": IocCorrelation,
  "threat-actor-profiling": ThreatActorProfiling,
  "mitre-navigator": MitreNavigator,
  "malware-family-research": MalwareFamilyResearch,
  "campaign-attribution": CampaignAttribution,
  "azure-logs-analysis": AzureLogsAnalysis,
  "cloud-incident-response": CloudIncidentResponse,
  "kubernetes-basics": KubernetesBasics,
  "docker-security": DockerSecurity,
  "container-escape-theory": ContainerEscapeTheory,
  "threat-hunting-lateral-movement": ThreatHuntingLateralMovement,
  "malware-timeline-analysis": MalwareTimelineAnalysis,
  "insider-data-theft": InsiderDataTheft,
  "business-email-compromise": BusinessEmailCompromise,
  "ddos-attack-incident": DdosAttackIncident,
  "supply-chain-compromise": SupplyChainCompromise,
  "cloud-data-breach": CloudDataBreach,
  "credential-stuffing-attack": CredentialStuffingAttack,
  "zero-day-exploitation": ZeroDayExploitation,
  "rogue-wireless-ap": RogueWirelessAp,
  "payment-card-skimmer": PaymentCardSkimmer,
  "third-party-vendor-compromise": ThirdPartyVendorCompromise,
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
  "alienvault-otx-pulse": ["task_1", "task_2", "task_3"],
  "abuseipdb-investigation": ["task_1", "task_2", "task_3"],
  "urlscan-investigation": ["task_1", "task_2", "task_3"],
  "dfir-timeline-creation": ["task_1", "task_2", "task_3"],
  "mft-analysis": ["task_1", "task_2", "task_3"],
  "azure-rbac-misconfiguration": ["task_1", "task_2", "task_3"],
  "gcp-iam-permissions": ["task_1", "task_2", "task_3"],
  "ransomware-incident": ["task_1", "task_2", "task_3"],
  "prefetch-analysis": ["task_1", "task_2", "task_3"],
  "usb-artefacts": ["task_1", "task_2", "task_3"],
  "event-correlation": ["task_1", "task_2", "task_3"],
  "sigma-to-sentinel": ["task_1", "task_2", "task_3"],
  "ioc-feed-integration": ["task_1", "task_2", "task_3"],
  "detection-logic-building": ["task_1", "task_2", "task_3"],
  "detection-validation": ["task_1", "task_2", "task_3"],
  "splunk-detection-hunt": ["task_1", "task_2", "task_3"],
  "usb-forensics": ["task_1", "task_2", "task_3"],
  "incident-severity-classification": ["task_1", "task_2", "task_3"],
  "hydra-advanced": ["task_1", "task_2", "task_3"],
  "api-pentesting": ["task_1", "task_2", "task_3"],
  "post-exploitation-basics": ["task_1", "task_2", "task_3"],
  "burp-suite-workflow": ["task_1", "task_2", "task_3"],
  "advanced-sql-injection": ["task_1", "task_2", "task_3"],
  "advanced-xss": ["task_1", "task_2", "task_3"],
  "kerberoasting": ["task_1", "task_2", "task_3"],
  "dcsync-attack": ["task_1", "task_2", "task_3"],
  "golden-ticket-attack": ["task_1", "task_2", "task_3"],
  "lateral-movement-techniques": ["task_1", "task_2", "task_3"],
  "secure-ai-apis": ["task_1", "task_2", "task_3"],
  "ai-threat-modeling": ["task_1", "task_2", "task_3"],
  "ai-hallucination-risks": ["task_1", "task_2", "task_3"],
  "ai-security-assessment": ["task_1", "task_2", "task_3"],
  "detect-ai-generated-phishing": ["task_1", "task_2", "task_3"],
  "ai-assisted-threat-hunting": ["task_1", "task_2", "task_3"],
  "ai-detection-evaluation": ["task_1", "task_2", "task_3"],
  "whois-analysis": ["task_1", "task_2", "task_3"],
  "ioc-correlation": ["task_1", "task_2", "task_3"],
  "threat-actor-profiling": ["task_1", "task_2", "task_3"],
  "mitre-navigator": ["task_1", "task_2", "task_3"],
  "malware-family-research": ["task_1", "task_2", "task_3"],
  "campaign-attribution": ["task_1", "task_2", "task_3"],
  "azure-logs-analysis": ["task_1", "task_2", "task_3"],
  "cloud-incident-response": ["task_1", "task_2", "task_3"],
  "kubernetes-basics": ["task_1", "task_2", "task_3"],
  "docker-security": ["task_1", "task_2", "task_3"],
  "container-escape-theory": ["task_1", "task_2", "task_3"],
  "threat-hunting-lateral-movement": ["task_1", "task_2", "task_3"],
  "malware-timeline-analysis": ["task_1", "task_2", "task_3"],
  "insider-data-theft": ["task_1", "task_2", "task_3"],
  "business-email-compromise": ["task_1", "task_2", "task_3"],
  "ddos-attack-incident": ["task_1", "task_2", "task_3"],
  "supply-chain-compromise": ["task_1", "task_2", "task_3"],
  "cloud-data-breach": ["task_1", "task_2", "task_3"],
  "credential-stuffing-attack": ["task_1", "task_2", "task_3"],
  "zero-day-exploitation": ["task_1", "task_2", "task_3"],
  "rogue-wireless-ap": ["task_1", "task_2", "task_3"],
  "payment-card-skimmer": ["task_1", "task_2", "task_3"],
  "third-party-vendor-compromise": ["task_1", "task_2", "task_3"],
};

export function getLabContent(slug: string): LabContent | null {
  return REGISTRY[slug] ?? null;
}
