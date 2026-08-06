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

  // ── Cybersecurity Fundamentals ───────────────────────────────────────────
  "cybersecurity-fundamentals": {
    "Why Cybersecurity Matters": [
      card(
        "What is the structural asymmetry between attackers and defenders?",
        "An attacker needs to find one way in; a defender must cover every way in. This is why security work is never finished and why reducing the number of entry points matters more than predicting which will be used.",
      ),
      card(
        "What does it mean to say the goal of security is to make attacks expensive?",
        "There is no perfectly secure system, so the aim is to raise the cost of attacking until the attacker gives up, gets noticed, or moves to a softer target — not to make attack impossible.",
      ),
    ],
    "The CIA Triad": [
      card(
        "Name the three properties of the CIA triad and what each protects.",
        "Confidentiality — only authorised people can read data. Integrity — data cannot be altered undetectably. Availability — systems and data are reachable when needed.",
      ),
      card(
        "Which CIA property does ransomware that encrypts files primarily violate?",
        "Availability. The data still exists and is not read by the attacker, but it cannot be accessed when needed — which in a hospital is the property with lives attached.",
      ),
      card(
        "Why do the three CIA properties trade against each other?",
        "Maximising one often costs another — an air-gapped system has excellent confidentiality and no availability. Good security chooses the right balance for the specific data rather than maximising all three.",
      ),
    ],
    "Threats, Vulnerabilities & Risk": [
      card(
        "Distinguish a threat, a vulnerability and risk.",
        "A threat is something that could cause harm; a vulnerability is a weakness it could use; risk is a threat able to reach a vulnerability, weighted by how bad the outcome would be.",
      ),
      card(
        "Why can two servers with the same vulnerability carry very different risk?",
        "Risk requires a path between threat and weakness. An internet-facing server is reachable; an isolated one is not — and reachability is often the fastest lever, since segmenting is quicker than patching.",
      ),
      card(
        "Why is a CVSS severity score not the same as a risk score?",
        "Severity describes a vulnerability in the abstract, knowing nothing about whether the system is exposed, what data it holds, or whether a compensating control blocks the path. Risk depends on all of those.",
      ),
    ],
    "Threat Actors": [
      card(
        "Why does an attacker's motivation predict behaviour better than their skill?",
        "Motivation and patience determine what an actor does and when they give up. An opportunist leaves when anything is hard; a state-sponsored actor persists for months — regardless of the tooling either uses.",
      ),
      card(
        "What makes insider threats resistant to perimeter controls?",
        "Insiders already have credentials, know where valuable data is, and generate activity that looks legitimate because mostly it is. Perimeter defences are simply irrelevant to them.",
      ),
    ],
    "The Attack Lifecycle": [
      card(
        "Why are the middle stages of the attack lifecycle the best place to invest in detection?",
        "Reconnaissance is nearly invisible and exfiltration is too late. Persistence, escalation and lateral movement force the attacker to do unusual things on systems you control and can watch.",
      ),
      card(
        "Why is lateral movement particularly detectable?",
        "Reaching the data requires authenticating between systems in patterns that normal business activity does not produce — a workstation contacting a server it has never touched. The attacker cannot avoid it.",
      ),
    ],
    "IP Addresses & Ports": [
      card(
        "What do an IP address and a port each identify in a connection?",
        "The IP address identifies the machine; the port identifies the service on it. Together they form a socket, and a conversation is a pair of sockets.",
      ),
      card(
        "Why does an ephemeral source port carry no investigative meaning?",
        "It is assigned per connection from a high range and identifies nothing about the service or intent. Reading it as significant is a common beginner mistake — the destination port is what names the service.",
      ),
      card(
        "What does seeing a private address such as 10.20.4.15 in a log tell you?",
        "The 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 ranges are not routable on the internet and are reused internally, so the traffic is internal rather than to or from the wider internet.",
      ),
    ],
    "The OSI Model & DNS": [
      card(
        "What is the practical value of the OSI model in an investigation?",
        "It tells you which layer a problem lives at and therefore which tool answers your question — a name that will not resolve is layer 7, dropped packets between subnets are layer 3.",
      ),
      card(
        "Why are DNS resolver logs valuable even when subsequent traffic is encrypted?",
        "The lookup records intent — the name a host wanted to reach — and happens before the encrypted session begins, so it survives even when the payload that follows is completely opaque.",
      ),
    ],
    "Users, Permissions & Privilege": [
      card(
        "State the principle of least privilege and why it is about consequences.",
        "An account should have exactly the permissions its job needs and no more. It limits what an attacker inherits on the day the account is compromised, independent of how good the code is.",
      ),
      card(
        "Why are service accounts a common weak point?",
        "They tend to be over-permissioned so nobody has to debug a broken service, often have passwords that never expire, and no human notices when they behave oddly at 3am.",
      ),
    ],
    "Processes, Logs & the Filesystem": [
      card(
        "What three places does activity on a host leave traces, and why correlate them?",
        "A process that ran, a log entry describing it, and filesystem changes. Each alone is weak; the three occurring in sequence is what produces confidence a benign explanation cannot account for.",
      ),
      card(
        "Why is a process list alone a weak basis for concluding a host is clean?",
        "It is a snapshot of what runs now. Malware that ran, did its work and exited leaves no trace in it — which is why persistent execution artefacts and logs matter as much as the live view.",
      ),
    ],
    "Defence in Depth & Zero Trust": [
      card(
        "Why does defence in depth work even when no single layer is excellent?",
        "The layers fail independently, so an attacker has to defeat several unrelated controls in sequence. Any one of them holding ends the intrusion.",
      ),
      card(
        "What assumption does zero trust remove, and what replaces it?",
        "It removes the idea that being inside the network confers trust. Every request is authenticated and authorised on its own merits regardless of origin — 'never trust, always verify'.",
      ),
    ],
    "Authentication, Authorisation & MFA": [
      card(
        "Distinguish authentication from authorisation, and name the bug that confusing them causes.",
        "Authentication is who you are; authorisation is what you may do. Systems that authenticate carefully then authorise barely produce broken access control — any record served by id you type.",
      ),
      card(
        "Why does a passkey defeat real-time phishing where a TOTP code does not?",
        "A TOTP code is valid for any site, so a relay works. A passkey signature is cryptographically bound to the real origin, so a lookalike domain gets no usable signature — the user cannot get it wrong.",
      ),
    ],
    "Phishing & Social Engineering": [
      card(
        "Why is recognising the manipulation lever more reliable than recognising the pretext?",
        "The pretexts vary endlessly, but the levers — authority, urgency, fear, familiarity, reciprocity — are consistent. Noticing 'this message is manufacturing urgency and secrecy' generalises where spotting a specific scam does not.",
      ),
      card(
        "What single control most reduces the impact of business email compromise?",
        "A mandatory out-of-band verification step for any change to payment details. It removes the payoff regardless of whether anyone was fooled, and BEC often carries no link or attachment to filter.",
      ),
    ],
    "Malware & Ransomware": [
      card(
        "How did double-extortion ransomware break the advice that backups are a complete answer?",
        "Modern ransomware steals the data before encrypting it, so refusing to pay means restoring from backup and still having the data published. Backups address availability but not the confidentiality half.",
      ),
      card(
        "Why is an untested backup described as a hypothesis rather than a control?",
        "Backups routinely run for years and then fail to restore — retention too short, backup server encrypted alongside production, or a full restore never timed. Until tested, recovery is a belief.",
      ),
    ],
    "Firewalls, Antivirus & Patching": [
      card(
        "Why is outbound firewall filtering the neglected half that catches command-and-control?",
        "Most firewalls are tight inbound and loose outbound, so an implant calling home over 443 leaves unchallenged. C2 relies on outbound-initiated connections that inbound rules never see.",
      ),
      card(
        "Why are the vulnerabilities used in real intrusions usually old rather than zero-days?",
        "Exploited flaws overwhelmingly have patches available for months or years. Zero-days get attention; unapplied patches do the damage, which makes patching speed a high-value investment.",
      ),
    ],
    "Encryption & Backups": [
      card(
        "What does encryption at rest protect against, and what does it not?",
        "It protects against someone obtaining the physical media or a raw file copy. It does nothing against a valid credential, because the system decrypts transparently for authorised callers.",
      ),
      card(
        "What do RPO and RTO measure, and why can neither be known without testing?",
        "RPO is how much data you can afford to lose, set by backup frequency; RTO is how long you can be down, set by restore speed. A team that has never timed a restore has a hope, not an RTO.",
      ),
    ],
    "Cybersecurity Career Paths": [
      card(
        "Why do most people enter security through the blue team?",
        "SOC work is where the volume of entry-level roles is, and triage exposes you to every other discipline in small doses — making it a natural on-ramp to wherever you end up.",
      ),
      card(
        "Why are the boundaries between security disciplines softer than the labels suggest?",
        "Detection engineering needs offensive knowledge to know what to look for, and good pentesters are the ones who can explain a finding to the team that must fix it. Skills cross over constantly.",
      ),
    ],
    "Applied Scenario: Spotting the Attack": [
      card(
        "Why check authentication logs before isolating a compromised workstation?",
        "Scoping decides what containment must cover. Sixty seconds establishing that a second host was involved prevents a containment action that looks successful while the attacker still has access.",
      ),
      card(
        "In investigation, what does a bare IP address as a download destination suggest?",
        "Legitimate software fetches from named domains with reputation and certificates. A connection to a raw IP address, especially a recently-seen one, is unusual enough to be worth immediate attention.",
      ),
    ],
  },

  // ── SOC Analyst Fundamentals ─────────────────────────────────────────────
  "soc-analyst-fundamentals": {
    "What is a SOC?": [
      card(
        "Why is dwell time the number a SOC cares about most?",
        "The gap between compromise and detection is where damage accumulates. An intrusion caught in an hour is an incident; the same one caught in six months is a breach with regulatory consequences.",
      ),
      card(
        "What is the actual skill of SOC work, given most alerts are not attacks?",
        "Working through high volumes of ambiguity quickly without becoming so numb that the real one goes past unread — not spotting the obvious intrusion, which is rare.",
      ),
    ],
    "SOC Tiers & Roles": [
      card(
        "What is Tier 1 actually accountable for, if not getting the verdict right?",
        "Making a defensible decision quickly and passing on enough context that the next person does not start from nothing. With minutes per alert, a correct final verdict is not a reasonable expectation.",
      ),
      card(
        "Why is the feedback loop from triage to detection engineering so important?",
        "When Tier 1 closes the same false positive forty times a week, that is a rule-tuning problem, not a staffing one. Without a route back to tuning, a SOC slowly drowns in its own alerts.",
      ),
    ],
    "What We Monitor": [
      card(
        "What question does each of endpoint, network and identity telemetry answer?",
        "Endpoints tell you what ran, networks tell you what was communicated, identity tells you who did it. No single domain is sufficient, so investigations move between them constantly.",
      ),
      card(
        "Why can an attacker using stolen valid credentials evade identity monitoring alone?",
        "The authentication succeeds with a real credential from a plausible time, so identity telemetry records something normal. Detecting it needs behavioural context, not the authentication event itself.",
      ),
    ],
    "Baselines & Anomalies": [
      card(
        "Why is the quality of detection limited by the quality of your baseline?",
        "Almost all detection is comparison against normal, so an event is only interesting relative to what usually happens. Rules written for someone else's environment produce meaningless alerts.",
      ),
      card(
        "What happens when an automatic baseline is built during a compromise?",
        "The attacker's activity becomes part of 'normal' and stops generating alerts permanently. Automatic baselining learns whatever it observes, with no notion of what should have been happening.",
      ),
    ],
    "Reading Logs": [
      card(
        "What five questions does almost any log entry answer?",
        "When, where, who, what, and the outcome. Finding those five in an unfamiliar format is the first thing to do with any new log source.",
      ),
      card(
        "Why do timestamps cause so much wasted investigation?",
        "Time zones make simultaneous events appear an hour apart, clock drift produces subtly misleading timelines, and ingestion time differs from event time under load. Normalising to UTC removes much of it.",
      ),
      card(
        "Which log fields should be treated as claims rather than facts?",
        "User agent strings, client-supplied hostnames and process names are all attacker-controllable. Source IP and the outcome recorded by the system itself are much harder to forge.",
      ),
    ],
    "Log Types & Sources": [
      card(
        "Why is process creation with command line the highest-value endpoint log source?",
        "It records both that a program ran and what it was told to do. It is off by default on Windows and needs a registry setting for the command line, without which it is nearly useless.",
      ),
      card(
        "Why is Windows event 1102 a uniquely strong signal?",
        "It records the clearing of the event log, written before the clear takes effect — so the act of destroying evidence records itself, turning an otherwise invisible action into a clear indicator.",
      ),
    ],
    "Mini Assessment: Log Triage": [
      card(
        "In authentication logs, why is failure then success for one account from one source so telling?",
        "Failed logins are constant background noise, but a run of failures followed by a success for the same username from the same address is the moment guessing stopped working — the pivot into compromise.",
      ),
      card(
        "Why does a four-second gap between login and a root shell indicate automation?",
        "A person logging in to do legitimate work reads something first. Escalation four seconds after login is a script, not a human — and it also reveals the account had unrestricted sudo.",
      ),
    ],
    "What is a SIEM?": [
      card(
        "Why is normalisation the step where most SIEM deployments succeed or fail?",
        "It maps each vendor's field names onto a common schema. Done well, a rule written once works everywhere; done badly, the rule matches nothing on half the estate and produces no error to say so.",
      ),
      card(
        "Why is ingesting every available log into a SIEM a trap?",
        "Licensing is volume-based, so it means a large bill, slow searches and a bigger haystack around the same needle. Send what answers a question you actually ask, and archive the rest cheaply.",
      ),
    ],
    "Correlation & Detection Rules": [
      card(
        "What does correlation let a detection rule do that a single-event rule cannot?",
        "Combine events unremarkable alone into a pattern that is not — one failed login is nothing, two hundred failures then a success is an alert. It is how a rule becomes specific enough to act on.",
      ),
      card(
        "Why is alert volume a design constraint rather than an afterthought?",
        "A rule producing 40 alerts a day at ten minutes each consumes most of a full-time person. A rule nobody has time to work gets muted within a fortnight, and muted rules detect nothing.",
      ),
    ],
    "The Triage Process": [
      card(
        "In triage, why must a benign explanation account for all the evidence, not most?",
        "A backup job explains large outbound transfer but not transfer to a residential IP at 02:00 from a workstation. Accepting the first plausible story that covers part of the evidence is how real intrusions get closed.",
      ),
      card(
        "Why write the reason for a closure, not just the verdict?",
        "'False positive' is worthless three months later when the same alert fires. A specific reason — matched this backup job, confirmed with this team, destination is our storage — is still useful a year on.",
      ),
    ],
    "Indicators of Compromise (IOCs)": [
      card(
        "Why are behavioural detections more durable than indicator-based ones?",
        "Recompiling to change a hash costs nothing; changing that an implant must establish persistence, escalate and move laterally costs a redesign of how the operator works. Behaviour is what they cannot cheaply abandon.",
      ),
      card(
        "Why can blocking a two-year-old malicious IP address cause harm?",
        "Addresses get reassigned, so an old C2 address may now be a CDN node or mail relay. Blocking it causes an outage you inflicted on yourself and teaches analysts to distrust the feed.",
      ),
    ],
    "Mini Assessment: Work the Alert": [
      card(
        "What is the most common benign cause of an impossible-travel alert?",
        "A VPN connecting or disconnecting, which moves a user's apparent location instantly. The rule knows nothing about VPNs, roaming or corporate egress points, so that is the explanation to test rather than assume.",
      ),
      card(
        "Which check most efficiently resolves an impossible-travel alert?",
        "Confirming the user was genuinely travelling and that MFA used a device-bound factor. Geolocation and distance are what the rule already did; travel records plus a phishing-resistant factor address both halves.",
      ),
    ],
    "The IR Lifecycle": [
      card(
        "Name the six PICERL phases and the two most often skipped.",
        "Preparation, Identification, Containment, Eradication, Recovery, Lessons learned. Preparation and Lessons learned are the ends that get squeezed, and they determine how well the middle goes.",
      ),
      card(
        "Why must you scope before eradicating and eradicate before recovering?",
        "Cleaning the one host you know about while a second is compromised looks successful and is not; restoring a system while access remains open leads to reinfection, usually within days.",
      ),
    ],
    "Containment & Evidence": [
      card(
        "Why is network isolation almost always preferable to powering off a compromised host?",
        "Both stop the attacker, but only isolation preserves memory — which holds the running implant, its configuration and often credentials. That evidence is unrecoverable once the machine loses power.",
      ),
      card(
        "What does the order of volatility dictate about evidence collection?",
        "Collect from most to least volatile — memory before disk before backups. Everything above 'disk' is gone the moment power is lost and cannot be recovered afterwards.",
      ),
    ],
    "Threat Intel & MITRE ATT&CK": [
      card(
        "In ATT&CK, what is the difference between a tactic and a technique?",
        "A tactic is the objective — persistence, exfiltration; a technique is a way of achieving it, with an id like T1566.001. The value is a shared, unambiguous vocabulary for attacker behaviour.",
      ),
      card(
        "How does mapping detections onto the ATT&CK matrix help a SOC?",
        "It turns a vague sense of coverage into a picture with holes in it. The gaps show which tactics you would currently miss entirely, which guides what to build next better than the newest report.",
      ),
    ],
    "Using Intel in the SOC": [
      card(
        "Why does most threat intelligence fail to change anything?",
        "It produces well-written reports with no decision attached. The fix is to start from the decision — what would you do differently if you knew this — and collect only what serves one.",
      ),
      card(
        "Why does relevance outrank novelty when triaging a threat report?",
        "Relevance is a function of your exposure, not the technique's age. A five-year-old method targeting software you run matters more than a novel one targeting software you do not.",
      ),
    ],
    "End-to-End Investigation": [
      card(
        "Why is a service account authenticating from a workstation an anomaly worth pursuing?",
        "Service accounts run on servers, not finance desktops. One initiating a connection from a workstation is out of place, and pulling that thread often reveals credential theft upstream.",
      ),
      card(
        "Why disable a compromised account after network isolation rather than before?",
        "Revoking access first alerts the attacker while they still hold a live session on, say, a domain controller. Isolating first removes their reach before they learn they have been detected.",
      ),
    ],
  },

  // ── Web Security Fundamentals ────────────────────────────────────────────
  "web-security-fundamentals": {
    "The Request/Response Cycle": [
      card(
        "What is the security consequence of HTTP being stateless?",
        "The server remembers nothing between requests, so each one must carry everything needed to identify who is asking. That is why sessions exist and why identity is proved afresh every request.",
      ),
      card(
        "Why is client-side validation insufficient as a security control?",
        "Everything in a request is attacker-controlled, and a browser is only one possible client. Anyone can craft the request directly without running the page's JavaScript, so the server must validate.",
      ),
    ],
    "Status Codes, Methods & Cookies": [
      card(
        "How can differing 401 and 403 responses on a login form leak information?",
        "Returning one status for an unknown username and another for a known username with a wrong password confirms which usernames exist, letting an attacker narrow later attacks to real accounts.",
      ),
      card(
        "What does the HttpOnly cookie flag protect against?",
        "It stops JavaScript reading the cookie, which turns an XSS bug from session theft into something less severe. It does not prevent XSS itself, only one of its consequences.",
      ),
    ],
    "Password Storage & Hashing": [
      card(
        "In web authentication, why is a fast hash like SHA-256 wrong for storing passwords?",
        "Speed is the attacker's advantage once the database leaks — billions of guesses per second make offline cracking cheap. Password storage wants a deliberately slow algorithm so each guess costs something.",
      ),
      card(
        "Why must a web application salt each stored password individually?",
        "Without a unique salt, identical passwords produce identical hashes, so cracking one breaks every account that shared it and precomputed rainbow tables work. Modern algorithms handle the salt for you.",
      ),
    ],
    "Sessions, Tokens & Brute Force": [
      card(
        "Why should nothing secret ever go in a JWT payload?",
        "A JWT payload is base64-encoded, not encrypted — anyone holding the token can read every claim. Signing proves it was not altered; it does nothing to hide the contents.",
      ),
      card(
        "Why does per-account rate limiting fail to stop password spraying?",
        "Spraying tries one common password across many accounts, so no single account exceeds the limit. Defence needs per-source limiting as well, and ideally phishing-resistant MFA.",
      ),
    ],
    "How SQL Injection Works": [
      card(
        "What is the root cause of SQL injection?",
        "User input becomes part of a query's structure rather than remaining data, because the query is assembled by joining strings. The database cannot tell the developer's instruction from the user's input.",
      ),
      card(
        "Why does suppressing database errors not fix SQL injection?",
        "Blind injection infers data one bit at a time from whether the page changes or how long it takes to respond, needing no error message at all — and it is fully automatable.",
      ),
    ],
    "Preventing SQL Injection": [
      card(
        "How does a parameterised query prevent injection?",
        "The query structure is sent to the database separately from the values, so it knows which part is instruction before it sees the input. Input can then contain any characters and is still treated as data.",
      ),
      card(
        "Why does using an ORM not guarantee protection from SQL injection?",
        "Protection is per-query. A single raw query built with string interpolation is injectable regardless of the ORM, and one injection point is usually enough to reach the whole database.",
      ),
    ],
    "Mini Assessment: Spot the SQLi": [
      card(
        "Why can an ORDER BY column not be protected by a query parameter?",
        "A column name is part of the query's structure, and parameters can only carry values. The only safe pattern is an allow-list — choosing from a fixed set of column names the developer controls.",
      ),
      card(
        "Why is unvalidated input passed as a parameter still safe from injection?",
        "Parameterisation separates structure from data before parsing, so the content is treated as a value no matter what it contains. Unvalidated is not the same as injectable.",
      ),
    ],
    "How XSS Works": [
      card(
        "Whose privileges does an injected XSS script run with, and why does that matter?",
        "The victim's — their session, cookies and the site's own origin. From the application's view the attacker's actions are indistinguishable from the user's, which is what makes XSS severe.",
      ),
      card(
        "Why is DOM-based XSS invisible to a firewall inspecting requests?",
        "The payload is often in the URL fragment, which browsers never send to the server. Client-side code reads it and writes it into the page, so server-side traffic never carries it.",
      ),
    ],
    "Preventing XSS": [
      card(
        "Why is filtering script tags an inadequate defence against XSS?",
        "Script execution has many other routes — event handler attributes, javascript: URLs, SVG — and an img tag with onerror needs no script tag at all. Context-aware output encoding covers them all.",
      ),
      card(
        "Why use a maintained sanitiser rather than filtering HTML yourself?",
        "The HTML parser has enormous surface and bypasses for hand-written filters are found continually. A library like DOMPurify with an allow-list is one of the clearest cases where your own is strictly worse.",
      ),
    ],
    "Server-Side Request Forgery": [
      card(
        "Why is SSRF considered more severe in cloud environments?",
        "The instance metadata service at 169.254.169.254 returns the host's role credentials to anything that can make an HTTP request from it, so an SSRF turns a web bug directly into cloud API access.",
      ),
      card(
        "How is blind SSRF still exploitable when the response is never shown?",
        "The attacker learns from timing and error differences — an open port responds differently from a closed one — which is enough to map an internal network and reach services that act without replying.",
      ),
    ],
    "Defending Against SSRF": [
      card(
        "Why can validating a URL's resolved address before fetching it be bypassed?",
        "The check and the fetch are separate DNS resolutions, and an attacker controlling the record can answer them differently — safe to the check, internal to the fetch. This is a time-of-check to time-of-use flaw.",
      ),
      card(
        "Why is the durable SSRF defence at the network layer rather than in the application?",
        "Network egress control enforces the destination when the connection is actually made, so the service cannot route to internal ranges or the metadata endpoint regardless of what the application decides.",
      ),
    ],
    "Broken Access Control & IDOR": [
      card(
        "Why is broken access control largely invisible to automated scanners?",
        "A scanner sees a 200 response with a valid-looking object and cannot know it belonged to someone else. Finding it requires knowing what should be permitted, which is business logic, not a pattern.",
      ),
      card(
        "Why are unguessable identifiers not a substitute for access control?",
        "Identifiers leak through referrals, logs, screenshots and exports, and the moment one does the object is readable by anyone. UUIDs raise enumeration cost and provide no authorisation.",
      ),
    ],
    "Privilege Escalation & CSRF": [
      card(
        "What is mass assignment, and how does it enable privilege escalation?",
        "Saving a whole request body to a record lets a user set fields they should not, such as their own role. The fix is to select the permitted fields explicitly rather than filtering the dangerous ones.",
      ),
      card(
        "Why does cross-site request forgery work at all?",
        "Browsers attach cookies to requests automatically based on the destination, regardless of which site initiated them — so an attacker's page can cause an authenticated request the victim did not intend.",
      ),
    ],
    "Secure Coding Principles": [
      card(
        "Why should a permission check fail closed?",
        "Failing open converts an outage into an authorisation bypass, and load is something an attacker can often influence. Denying on error means a failure degrades availability, never confidentiality.",
      ),
      card(
        "Why make the safe path the easy path in a codebase?",
        "If safety requires remembering a rule on every call site it will eventually be forgotten — not through carelessness but because that is what happens to rules that depend on memory. A safe helper gets used.",
      ),
    ],
    "Dependencies & Secrets": [
      card(
        "Why is rotating a committed secret the only reliable response?",
        "Git history, every clone, and possibly CI logs and forks still contain it. Deleting it in a later commit or rewriting history cannot reach copies you do not control, so it must be treated as public.",
      ),
      card(
        "Why does an SBOM's value appear entirely on the day of a major advisory?",
        "When the next advisory lands, a software bill of materials lets you answer 'are we affected?' in minutes rather than auditing every dependency by hand under time pressure.",
      ),
    ],
    "Applied Review": [
      card(
        "Why can a missing ownership check be more severe than a SQL injection in the same endpoint?",
        "SQL injection needs a crafted payload; an authorisation gap needs only a different id, works for every object, and produces requests that look entirely legitimate — exploitable with no anomaly in the logs.",
      ),
      card(
        "In a code review, why is spotting the shared pattern often more valuable than the individual bugs?",
        "Four bugs in one endpoint — all user input trusted at a different layer — suggests the codebase lacks a safe path. That is a design conversation rather than four disconnected tickets.",
      ),
    ],
  },

  // ── Linux Security Fundamentals ──────────────────────────────────────────
  "linux-security-fundamentals": {
    "The Command Line": [
      card(
        "Why is the shell the primary tool for Linux security work?",
        "It is scriptable, works identically over a remote connection, leaves a record of exactly what was done, and reaches everything. On a compromised host you will often have nothing but a shell.",
      ),
      card(
        "Why is an interactive login from an unrecognised external address significant on a server?",
        "Servers usually run services, not interactive sessions. A human shell logged in from an address that is neither an admin jump host nor a known range is precisely the anomaly to investigate first.",
      ),
    ],
    "Pipes, Redirects & Find": [
      card(
        "Why is searching a filesystem by modification time often more useful than by filename?",
        "An attacker controls what a file is called but leaves a modification timestamp they cannot easily choose. The time places the file in the window of the activity you are investigating.",
      ),
      card(
        "What is the core investigative skill the shell's pipe enables?",
        "Composition — chaining small single-purpose commands to answer a question no single tool was built for. You build the tool you need from parts rather than looking for one that already exists.",
      ),
    ],
    "Filesystem Hierarchy": [
      card(
        "Why are /tmp, /var/tmp and /dev/shm the first directories to check on a host?",
        "They are world-writable, so any user can drop tooling there with no privilege needed — which is exactly why attackers use them. Recent files in these three are high-value triage targets.",
      ),
      card(
        "How can you recover a running binary that has been deleted from disk?",
        "From /proc/<pid>/exe, which references the executable even after the file is unlinked, as long as the process runs. Attackers delete their binary to hide it, but the running process gives it away.",
      ),
    ],
    "Files, Links & Hidden Data": [
      card(
        "Why does a leading dot on a filename provide no security?",
        "It only tells listing tools to hide the file by default. Anyone using ls -a or find sees it exactly as any other file, so it is a display convention rather than access control.",
      ),
      card(
        "What makes a statically linked binary notable when found in a temp directory?",
        "It carries its own libraries, so it runs anywhere regardless of what is installed — convenient for an attacker dropping tooling onto an unknown host, and a small tell when found somewhere it should not be.",
      ),
    ],
    "Reading Permissions": [
      card(
        "How do you read the ten-character Linux permission string?",
        "The first character is the type; the next three are the owner's read/write/execute, then the group's, then everyone else's. Read it in groups of three: owner, group, others.",
      ),
      card(
        "Why does SSH refuse to use a private key with 644 permissions?",
        "At 644 every local user can read the key, which is enough to impersonate its owner. A private key must be readable only by its owner — 600 — and SSH enforces this because looser makes it worthless.",
      ),
    ],
    "chmod, chown & SUID": [
      card(
        "What does the setuid bit do, and why is it a security concern?",
        "A setuid program runs with the privileges of the file's owner rather than whoever launched it. When the owner is root, any user running it operates as root — so every setuid-root binary is a potential escalation.",
      ),
      card(
        "Why is an unexpected setuid-root binary such as find a critical finding?",
        "Programs that can run commands or read and write files become root-level tools when setuid root — find can spawn a shell, giving an instant root prompt. Enumerating setuid binaries is a first step for both sides.",
      ),
    ],
    "Inspecting Processes": [
      card(
        "Why can a parent-child process relationship be wrong when neither process is individually?",
        "nginx is fine, a shell is fine, curl is fine — but a web server spawning a shell that spawns a downloader is a hallmark of a web exploit. The relationship is the anomaly, not any single process.",
      ),
      card(
        "Why is the PPID column so valuable when reading a process list?",
        "It reveals lineage — what started what. A flat list of process names hides that nginx launched a shell; the parent-child links expose the sequence an attacker's activity leaves behind.",
      ),
    ],
    "Services, systemd & Cron": [
      card(
        "Why are services and scheduled tasks the places to hunt for persistence?",
        "Getting code to run once is not enough for an attacker — a reboot ends it. The mechanisms that legitimately start programs automatically, like cron and systemd, are exactly where persistence lives.",
      ),
      card(
        "Why is a host not clean after removing one malicious cron job?",
        "Persistence is deliberately redundant. A systemd service, an authorized_keys entry or a .bashrc line can each re-establish access, so every mechanism must be enumerated before any is removed.",
      ),
    ],
    "Inspecting Network Connections": [
      card(
        "What turns a suspicious network connection into an actionable finding?",
        "The process that owns the socket, revealed by ss -p and traceable through /proc. A connection to a bad address is a lead; the program making it is what you investigate, contain and remove.",
      ),
      card(
        "Why is a process that both listens and connects out a classic backdoor shape?",
        "It takes commands on the listening port and reports back on the outbound connection — the dual role of receiving instructions and exfiltrating or beaconing that a backdoor needs.",
      ),
    ],
    "Firewalls & SSH Hardening": [
      card(
        "Why is disabling SSH password authentication more valuable than changing the port?",
        "Key-only authentication removes password guessing entirely — there is no secret left to guess. Moving the port is obscurity that a scanner defeats quickly, leaving the underlying weakness untouched.",
      ),
      card(
        "Why does outbound firewall filtering matter on a server?",
        "A server that only needs to reach a package mirror and a database has no reason to connect anywhere else. Restricting egress is what catches command-and-control after a compromise.",
      ),
    ],
    "Hardening Principles": [
      card(
        "What is the single idea underneath every specific hardening step?",
        "Anything that is not there cannot be attacked. A service not running, an account that does not exist, a package not installed — most hardening is subtraction of attack surface.",
      ),
      card(
        "How does a captured baseline help detect compromise?",
        "Recording the intended state — services, packages, ports, users — makes divergence visible. A new listening port or unexpected setuid binary stands out against a known baseline where it would otherwise be invisible.",
      ),
    ],
    "Users, sudo & Auditing": [
      card(
        "Why is NOPASSWD: ALL in sudoers effectively granting root?",
        "It lets the account run any command as root without a password, so a web process compromised while running as it inherits full root. Scoping sudo to specific commands limits the blast radius.",
      ),
      card(
        "What is the security value of logging privileged actions, beyond after-the-fact detection?",
        "The knowledge that actions are recorded changes behaviour, and the record is what lets you reconstruct what a compromised account actually did — turning an opaque incident into a reconstructable one.",
      ),
    ],
    "Common Escalation Paths": [
      card(
        "Why does most Linux privilege escalation being misconfiguration matter for defence?",
        "If most paths are misconfigurations rather than exploits, auditing sudo rules, setuid binaries and file permissions closes the majority — no patch required. The same enumeration an attacker runs is the defender's audit.",
      ),
      card(
        "Why is `sudo -l` the first thing checked in an escalation attempt?",
        "It lists exactly what the current account may run as another user, which is the cleanest escalation when something exploitable is permitted and the fastest category to rule out when it is not.",
      ),
    ],
    "Mini Assessment: Find the Escalation": [
      card(
        "Why must a defender who finds one escalation path keep enumerating?",
        "An attacker needs only one working path, so a defender must close all of them. Fixing a setuid vim while leaving a world-writable root cron job leaves the host just as escalatable.",
      ),
      card(
        "Why is a world-writable file in /etc/cron.d a route to root?",
        "Cron jobs there run as root, so if an unprivileged user can edit the file they can change what root executes on a schedule — running their own code with root's privileges.",
      ),
    ],
    "Applied Investigation": [
      card(
        "How can a single reported connection uncover a full host compromise?",
        "Tying the connection to its process, seeing through a faked process name via /proc, tracing back to the web exploit that spawned it and forward through escalation to persistence — each artefact points at the next.",
      ),
      card(
        "Why check every persistence location before removing any during host cleanup?",
        "Attackers plant redundant persistence — cron, a systemd service, an SSH key, all calling the same address. Remove one and the others restore access, so all must be enumerated and removed together.",
      ),
    ],
  },
};
