export interface MitreTechniqueRef {
  id: string;
  name: string;
  tactic: string;
}

// Primary ATT&CK techniques for each REDai adversary action
export const REDAI_MITRE_MAP: Record<string, MitreTechniqueRef[]> = {
  PHISH_EMPLOYEE: [
    { id: "T1566.001", name: "Spearphishing Attachment", tactic: "Initial Access" },
    { id: "T1566.002", name: "Spearphishing Link",       tactic: "Initial Access" },
  ],
  STEAL_CREDENTIALS: [
    { id: "T1003.001", name: "LSASS Memory",                    tactic: "Credential Access" },
    { id: "T1555",     name: "Credentials from Password Stores", tactic: "Credential Access" },
  ],
  EXPLOIT_SERVER: [
    { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access" },
    { id: "T1068", name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation" },
  ],
  MOVE_LATERALLY: [
    { id: "T1550.002", name: "Pass the Hash",              tactic: "Lateral Movement" },
    { id: "T1021.002", name: "SMB/Windows Admin Shares",   tactic: "Lateral Movement" },
  ],
  EXFILTRATE_DATA: [
    { id: "T1041", name: "Exfiltration Over C2 Channel",       tactic: "Exfiltration" },
    { id: "T1048", name: "Exfiltration Over Alternative Protocol", tactic: "Exfiltration" },
  ],
  DEPLOY_RANSOMWARE: [
    { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact" },
    { id: "T1490", name: "Inhibit System Recovery",   tactic: "Impact" },
  ],
};

export function getMitreTechniques(action: string): MitreTechniqueRef[] {
  return REDAI_MITRE_MAP[action] ?? [];
}

export function getPrimaryTechnique(action: string): MitreTechniqueRef | null {
  return REDAI_MITRE_MAP[action]?.[0] ?? null;
}
