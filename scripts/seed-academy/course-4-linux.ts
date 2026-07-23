import type { SeedCourse } from "./types";

export const course4: SeedCourse = {
  slug: "linux-security-fundamentals",
  title: "Linux Security Fundamentals",
  subtitle: "The OS that runs the internet",
  description:
    "Linux powers most servers, containers, and security tools. Get comfortable at the command line, understand the filesystem and permission model, learn how processes and networking work, then harden a system and understand how privilege escalation happens — from both sides.",
  category: "BLUE_TEAM",
  difficulty: "MEDIUM",
  estimatedHrs: 16,
  order: 4,
  prerequisites: ["cybersecurity-fundamentals"],
  objectives: [
    "Navigate the Linux command line confidently",
    "Understand the filesystem hierarchy and where things live",
    "Read and set file permissions correctly",
    "Inspect processes, services, and networking",
    "Harden a Linux system against attack",
    "Recognise common privilege-escalation paths",
  ],
  modules: [
    // ─── Module 1 ───────────────────────────────────────────────
    {
      title: "Linux Basics",
      description: "Getting comfortable at the shell.",
      lessons: [
        {
          title: "The Command Line",
          summary: "Your primary tool.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Linux security work happens at the **command line**. The shell (usually **bash**) is where you navigate, inspect, and control the system. A handful of commands cover most navigation:" },
            { type: "CODE", language: "bash", caption: "Core navigation commands", code: "pwd            # print working directory (where am I?)\nls -la         # list all files, with details\ncd /var/log    # change directory\ncat file.txt   # print a file's contents\nless file.txt  # scroll through a large file\ngrep 'error' file.txt   # search inside a file" },
            { type: "CALLOUT", variant: "tip", title: "grep is your best friend", text: "grep searches text for patterns. Piped after other commands (ps aux | grep ssh) it's how you find the needle in the haystack — the one process, log line, or connection that matters." },
            { type: "KNOWLEDGE_CHECK", question: "Which command shows your current directory?", options: [
              { id: "A", text: "ls" },
              { id: "B", text: "pwd" },
              { id: "C", text: "cd" },
              { id: "D", text: "cat" },
            ], correct: "B", explanation: "pwd — 'print working directory' — tells you where you currently are in the filesystem." },
          ],
          flashcards: [
            { front: "What does `pwd` do?", back: "Prints the current working directory." },
            { front: "What does `grep` do?", back: "Searches text for a pattern — great piped after other commands to filter output." },
          ],
        },
        {
          title: "Pipes, Redirects & Find",
          summary: "Combining commands into power tools.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Linux's power comes from **combining** small commands. The **pipe** (`|`) sends one command's output into the next. **Redirects** (`>`, `>>`) send output to files. And `find` locates files across the system." },
            { type: "CODE", language: "bash", caption: "Composition in action", code: "ps aux | grep nginx           # find nginx processes\ncat access.log | grep 404 | wc -l   # count 404s\nfind / -name '*.conf' 2>/dev/null   # find all .conf files\nfind / -perm -4000 2>/dev/null      # find SUID binaries (!)" },
            { type: "CALLOUT", variant: "warning", title: "SUID hunting", text: "find / -perm -4000 lists SUID binaries — programs that run as their owner (often root). Attackers hunt these for privilege escalation, and so should defenders auditing a box." },
            { type: "KNOWLEDGE_CHECK", question: "What does the pipe `|` do in `ps aux | grep ssh`?", options: [
              { id: "A", text: "Runs the two commands separately" },
              { id: "B", text: "Sends the output of ps aux as input to grep" },
              { id: "C", text: "Saves output to a file" },
              { id: "D", text: "Deletes the ssh process" },
            ], correct: "B", explanation: "The pipe feeds the first command's output into the second — here, filtering the process list for 'ssh'." },
          ],
          flashcards: [
            { front: "What does the pipe `|` do?", back: "Sends the output of one command as the input to the next." },
            { front: "What does `find / -perm -4000` find, and why does it matter?", back: "SUID binaries — programs that run as their owner (often root). A key privilege-escalation target." },
          ],
        },
      ],
      quiz: {
        title: "Module 1 Quiz: Command Line",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "To count how many 404 errors are in a log, you might run: cat access.log | grep 404 | ___", options: ["wc -l", "chmod", "cd", "kill"], correct: "wc -l", explanation: "wc -l counts lines." },
          { type: "MULTIPLE_CHOICE", question: "In `ps aux | grep ssh`, what is the pipe doing?", options: ["Deleting ssh", "Feeding ps output into grep to filter it", "Restarting ssh", "Encrypting output"], correct: "Feeding ps output into grep to filter it" },
          { type: "MULTIPLE_CHOICE", question: "Which command scrolls through a large file one screen at a time?", options: ["less", "chmod", "kill", "pwd"], correct: "less" },
          { type: "MULTIPLE_CHOICE", question: "Why do both attackers and defenders run find / -perm -4000?", options: ["To list hidden files", "To find SUID binaries — a privilege-escalation vector", "To count logs", "To reboot"], correct: "To find SUID binaries — a privilege-escalation vector" },
          { type: "FILL_BLANK", question: "The redirect operator that appends output to a file (rather than overwriting) is '>___'.", correct: ">" },
        ],
      },
    },

    // ─── Module 2 ───────────────────────────────────────────────
    {
      title: "The Filesystem",
      description: "Where everything lives.",
      lessons: [
        {
          title: "Filesystem Hierarchy",
          summary: "A map of the system.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Linux organises everything under a single root, `/`. Knowing the key directories tells you where to look:\n\n`/etc` — configuration files (and `/etc/passwd`, `/etc/shadow`).\n`/var/log` — logs.\n`/home` — user home directories.\n`/root` — the root user's home.\n`/tmp` — temporary files (world-writable — attackers love it).\n`/bin`, `/usr/bin` — programs.\n`/proc` — a virtual view of running processes and kernel state." },
            { type: "CALLOUT", variant: "important", title: "/etc/passwd and /etc/shadow", text: "/etc/passwd lists user accounts (world-readable). /etc/shadow holds password hashes and is readable only by root. If you can read /etc/shadow as a normal user, that's a serious misconfiguration." },
            { type: "KNOWLEDGE_CHECK", question: "Where are password hashes stored on a modern Linux system?", options: [
              { id: "A", text: "/etc/passwd" },
              { id: "B", text: "/etc/shadow" },
              { id: "C", text: "/var/log" },
              { id: "D", text: "/home" },
            ], correct: "B", explanation: "/etc/shadow holds the password hashes and is restricted to root. /etc/passwd lists accounts but no longer stores hashes." },
          ],
          flashcards: [
            { front: "What lives in /etc?", back: "Configuration files, including /etc/passwd and /etc/shadow." },
            { front: "/etc/passwd vs /etc/shadow?", back: "passwd = account list (world-readable). shadow = password hashes (root-only)." },
          ],
        },
        {
          title: "Files, Links & Hidden Data",
          summary: "Not everything is obvious.",
          durationMin: 6,
          blocks: [
            { type: "TEXT", text: "In Linux, **everything is a file** — even devices and processes. Files starting with `.` are **hidden** (shown with `ls -a`); attackers hide tools in dot-directories like `/tmp/.hidden`.\n\n**Symbolic links** point to other files, and can be abused to trick programs into touching files they shouldn't. When investigating, always check for hidden files and unexpected links in writable directories." },
            { type: "KNOWLEDGE_CHECK", question: "Why do attackers often hide files with a leading dot (e.g. .backdoor)?", options: [
              { id: "A", text: "It makes them run faster" },
              { id: "B", text: "Dot-files are hidden from a normal `ls` listing" },
              { id: "C", text: "It encrypts them" },
              { id: "D", text: "It gives them root" },
            ], correct: "B", explanation: "Files beginning with a dot don't show in a plain ls, so they're a simple way to hide from a casual look. Use ls -a to reveal them." },
          ],
          flashcards: [
            { front: "How do you list hidden (dot) files?", back: "ls -a — files starting with '.' are hidden from a normal ls." },
            { front: "In Linux, what is treated as a file?", back: "Almost everything — regular files, devices, and even processes (via /proc)." },
          ],
        },
      ],
      quiz: {
        title: "Module 2 Quiz: Filesystem",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "If a normal (non-root) user can read /etc/shadow, this indicates:", options: ["Normal operation", "A serious misconfiguration", "The file is empty", "A network issue"], correct: "A serious misconfiguration", explanation: "/etc/shadow holds password hashes and should be root-only." },
          { type: "MULTIPLE_CHOICE", question: "A virtual directory presenting running processes and kernel state is:", options: ["/proc", "/home", "/boot", "/etc"], correct: "/proc" },
          { type: "MULTIPLE_CHOICE", question: "Which file lists user accounts and is world-readable?", options: ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/root/.bashrc"], correct: "/etc/passwd" },
          { type: "MULTIPLE_CHOICE", question: "Why do attackers hide tools in paths like /tmp/.hidden?", options: ["It runs faster", "Dot-files don't appear in a normal ls listing", "It encrypts them", "It grants root"], correct: "Dot-files don't appear in a normal ls listing" },
          { type: "TRUE_FALSE", question: "Everything in Linux — including devices and processes — is represented as a file.", correct: "true" },
        ],
      },
    },

    // ─── Module 3 ───────────────────────────────────────────────
    {
      title: "Permissions",
      description: "The core of Linux security.",
      lessons: [
        {
          title: "Reading Permissions",
          summary: "rwx, owner, group, other.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "Every file has permissions for three classes — **owner**, **group**, **other** — each with **read (r)**, **write (w)**, and **execute (x)**. `ls -l` shows them:" },
            { type: "CODE", language: "bash", caption: "Reading an ls -l line", code: "-rwxr-xr--  1  alice  devs  2048  file.sh\n │└┬┘└┬┘└┬┘\n │ │  │  └── other:  r--  (read only)\n │ │  └───── group:  r-x  (read + execute)\n │ └──────── owner:  rwx  (read + write + execute)\n └────────── type:   -    (regular file; d = directory)" },
            { type: "KNOWLEDGE_CHECK", question: "For the file above, what can a user in the 'devs' group do?", options: [
              { id: "A", text: "Read, write, and execute" },
              { id: "B", text: "Read and execute, but not write" },
              { id: "C", text: "Only read" },
              { id: "D", text: "Nothing" },
            ], correct: "B", explanation: "The group bits are r-x — read and execute, but no write. Only the owner (alice) has write here." },
          ],
          flashcards: [
            { front: "What are the three permission classes?", back: "Owner, group, and other." },
            { front: "What do r, w, x mean?", back: "Read, write, execute." },
          ],
        },
        {
          title: "chmod, chown & SUID",
          summary: "Setting permissions — and the dangerous bits.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**chmod** changes permissions, often written in octal: `r=4, w=2, x=1`, summed per class. `chmod 755` = owner rwx (7), group r-x (5), other r-x (5). **chown** changes ownership.\n\nBeyond rwx, special bits matter for security. The **SUID** bit makes a program run as its **owner**, regardless of who launches it. A SUID-root binary runs as root — extremely useful, and extremely dangerous if the program can be abused." },
            { type: "CODE", language: "bash", caption: "Permission commands", code: "chmod 600 secret.txt     # owner read/write only\nchmod +x script.sh       # make executable\nchown alice:devs file    # set owner and group\nchmod u+s /path/binary   # set SUID bit (dangerous!)" },
            { type: "CALLOUT", variant: "danger", title: "SUID = escalation risk", text: "chmod 777 (everyone can do everything) and unnecessary SUID-root binaries are classic misconfigurations. An attacker who finds a vulnerable SUID-root program can often become root." },
            { type: "KNOWLEDGE_CHECK", question: "A program with the SUID bit set and owned by root will run:", options: [
              { id: "A", text: "As whoever launched it" },
              { id: "B", text: "As root, regardless of who launched it" },
              { id: "C", text: "Only for root" },
              { id: "D", text: "Never" },
            ], correct: "B", explanation: "SUID makes a binary execute with the owner's privileges. Owned by root, it runs as root for anyone who can execute it — a prime escalation target." },
          ],
          flashcards: [
            { front: "What does chmod 755 mean?", back: "Owner rwx (7), group r-x (5), other r-x (5). (r=4, w=2, x=1.)" },
            { front: "What does the SUID bit do?", back: "Makes a program run as its owner (often root), regardless of who launches it — a key privilege-escalation vector." },
          ],
        },
      ],
      quiz: {
        title: "Module 3 Quiz: Permissions",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "For a file with permissions -rwxr-xr--, what can a member of the file's group do?", options: ["Read, write, execute", "Read and execute only", "Read only", "Nothing"], correct: "Read and execute only", explanation: "Group bits r-x = read + execute, no write." },
          { type: "MULTIPLE_CHOICE", question: "In octal, chmod 600 grants:", options: ["Everyone full access", "Owner read/write only", "Group execute only", "Read for all"], correct: "Owner read/write only" },
          { type: "MULTIPLE_CHOICE", question: "Which command changes a file's owner and group?", options: ["chmod", "chown", "chgrp only", "ls"], correct: "chown" },
          { type: "MULTIPLE_CHOICE", question: "A SUID-root binary is dangerous because if it can be abused, an attacker may:", options: ["Slow the system", "Gain root privileges", "Delete logs only", "Change the hostname"], correct: "Gain root privileges" },
          { type: "TRUE_FALSE", question: "In octal permissions r=4, w=2, x=1, so 5 means read + execute.", correct: "true" },
        ],
      },
    },

    // ─── Module 4 ───────────────────────────────────────────────
    {
      title: "Processes & Services",
      description: "What's running, and how it's managed.",
      lessons: [
        {
          title: "Inspecting Processes",
          summary: "Finding what shouldn't be there.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "A **process** is a running program, each with a **PID** (process ID). Investigating a possibly-compromised box means knowing what's running and whether it belongs there." },
            { type: "CODE", language: "bash", caption: "Process inspection", code: "ps aux              # all processes with user, CPU, memory\ntop / htop          # live, sortable process view\nps aux | grep -v ']' | sort -k3 -r   # sort by CPU\nkill 2841           # terminate PID 2841\nlsof -p 2841        # files/sockets a process has open" },
            { type: "CALLOUT", variant: "warning", title: "Red flags in a process list", text: "Processes running from /tmp, random-looking names, high CPU from an unknown binary, or a process with a deleted executable on disk — all warrant a closer look." },
            { type: "KNOWLEDGE_CHECK", question: "Which is the clearest red flag when reviewing running processes?", options: [
              { id: "A", text: "A web server running as its own service user" },
              { id: "B", text: "An unknown binary executing from /tmp with high CPU" },
              { id: "C", text: "The bash shell you're using" },
              { id: "D", text: "systemd running as PID 1" },
            ], correct: "B", explanation: "Legitimate software rarely runs from /tmp. An unknown high-CPU binary there is a strong indicator of malware — worth immediate investigation." },
          ],
          flashcards: [
            { front: "What does `ps aux` show?", back: "All running processes with their user, CPU, and memory usage." },
            { front: "Name a process red flag on a Linux box.", back: "An unknown binary running from /tmp (or with a deleted executable, or a random name and high CPU)." },
          ],
        },
        {
          title: "Services, systemd & Cron",
          summary: "Persistence lives here.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Background services are managed by **systemd**. `systemctl` controls them. **Cron** schedules recurring tasks. Both are favourite places for attackers to establish **persistence** — a malicious systemd service or cron job restarts their malware after a reboot." },
            { type: "CODE", language: "bash", caption: "Auditing services and scheduled tasks", code: "systemctl list-units --type=service   # running services\nsystemctl status sshd                 # one service's status\ncrontab -l                            # current user's cron jobs\ncat /etc/crontab; ls /etc/cron.*      # system-wide cron" },
            { type: "KNOWLEDGE_CHECK", question: "Why would an attacker add a malicious cron job or systemd service?", options: [
              { id: "A", text: "To speed up the system" },
              { id: "B", text: "For persistence — to survive reboots and re-launch their malware" },
              { id: "C", text: "To free up disk space" },
              { id: "D", text: "To fix a bug" },
            ], correct: "B", explanation: "Cron jobs and systemd services run automatically and survive reboots, making them classic persistence mechanisms." },
          ],
          flashcards: [
            { front: "What manages background services on modern Linux?", back: "systemd (controlled via systemctl)." },
            { front: "Where do attackers commonly hide persistence?", back: "In cron jobs and systemd services — both auto-run and survive reboots." },
          ],
        },
      ],
      quiz: {
        title: "Module 4 Quiz: Processes",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Which command shows the files and network sockets a given process has open?", options: ["lsof -p <PID>", "chmod", "pwd", "cat"], correct: "lsof -p <PID>" },
          { type: "MULTIPLE_CHOICE", question: "To list which command a user's account will run automatically on a schedule, you check:", options: ["crontab -l", "ls -a", "kill", "whoami"], correct: "crontab -l" },
          { type: "MULTIPLE_CHOICE", question: "Why are cron jobs and systemd services favourite spots for attacker persistence?", options: ["They use less memory", "They auto-run and survive reboots", "They are encrypted", "They hide the hostname"], correct: "They auto-run and survive reboots" },
          { type: "MULTIPLE_CHOICE", question: "Which is the clearest process red flag?", options: ["systemd as PID 1", "An unknown high-CPU binary running from /tmp", "Your own bash shell", "A web server as its service user"], correct: "An unknown high-CPU binary running from /tmp" },
          { type: "TRUE_FALSE", question: "A process whose executable file has been deleted from disk warrants a closer look.", correct: "true" },
        ],
      },
    },

    // ─── Module 5 ───────────────────────────────────────────────
    {
      title: "Linux Networking",
      description: "Connections in and out.",
      lessons: [
        {
          title: "Inspecting Network Connections",
          summary: "Who's talking to whom.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "On a server, you need to know what's **listening** (accepting connections) and what's **connected** (talking to remote hosts). Unexpected listeners or outbound connections are prime indicators of compromise." },
            { type: "CODE", language: "bash", caption: "Network inspection", code: "ss -tulpn        # listening TCP/UDP ports + owning process\nss -tp           # active TCP connections\nnetstat -tulpn   # older equivalent of ss\nlsof -i :4444    # what's using port 4444?" },
            { type: "CALLOUT", variant: "warning", title: "Reverse-shell ports", text: "An outbound connection to a strange IP on an odd port (4444, 1337, etc.) from a process like bash or python can be a reverse shell — the attacker's live channel into the box." },
            { type: "KNOWLEDGE_CHECK", question: "You see bash holding an established outbound connection to an unknown IP on port 4444. This most likely indicates:", options: [
              { id: "A", text: "Normal web browsing" },
              { id: "B", text: "A reverse shell — an attacker's live channel" },
              { id: "C", text: "A DNS query" },
              { id: "D", text: "A software update" },
            ], correct: "B", explanation: "A shell process with an outbound connection to an odd port is a textbook reverse shell, giving the attacker interactive access." },
          ],
          flashcards: [
            { front: "What does `ss -tulpn` show?", back: "Listening TCP/UDP ports and the processes that own them." },
            { front: "What is a reverse shell?", back: "An outbound connection from a victim to the attacker, giving them interactive command access — often on odd ports like 4444." },
          ],
        },
        {
          title: "Firewalls & SSH Hardening",
          summary: "Controlling access to the box.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Linux firewalls (**iptables**, **nftables**, or the friendlier **ufw**) control which connections are allowed. Default-deny inbound, then allow only what's needed.\n\n**SSH** is the main remote-access service and a top attack target. Harden it: disable root login, use **key-based authentication** instead of passwords, and consider changing the port and rate-limiting connections." },
            { type: "CODE", language: "bash", caption: "Basic hardening", code: "ufw default deny incoming\nufw allow 22/tcp\nufw enable\n# In /etc/ssh/sshd_config:\n#   PermitRootLogin no\n#   PasswordAuthentication no   (keys only)" },
            { type: "KNOWLEDGE_CHECK", question: "Which SSH setting most improves security against brute-force password attacks?", options: [
              { id: "A", text: "PermitRootLogin yes" },
              { id: "B", text: "PasswordAuthentication no (use keys only)" },
              { id: "C", text: "Allowing all IPs" },
              { id: "D", text: "Disabling the firewall" },
            ], correct: "B", explanation: "Disabling password auth and requiring SSH keys eliminates password brute-forcing entirely — keys can't be guessed like passwords." },
          ],
          flashcards: [
            { front: "Three ways to harden SSH?", back: "Disable root login, use key-based auth (disable passwords), and rate-limit / change the port." },
            { front: "What's a sensible default firewall policy?", back: "Default-deny inbound, then allow only the specific ports you need." },
          ],
        },
      ],
      quiz: {
        title: "Module 5 Quiz: Networking",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "You need to know what is using port 4444. Which command answers that directly?", options: ["lsof -i :4444", "pwd", "chmod 4444", "kill 4444"], correct: "lsof -i :4444" },
          { type: "MULTIPLE_CHOICE", question: "Why is disabling SSH password authentication (keys only) so effective?", options: ["Keys load faster", "Keys can't be guessed like passwords, eliminating brute force", "It disables the firewall", "It hides the port"], correct: "Keys can't be guessed like passwords, eliminating brute force" },
          { type: "MULTIPLE_CHOICE", question: "Setting PermitRootLogin no in sshd_config does what?", options: ["Blocks all logins", "Prevents logging in directly as root over SSH", "Disables the firewall", "Removes the root account"], correct: "Prevents logging in directly as root over SSH" },
          { type: "MULTIPLE_CHOICE", question: "A shell process (bash/python) holding an outbound connection to a strange IP on an odd port is most likely a:", options: ["Software update", "Reverse shell / attacker channel", "DNS query", "Backup job"], correct: "Reverse shell / attacker channel" },
          { type: "TRUE_FALSE", question: "'Default deny incoming, then allow only needed ports' is a sound firewall policy.", correct: "true" },
        ],
      },
    },

    // ─── Module 6 ───────────────────────────────────────────────
    {
      title: "System Hardening",
      description: "Reducing the attack surface.",
      lessons: [
        {
          title: "Hardening Principles",
          summary: "Less is more.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**Hardening** means systematically reducing what an attacker can exploit:\n\n- **Minimise** — remove unused packages and disable unneeded services. Every running service is attack surface.\n- **Patch** — keep everything updated.\n- **Least privilege** — no unnecessary root, no world-writable files, minimal SUID.\n- **Strong auth** — SSH keys, MFA where possible.\n- **Logging & monitoring** — so you'd notice an intrusion.\n\nSecurity benchmarks like the **CIS Benchmarks** give concrete, checklist-style hardening guidance per OS." },
            { type: "KNOWLEDGE_CHECK", question: "Why does disabling unused services improve security?", options: [
              { id: "A", text: "It frees disk space only" },
              { id: "B", text: "Each running service is attack surface; fewer services means fewer ways in" },
              { id: "C", text: "It speeds up boot only" },
              { id: "D", text: "It has no security benefit" },
            ], correct: "B", explanation: "Every listening service is a potential entry point. Removing what you don't need shrinks the attack surface." },
          ],
          flashcards: [
            { front: "What is system hardening?", back: "Systematically reducing attack surface — removing unused software/services, patching, least privilege, strong auth, and monitoring." },
            { front: "What are the CIS Benchmarks?", back: "Consensus, checklist-style hardening guides with concrete settings for each operating system." },
          ],
        },
        {
          title: "Users, sudo & Auditing",
          summary: "Controlling and recording privilege.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Instead of sharing the root password, grant specific admin rights via **sudo**, configured in `/etc/sudoers`. Every sudo use is logged, giving accountability.\n\nAudit accounts regularly: disable unused accounts, ensure no account other than root has UID 0, and check for users with empty passwords. Tools like **auditd** record security-relevant events for later review." },
            { type: "CODE", language: "bash", caption: "Account auditing", code: "awk -F: '$3==0 {print $1}' /etc/passwd   # any UID-0 accounts besides root?\nsudo -l                                  # what can I run via sudo?\nlast                                     # recent logins\ngrep sudo /var/log/auth.log              # sudo usage history" },
            { type: "CALLOUT", variant: "danger", title: "A second UID-0 account", text: "Only root should have UID 0. If awk finds another account with UID 0, it has root-equivalent power — a classic backdoor an attacker plants." },
            { type: "KNOWLEDGE_CHECK", question: "Why is sudo preferred over sharing the root password?", options: [
              { id: "A", text: "It's faster to type" },
              { id: "B", text: "It grants specific rights per user and logs every use, giving accountability" },
              { id: "C", text: "It disables the firewall" },
              { id: "D", text: "It encrypts the disk" },
            ], correct: "B", explanation: "sudo grants granular, per-user privileges and records each use — you know who did what, unlike a shared root password." },
          ],
          flashcards: [
            { front: "Why use sudo instead of a shared root password?", back: "It grants specific rights per user and logs every use — accountability and least privilege." },
            { front: "How many accounts should have UID 0?", back: "Exactly one — root. Any other UID-0 account is a backdoor." },
          ],
        },
      ],
      quiz: {
        title: "Module 6 Quiz: Hardening",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "The command `awk -F: '$3==0 {print $1}' /etc/passwd` is used to find:", options: ["Empty files", "Any account with UID 0 (root-equivalent)", "Large logs", "Open ports"], correct: "Any account with UID 0 (root-equivalent)" },
          { type: "MULTIPLE_CHOICE", question: "Compared to sharing the root password, using sudo gives you:", options: ["Faster typing", "Per-user granular rights plus a log of every use", "A disabled firewall", "Encrypted disks"], correct: "Per-user granular rights plus a log of every use" },
          { type: "MULTIPLE_CHOICE", question: "Which command shows what the current user is permitted to run as root?", options: ["sudo -l", "ls -la", "uname -a", "pwd"], correct: "sudo -l" },
          { type: "MULTIPLE_CHOICE", question: "auditd is used to:", options: ["Format disks", "Record security-relevant events for later review", "Speed up boot", "Manage passwords"], correct: "Record security-relevant events for later review" },
          { type: "TRUE_FALSE", question: "Removing unused packages and disabling unneeded services reduces attack surface.", correct: "true" },
        ],
      },
    },

    // ─── Module 7 ───────────────────────────────────────────────
    {
      title: "Privilege Escalation",
      description: "From user to root — and stopping it.",
      lessons: [
        {
          title: "Common Escalation Paths",
          summary: "How attackers climb.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "After gaining a foothold as a low-privilege user, attackers hunt for a way to **root**. The usual suspects:\n\n- **Misconfigured sudo** — a user allowed to run a program as root that can spawn a shell.\n- **SUID binaries** — vulnerable or abusable SUID-root programs.\n- **Writable files run by root** — e.g. a root cron job running a script you can edit.\n- **Kernel exploits** — an unpatched kernel vulnerability.\n- **Credential reuse** — passwords or keys left lying in files." },
            { type: "CODE", language: "bash", caption: "Enumeration an attacker (or auditor) runs", code: "sudo -l                       # what can I run as root?\nfind / -perm -4000 2>/dev/null   # SUID binaries\nfind / -writable -type f 2>/dev/null | grep -v /proc\ncat /etc/crontab              # root-run scheduled scripts\nuname -a                      # kernel version (exploit check)" },
            { type: "CALLOUT", variant: "warning", title: "GTFOBins", text: "Many normal binaries can be abused to escalate if misconfigured (given sudo or SUID). The GTFOBins project catalogues these — defenders should assume attackers know every trick in it." },
            { type: "KNOWLEDGE_CHECK", question: "A user can run `sudo vim` as root. Why is this a privilege-escalation risk?", options: [
              { id: "A", text: "vim uses too much memory" },
              { id: "B", text: "vim can spawn a shell from within it — running as root, that's a root shell" },
              { id: "C", text: "vim is outdated" },
              { id: "D", text: "It isn't a risk" },
            ], correct: "B", explanation: "Editors like vim can launch a shell (:!sh). If vim runs as root via sudo, that shell is a root shell — instant escalation. This is a classic GTFOBins technique." },
          ],
          flashcards: [
            { front: "Name three common Linux privilege-escalation paths.", back: "Misconfigured sudo, abusable SUID binaries, root-run writable scripts (also kernel exploits, leaked credentials)." },
            { front: "What is GTFOBins?", back: "A catalogue of normal binaries that can be abused for privilege escalation when misconfigured with sudo or SUID." },
          ],
        },
        {
          title: "Mini Assessment: Find the Escalation",
          summary: "Audit a box like an attacker.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "You've landed on a box as user `web`. Enumeration returns:" },
            { type: "CODE", language: "bash", code: "$ sudo -l\nUser web may run the following commands:\n    (root) NOPASSWD: /usr/bin/find\n\n$ find / -perm -4000 2>/dev/null\n/usr/bin/passwd\n/usr/bin/sudo" },
            { type: "CALLOUT", variant: "warning", title: "Think GTFOBins", text: "One of these lines is a direct path to root. Which one, and why?" },
            { type: "KNOWLEDGE_CHECK", question: "What's the escalation path here?", options: [
              { id: "A", text: "The SUID passwd binary" },
              { id: "B", text: "sudo find — find can execute commands (-exec) and it runs as root with NOPASSWD" },
              { id: "C", text: "There is no path to root" },
              { id: "D", text: "The kernel version" },
            ], correct: "B", explanation: "find has an -exec option that runs arbitrary commands. Since web can run find as root without a password, `sudo find . -exec /bin/sh \\;` spawns a root shell. The SUID passwd/sudo binaries are normal and expected." },
          ],
          flashcards: [
            { front: "How can `sudo find` lead to root?", back: "find's -exec runs arbitrary commands; run as root via sudo, `find . -exec /bin/sh \\;` gives a root shell." },
          ],
        },
      ],
      quiz: {
        title: "Module 7 Quiz: Privilege Escalation",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "A user has NOPASSWD sudo on /usr/bin/find. How does this lead to root?", options: ["find is malware", "find's -exec runs arbitrary commands, so 'sudo find . -exec /bin/sh \\;' spawns a root shell", "It doesn't", "find deletes /etc/shadow"], correct: "find's -exec runs arbitrary commands, so 'sudo find . -exec /bin/sh \\;' spawns a root shell" },
          { type: "MULTIPLE_CHOICE", question: "Why is a root cron job that runs a world-writable script an escalation risk?", options: ["Cron is slow", "You can edit the script, and root will then execute your code", "It uses too much CPU", "It hides the hostname"], correct: "You can edit the script, and root will then execute your code" },
          { type: "MULTIPLE_CHOICE", question: "Editors like vim run via sudo are risky because they can:", options: ["Change fonts", "Spawn a shell (:!sh) that inherits root", "Only edit text", "Encrypt files"], correct: "Spawn a shell (:!sh) that inherits root" },
          { type: "MULTIPLE_CHOICE", question: "Checking `uname -a` during enumeration helps identify:", options: ["The kernel version, for possible kernel exploits", "The user's password", "Open ports", "Cron jobs"], correct: "The kernel version, for possible kernel exploits" },
          { type: "TRUE_FALSE", question: "Credentials left lying in readable files are a common privilege-escalation path.", correct: "true" },
        ],
      },
    },

    // ─── Module 8 ───────────────────────────────────────────────
    {
      title: "Final Assessment: Linux Security",
      description: "Investigate and secure a box.",
      lessons: [
        {
          title: "Applied Investigation",
          summary: "Everything, together.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "You're handed a Linux server suspected of compromise. Your enumeration finds:\n1. A process `./x` running from `/tmp` as root, holding an outbound connection to a foreign IP on port 4444.\n2. A cron job in `/etc/crontab` running `/tmp/.update.sh` every 5 minutes.\n3. A second account in `/etc/passwd` with UID 0." },
            { type: "KNOWLEDGE_CHECK", question: "The outbound connection on port 4444 from /tmp/x most likely represents:", options: [
              { id: "A", text: "A software update" },
              { id: "B", text: "A reverse shell / C2 channel" },
              { id: "C", text: "Normal DNS" },
              { id: "D", text: "A backup job" },
            ], correct: "B", explanation: "An unknown binary from /tmp with an outbound connection on an odd port is a reverse shell or command-and-control channel." },
            { type: "KNOWLEDGE_CHECK", question: "The cron job running /tmp/.update.sh every 5 minutes is an example of:", options: [
              { id: "A", text: "A backup" },
              { id: "B", text: "Persistence" },
              { id: "C", text: "Hardening" },
              { id: "D", text: "Normal maintenance" },
            ], correct: "B", explanation: "A cron job re-running a hidden script from /tmp is a persistence mechanism — it re-establishes the attacker's foothold." },
            { type: "KNOWLEDGE_CHECK", question: "The second UID-0 account tells you:", options: [
              { id: "A", text: "Nothing unusual" },
              { id: "B", text: "The attacker created a backdoor root-equivalent account" },
              { id: "C", text: "The system needs more RAM" },
              { id: "D", text: "It's a normal service account" },
            ], correct: "B", explanation: "Only root should have UID 0. A second UID-0 account is a root-equivalent backdoor the attacker planted for durable access." },
          ],
          flashcards: [
            { front: "Three signs of Linux compromise to check for?", back: "Unknown binaries/connections from /tmp (reverse shell), suspicious cron/systemd persistence, and extra UID-0 accounts." },
          ],
        },
      ],
      quiz: {
        title: "Final Assessment: Linux Security Fundamentals",
        passMark: 70,
        questions: [
          { type: "MULTIPLE_CHOICE", question: "An unknown binary from /tmp with an outbound port-4444 connection is a:", options: ["Backup", "Reverse shell / C2", "DNS query", "Kernel module"], correct: "Reverse shell / C2" },
          { type: "MULTIPLE_CHOICE", question: "A cron job re-running a hidden /tmp script is:", options: ["Hardening", "Persistence", "A firewall rule", "Normal"], correct: "Persistence" },
          { type: "MULTIPLE_CHOICE", question: "A second account with UID 0 is:", options: ["Normal", "A root-equivalent backdoor", "A group", "A service"], correct: "A root-equivalent backdoor" },
          { type: "MULTIPLE_CHOICE", question: "Password hashes live in:", options: ["/etc/passwd", "/etc/shadow", "/tmp", "/var/log"], correct: "/etc/shadow" },
          { type: "MULTIPLE_CHOICE", question: "The SUID bit causes a program to run as:", options: ["The launcher", "Its owner", "Guest", "Nobody"], correct: "Its owner" },
          { type: "MULTIPLE_CHOICE", question: "To see what you can run as root via sudo:", options: ["sudo -l", "ls -la", "ps aux", "uname -a"], correct: "sudo -l" },
          { type: "TRUE_FALSE", question: "Default-deny inbound is a sound firewall policy.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "The strongest SSH hardening is:", options: ["Root login on", "Key-based auth, passwords off", "Open all ports", "No logging"], correct: "Key-based auth, passwords off" },
        ],
      },
    },
  ],
};
