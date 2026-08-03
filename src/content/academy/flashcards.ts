/**
 * Flashcard decks for the Academy courses.
 *
 * Kept apart from the lesson prose deliberately. A card is not a summary of a
 * lesson — it is one retrievable fact, phrased so that recalling it is possible
 * and guessing it is not. Writing them inline alongside the teaching text tends
 * to produce restatements of the last paragraph, which review as trivia.
 *
 * Two rules the deck is tested against:
 *
 *   - One fact per card. A card asking two things gets graded on whichever half
 *     the learner remembered, and the scheduler then holds a false belief about
 *     both.
 *   - No yes/no fronts. A 50% chance of being right by accident makes the grade
 *     meaningless, and the grade is the only input the scheduler has.
 *
 * Keyed by course slug, then by the exact lesson title. A title that matches no
 * lesson is reported by the seed script rather than silently dropped.
 */

export type CardSeed = { front: string; back: string };

const card = (front: string, back: string): CardSeed => ({ front, back });

export const FLASHCARDS: Record<string, Record<string, CardSeed[]>> = {
  // ── Network security ─────────────────────────────────────────────────────
  "network-security-fundamentals": {
    "TCP, UDP and what a flow actually is": [
      card(
        "Why does a UDP 'flow' duration need reading more carefully than a TCP one?",
        "UDP has no handshake or teardown, so a flow is inferred by grouping packets between the same endpoints under a timeout. A long UDP flow may be one conversation or several the collector merged.",
      ),
      card(
        "What shape do flow records take when traffic is beaconing?",
        "High packet count, long duration, very low total bytes — often a couple of bytes of payload per packet. Something is checking in on a schedule and saying almost nothing.",
      ),
      card(
        "Why do flow records beat full packet capture for triage?",
        "They discard contents and keep the shape of the conversation, so a day of traffic is scannable in seconds rather than being hundreds of gigabytes you will never read.",
      ),
    ],
    "DNS as an investigative goldmine": [
      card(
        "What do resolver logs record that proxy and firewall logs do not?",
        "Intent. A lookup shows what a host wanted to reach even if the connection that followed was encrypted, blocked, or never completed.",
      ),
      card(
        "What does a burst of NXDOMAIN responses for random-looking subdomains indicate?",
        "A domain generation algorithm. Malware and operator compute the same candidate list; the operator registers one, and the malware finds it by trying them all. The failures are the mechanism working.",
      ),
      card(
        "Why does DNS log retention tend to outlast other network telemetry?",
        "The records are small, so generous retention is cheap — and the resolver sees every lookup from every host rather than only proxied or denied traffic.",
      ),
    ],
    "HTTP and TLS": [
      card(
        "What is still visible to a network sensor after TLS is negotiated?",
        "The SNI field, certificate details, JA3/JA3S fingerprints, timing, and byte volumes in each direction. The payload is opaque; the metadata is not.",
      ),
      card(
        "Why is the Server Name Indication field investigatively useful?",
        "It carries the hostname the client asked for, in the clear, before the encrypted session begins — so it attributes an encrypted connection to a destination name.",
      ),
    ],
    "SMB and internal movement": [
      card(
        "Which SMB share name being accessed most strongly suggests administrative lateral movement?",
        "ADMIN$ and C$ — the hidden administrative shares. Ordinary user activity touches named shares, not these.",
      ),
      card(
        "What baseline makes SMB lateral movement stand out without any signature?",
        "Which hosts normally talk to which. A workstation authenticating to a server it has never contacted before is the anomaly, regardless of the tooling used.",
      ),
    ],
    "Start with conversations, not packets": [
      card(
        "What question should the first pass over network data answer?",
        "Who talked to whom, how much, and for how long — not what was said. Narrowing to content before narrowing to conversations means only finding what you already suspected.",
      ),
      card(
        "Why is starting from a packet capture usually the slower path?",
        "You have to choose what to decode before you know what matters, so the choice encodes your assumptions. Conversation summaries let the data suggest where to look.",
      ),
    ],
    "Volume, duration and direction": [
      card(
        "Why is volume alone a poor signal for exfiltration?",
        "Large transfers are routine — backups, updates, video. What distinguishes exfiltration is direction relative to the host's baseline: a workstation uploading far more than it downloads.",
      ),
      card(
        "What does high volume over a short period usually indicate, versus low volume over a long one?",
        "High-and-short is a transfer or download. Low-and-long is automation checking in. It is the relationship between the two numbers that carries the signal, not either alone.",
      ),
    ],
    "Following a stream": [
      card(
        "What does reassembling a stream give you that per-packet inspection does not?",
        "The application-layer conversation in order, so requests and responses can be read as an exchange rather than as fragments split across packet boundaries.",
      ),
      card(
        "When is following a stream worth the time it costs?",
        "After flow analysis has already identified which conversation matters. It answers 'what exactly was said' — an expensive question to ask of the wrong conversation.",
      ),
    ],
    "Beacon detection": [
      card(
        "Which single statistic separates timer-driven traffic from human-driven traffic?",
        "Standard deviation of the intervals divided by their mean. Near zero means a scheduler; near or above one means a person, or an application reacting to one.",
      ),
      card(
        "Why is interval regularity alone not enough to alert on a beacon?",
        "Legitimate monitoring and EDR agents poll on fixed timers and are often more regular than malware. Regularity is necessary but nowhere near sufficient.",
      ),
      card(
        "Which two conditions, added to interval regularity, make a beacon rule specific enough to page on?",
        "Near-constant payload size in both directions, and a destination first seen in the environment recently. Real telemetry varies in size; long-established destinations are rarely C2.",
      ),
    ],
    "DNS tunnelling": [
      card(
        "What makes DNS attractive as a covert channel even in restricted networks?",
        "It is almost always permitted outbound and is frequently unproxied and uninspected, so it reaches the internet where other protocols are blocked.",
      ),
      card(
        "Which observable properties give DNS tunnelling away?",
        "Unusually long query names, high-entropy labels, heavy use of TXT or NULL record types, and query volume to one parent domain far above any other.",
      ),
    ],
    "Staged exfiltration": [
      card(
        "Why does encrypting an archive before transfer defeat content-inspecting DLP?",
        "The inspection sees ciphertext. Detection has to shift to the host — the archive appearing where none belongs — or to network volume and direction rather than content.",
      ),
      card(
        "Which stage of staged exfiltration is loudest on the endpoint and quietest on the network?",
        "Local collection. Copying files into one staging directory generates heavy local file activity and no external traffic at all.",
      ),
      card(
        "What evidence does the cleanup stage typically leave behind?",
        "Deletion timestamps clustered minutes after a large outbound transfer. That temporal cluster is frequently the clearest remaining artefact.",
      ),
    ],
  },

  // ── Cloud security ───────────────────────────────────────────────────────
  "cloud-security-essentials": {
    "Users, roles and assumption": [
      card(
        "What is the practical difference between an IAM user and a role?",
        "A user has long-lived credentials attached to an identity. A role has no credentials — it is assumed, producing short-lived tokens, so exposure has a time limit built in.",
      ),
      card(
        "Why does role assumption complicate audit-log attribution?",
        "The events after assumption carry the role's identity, not the assuming principal's. Tracing back to a human means correlating through the AssumeRole event's session name.",
      ),
    ],
    "Permissions boundaries and scoping": [
      card(
        "What does a permissions boundary do that an identity policy does not?",
        "It caps the maximum permissions an identity can ever have, regardless of what policies are later attached — so delegating policy attachment stops being a privilege-escalation path.",
      ),
      card(
        "Why is iam:PassRole worth treating as a sensitive permission?",
        "It lets a principal hand a role to a service they can control. Combined with the ability to launch that service, it grants whatever the passed role can do.",
      ),
    ],
    "Instance and workload identity": [
      card(
        "Why is stealing an instance-metadata credential different from stealing an access key?",
        "Metadata credentials are short-lived and rotate automatically, so the window is bounded — but they are retrievable by anything that can make an HTTP request from the host, including through SSRF.",
      ),
      card(
        "What does IMDSv2 change about metadata credential theft?",
        "It requires a PUT request to obtain a session token before any read, which defeats the simple SSRF patterns that could only issue GETs.",
      ),
    ],
    "Anatomy of an audit event": [
      card(
        "Which audit-event fields identify the actor behind an API call?",
        "userIdentity — its type, arn, and accessKeyId — together with sourceIPAddress and userAgent. The ARN says who; the key id says which credential.",
      ),
      card(
        "What does a burst of GetCallerIdentity calls from one credential suggest?",
        "Orientation by someone who does not know what the credential is. Legitimate automation already knows its own identity and rarely needs to ask repeatedly.",
      ),
      card(
        "Why is CreateAccessKey the pivotal event in a stolen-credential incident?",
        "It makes the access independent of the original credential. After it, rotating the leaked key achieves nothing, because a second credential now exists.",
      ),
    ],
    "Regional gaps and disabled trails": [
      card(
        "Why do attackers operate in unused cloud regions?",
        "Logging, guardrails and monitoring are often configured per region and enabled only where the business operates. An unused region is frequently unwatched but fully functional.",
      ),
      card(
        "Which two audit events should page someone regardless of hour?",
        "StopLogging and DeleteTrail. Neither has a legitimate emergency use, and both are attempts to remove the record of what follows.",
      ),
    ],
    "Detecting cloud persistence": [
      card(
        "Why does rotating a compromised access key often fail to end a cloud incident?",
        "Because persistence is usually established through a second identity — a new user, key, or role trust relationship — that survives the rotation entirely.",
      ),
      card(
        "Which policy is most commonly attached during cloud privilege escalation, and why that one?",
        "AdministratorAccess — because it is a managed policy that exists in every account, so it needs no authoring and leaves no custom policy behind.",
      ),
      card(
        "Where does identity-federation persistence hide that key rotation will never touch?",
        "In role trust policies and identity-provider configuration. A modified trust relationship grants access without any credential existing to rotate.",
      ),
    ],
    "Public by accident": [
      card(
        "Why can a public bucket not always be shown to have been read?",
        "Management events record the policy change, but object-level reads require data-event or server access logging, which is off by default. Without it, absence of access is unprovable.",
      ),
      card(
        "How do you separate third-party reads from your own application's in access logs?",
        "Filter to unauthenticated requests. A public read needs no credentials, so anonymous requester entries are the ones that bear on the disclosure question.",
      ),
      card(
        "What does it mean when an anonymous request fetches specific object names directly?",
        "The requester already knew the names, which means the bucket had been listed beforehand — a targeted retrieval rather than opportunistic scanning.",
      ),
    ],
    "Encryption and key management": [
      card(
        "What does provider-managed encryption at rest actually protect against?",
        "Physical media compromise and disposal. It does nothing against a credential with permission to read the object, because decryption is transparent to authorised callers.",
      ),
      card(
        "Why does a customer-managed key improve the audit position over a provider-managed one?",
        "Key usage becomes a separately logged, separately permissioned event, so decryption itself is auditable and revocable independently of storage access.",
      ),
    ],
    "Responding to a researcher disclosure": [
      card(
        "What is the first technical action on receiving an external exposure report?",
        "Establish the exposure window from the management trail before changing anything. The timestamps bound every subsequent question, and remediation can obscure them.",
      ),
      card(
        "Why should a disclosure state logging gaps explicitly?",
        "Notification duties turn on whether data was accessed, not merely exposed. An assessment that hides its own blind spots is the one that collapses under scrutiny later.",
      ),
    ],
  },

  // ── Digital forensics ────────────────────────────────────────────────────
  "digital-forensics-essentials": {
    "Order of volatility": [
      card(
        "What does the order of volatility dictate about collection sequence?",
        "Collect from most to least volatile — CPU and memory state first, then network state, then disk, then backups. Slower-changing evidence survives the time spent on faster-changing evidence.",
      ),
      card(
        "What is lost the moment a suspect machine is powered off?",
        "Memory contents: running processes, injected code, decrypted material, network connections, and clipboard data. None of it is recoverable from disk afterwards.",
      ),
    ],
    "Imaging and hashing": [
      card(
        "Why must the source hash be computed during acquisition rather than after?",
        "A hash taken later proves only that the copy has not changed since then. Hashing during the read proves the image matches what was actually on the device at acquisition.",
      ),
      card(
        "What does a write blocker returning 0 for a read-only check mean you must do?",
        "Stop. The device is writable, so continuing risks altering evidence — and any alteration is a defect in the whole chain, not just that one file.",
      ),
      card(
        "Why record the device model and serial number before imaging?",
        "It is what ties the image file to a specific physical device later. A hash proves integrity; the serial proves provenance.",
      ),
    ],
    "Live response trade-offs": [
      card(
        "What is the unavoidable cost of live response?",
        "Every command run alters the system — process lists, prefetch, memory, timestamps. The trade is accepting known contamination in exchange for volatile evidence you cannot get otherwise.",
      ),
      card(
        "How do you make live-response contamination defensible?",
        "Document every command, its exact time, and the tool used, so investigators can distinguish your footprints from the subject's rather than guessing.",
      ),
    ],
    "Evidence of execution": [
      card(
        "What does a Windows prefetch file establish, and what does it not?",
        "It establishes that the loader started the executable, with run count and last-run times. It does not establish who initiated it or what it did.",
      ),
      card(
        "Why is ShimCache better described as presence evidence than execution evidence?",
        "AppCompatCache records paths and file modification times the shim engine evaluated, which can happen without the binary running. Treating it as proof of execution overstates it.",
      ),
      card(
        "Which execution artefact survives deletion of the binary itself, and what does it carry?",
        "Amcache — it retains a SHA-1 of the file, so the exact build can be identified even after the file is gone.",
      ),
      card(
        "Why is corroboration from outside the examined host so valuable?",
        "Every on-host artefact could have been altered by whoever controlled the host. An independent source such as firewall or proxy logs is not subject to that doubt.",
      ),
    ],
    "Registry as a record": [
      card(
        "What makes registry key last-write times forensically useful?",
        "They timestamp configuration changes, so persistence mechanisms and settings modifications can be placed on a timeline even when no log recorded them.",
      ),
      card(
        "Which registry locations are checked first for persistence?",
        "Run and RunOnce keys, services, scheduled task registrations, and Winlogon helper values — the places the operating system reads automatically at boot or logon.",
      ),
    ],
    "Browser and file system artefacts": [
      card(
        "Why does browser history matter even when the activity was in a private window?",
        "Private mode limits what the browser records, not what the rest of the system records — DNS caches, memory, prefetch and network logs frequently retain the activity.",
      ),
      card(
        "What does the NTFS master file table give an examiner that a directory listing does not?",
        "Records for deleted entries and multiple timestamp sets per file, including the $FILE_NAME attribute, which resists the tampering that alters visible timestamps.",
      ),
    ],
    "Building a super timeline": [
      card(
        "Why parse every artefact into a timeline before forming a theory?",
        "Filtering first means only finding what you already suspected. Parsing everything, then narrowing by time, lets sequences appear that no hypothesis pointed at.",
      ),
      card(
        "What makes a timeline entry meaningful when millions of events exist?",
        "Its neighbours. A file creation is unremarkable; a file creation followed by execution and a large outbound transfer is a finding, and only the ordering shows it.",
      ),
    ],
    "Timestomping": [
      card(
        "Which NTFS timestamps does common timestomping fail to alter?",
        "The $FILE_NAME attribute timestamps. Most tools modify $STANDARD_INFORMATION only, so a mismatch between the two sets is direct evidence of tampering.",
      ),
      card(
        "What does a file with a modification time earlier than its creation time indicate?",
        "Manipulation. The ordering is impossible under normal filesystem operation, so it flags the file without needing any other artefact.",
      ),
    ],
    "Log deletion and gaps": [
      card(
        "Why is a cleared Windows event log still evidential?",
        "Clearing itself is logged as event 1102, with a timestamp and the account responsible. The absence becomes the finding, and it is a deliberate act rather than an accident.",
      ),
      card(
        "How do you distinguish deliberate log destruction from ordinary rotation?",
        "Rotation is periodic, uniform across hosts, and leaves complete older files. Destruction is a single sharp gap, often on one host, and often adjacent to other suspicious activity.",
      ),
    ],
  },

  // ── Detection engineering ────────────────────────────────────────────────
  "detection-engineering-essentials": {
    "Log sources and field mapping": [
      card(
        "Why does field mapping decide whether a detection is portable?",
        "The same concept carries different field names in every product. A rule written against one schema silently matches nothing on another unless the fields are mapped.",
      ),
      card(
        "What should be verified about a log source before writing rules against it?",
        "That the fields the rule depends on are actually populated in production — not merely documented. Detections most often fail because a field is empty, not because the logic is wrong.",
      ),
    ],
    "Detection logic and conditions": [
      card(
        "What distinguishes a detection from a search?",
        "A detection carries a condition specific enough to act on and quiet enough to survive. A search finds occurrences; a detection asserts that occurrences are worth someone's time.",
      ),
      card(
        "Why are broad exclusions dangerous in detection logic?",
        "They discard the true positives along with the noise. Excluding a specific script path preserves the rule; excluding the interpreter that ran it removes the detection entirely.",
      ),
    ],
    "Metadata that matters": [
      card(
        "What metadata makes a detection maintainable by someone other than its author?",
        "The hypothesis it tests, its known false positives, the data source it needs, and its ATT&CK mapping. Without those, a misbehaving rule gets muted rather than fixed.",
      ),
      card(
        "Why record a rule's known false positives rather than tuning them away silently?",
        "The exclusions encode local knowledge. Written down, they explain why the rule looks odd; undocumented, the next engineer removes them and the noise returns.",
      ),
    ],
    "Why indicators decay": [
      card(
        "Why do IP-address indicators decay faster than behavioural detections?",
        "Addresses are reassigned and cheaply replaced by the adversary. Behaviour has to change with the tradecraft, which is far more expensive for them to alter.",
      ),
      card(
        "What is the concrete harm of retaining stale IP indicators?",
        "Reassigned addresses become CDN nodes, mail relays and shared hosting. Blocking or alerting on them damages your own operations and trains analysts to ignore the feed.",
      ),
    ],
    "Parent-child process logic": [
      card(
        "Why is parent-child relationship such a productive detection surface?",
        "It encodes intent that neither process reveals alone. Both Word and PowerShell are legitimate; Word spawning PowerShell almost never is.",
      ),
      card(
        "What must be done to a parent-child rule before it reaches an analyst?",
        "Replay it against weeks of production telemetry and group the matches by command line. The rule is not finished until its expected alert rate is known.",
      ),
      card(
        "When one command line accounts for most matches of a rule, what is the correct fix?",
        "Exclude that specific command line or script path — not the parent process, and not the child. A broad exclusion would discard the detections the rule exists for.",
      ),
    ],
    "Detecting living-off-the-land": [
      card(
        "Why does alerting on a living-off-the-land binary's execution never work?",
        "The binaries are signed, present everywhere, and run constantly for legitimate reasons. The execution carries no signal; the arguments do.",
      ),
      card(
        "Which certutil.exe arguments indicate intent rather than ordinary use?",
        "-urlcache, -decode and -encode. Certificate store operations dominate legitimate use; these three download or transform files.",
      ),
      card(
        "Why is broad living-off-the-land coverage a set of narrow rules rather than one general rule?",
        "Each binary has a different legitimate-use profile, so each needs its own baseline and exclusions. A general rule fires constantly and gets muted within a week.",
      ),
    ],
    "Testing against known-good and known-bad": [
      card(
        "Which two tests does every detection rule need?",
        "One proving it fires on the behaviour it targets, and one proving it stays quiet on the legitimate activity it must ignore. The second is the one usually missing.",
      ),
      card(
        "What failure does validating rule syntax in CI prevent?",
        "A rule that loads without error and silently never matches — for example a condition referencing a selection that does not exist. It produces no alerts and no complaints.",
      ),
    ],
    "Measuring false-positive rate": [
      card(
        "What measurement decides whether a rule is fit to deploy?",
        "Its expected alerts per day, measured by replaying it over historical production data. A rule with no measured rate is a guess about someone else's workload.",
      ),
      card(
        "Why is a rule that fires twice a month often more valuable than one firing hourly?",
        "Because it will still be enabled next quarter. Alert volume that exceeds capacity gets muted, and a muted rule detects nothing regardless of its logic.",
      ),
    ],
    "Detection as code": [
      card(
        "What does keeping detections in version control provide during an incident?",
        "The history of why a rule looks the way it does — each tuning change with its author, reason and diff. That context is what tells you whether odd behaviour is intentional.",
      ),
      card(
        "Which CI gate most directly protects the analyst queue?",
        "A baseline check that fails the build when a rule's projected alert rate exceeds a threshold. Syntax gates protect correctness; this one protects sustainability.",
      ),
    ],
  },

  // ── Cryptography ─────────────────────────────────────────────────────────
  "cryptography-for-defenders": {
    "Encoding, hashing, encryption": [
      card(
        "What single property separates encoding from encryption?",
        "A key. Encoding is reversible by anyone because it is only a change of alphabet; encryption is reversible only by a key holder.",
      ),
      card(
        "Why can a hash never be used to store data you need back?",
        "It is one-way and fixed-length, discarding information by design. That is what makes it useful for integrity and useless for confidentiality of recoverable data.",
      ),
      card(
        "What is the avalanche property of a cryptographic hash?",
        "A single-bit change in input changes roughly half the output bits, so similar inputs produce entirely unrelated digests and near-misses reveal nothing.",
      ),
    ],
    "Symmetric and asymmetric": [
      card(
        "Why do real protocols use asymmetric and symmetric cryptography together?",
        "Asymmetric operations are slow but solve key distribution; symmetric ones are fast but need a shared key. Asymmetric establishes the key, symmetric carries the data.",
      ),
      card(
        "What problem does asymmetric cryptography solve that symmetric cannot?",
        "Establishing a shared secret between parties who have never met, over a channel an adversary can read.",
      ),
    ],
    "Integrity and authenticity": [
      card(
        "What does a MAC provide that a plain hash does not?",
        "Authenticity. A hash proves the data is unchanged relative to that digest, but anyone can recompute it. A MAC requires a key, so it proves who produced it.",
      ),
      card(
        "Why is encryption without integrity protection dangerous?",
        "Ciphertext can be altered in ways that produce predictable plaintext changes. Without a MAC or an authenticated mode, the receiver cannot detect the tampering.",
      ),
    ],
    "Key management": [
      card(
        "Why is key management usually the weak point rather than the algorithm?",
        "The algorithms in common use are sound. Keys, by contrast, get committed to repositories, logged, shared, and never rotated — all of which defeat the algorithm entirely.",
      ),
      card(
        "What does key rotation actually limit?",
        "The blast radius in time. It does not prevent compromise; it bounds how much data a compromised key can decrypt and for how long it remains useful.",
      ),
    ],
    "Password storage": [
      card(
        "Why is a fast hash the wrong choice for password storage?",
        "Speed is the attacker's advantage. MD5 allows tens of billions of guesses per second; bcrypt at a sensible cost factor allows a few thousand.",
      ),
      card(
        "What does a slow hash buy, and what does it not?",
        "It buys time proportional to password strength. It does not rescue weak passwords — 'password' falls to a dictionary attack under any algorithm.",
      ),
      card(
        "Why is the bcrypt cost factor stored inside the hash string?",
        "So it can be raised later and existing hashes upgraded on next login, without invalidating stored credentials or requiring a migration.",
      ),
      card(
        "What does a per-password salt prevent?",
        "Precomputation. Without it, one rainbow table or one cracked hash breaks every account sharing that password.",
      ),
    ],
    "Certificate validation": [
      card(
        "What does 'unable to verify the first certificate' usually mean?",
        "The server presented the leaf without its intermediate. The certificate may be perfectly valid; the chain as presented is incomplete.",
      ),
      card(
        "Why does a chain often work in a browser but fail from the command line?",
        "Browsers cache intermediates from earlier sessions and fetch them via the Authority Information Access extension. A cold client with no route to the PKI host does neither.",
      ),
      card(
        "How do you tell a missing intermediate from an untrusted root?",
        "By the depth at which verification fails. Supplying the intermediate moves the error deeper in the chain if the root is also untrusted — two distinct problems with distinct fixes.",
      ),
    ],
    "Metadata still speaks": [
      card(
        "What can a network observer learn from a TLS session without decrypting it?",
        "The destination name from SNI, certificate details, client and server fingerprints, connection timing, and the volume of data in each direction.",
      ),
      card(
        "Why does encryption not defeat traffic analysis?",
        "Size and timing patterns survive encryption. Beacon regularity, upload asymmetry and message-length signatures are all readable from ciphertext.",
      ),
    ],
    "Fingerprinting clients": [
      card(
        "What does a JA3 fingerprint summarise?",
        "The client's TLS Client Hello — cipher suites, extensions and their ordering — which reflects the TLS library and version rather than the payload.",
      ),
      card(
        "Why is a JA3 fingerprint useful when the destination is unknown?",
        "It identifies the client software. A fingerprint matching a known malware library rather than any installed browser is suspicious independently of where it connects.",
      ),
    ],
    "When decryption is appropriate": [
      card(
        "What must be settled before deploying TLS interception?",
        "Legal basis, scope, and what is excluded — health, banking and legal traffic in particular. Interception creates a repository of employee personal data and its own breach risk.",
      ),
      card(
        "What technical risk does TLS interception introduce?",
        "The interception point becomes a single place where all plaintext exists, and it frequently negotiates weaker parameters with the origin than the client would have.",
      ),
    ],
  },

  // ── Threat intelligence ──────────────────────────────────────────────────
  "threat-intelligence-essentials": {
    "Intelligence requirements": [
      card(
        "What makes something an intelligence requirement rather than a topic of interest?",
        "A decision waits on it. If no action changes based on the answer, collecting it produces reading material rather than intelligence.",
      ),
      card(
        "Why do intelligence programmes fail without stated requirements?",
        "Collection expands to whatever is available, output is measured by volume, and nobody can say which reports mattered — because no decision was ever attached to them.",
      ),
    ],
    "Sources and their biases": [
      card(
        "What bias do vendor incident-response reports systematically carry?",
        "They describe intrusions in organisations that could afford that vendor and chose to engage them. Sectors and regions outside that customer base are under-represented.",
      ),
      card(
        "Why does source overlap not increase confidence as much as it appears to?",
        "Reports frequently cite each other or share an original source. Three articles tracing to one investigation are one observation, not three.",
      ),
    ],
    "Relevance over novelty": [
      card(
        "Why is a new technique often less important than an old one?",
        "Relevance is a function of your exposure, not the technique's age. A five-year-old method targeting software you actually run outranks a novel one targeting software you do not.",
      ),
      card(
        "What is the first filter to apply to any threat report?",
        "Whether the targeted technology, sector or geography intersects with yours. Everything else is secondary to that intersection.",
      ),
    ],
    "Confidence and uncertainty": [
      card(
        "Why must confidence be stated separately from the assessment itself?",
        "Readers otherwise infer certainty from tone. An explicit confidence level lets a decision-maker weigh the judgement against its evidential basis.",
      ),
      card(
        "What distinguishes low confidence from an absence of assessment?",
        "Low confidence still states a judgement and its reasoning, so it can be challenged and updated. Silence gives the reader nothing to act on or correct.",
      ),
    ],
    Attribution: [
      card(
        "Which three claims does attribution conflate, and how do they differ in evidential weight?",
        "Same tooling, same operator, same sponsor. Tooling is often demonstrable; operator rests on tradecraft and infrastructure; sponsor usually has no supporting technical evidence at all.",
      ),
      card(
        "Why is shared malware weak evidence of a shared operator?",
        "Families are sold, leaked, stolen and reused. Common tooling narrows the field far less than its intuitive weight suggests.",
      ),
      card(
        "Which overlaps carry the most attribution weight, and why?",
        "Unconscious operational habits — a non-default staging directory, specific archive switches, a fixed order of operations. They are expensive to fake because they are not deliberate.",
      ),
      card(
        "What turns an attribution assessment from an opinion into an auditable judgement?",
        "Stating what observation would overturn it. A named falsifier makes the reasoning checkable and gives collection something specific to pursue.",
      ),
    ],
    "Structured techniques": [
      card(
        "What problem do structured analytic techniques address?",
        "Analysts anchor on the first plausible explanation and then seek confirming evidence. Structure forces competing hypotheses to be evaluated against the same evidence.",
      ),
      card(
        "In analysis of competing hypotheses, what carries the most weight?",
        "Evidence that is inconsistent with a hypothesis. Consistency is cheap — most evidence fits most hypotheses — so elimination does the real work.",
      ),
    ],
    "Indicators and their lifespan": [
      card(
        "What is the right question to ask of an indicator feed?",
        "How many of its indicators ever matched anything, and how old those were when they did. Volume is not value, and most feeds are dominated by indicators that never fire.",
      ),
      card(
        "What is the practical way to handle indicator decay?",
        "Automatic expiry by age, with the threshold set from measured match data — typically ingesting recent indicators and letting older ones lapse rather than accumulating them.",
      ),
    ],
    "Mapping to ATT&CK": [
      card(
        "What makes an ATT&CK mapping useful rather than decorative?",
        "Each mapped technique should answer whether you would have detected or prevented it. A mapping that produces no such question is a labelling exercise.",
      ),
      card(
        "Why map an intrusion to techniques rather than to a named tool?",
        "Tools change between campaigns; the technique usually does not. Detection built on the technique survives the adversary swapping their toolkit.",
      ),
    ],
    "Writing for decision-makers": [
      card(
        "What belongs in the first paragraph of an intelligence product?",
        "The judgement, its confidence, and what should change as a result. Evidence supports the judgement; it does not precede it.",
      ),
      card(
        "Why does technical depth reduce the impact of an executive product?",
        "The reader is deciding on resources, not on indicators. Detail that does not change the decision competes with the sentence that does.",
      ),
    ],
  },
};
