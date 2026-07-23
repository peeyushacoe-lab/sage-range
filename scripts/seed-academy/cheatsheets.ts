// Cheat sheets from the Phase 1 appendix. Content is markdown-ish text
// rendered by the cheat-sheet viewer.

export const CHEAT_SHEETS: { title: string; description: string; content: string }[] = [
  {
    title: "Common Ports & Protocols",
    description: "The ports every analyst should know cold.",
    content: `# Common Ports & Protocols

| Port | Protocol | Purpose |
|------|----------|---------|
| 20/21 | FTP | File transfer (insecure) |
| 22 | SSH | Secure remote shell |
| 23 | Telnet | Remote shell (insecure) |
| 25 | SMTP | Sending email |
| 53 | DNS | Name resolution |
| 80 | HTTP | Web (unencrypted) |
| 110 | POP3 | Retrieving email |
| 143 | IMAP | Retrieving email |
| 443 | HTTPS | Web (encrypted) |
| 445 | SMB | Windows file sharing |
| 3306 | MySQL | Database |
| 3389 | RDP | Windows remote desktop |
| 5432 | PostgreSQL | Database |

**Remember:** 22 (SSH), 80 (HTTP), 443 (HTTPS), 53 (DNS), and 3389 (RDP) are the highest-value ports to memorise first.`,
  },
  {
    title: "Linux Command Quick Reference",
    description: "Navigation, permissions, processes, and networking.",
    content: `# Linux Command Quick Reference

## Navigation & Files
\`\`\`
pwd                 # where am I
ls -la              # list all, detailed
cd /path            # change directory
cat / less file     # view a file
find / -name '*.conf' 2>/dev/null   # find files
grep 'pattern' file # search text
\`\`\`

## Permissions
\`\`\`
chmod 755 file      # rwx / r-x / r-x
chmod +x script.sh  # make executable
chown user:group f  # change ownership
find / -perm -4000 2>/dev/null   # SUID binaries
\`\`\`

## Processes & Services
\`\`\`
ps aux              # all processes
top / htop          # live view
kill <PID>          # terminate
systemctl status s  # service state
crontab -l          # scheduled jobs
\`\`\`

## Networking
\`\`\`
ss -tulpn           # listening ports + process
ss -tp              # active connections
lsof -i :<port>     # what uses a port
\`\`\`

## Privilege
\`\`\`
whoami / id         # who am I
sudo -l             # what can I run as root
\`\`\``,
  },
  {
    title: "OWASP Top 10 Web Vulnerabilities",
    description: "The web flaws you'll meet most, with one-line fixes.",
    content: `# OWASP Top 10 — Quick Reference

| Vulnerability | What it is | Primary fix |
|---------------|-----------|-------------|
| Broken Access Control | Acting outside your permissions (IDOR) | Authorise every request server-side |
| Cryptographic Failures | Weak/missing encryption | Use TLS; hash passwords with bcrypt/Argon2 |
| Injection (SQLi) | Input treated as code | Parameterised queries |
| Insecure Design | Missing security by design | Threat model; secure defaults |
| Security Misconfiguration | Weak/default settings | Harden; remove defaults |
| Vulnerable Components | Outdated dependencies | Patch; use SCA (npm audit) |
| Auth Failures | Weak login/session handling | MFA, rate limiting, strong sessions |
| Integrity Failures | Untrusted updates/data | Verify signatures |
| Logging Failures | Can't detect attacks | Log & monitor security events |
| SSRF | Server fetches attacker URLs | Allow-list destinations; block internal ranges |

**Golden rule:** Never trust client input. Validate on input, encode on output, parameterise queries.`,
  },
  {
    title: "Incident Response Checklist",
    description: "The PICERL lifecycle as an actionable checklist.",
    content: `# Incident Response Checklist (PICERL)

## 1. Preparation (before anything happens)
- [ ] IR plan documented and accessible
- [ ] Contacts and escalation paths known
- [ ] Tools and logging in place

## 2. Identification
- [ ] Confirm the incident is real (not a false positive)
- [ ] Scope it — which hosts, users, data?
- [ ] Classify severity

## 3. Containment
- [ ] Isolate affected hosts from the network
- [ ] Disable compromised accounts
- [ ] Block malicious IPs/domains
- [ ] **Preserve evidence** (capture RAM before powering off)

## 4. Eradication
- [ ] Remove malware and attacker persistence (cron, services, accounts)
- [ ] Close the entry point (patch, fix config)

## 5. Recovery
- [ ] Restore from known-clean backups
- [ ] Verify systems are clean before reconnecting
- [ ] Monitor closely for recurrence

## 6. Lessons Learned
- [ ] Document timeline and root cause
- [ ] Update controls and detections
- [ ] Share findings with the team

**Order of volatility:** capture RAM & running processes first, disk later. **Contain before you eradicate.**`,
  },
];
