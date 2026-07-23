import type { SeedCourse } from "./types";

export const course1: SeedCourse = {
  slug: "cybersecurity-fundamentals",
  title: "Cybersecurity Fundamentals",
  subtitle: "Your foundation in security — from zero to confident",
  description:
    "The starting point for every security career. Learn what cybersecurity really is, the threats you'll defend against, how networks and operating systems work, and the core principles that underpin every discipline. No prior knowledge needed.",
  category: "FUNDAMENTALS",
  difficulty: "EASY",
  estimatedHrs: 14,
  order: 1,
  prerequisites: [],
  objectives: [
    "Explain the CIA triad and why it drives every security decision",
    "Identify common threat actors and the attacks they use",
    "Read IP addresses, ports, and understand how packets travel",
    "Navigate the security fundamentals of Windows and Linux",
    "Recognise phishing, malware, and social engineering in the wild",
    "Map out the cybersecurity career paths open to you",
  ],
  modules: [
    // ─── Module 1 ───────────────────────────────────────────────
    {
      title: "What is Cybersecurity?",
      description: "The mental model behind everything you'll learn.",
      lessons: [
        {
          title: "Why Cybersecurity Matters",
          summary: "The stakes, in real numbers.",
          durationMin: 6,
          blocks: [
            { type: "TEXT", text: "Every 39 seconds, somewhere in the world, a system is attacked. Cybersecurity is the practice of **protecting systems, networks, and data** from digital attacks that aim to steal, damage, or disrupt.\n\nThis isn't abstract. A single ransomware attack can shut down a hospital. A leaked password can drain a bank account. A misconfigured server can expose millions of people's private records. The people who defend against this are in enormous demand — and that's the career you're starting today." },
            { type: "CALLOUT", variant: "important", title: "The core idea", text: "Security is not a product you buy — it's a continuous process of reducing risk. There is no such thing as 'perfectly secure'. The goal is to make attacks expensive enough that attackers give up." },
            { type: "TEXT", text: "Attackers only need to find **one** way in. Defenders have to protect **every** way in. This asymmetry is why the job is hard, interesting, and never finished." },
            { type: "KNOWLEDGE_CHECK", question: "Why is a defender's job fundamentally harder than an attacker's?", options: [
              { id: "A", text: "Defenders have less powerful tools" },
              { id: "B", text: "An attacker needs one way in; a defender must protect every way in" },
              { id: "C", text: "Attackers always have more money" },
              { id: "D", text: "Defenders aren't allowed to use automation" },
            ], correct: "B", explanation: "This asymmetry — one gap is enough for the attacker, but the defender must cover them all — is the central challenge of security." },
          ],
          flashcards: [
            { front: "What is cybersecurity?", back: "The practice of protecting systems, networks, and data from digital attacks that aim to steal, damage, or disrupt." },
            { front: "Is 'perfectly secure' achievable?", back: "No. The goal is to reduce risk and make attacks expensive enough that attackers give up." },
          ],
        },
        {
          title: "The CIA Triad",
          summary: "The three goals behind every control.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Almost every security decision comes back to three goals, known as the **CIA triad**:\n\n**Confidentiality** — only authorised people can read the data.\n**Integrity** — data cannot be altered without detection.\n**Availability** — systems and data are accessible when needed." },
            { type: "CALLOUT", variant: "info", title: "Real examples", text: "Encryption protects confidentiality. A checksum or digital signature protects integrity. Backups and redundancy protect availability." },
            { type: "TEXT", text: "These three often trade off against each other. Locking a system in a vault with no network connection maximises confidentiality but destroys availability. Good security finds the right **balance for the specific data and threat**." },
            { type: "KNOWLEDGE_CHECK", question: "A ransomware attack encrypts a company's files so staff can't open them. Which part of the CIA triad is primarily violated?", options: [
              { id: "A", text: "Confidentiality" },
              { id: "B", text: "Integrity" },
              { id: "C", text: "Availability" },
              { id: "D", text: "None of these" },
            ], correct: "C", explanation: "The data still exists and hasn't been read or altered — but staff cannot access it. That's an availability failure. (Modern ransomware often attacks confidentiality too, by stealing data first.)" },
          ],
          flashcards: [
            { front: "What does CIA stand for in security?", back: "Confidentiality, Integrity, Availability." },
            { front: "Which CIA goal does encryption protect?", back: "Confidentiality — only authorised people can read the data." },
            { front: "Which CIA goal do backups protect?", back: "Availability — data is accessible when needed." },
          ],
        },
        {
          title: "Threats, Vulnerabilities & Risk",
          summary: "Three words people constantly confuse.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "These three terms get mixed up constantly. Getting them right is the mark of someone who actually understands security.\n\n**Vulnerability** — a weakness (an unpatched server, a weak password).\n**Threat** — something that could exploit the weakness (a hacker, malware, a careless employee).\n**Risk** — the *likelihood* and *impact* of a threat exploiting a vulnerability." },
            { type: "CALLOUT", variant: "tip", title: "The formula", text: "Risk = Threat × Vulnerability × Impact. Reduce any factor to zero and the risk disappears. You usually can't remove threats — so you reduce vulnerabilities and limit impact." },
            { type: "KNOWLEDGE_CHECK", question: "A server has an unpatched flaw, but it's completely offline with no network or physical access. How would you describe this?", options: [
              { id: "A", text: "High risk — the vulnerability exists" },
              { id: "B", text: "Low risk — there's a vulnerability but no realistic threat can reach it" },
              { id: "C", text: "No vulnerability exists" },
              { id: "D", text: "It's a threat, not a vulnerability" },
            ], correct: "B", explanation: "The vulnerability is real, but with no way for a threat to reach it, the likelihood — and therefore the risk — is very low. Risk needs all factors present." },
          ],
          flashcards: [
            { front: "Vulnerability vs Threat vs Risk?", back: "Vulnerability = weakness. Threat = something that could exploit it. Risk = likelihood × impact of that happening." },
            { front: "The risk formula", back: "Risk = Threat × Vulnerability × Impact." },
          ],
        },
      ],
      quiz: {
        title: "Module 1 Quiz: Cybersecurity Basics",
        passMark: 70,
        questions: [
          { type: "MULTIPLE_CHOICE", question: "What are the three goals of the CIA triad?", options: ["Control, Integrity, Access", "Confidentiality, Integrity, Availability", "Confidentiality, Identity, Authorisation", "Control, Identity, Availability"], correct: "Confidentiality, Integrity, Availability", explanation: "Confidentiality, Integrity, Availability." },
          { type: "MULTIPLE_CHOICE", question: "A weakness in a system, such as an unpatched service, is called a:", options: ["Threat", "Risk", "Vulnerability", "Exploit"], correct: "Vulnerability" },
          { type: "TRUE_FALSE", question: "It is possible to make a system perfectly secure with enough effort.", correct: "false", explanation: "Security reduces risk; it never eliminates it entirely." },
          { type: "MULTIPLE_CHOICE", question: "Backups and redundancy primarily protect which CIA goal?", options: ["Confidentiality", "Integrity", "Availability", "Authenticity"], correct: "Availability" },
          { type: "MULTIPLE_CHOICE", question: "Risk is best described as:", options: ["A weakness in software", "The likelihood and impact of a threat exploiting a vulnerability", "A malicious actor", "A type of malware"], correct: "The likelihood and impact of a threat exploiting a vulnerability" },
          { type: "TRUE_FALSE", question: "An attacker only needs to find one way in, while a defender must protect every way in.", correct: "true" },
        ],
      },
    },

    // ─── Module 2 ───────────────────────────────────────────────
    {
      title: "The Threat Landscape",
      description: "Who attacks, why, and how.",
      lessons: [
        {
          title: "Threat Actors",
          summary: "Know your adversary.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Not all attackers are the same. Understanding **who** might target you shapes how you defend.\n\n**Script kiddies** — low skill, use others' tools for fun or notoriety.\n**Hacktivists** — driven by a cause (e.g. defacing a website in protest).\n**Cybercriminals** — motivated by money: ransomware, fraud, data theft.\n**Insiders** — employees or contractors, malicious or careless.\n**Nation-states / APTs** — well-funded, patient, highly skilled." },
            { type: "CALLOUT", variant: "warning", title: "APT means persistent", text: "An Advanced Persistent Threat doesn't smash and grab. It quietly establishes long-term access and stays hidden for months — sometimes years — to achieve strategic goals." },
            { type: "KNOWLEDGE_CHECK", question: "A group breaches a network and stays hidden for 8 months, slowly collecting intelligence. Which actor type best fits?", options: [
              { id: "A", text: "Script kiddie" },
              { id: "B", text: "Hacktivist" },
              { id: "C", text: "Advanced Persistent Threat (nation-state)" },
              { id: "D", text: "Careless insider" },
            ], correct: "C", explanation: "Long-term, stealthy, goal-driven access is the signature of an APT — usually nation-state backed." },
          ],
          flashcards: [
            { front: "What is an APT?", back: "Advanced Persistent Threat — a well-funded, patient, skilled attacker (often nation-state) that maintains long-term hidden access." },
            { front: "What motivates most cybercriminals?", back: "Money — via ransomware, fraud, and data theft." },
          ],
        },
        {
          title: "The Attack Lifecycle",
          summary: "How a breach actually unfolds.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Real attacks follow stages, often modelled as the **Cyber Kill Chain**:\n\n1. **Reconnaissance** — research the target.\n2. **Weaponisation & Delivery** — craft and send the payload (e.g. a phishing email).\n3. **Exploitation** — the payload runs, exploiting a weakness.\n4. **Installation** — malware gains a foothold.\n5. **Command & Control (C2)** — the attacker remotely controls the system.\n6. **Actions on Objectives** — steal data, deploy ransomware, etc." },
            { type: "CALLOUT", variant: "tip", title: "Why defenders love this model", text: "You don't have to stop every stage — breaking the chain at *any* link stops the attack. Blocking C2 traffic can neutralise malware that already got in." },
            { type: "KNOWLEDGE_CHECK", question: "An attacker is scanning your public website and looking up employee names on LinkedIn. Which kill chain stage is this?", options: [
              { id: "A", text: "Reconnaissance" },
              { id: "B", text: "Exploitation" },
              { id: "C", text: "Command & Control" },
              { id: "D", text: "Actions on Objectives" },
            ], correct: "A", explanation: "Gathering information about the target before any attack is reconnaissance — the first stage." },
          ],
          flashcards: [
            { front: "What is the Cyber Kill Chain?", back: "A model of attack stages: Recon → Weaponise/Deliver → Exploit → Install → C2 → Actions on Objectives." },
            { front: "What does C2 stand for?", back: "Command & Control — the channel an attacker uses to remotely control a compromised system." },
          ],
        },
      ],
      quiz: {
        title: "Module 2 Quiz: Threats",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Which threat actor is characterised by long-term, stealthy, well-funded access?", options: ["Script kiddie", "Hacktivist", "Advanced Persistent Threat", "Insider"], correct: "Advanced Persistent Threat" },
          { type: "MULTIPLE_CHOICE", question: "In the Cyber Kill Chain, researching a target before attacking is which stage?", options: ["Exploitation", "Reconnaissance", "Installation", "Delivery"], correct: "Reconnaissance" },
          { type: "TRUE_FALSE", question: "You must stop all stages of the kill chain to prevent a breach.", correct: "false", explanation: "Breaking the chain at any single link stops the attack." },
          { type: "MULTIPLE_CHOICE", question: "What does 'C2' refer to in an attack?", options: ["Confidentiality Control", "Command & Control", "Critical Compromise", "Cyber Countermeasure"], correct: "Command & Control" },
          { type: "MULTIPLE_CHOICE", question: "A disgruntled employee deleting files is an example of which threat actor?", options: ["Nation-state", "Insider", "Hacktivist", "Script kiddie"], correct: "Insider" },
        ],
      },
    },

    // ─── Module 3 ───────────────────────────────────────────────
    {
      title: "Networking Basics",
      description: "How data moves — the foundation for everything.",
      lessons: [
        {
          title: "IP Addresses & Ports",
          summary: "Addresses and doors.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "Every device on a network has an **IP address** — like a postal address for data. IPv4 addresses look like `192.168.1.10` (four numbers, each 0–255).\n\nA **port** is like a numbered door on that address. A single server can run many services, each listening on its own port." },
            { type: "CODE", language: "text", caption: "Common ports worth memorising", code: "22    SSH      (secure remote shell)\n80    HTTP     (web, unencrypted)\n443   HTTPS    (web, encrypted)\n53    DNS      (name resolution)\n25    SMTP     (email sending)\n3389  RDP      (Windows remote desktop)" },
            { type: "CALLOUT", variant: "info", title: "Private vs public", text: "Ranges like 192.168.x.x and 10.x.x.x are private — used inside home and office networks. They aren't routable on the public internet." },
            { type: "KNOWLEDGE_CHECK", question: "You connect to `https://example.com`. Which port is used by default?", options: [
              { id: "A", text: "22" },
              { id: "B", text: "80" },
              { id: "C", text: "443" },
              { id: "D", text: "53" },
            ], correct: "C", explanation: "HTTPS (encrypted web traffic) uses port 443 by default. Plain HTTP uses 80." },
          ],
          flashcards: [
            { front: "What port does SSH use?", back: "Port 22." },
            { front: "HTTP vs HTTPS ports?", back: "HTTP = 80 (unencrypted), HTTPS = 443 (encrypted)." },
            { front: "What port does DNS use?", back: "Port 53." },
          ],
        },
        {
          title: "The OSI Model & DNS",
          summary: "Layers, and how names become addresses.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The **OSI model** breaks networking into 7 layers, from physical cables (Layer 1) up to applications (Layer 7). You don't need to memorise all seven now, but knowing that attacks and defences happen at *different layers* is key — a firewall filtering ports works at Layer 4, while a web application firewall inspects Layer 7 content." },
            { type: "TEXT", text: "**DNS** (Domain Name System) is the internet's phone book. When you type `example.com`, DNS translates that human-friendly name into an IP address the network can route to." },
            { type: "CALLOUT", variant: "warning", title: "DNS is a target", text: "Because everything relies on DNS, attackers abuse it — poisoning caches to redirect users, or tunnelling stolen data out through DNS queries to evade firewalls." },
            { type: "KNOWLEDGE_CHECK", question: "What is the primary job of DNS?", options: [
              { id: "A", text: "Encrypt web traffic" },
              { id: "B", text: "Translate domain names into IP addresses" },
              { id: "C", text: "Assign IP addresses to new devices" },
              { id: "D", text: "Block malicious ports" },
            ], correct: "B", explanation: "DNS resolves human-readable names (example.com) into machine-routable IP addresses." },
          ],
          flashcards: [
            { front: "What does DNS do?", back: "Translates domain names (example.com) into IP addresses." },
            { front: "How many layers in the OSI model?", back: "Seven — from physical (L1) to application (L7)." },
          ],
        },
      ],
      quiz: {
        title: "Module 3 Quiz: Networking",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Which port does HTTPS use by default?", options: ["80", "22", "443", "53"], correct: "443" },
          { type: "MULTIPLE_CHOICE", question: "What does DNS do?", options: ["Encrypts traffic", "Translates names to IP addresses", "Assigns MAC addresses", "Filters packets"], correct: "Translates names to IP addresses" },
          { type: "FILL_BLANK", question: "SSH runs on port number ___.", correct: "22" },
          { type: "TRUE_FALSE", question: "192.168.1.10 is a private IP address.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "A port is best described as:", options: ["A physical cable", "A numbered endpoint for a service on a host", "A type of firewall", "An encryption key"], correct: "A numbered endpoint for a service on a host" },
        ],
      },
    },

    // ─── Module 4 ───────────────────────────────────────────────
    {
      title: "Operating System Essentials",
      description: "Windows and Linux from a security lens.",
      lessons: [
        {
          title: "Users, Permissions & Privilege",
          summary: "Who can do what.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Operating systems control access through **users** and **permissions**. Some accounts are ordinary; some are all-powerful:\n\n- On **Linux**, the superuser is `root` (UID 0).\n- On **Windows**, it's `Administrator` (and the SYSTEM account).\n\nThe golden rule is **least privilege**: give each account only the access it needs, nothing more. If an attacker compromises a low-privilege account, least privilege limits the damage." },
            { type: "CODE", language: "bash", caption: "Checking your identity on Linux", code: "whoami        # prints your username\nid            # shows your user and group IDs\nsudo command  # run one command as root" },
            { type: "KNOWLEDGE_CHECK", question: "Why does 'least privilege' reduce the impact of a breach?", options: [
              { id: "A", text: "It makes passwords longer" },
              { id: "B", text: "A compromised account can only do what that account was allowed to do" },
              { id: "C", text: "It encrypts the hard drive" },
              { id: "D", text: "It blocks all network traffic" },
            ], correct: "B", explanation: "If an account has minimal rights, an attacker who steals it inherits only those minimal rights — containing the blast radius." },
          ],
          flashcards: [
            { front: "What is the superuser called on Linux? On Windows?", back: "Linux: root (UID 0). Windows: Administrator / SYSTEM." },
            { front: "What is the principle of least privilege?", back: "Give each account only the access it needs — nothing more." },
          ],
        },
        {
          title: "Processes, Logs & the Filesystem",
          summary: "Where evidence lives.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "A **process** is a running program. Malware runs as a process — so knowing how to list and inspect processes is a core defensive skill.\n\n**Logs** record what happened: logins, errors, program activity. When investigating an incident, logs are your primary evidence. On Linux they live in `/var/log`; on Windows, the Event Viewer." },
            { type: "CODE", language: "bash", caption: "Inspecting a Linux system", code: "ps aux              # list all running processes\ntop                 # live view of resource usage\nls -l /var/log      # where system logs live\ntail -f /var/log/auth.log   # watch auth events live" },
            { type: "CALLOUT", variant: "tip", title: "Logs are gold", text: "The first question in almost every investigation is 'what do the logs say?' Attackers know this too — clearing logs is a common way to hide tracks, which is itself a red flag." },
            { type: "KNOWLEDGE_CHECK", question: "During an investigation you notice the auth log was wiped clean minutes before an alert. What should you conclude?", options: [
              { id: "A", text: "Nothing — logs rotate normally" },
              { id: "B", text: "This is a red flag; attackers often clear logs to hide activity" },
              { id: "C", text: "The system is working correctly" },
              { id: "D", text: "Logs are irrelevant to investigations" },
            ], correct: "B", explanation: "Suddenly-cleared logs right before an alert are a classic anti-forensic move — a strong indicator of intrusion." },
          ],
          flashcards: [
            { front: "Where do Linux system logs live?", back: "In /var/log (e.g. /var/log/auth.log). On Windows, the Event Viewer." },
            { front: "What command lists all running processes on Linux?", back: "ps aux (or top for a live view)." },
          ],
        },
      ],
      quiz: {
        title: "Module 4 Quiz: Operating Systems",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "The all-powerful superuser account on Linux is called:", options: ["admin", "root", "superuser", "system"], correct: "root" },
          { type: "MULTIPLE_CHOICE", question: "Where do most Linux system logs live?", options: ["/etc", "/var/log", "/home", "/tmp"], correct: "/var/log" },
          { type: "FILL_BLANK", question: "The command to see which user you are logged in as on Linux is ___.", correct: "whoami" },
          { type: "TRUE_FALSE", question: "Least privilege means giving accounts as much access as possible for convenience.", correct: "false", explanation: "It means the opposite — only the minimum access needed." },
          { type: "MULTIPLE_CHOICE", question: "A running program is called a:", options: ["File", "Process", "Port", "Log"], correct: "Process" },
        ],
      },
    },

    // ─── Module 5 ───────────────────────────────────────────────
    {
      title: "Core Security Principles",
      description: "Timeless ideas that guide good defence.",
      lessons: [
        {
          title: "Defence in Depth & Zero Trust",
          summary: "Layers, and 'never trust, always verify'.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Defence in depth** means layering multiple controls so that if one fails, others still protect you. A castle has a moat, walls, gates, and guards — not just one thick wall.\n\n**Zero Trust** is a more modern principle: *never trust, always verify*. Don't assume something is safe just because it's inside your network. Every request is authenticated and authorised, every time." },
            { type: "CALLOUT", variant: "important", title: "Why zero trust rose", text: "The old model trusted anything inside the network perimeter. But once attackers got in — via phishing, say — they moved freely. Zero Trust removes that automatic internal trust." },
            { type: "KNOWLEDGE_CHECK", question: "The phrase 'never trust, always verify' describes which principle?", options: [
              { id: "A", text: "Defence in depth" },
              { id: "B", text: "Least privilege" },
              { id: "C", text: "Zero Trust" },
              { id: "D", text: "Separation of duties" },
            ], correct: "C", explanation: "'Never trust, always verify' is the defining phrase of Zero Trust architecture." },
          ],
          flashcards: [
            { front: "What is defence in depth?", back: "Layering multiple security controls so that if one fails, others still protect you." },
            { front: "Summarise Zero Trust in four words.", back: "Never trust, always verify." },
          ],
        },
        {
          title: "Authentication, Authorisation & MFA",
          summary: "Proving who you are, and what you can do.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Two words that sound alike but mean different things:\n\n**Authentication** — proving *who you are* (a password, fingerprint, security key).\n**Authorisation** — deciding *what you're allowed to do* once identified.\n\nAuthentication factors come in three types: something you **know** (password), something you **have** (phone, token), something you **are** (fingerprint, face)." },
            { type: "CALLOUT", variant: "tip", title: "Why MFA is so effective", text: "Multi-Factor Authentication combines two or more different factor types. Even if an attacker steals your password (something you know), they still can't log in without your phone (something you have). MFA blocks the vast majority of account-takeover attacks." },
            { type: "KNOWLEDGE_CHECK", question: "A login requires a password AND a code from your phone app. What kind of authentication is this?", options: [
              { id: "A", text: "Single-factor (two things you know)" },
              { id: "B", text: "Multi-factor (something you know + something you have)" },
              { id: "C", text: "Authorisation, not authentication" },
              { id: "D", text: "Biometric authentication" },
            ], correct: "B", explanation: "Password (know) + phone code (have) are two different factor types — that's genuine multi-factor authentication." },
          ],
          flashcards: [
            { front: "Authentication vs Authorisation?", back: "Authentication = proving who you are. Authorisation = what you're allowed to do." },
            { front: "The three authentication factor types?", back: "Something you know, something you have, something you are." },
          ],
        },
      ],
      quiz: {
        title: "Module 5 Quiz: Security Principles",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "'Never trust, always verify' is the motto of:", options: ["Defence in depth", "Zero Trust", "Least privilege", "The CIA triad"], correct: "Zero Trust" },
          { type: "MULTIPLE_CHOICE", question: "Proving who you are is called:", options: ["Authorisation", "Authentication", "Auditing", "Accounting"], correct: "Authentication" },
          { type: "MULTIPLE_CHOICE", question: "A fingerprint is which kind of authentication factor?", options: ["Something you know", "Something you have", "Something you are", "Something you do"], correct: "Something you are" },
          { type: "TRUE_FALSE", question: "MFA combines two or more different factor types.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Layering multiple controls so one failure isn't fatal is called:", options: ["Zero Trust", "Defence in depth", "Single sign-on", "Encryption"], correct: "Defence in depth" },
        ],
      },
    },

    // ─── Module 6 ───────────────────────────────────────────────
    {
      title: "Common Attacks",
      description: "The threats you'll see most often.",
      lessons: [
        {
          title: "Phishing & Social Engineering",
          summary: "Hacking the human.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The easiest way past a firewall is to trick a person into opening the door. **Social engineering** manipulates human psychology — urgency, authority, fear, curiosity — to make victims act against their own interest.\n\n**Phishing** is social engineering by email. Variants include **spear phishing** (targeted at a specific person), **whaling** (targeting executives), and **smishing** (via SMS)." },
            { type: "CALLOUT", variant: "warning", title: "Red flags in a phishing email", text: "Unexpected urgency ('act now or your account closes'), mismatched sender addresses, generic greetings, links that don't match the real domain, and requests for credentials or payment." },
            { type: "KNOWLEDGE_CHECK", question: "An email addressed to the CFO by name, appearing to come from the CEO, urgently requesting a wire transfer. What is this?", options: [
              { id: "A", text: "Generic phishing" },
              { id: "B", text: "Spear phishing / whaling (Business Email Compromise)" },
              { id: "C", text: "Smishing" },
              { id: "D", text: "A denial-of-service attack" },
            ], correct: "B", explanation: "Targeting a specific high-value individual (an executive) with a tailored message is spear phishing / whaling — the basis of Business Email Compromise (BEC)." },
          ],
          flashcards: [
            { front: "What is social engineering?", back: "Manipulating human psychology (urgency, authority, fear) to make people act against their own security." },
            { front: "Spear phishing vs whaling?", back: "Spear phishing targets a specific individual; whaling specifically targets executives." },
          ],
        },
        {
          title: "Malware & Ransomware",
          summary: "Malicious software, by type.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Malware** is any malicious software. The main families:\n\n- **Virus** — attaches to files, spreads when they run.\n- **Worm** — self-replicates across networks with no user action.\n- **Trojan** — disguised as legitimate software.\n- **Ransomware** — encrypts your files and demands payment.\n- **Spyware** — secretly collects information.\n- **Rootkit** — hides deep in the system to maintain stealthy access." },
            { type: "CALLOUT", variant: "danger", title: "Ransomware reality", text: "Modern ransomware often uses 'double extortion': it steals your data *before* encrypting it, then threatens to leak it publicly even if you restore from backup. Backups alone are no longer a complete defence." },
            { type: "KNOWLEDGE_CHECK", question: "Which malware type self-replicates across a network without any user action?", options: [
              { id: "A", text: "Virus" },
              { id: "B", text: "Worm" },
              { id: "C", text: "Trojan" },
              { id: "D", text: "Spyware" },
            ], correct: "B", explanation: "A worm spreads on its own across networks. A virus needs a user to run an infected file; a trojan needs a user to be deceived into running it." },
          ],
          flashcards: [
            { front: "Virus vs Worm?", back: "A virus needs a user to run an infected file; a worm self-replicates across networks with no user action." },
            { front: "What is 'double extortion' ransomware?", back: "It steals data before encrypting, then threatens to leak it publicly — so backups alone won't save you." },
          ],
        },
      ],
      quiz: {
        title: "Module 6 Quiz: Common Attacks",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Phishing aimed at a specific executive is called:", options: ["Smishing", "Whaling", "Vishing", "Pharming"], correct: "Whaling" },
          { type: "MULTIPLE_CHOICE", question: "Which malware self-replicates across networks without user action?", options: ["Virus", "Trojan", "Worm", "Rootkit"], correct: "Worm" },
          { type: "MULTIPLE_CHOICE", question: "Malware that encrypts files and demands payment is:", options: ["Spyware", "Ransomware", "Adware", "A worm"], correct: "Ransomware" },
          { type: "TRUE_FALSE", question: "Social engineering targets technical flaws rather than people.", correct: "false", explanation: "It targets people — human psychology — not technical flaws." },
          { type: "MULTIPLE_CHOICE", question: "Malware disguised as legitimate software is a:", options: ["Worm", "Trojan", "Virus", "Rootkit"], correct: "Trojan" },
        ],
      },
    },

    // ─── Module 7 ───────────────────────────────────────────────
    {
      title: "Defence Basics",
      description: "The tools and habits that keep systems safe.",
      lessons: [
        {
          title: "Firewalls, Antivirus & Patching",
          summary: "The everyday defensive toolkit.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "A **firewall** controls network traffic, allowing or blocking connections based on rules (e.g. block all inbound traffic except ports 443 and 22).\n\n**Antivirus / EDR** detects and removes malicious software. Modern **EDR** (Endpoint Detection & Response) goes further, watching behaviour and enabling investigation.\n\n**Patching** — applying software updates — is one of the single most effective defences. Most breaches exploit vulnerabilities that already had a fix available." },
            { type: "CALLOUT", variant: "important", title: "Patch, patch, patch", text: "The Equifax breach that exposed 147 million people exploited a vulnerability that had a patch available two months earlier. Timely patching would have prevented it." },
            { type: "KNOWLEDGE_CHECK", question: "What is the primary function of a firewall?", options: [
              { id: "A", text: "Encrypt files at rest" },
              { id: "B", text: "Control which network connections are allowed or blocked" },
              { id: "C", text: "Scan email for phishing" },
              { id: "D", text: "Back up data automatically" },
            ], correct: "B", explanation: "A firewall's core job is filtering network traffic by rules — permitting or denying connections." },
          ],
          flashcards: [
            { front: "What does a firewall do?", back: "Controls network traffic — allowing or blocking connections based on rules." },
            { front: "Why is patching so important?", back: "Most breaches exploit known vulnerabilities that already had a fix available. Patching closes them." },
          ],
        },
        {
          title: "Encryption & Backups",
          summary: "Protecting data at rest and in transit.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Encryption** scrambles data so only someone with the key can read it. Two contexts matter:\n\n- **In transit** — data moving across networks (HTTPS/TLS protects this).\n- **At rest** — data stored on disk (full-disk encryption protects this).\n\n**Backups** are your safety net against ransomware, hardware failure, and mistakes. The **3-2-1 rule**: 3 copies of data, on 2 different media types, with 1 copy off-site." },
            { type: "KNOWLEDGE_CHECK", question: "HTTPS protects data in which state?", options: [
              { id: "A", text: "At rest (on disk)" },
              { id: "B", text: "In transit (moving across the network)" },
              { id: "C", text: "In use (in memory)" },
              { id: "D", text: "It doesn't encrypt anything" },
            ], correct: "B", explanation: "HTTPS/TLS encrypts data in transit — as it travels between your browser and the server." },
          ],
          flashcards: [
            { front: "Encryption in transit vs at rest?", back: "In transit = data moving over a network (HTTPS/TLS). At rest = data stored on disk (full-disk encryption)." },
            { front: "What is the 3-2-1 backup rule?", back: "3 copies of data, on 2 different media types, with 1 copy off-site." },
          ],
        },
      ],
      quiz: {
        title: "Module 7 Quiz: Defence",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "A firewall primarily:", options: ["Encrypts disks", "Controls allowed/blocked network traffic", "Removes viruses", "Backs up data"], correct: "Controls allowed/blocked network traffic" },
          { type: "MULTIPLE_CHOICE", question: "HTTPS protects data that is:", options: ["At rest", "In transit", "Deleted", "Printed"], correct: "In transit" },
          { type: "FILL_BLANK", question: "The backup rule of 3 copies, 2 media, 1 off-site is called the ___-2-1 rule.", correct: "3" },
          { type: "TRUE_FALSE", question: "Applying software patches promptly prevents many breaches.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "EDR stands for:", options: ["Encrypted Data Recovery", "Endpoint Detection & Response", "External Data Rule", "Emergency Disk Repair"], correct: "Endpoint Detection & Response" },
        ],
      },
    },

    // ─── Module 8 ───────────────────────────────────────────────
    {
      title: "Career Paths & Final Assessment",
      description: "Where you can go from here.",
      lessons: [
        {
          title: "Cybersecurity Career Paths",
          summary: "Blue, red, and everything between.",
          durationMin: 6,
          blocks: [
            { type: "TEXT", text: "Cybersecurity is a huge field with room for every kind of thinker:\n\n**Blue Team (Defence)** — SOC analyst, incident responder, threat hunter. You detect and stop attacks.\n**Red Team (Offence)** — penetration tester, red teamer. You attack systems (with permission) to find weaknesses.\n**GRC** — governance, risk, compliance. You manage policy, audits, and standards.\n**Specialisms** — digital forensics, malware analysis, cloud security, application security." },
            { type: "CALLOUT", variant: "tip", title: "Start blue", text: "Most people begin on the Blue Team — the **SOC analyst** role is the classic entry point, and it's the next course in this path. It teaches you how attacks look from the defender's chair." },
            { type: "KNOWLEDGE_CHECK", question: "A penetration tester who attacks systems (with permission) to find weaknesses is part of which team?", options: [
              { id: "A", text: "Blue Team" },
              { id: "B", text: "Red Team" },
              { id: "C", text: "GRC" },
              { id: "D", text: "Help desk" },
            ], correct: "B", explanation: "Offensive security — attacking systems with authorisation to find flaws — is the Red Team." },
          ],
          flashcards: [
            { front: "Blue Team vs Red Team?", back: "Blue Team defends (detect/respond). Red Team attacks with permission to find weaknesses." },
            { front: "What is the classic entry-level defensive role?", back: "SOC (Security Operations Centre) analyst." },
          ],
        },
        {
          title: "Applied Scenario: Spotting the Attack",
          summary: "Put it all together.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "Let's apply everything. Read this scenario carefully.\n\n*An employee at a finance firm receives an email that appears to come from the CEO. It addresses her by name, references a real ongoing acquisition, and urgently asks her to wire £48,000 to a new supplier before end of day. The email domain is `ceo@company-finance.com` — the real domain is `company.com`.*" },
            { type: "CALLOUT", variant: "warning", title: "Analyse before answering", text: "Think about: what attack type is this? What red flags are present? Which security control would have helped most?" },
            { type: "KNOWLEDGE_CHECK", question: "What is the single strongest red flag in this scenario?", options: [
              { id: "A", text: "The email addresses her by name" },
              { id: "B", text: "The sender domain (company-finance.com) does not match the real domain (company.com)" },
              { id: "C", text: "It references a real acquisition" },
              { id: "D", text: "It was sent during business hours" },
            ], correct: "B", explanation: "The look-alike domain is the clearest technical giveaway. Personalisation and real details are social-engineering tricks designed to build false trust." },
            { type: "KNOWLEDGE_CHECK", question: "This attack — impersonating an executive to trigger a fraudulent payment — is best classified as:", options: [
              { id: "A", text: "Ransomware" },
              { id: "B", text: "Business Email Compromise (spear phishing / whaling)" },
              { id: "C", text: "A worm" },
              { id: "D", text: "A denial-of-service attack" },
            ], correct: "B", explanation: "Impersonating a senior executive to induce a fraudulent wire transfer is textbook Business Email Compromise — a targeted spear-phishing / whaling attack." },
            { type: "CALLOUT", variant: "tip", title: "The right response", text: "Verify out-of-band — call the CEO on a known number before acting. Never trust urgency in an email alone. A policy requiring dual approval for large payments would also stop this." },
          ],
          flashcards: [
            { front: "What is Business Email Compromise (BEC)?", back: "Impersonating an executive or trusted party via email to trick someone into a fraudulent payment or data disclosure." },
            { front: "Best defence against a suspicious payment request?", back: "Verify out-of-band (e.g. phone the person on a known number) and require dual approval for large payments." },
          ],
        },
      ],
      quiz: {
        title: "Final Assessment: Cybersecurity Fundamentals",
        passMark: 70,
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Impersonating a CEO to trigger a fraudulent wire transfer is called:", options: ["Ransomware", "Business Email Compromise", "A worm", "DNS poisoning"], correct: "Business Email Compromise" },
          { type: "MULTIPLE_CHOICE", question: "The three goals of the CIA triad are:", options: ["Confidentiality, Integrity, Availability", "Control, Identity, Access", "Confidentiality, Identity, Authorisation", "Compliance, Integrity, Auditing"], correct: "Confidentiality, Integrity, Availability" },
          { type: "MULTIPLE_CHOICE", question: "The best immediate response to an urgent payment email from an 'executive' is to:", options: ["Pay quickly to avoid trouble", "Verify out-of-band via a known phone number", "Reply asking if it's real", "Forward it to all staff"], correct: "Verify out-of-band via a known phone number" },
          { type: "MULTIPLE_CHOICE", question: "A SOC analyst is part of which team?", options: ["Red Team", "Blue Team", "Purple Team", "GRC"], correct: "Blue Team" },
          { type: "TRUE_FALSE", question: "A look-alike sender domain (company-finance.com vs company.com) is a strong phishing indicator.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Which control most directly blocks account takeover even if a password is stolen?", options: ["Antivirus", "Multi-Factor Authentication", "A firewall", "A backup"], correct: "Multi-Factor Authentication" },
          { type: "MULTIPLE_CHOICE", question: "'Never trust, always verify' describes:", options: ["Defence in depth", "Zero Trust", "The CIA triad", "Least privilege"], correct: "Zero Trust" },
          { type: "MULTIPLE_CHOICE", question: "Which is the strongest practical defence against known-vulnerability exploits?", options: ["Longer passwords", "Prompt patching", "More firewalls", "Disabling logs"], correct: "Prompt patching" },
        ],
      },
    },
  ],
};
