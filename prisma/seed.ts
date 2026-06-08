// Master seed — idempotent, safe to run multiple times.
// Covers: all 14 labs + flags + hints, 5 scenario templates, 5 learning paths.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ─── Labs ────────────────────────────────────────────────────────────────────

const LABS = [
  {
    slug: "welcome-ctf",
    title: "Welcome to Sage Forge",
    description: "Your first flag. Find SAGE{...} hidden in the HTML source, decode a Base64 string, and spot a credential leak in a git diff.",
    type: "CTF" as const,
    difficulty: "EASY" as const,
    category: "Misc",
    points: 50,
    published: true,
    flags: [
      { value: "SAGE{w3lc0me_t0_th3_r4nge}", points: 50 },
      { value: "SAGE{b4se64_is_n0t_encrypti0n}", points: 50 },
      { value: "SAGE{h4rdc0d3d_s3cr3ts_l34k}", points: 50 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The flag is hidden in the page markup — not visible text." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Open DevTools (F12) → Elements and look for an HTML comment." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Search for <!-- in the source — the flag is inside." },
      { stage: "task_2", level: 1, pointCost: 10, text: "That string has only letters, numbers, and = padding — a common encoding scheme." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Run atob('paste-string') in the browser console (F12 → Console)." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Decoded output starts SAGE{b4se64..." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Green + lines in a git diff show newly added code." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Look for a constant called SECRET_TOKEN in the added lines." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The flag is the string value assigned to SECRET_TOKEN." },
    ],
  },
  {
    slug: "sql-injection-101",
    title: "SQL Injection 101",
    description: "Bypass a vulnerable login form, extract data via UNION injection, and confirm a blind boolean SQLi — three core injection techniques in one room.",
    type: "CTF" as const,
    difficulty: "EASY" as const,
    category: "Web Security",
    points: 100,
    published: true,
    flags: [
      { value: "SAGE{cl4ss1c_0r_1_eq_1}", points: 100 },
      { value: "SAGE{un10n_s3l3ct_d4t4_l34k}", points: 100 },
      { value: "SAGE{bl1nd_bl00l3an_sqli_m4st3r}", points: 100 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "SQL injection in the username field can break the WHERE clause logic." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Try entering ' OR '1'='1 as the username." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Or use admin'-- to comment out the password check." },
      { stage: "task_2", level: 1, pointCost: 10, text: "A UNION SELECT appends rows from other tables to your results." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Match the column count of the original query — it's 2." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Try: electronics' UNION SELECT email,password FROM users--" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Boolean blind SQLi uses true/false responses to infer data." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Send admin' AND '1'='1-- and admin' AND '1'='0-- to confirm both branches." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Exercise both branches (true and false) to complete the task." },
    ],
  },
  {
    slug: "soc-alert-investigation",
    title: "SOC Alert Investigation",
    description: "A SIEM alert fired at 02:17. Inspect firewall logs, email headers, and DNS telemetry to trace a phishing-driven intrusion and identify the C2 server.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "SOC",
    points: 200,
    published: true,
    flags: [{ value: "SAGE{198.51.100.42}", points: 200 }],
    hints: [
      { stage: "investigation", level: 1, pointCost: 10, text: "Cross-reference the phishing email sender IP with the SIEM lateral movement alert." },
      { stage: "investigation", level: 2, pointCost: 20, text: "Look at which IP appears in both the email header and the outbound firewall logs." },
      { stage: "investigation", level: 3, pointCost: 30, text: "The C2 IP is 198.51.100.42 — submit it as SAGE{198.51.100.42}." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Containment means stopping the spread — not just detecting it." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Network isolation prevents lateral movement. Killing the process removes persistence." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Both actions are needed: isolate the host AND terminate the process." },
      { stage: "task_3", level: 1, pointCost: 10, text: "The attacker established persistence — look at which system they tried to reach after initial access." },
      { stage: "task_3", level: 2, pointCost: 20, text: "DNS queries to suspicious domains after initial access suggest C2 beaconing." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The WORKSTATION-07 lateral movement is the correct answer." },
    ],
  },
  {
    slug: "network-forensics-101",
    title: "Network Forensics 101",
    description: "Analyze captured network traffic to identify C2 communication, extract indicators of compromise, and attribute the attack to a known threat actor.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Network Analysis",
    points: 150,
    published: true,
    flags: [{ value: "SAGE{185.220.101.47}", points: 150 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "C2 traffic often beacons on regular intervals to non-standard ports." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Look for outbound connections to IPs that don't belong to known services." },
      { stage: "task_1", level: 3, pointCost: 30, text: "The C2 IP is 185.220.101.47 — a known Tor exit node used by threat actors." },
      { stage: "task_2", level: 1, pointCost: 10, text: "HTTP POST requests with base64-encoded bodies are common for data exfiltration." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Decode the POST body — what kind of data is being exfiltrated?" },
      { stage: "task_2", level: 3, pointCost: 30, text: "The exfil payload contains credential hashes extracted from the host." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Threat actors are often attributed via their C2 infrastructure and TTPs." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Cross-reference the C2 IP with threat intel databases — it maps to a known APT." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The Tor exit node pattern and credential theft TTPs match a Russian cybercriminal group." },
    ],
  },
  {
    slug: "privilege-escalation",
    title: "Linux Privilege Escalation",
    description: "You have a low-privilege shell on a Linux server. Find misconfigurations in SUID binaries, sudo rules, and cron jobs to escalate to root.",
    type: "RED_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Linux Security",
    points: 200,
    published: true,
    flags: [{ value: "SAGE{r00t_fl4g_c4ptured}", points: 200 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "SUID binaries run as the file owner regardless of who executes them." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Run: find / -perm -4000 -type f 2>/dev/null to list SUID binaries." },
      { stage: "task_1", level: 3, pointCost: 30, text: "GTFOBins documents exploitation paths for common SUID binaries." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Check your sudo rights with: sudo -l" },
      { stage: "task_2", level: 2, pointCost: 20, text: "If you can run a binary as root with sudo, check GTFOBins for escalation." },
      { stage: "task_2", level: 3, pointCost: 30, text: "sudo vim → :!/bin/bash spawns a root shell." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Once root, read /root/flag.txt to get the final flag." },
      { stage: "task_3", level: 2, pointCost: 20, text: "cat /root/flag.txt" },
      { stage: "task_3", level: 3, pointCost: 30, text: "The flag is SAGE{r00t_fl4g_c4ptured}" },
    ],
  },
  {
    slug: "osint-investigation",
    title: "OSINT: Follow the Trail",
    description: "A phishing email arrived. Use open-source intelligence — WHOIS, DNS records, and certificate transparency — to trace the attacker's infrastructure.",
    type: "CTF" as const,
    difficulty: "EASY" as const,
    category: "OSINT",
    points: 100,
    published: true,
    flags: [
      { value: "SAGE{91.108.4.33}", points: 100 },
      { value: "SAGE{ns1.bulletproof-hosting.biz}", points: 100 },
      { value: "SAGE{4_d0m41ns_s4me_1nfr4}", points: 100 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "WHOIS records reveal the registrant IP and registration details for a domain." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Query the sending domain's WHOIS record — look for the IP in the abuse contact section." },
      { stage: "task_1", level: 3, pointCost: 30, text: "The IP 91.108.4.33 resolves from the domain — submit as SAGE{91.108.4.33}." },
      { stage: "task_2", level: 1, pointCost: 10, text: "DNS NS records reveal which hosting provider manages a domain." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Bulletproof hosting providers are often used by threat actors for resilient C2." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The nameserver is ns1.bulletproof-hosting.biz" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Certificate Transparency logs record all SSL certs issued for a domain." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Check crt.sh for the sending domain — how many domains share the same infrastructure?" },
      { stage: "task_3", level: 3, pointCost: 30, text: "4 domains share the same infrastructure — submit SAGE{4_d0m41ns_s4me_1nfr4}." },
    ],
  },
  {
    slug: "windows-log-analysis",
    title: "Windows Log Analysis",
    description: "Parse Windows Security and Sysmon event logs to reconstruct a lateral movement attack chain — from initial access to domain controller compromise.",
    type: "BLUE_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Log Analysis",
    points: 250,
    published: true,
    flags: [{ value: "SAGE{185.220.101.47}", points: 250 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Event ID 4625 is a failed logon. A spike in failures from one source indicates brute force." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Sort the Security log by Event ID 4625 and find the source workstation." },
      { stage: "task_1", level: 3, pointCost: 30, text: "DESKTOP-HR03 generated 47 failed logons in 3 minutes — classic brute force." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Event ID 4688 logs new process creation. Sysmon Event ID 1 captures the full command line." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Search for PsExec, net use, or wmic in Sysmon logs — common lateral movement tools." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The attacker used PsExec to move from DESKTOP-HR03 to DC01." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Sysmon Event ID 3 logs network connections including the destination IP." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Filter for outbound connections from DC01 after the lateral movement." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The exfil destination is 185.220.101.47 — submit as SAGE{185.220.101.47}." },
    ],
  },
  {
    slug: "malware-triage",
    title: "Malware Triage",
    description: "Perform static and behavioral analysis on a suspicious executable to determine its capabilities, persistence mechanism, and C2 mutex name.",
    type: "BLUE_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Malware Analysis",
    points: 300,
    published: true,
    flags: [{ value: "SAGE{AsyncMutex_6SI8OkPnk}", points: 300 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The PE header contains metadata — check the compilation timestamp and linker version." },
      { stage: "task_1", level: 2, pointCost: 20, text: "String extraction (strings command) reveals hardcoded C2 domains, registry keys, and mutex names." },
      { stage: "task_1", level: 3, pointCost: 30, text: "The import table shows which Windows APIs the binary uses — network + registry APIs = RAT." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Persistence mechanisms include registry Run keys, scheduled tasks, and service creation." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Look for HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run in the strings." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The malware adds itself to the registry Run key under the name 'WindowsUpdater'." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Mutexes prevent multiple instances of malware running simultaneously." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Search the strings output for 'Mutex' or 'CreateMutex' — what name does it use?" },
      { stage: "task_3", level: 3, pointCost: 30, text: "The mutex is AsyncMutex_6SI8OkPnk — submit as SAGE{AsyncMutex_6SI8OkPnk}." },
    ],
  },
  {
    slug: "xss-fundamentals",
    title: "XSS Fundamentals",
    description: "Discover and exploit Cross-Site Scripting vulnerabilities — reflected, stored, and CSP bypass — across three progressively hardened targets.",
    type: "CTF" as const,
    difficulty: "EASY" as const,
    category: "Web Security",
    points: 100,
    published: true,
    flags: [{ value: "SAGE{cdn_bypass_csp_byp4ss}", points: 100 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Reflected XSS means user input is echoed back into the HTML without sanitization." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Try injecting a <script> tag in the input field." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Payload: <script>alert(document.domain)</script>" },
      { stage: "task_2", level: 1, pointCost: 10, text: "When XSS fires, document.cookie contains the victim's session tokens." },
      { stage: "task_2", level: 2, pointCost: 20, text: "What does document.cookie return when the script executes?" },
      { stage: "task_2", level: 3, pointCost: 30, text: "The answer is 'Session cookies' — that's what document.cookie retrieves." },
      { stage: "task_3", level: 1, pointCost: 10, text: "CSP restricts which scripts can execute — but trusting a CDN is a bypass vector." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Read the CSP header: which external domain is explicitly allowed?" },
      { stage: "task_3", level: 3, pointCost: 30, text: "cdn.jsdelivr.net is trusted — load a script from there to bypass the CSP." },
    ],
  },
  {
    slug: "ssrf-attack",
    title: "SSRF Attack",
    description: "Exploit Server-Side Request Forgery to pivot from a web app to cloud metadata, extract AWS credentials, and access the internal admin API.",
    type: "RED_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Web Security",
    points: 200,
    published: true,
    flags: [
      { value: "SAGE{cl0ud_m3t4d4t4_ssrf}", points: 200 },
      { value: "SAGE{ssrf_1nt3rn4l_4cc3ss}", points: 200 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "SSRF lets you make the server fetch URLs on your behalf — including internal ones." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Try pointing the URL parameter at http://localhost/ or http://127.0.0.1/" },
      { stage: "task_1", level: 3, pointCost: 30, text: "The server fetches any URL you give it — even internal ones it shouldn't expose." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Cloud instances expose metadata at a special IP address: 169.254.169.254" },
      { stage: "task_2", level: 2, pointCost: 20, text: "Try: http://169.254.169.254/latest/meta-data/iam/security-credentials/" },
      { stage: "task_2", level: 3, pointCost: 30, text: "The metadata endpoint returns AWS credentials — submit as SAGE{cl0ud_m3t4d4t4_ssrf}." },
      { stage: "task_3", level: 1, pointCost: 10, text: "With AWS creds, you can call the internal admin API directly." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The admin endpoint is at http://internal-admin.local/api/flag" },
      { stage: "task_3", level: 3, pointCost: 30, text: "The response contains SAGE{ssrf_1nt3rn4l_4cc3ss}." },
    ],
  },
  {
    slug: "active-directory-101",
    title: "Active Directory 101",
    description: "Enumerate a Windows domain, discover Kerberoastable service accounts, crack the TGS hash offline, and perform Pass-the-Hash lateral movement to the Domain Controller.",
    type: "RED_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Active Directory",
    points: 250,
    published: true,
    flags: [{ value: "SAGE{p4ss_th3_h4sh_4dm1n}", points: 250 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "BloodHound and ldapdomaindump map out AD permissions and attack paths visually." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Run GetUserSPNs.py (Impacket) to list service accounts with SPNs set." },
      { stage: "task_1", level: 3, pointCost: 30, text: "The svc_backup account has an SPN set — request a TGS and capture the hash." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Kerberoasted hashes can be cracked offline with hashcat or john." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Use hashcat with -m 13100 (Kerberos TGS-REP) and rockyou.txt." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The password cracks to 'Password123!' — now you have domain credentials." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Pass-the-Hash uses NTLM hashes instead of plaintext passwords for authentication." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Use psexec.py or wmiexec.py from Impacket with the NTLM hash." },
      { stage: "task_3", level: 3, pointCost: 30, text: "psexec.py domain/admin@DC01 -hashes :NTLM_HASH spawns a SYSTEM shell." },
    ],
  },
  {
    slug: "phishing-analysis",
    title: "Phishing Email Analysis",
    description: "Analyze a suspicious email to identify display-name spoofing, decode a defanged malicious URL, and extract the macro persistence command.",
    type: "BLUE_TEAM" as const,
    difficulty: "EASY" as const,
    category: "Email Security",
    points: 100,
    published: true,
    flags: [{ value: "SAGE{sp00f_m4cr0_p3rs1st3nc3}", points: 100 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Phishing indicators: display name mismatch, suspicious Reply-To, unusual X-Mailer headers." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The From: display name says 'IT Support' but the actual email domain is wrong." },
      { stage: "task_1", level: 3, pointCost: 30, text: "All three indicators together confirm the spoofed email: wrong domain + Reply-To mismatch + PhishKit X-Mailer." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Defanging replaces dots with [.] and https with hxxps to prevent accidental clicks." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Re-fang the URL: replace hxxps→https and [.]→. to reveal the actual domain." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The domain resolves to a known phishing kit hosting provider." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Macros can persist via the registry Run key or scheduled tasks." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The reg add command in the macro writes to HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The Run key is the persistence mechanism — that's the answer." },
    ],
  },
  {
    slug: "memory-forensics",
    title: "Memory Forensics",
    description: "Use Volatility-style commands to identify malicious processes, dump suspicious network connections, and detect process hollowing in a live memory image.",
    type: "BLUE_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Memory Analysis",
    points: 300,
    published: true,
    flags: [{ value: "SAGE{pr0c3ss_h0ll0w1ng_d3t3ct3d}", points: 300 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "pslist/pstree shows all running processes — look for parent-child anomalies." },
      { stage: "task_1", level: 2, pointCost: 20, text: "svchost.exe should only spawn as a child of services.exe — if it doesn't, it's suspicious." },
      { stage: "task_1", level: 3, pointCost: 30, text: "PID 1492 (svchost.exe) has explorer.exe as parent — abnormal, suggests injection." },
      { stage: "task_2", level: 1, pointCost: 10, text: "netscan shows active and closed network connections at the time of the dump." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Look for established connections to non-standard ports from suspicious processes." },
      { stage: "task_2", level: 3, pointCost: 30, text: "PID 1492 has an established connection to 185.220.101.47:4444 — classic C2 port." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Process hollowing: legit process started suspended, memory replaced with malware." },
      { stage: "task_3", level: 2, pointCost: 20, text: "malfind detects memory regions with execute permissions that differ from the on-disk image." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The technique is process hollowing — submit SAGE{pr0c3ss_h0ll0w1ng_d3t3ct3d}." },
    ],
  },
  {
    slug: "web-recon",
    title: "Web Reconnaissance",
    description: "Gather intelligence on a target using robots.txt enumeration, exposed .git directory discovery, and subdomain enumeration via certificate transparency.",
    type: "CTF" as const,
    difficulty: "EASY" as const,
    category: "Reconnaissance",
    points: 100,
    published: true,
    flags: [{ value: "SAGE{r3c0n_r0b0ts_g1t_subd0m41n}", points: 100 }],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "robots.txt tells search engines what not to index — attackers read it first." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Look for a Disallow path containing 'admin' in the robots.txt file." },
      { stage: "task_1", level: 3, pointCost: 30, text: "/admin/panel is disallowed — the answer to the question." },
      { stage: "task_2", level: 1, pointCost: 10, text: "An exposed .git directory contains the full version history of the source code." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Check /.git/config and /.git/COMMIT_EDITMSG for developer info." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Exposed .git leaks source code, commit history, AND credentials." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Certificate Transparency logs record all issued SSL certs — search crt.sh." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Look for subdomains that suggest staging or admin interfaces." },
      { stage: "task_3", level: 3, pointCost: 30, text: "staging.target.com suggests a non-production environment that may be less hardened." },
    ],
  },
];

// ─── Scenario Templates ───────────────────────────────────────────────────────

const TEMPLATES = [
  {
    slug: "phishing-to-ransomware",
    name: "Phishing to Ransomware",
    description: "A targeted phishing campaign escalates to full ransomware deployment. Stop the kill chain before encryption begins.",
    industry: "Financial Services",
    difficulty: "MEDIUM" as const,
    published: true,
  },
  {
    slug: "insider-threat",
    name: "Insider Threat: The Disgruntled Admin",
    description: "A privileged IT administrator abuses access after a denied promotion. Contain the breach before patient data is exfiltrated.",
    industry: "Healthcare",
    difficulty: "HARD" as const,
    published: true,
  },
  {
    slug: "cloud-misconfiguration",
    name: "Cloud Misconfiguration Crisis",
    description: "A public S3 bucket contains AWS credentials. The attacker pivots through IAM to production databases. Stop the breach before cloud sprawl makes containment impossible.",
    industry: "Technology",
    difficulty: "MEDIUM" as const,
    published: true,
  },
  {
    slug: "supply-chain-attack",
    name: "Supply Chain Compromise",
    description: "A backdoor in a widely-used npm package your company depends on. 3 million weekly downloads affected. Coordinate disclosure, patch, and navigate a PR firestorm.",
    industry: "Software Development",
    difficulty: "HARD" as const,
    published: true,
  },
  {
    slug: "data-breach",
    name: "Data Breach: SQL Injection",
    description: "Your WAF blocked an injection attempt — but logs show it succeeded 6 hours earlier. 450k customer records may be exfiltrated. GDPR requires notification in 72 hours.",
    industry: "E-Commerce",
    difficulty: "MEDIUM" as const,
    published: true,
  },
];

// ─── Learning Paths ───────────────────────────────────────────────────────────

const PATHS = [
  {
    slug: "ctf-starter",
    title: "CTF Starter Pack",
    description: "Your first steps into Capture the Flag. Master source recon, encoding, OSINT, and web reconnaissance — the foundation every security professional needs.",
    order: 0,
    published: true,
    labs: ["welcome-ctf", "osint-investigation", "web-recon", "xss-fundamentals"],
  },
  {
    slug: "web-security-essentials",
    title: "Web Security Essentials",
    description: "Understand and exploit the most dangerous web vulnerabilities — SQL injection, XSS, and SSRF — that appear in real-world breaches every week.",
    order: 1,
    published: true,
    labs: ["sql-injection-101", "xss-fundamentals", "ssrf-attack"],
  },
  {
    slug: "soc-analyst-fundamentals",
    title: "SOC Analyst Fundamentals",
    description: "Master alert triage, log analysis, network forensics, and phishing investigation — the core skills every blue team analyst uses daily.",
    order: 2,
    published: true,
    labs: ["phishing-analysis", "soc-alert-investigation", "network-forensics-101", "windows-log-analysis"],
  },
  {
    slug: "advanced-forensics",
    title: "Advanced Forensics",
    description: "Go deep on malware analysis and memory forensics. Identify process hollowing, extract mutex names, and reconstruct attacker behaviour from artifacts.",
    order: 3,
    published: true,
    labs: ["malware-triage", "memory-forensics"],
  },
  {
    slug: "red-team-fundamentals",
    title: "Red Team Fundamentals",
    description: "Learn offensive techniques used in real penetration tests — Linux privilege escalation and Active Directory attacks including Kerberoasting and Pass-the-Hash.",
    order: 4,
    published: true,
    labs: ["privilege-escalation", "active-directory-101"],
  },
];

// ─── Competitions ─────────────────────────────────────────────────────────────

const COMPETITIONS = [
  {
    name: "Sage Cup 2026 — Season 1",
    slug: "sage-cup-2026-s1",
    description:
      "The inaugural Sage Range open competition. Race the clock across four labs spanning CTF, web security, and blue team forensics. Top three finishers earn a verified competition certificate. All skill levels welcome — scoring is cumulative across labs.",
    startDate: new Date("2026-07-01T09:00:00Z"),
    endDate: new Date("2026-07-31T23:59:59Z"),
    published: true,
    labSlugs: ["welcome-ctf", "sql-injection-101", "network-forensics-101", "phishing-analysis"],
  },
  {
    name: "Blue Team Gauntlet — July 2026",
    slug: "blue-team-gauntlet-jul26",
    description:
      "A blue team-only competition for SOC analysts and defenders. Four high-difficulty labs covering log analysis, memory forensics, malware triage, and Windows event correlation. This is not a beginner event — every lab is HARD or above. Points are awarded for speed as well as correctness.",
    startDate: new Date("2026-07-15T09:00:00Z"),
    endDate: new Date("2026-07-22T23:59:59Z"),
    published: true,
    labSlugs: ["windows-log-analysis", "malware-triage", "memory-forensics", "soc-alert-investigation"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding labs...");
  for (const lab of LABS) {
    const { flags, hints, ...labData } = lab;

    const record = await db.lab.upsert({
      where: { slug: lab.slug },
      update: { ...labData },
      create: { ...labData },
    });

    // Seed flags (only create if none exist)
    const existingFlags = await db.flag.count({ where: { labId: record.id } });
    if (existingFlags === 0) {
      for (const flag of flags) {
        await db.flag.create({ data: { labId: record.id, ...flag } });
      }
    }

    // Seed hints (only create if none exist)
    const existingHints = await db.labHint.count({ where: { labId: record.id } });
    if (existingHints === 0) {
      for (const hint of hints) {
        await db.labHint.create({ data: { labId: record.id, ...hint } });
      }
    }

    console.log(`  ✓ ${lab.slug}`);
  }

  console.log("\nSeeding scenario templates...");
  for (const template of TEMPLATES) {
    await db.scenarioTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
    console.log(`  ✓ ${template.slug}`);
  }

  console.log("\nSeeding learning paths...");
  for (const pathData of PATHS) {
    const { labs: labSlugs, ...pathMeta } = pathData;

    const path = await db.learningPath.upsert({
      where: { slug: pathData.slug },
      update: pathMeta,
      create: pathMeta,
    });

    for (let i = 0; i < labSlugs.length; i++) {
      const lab = await db.lab.findUnique({ where: { slug: labSlugs[i] } });
      if (!lab) { console.warn(`    ⚠ Lab not found: ${labSlugs[i]}`); continue; }
      await db.pathLab.upsert({
        where: { pathId_labId: { pathId: path.id, labId: lab.id } },
        update: { order: i + 1 },
        create: { pathId: path.id, labId: lab.id, order: i + 1 },
      });
    }

    console.log(`  ✓ ${pathData.slug} (${labSlugs.length} labs)`);
  }

  console.log("\nSeeding competitions...");
  for (const comp of COMPETITIONS) {
    await db.competition.upsert({
      where: { slug: comp.slug },
      update: {
        name: comp.name,
        description: comp.description,
        startDate: comp.startDate,
        endDate: comp.endDate,
        published: comp.published,
        labSlugs: comp.labSlugs,
      },
      create: comp,
    });
    console.log(`  ✓ ${comp.slug}`);
  }

  console.log("\nDone. All content seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
