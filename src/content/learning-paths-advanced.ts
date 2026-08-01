/**
 * Second tranche of learning paths.
 *
 * Split from learning-paths.ts to keep both files readable rather than because
 * the content differs in kind. Three of these fill paths that already existed
 * with labs but no modules — a path that renders an empty module page is worse
 * than one that was never listed.
 *
 * Topics were chosen for genuine distinctness. Publishing forty paths that
 * re-teach the same six concepts would inflate a count and teach nothing, so
 * these cover ground the first tranche does not: offensive work, purple team,
 * containers, identity, secure coding, OT, leadership and compliance.
 */

import type { PathSeed, QuizQuestionSeed, ModuleSeed } from "./learning-paths";

/** Question bank for this tranche. Distractors are real misconceptions. */
const Q = {
  ctfMethod: {
    type: "MULTIPLE_CHOICE" as const,
    question: "You are stuck on a challenge with no obvious way in. What is the most productive next step?",
    options: [
      "Try every exploit you know against it in turn",
      "Re-read what you have been given and list what you have not yet checked",
      "Look up the answer and move on",
      "Assume the challenge is broken",
    ],
    correctAnswer: 1,
    explanation:
      "Most stalls are missing enumeration, not missing exploits. Listing what you have not checked turns a stall into a plan.",
  },
  encoding: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which of these are encodings rather than encryption?",
    options: ["Base64", "AES-256", "ROT13", "Hexadecimal"],
    correctAnswer: [0, 2, 3],
    explanation:
      "Encoding is reversible without a key and provides no confidentiality. Treating Base64 as protection is a recurring real-world failure, not just a CTF trap.",
  },
  reconScope: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Before any active testing, what governs what you may touch?",
    options: [
      "Whatever resolves to the client's domain",
      "The written scope and rules of engagement",
      "Anything reachable from the client's network",
      "Whatever the client mentioned verbally",
    ],
    correctAnswer: 1,
    explanation:
      "Scope is contractual. Acting outside it — even helpfully — turns authorised testing into unauthorised access.",
  },
  privEscLinux: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which findings could plausibly yield root on a Linux host?",
    options: [
      "A SUID binary that spawns a shell",
      "A writable systemd unit file",
      "World-readable /etc/passwd",
      "sudo rights on a command that can execute arbitrary files",
    ],
    correctAnswer: [0, 1, 3],
    explanation:
      "SUID binaries, writable units and permissive sudo entries are all escalation routes. /etc/passwd being readable is normal and yields nothing on its own.",
  },
  provingImpact: {
    type: "MULTIPLE_CHOICE" as const,
    question: "You find an exploitable flaw on a production system. What do you do?",
    options: [
      "Exploit it fully to demonstrate maximum impact",
      "Demonstrate impact minimally, then stop and report",
      "Leave it undocumented to avoid causing alarm",
      "Delete the affected data to prove the risk is real",
    ],
    correctAnswer: 1,
    explanation:
      "The objective is to evidence risk, not to realise it. Proving access is enough; causing the damage you are warning about is not testing.",
  },
  intelSources: {
    type: "MULTIPLE_CHOICE" as const,
    question: "What makes a piece of threat intelligence actionable for your organisation?",
    options: [
      "It concerns a sophisticated and widely reported actor",
      "It maps to techniques your estate is actually exposed to",
      "It was published recently",
      "It contains a large number of indicators",
    ],
    correctAnswer: 1,
    explanation:
      "Relevance beats novelty and volume. Intelligence about an actor who cannot reach you is interesting, not actionable.",
  },
  intelConfidence: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A report attributes an intrusion to a named state actor with 'high confidence'. How should you treat it?",
    options: [
      "As established fact for your own reporting",
      "As one assessment, weighing the evidence and the assessor's visibility",
      "As irrelevant, since attribution never matters",
      "As proof that your organisation is being targeted",
    ],
    correctAnswer: 1,
    explanation:
      "Attribution is an assessment, not an observation. Repeating someone else's confidence as your own fact is how bad conclusions propagate.",
  },
  iocLifespan: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Why do hash- and domain-based indicators decay quickly?",
    options: [
      "Detection tools expire them automatically",
      "Attackers change infrastructure and rebuild payloads cheaply",
      "They are usually reported inaccurately",
      "They only apply to one operating system",
    ],
    correctAnswer: 1,
    explanation:
      "Infrastructure and payloads are cheap to change; tradecraft is not. That is why behavioural detection outlives indicator feeds.",
  },
  purpleLoop: {
    type: "MULTIPLE_CHOICE" as const,
    question: "What is the defining output of a purple team exercise?",
    options: [
      "A list of successful attacks",
      "Measured detection coverage, and the gaps closed as a result",
      "A score comparing red and blue",
      "A penetration test report",
    ],
    correctAnswer: 1,
    explanation:
      "Purple team exists to improve detection, not to determine a winner. An exercise that ends without a tuned rule has not finished.",
  },
  atomicTesting: {
    type: "MULTIPLE_CHOICE" as const,
    question: "You emulate a technique and no alert fires. What is the first thing to check?",
    options: [
      "Whether the detection rule is wrong",
      "Whether the relevant telemetry was collected at all",
      "Whether the analyst missed it",
      "Whether the technique works on your platform",
    ],
    correctAnswer: 1,
    explanation:
      "A rule cannot fire on data you do not collect. Coverage gaps masquerade as detection gaps far more often than the reverse.",
  },
  containerEscape: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which configurations meaningfully raise the risk of container escape?",
    options: [
      "Running the container as root",
      "Mounting the host Docker socket inside the container",
      "Setting a memory limit",
      "Running with --privileged",
    ],
    correctAnswer: [0, 1, 3],
    explanation:
      "Root, a mounted Docker socket and privileged mode each hand out host-level capability. A memory limit constrains resources, not privilege.",
  },
  k8sRbac: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Why is a Kubernetes service account with cluster-admin especially dangerous?",
    options: [
      "It consumes more resources",
      "Any workload holding its token effectively controls the cluster",
      "It cannot be audited",
      "It prevents pods from scheduling",
    ],
    correctAnswer: 1,
    explanation:
      "Service account tokens are mounted into pods. A single compromised workload with that binding is a cluster takeover.",
  },
  mfaTypes: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which second factor best resists real-time phishing?",
    options: [
      "SMS one-time code",
      "Time-based code from an authenticator app",
      "Phishing-resistant hardware token bound to the origin",
      "Email one-time link",
    ],
    correctAnswer: 2,
    explanation:
      "Origin-bound hardware factors will not authenticate to an attacker's domain. Codes of any kind can be relayed by a proxy in real time.",
  },
  leastPrivilege: {
    type: "MULTIPLE_CHOICE" as const,
    question: "What most often defeats least privilege in practice?",
    options: [
      "Users demanding administrator rights",
      "Permissions granted for a temporary need and never revoked",
      "Poor password policies",
      "Lack of security awareness training",
    ],
    correctAnswer: 1,
    explanation:
      "Standing access accumulated from expired justifications is the usual failure. It is an expiry problem far more than a granting problem.",
  },
  inputValidation: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Where must untrusted input be validated?",
    options: [
      "In the browser, before submission",
      "At every trust boundary on the server side",
      "In the database layer only",
      "At the network firewall",
    ],
    correctAnswer: 1,
    explanation:
      "Client-side validation is a usability feature; anyone can bypass it. Validation belongs wherever data crosses into a context that acts on it.",
  },
  secretsHandling: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which practices genuinely reduce the risk of leaked credentials?",
    options: [
      "Short-lived credentials issued at runtime",
      "Secrets committed to a private repository",
      "Automated scanning of commits for secrets",
      "Rotating long-lived keys on a schedule",
    ],
    correctAnswer: [0, 2, 3],
    explanation:
      "A private repository is one access-control mistake from public, and history keeps the secret forever. Short-lived credentials remove the prize entirely.",
  },
  otSafety: {
    type: "MULTIPLE_CHOICE" as const,
    question: "How does incident response in OT differ most sharply from IT?",
    options: [
      "OT systems are newer and better patched",
      "Availability and physical safety usually outrank confidentiality",
      "OT networks carry less traffic",
      "OT incidents are always caused by insiders",
    ],
    correctAnswer: 1,
    explanation:
      "Isolating a controller mid-process can be more dangerous than the intrusion. OT response is a safety decision before it is a security one.",
  },
  otSegmentation: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which single observation most clearly proves OT segmentation has failed?",
    options: [
      "Modbus traffic between two PLCs",
      "A PLC making an outbound connection to an internet host",
      "An engineering workstation reading register values",
      "A vendor account logging into the historian",
    ],
    correctAnswer: 1,
    explanation:
      "Controllers should never reach the internet. That single flow proves the boundary is not what the diagram claims.",
  },
  metricsThatMatter: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which SOC metric most reflects genuine capability?",
    options: [
      "Number of alerts closed per analyst per shift",
      "Time to detect and contain real incidents",
      "Total alerts generated",
      "Number of detection rules deployed",
    ],
    correctAnswer: 1,
    explanation:
      "Volume metrics reward closing tickets fast. Detection and containment time measure whether the function actually works.",
  },
  onCallHealth: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Your team is sixteen hours into an incident. What is the right call?",
    options: [
      "Push through while momentum lasts",
      "Rotate with a written handover and bring in external support",
      "Stand everyone down until morning",
      "Reduce the team so fewer people are tired",
    ],
    correctAnswer: 1,
    explanation:
      "Hour sixteen is where the deleted-instead-of-isolated host comes from. A written handover is what makes rotation safe rather than disruptive.",
  },
  dataRetention: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Why does excessive data retention increase breach impact?",
    options: [
      "It slows down backups",
      "Data you no longer need is still data an attacker can take",
      "It breaches licensing agreements",
      "It makes systems harder to patch",
    ],
    correctAnswer: 1,
    explanation:
      "Retention is a liability multiplier. The cheapest way to reduce breach scope is to hold less for less time.",
  },
  lawfulBasis: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A security tool would process employee personal data. What must be established first?",
    options: [
      "That the vendor is ISO 27001 certified",
      "A lawful basis and a proportionality assessment",
      "That the tool encrypts data at rest",
      "That the data stays within the organisation",
    ],
    correctAnswer: 1,
    explanation:
      "Security purpose does not exempt processing from data protection law. Basis and proportionality come before technical controls.",
  },
};

function mod(
  title: string,
  overview: string,
  reading: string,
  questions: QuizQuestionSeed[],
  passMark = 70,
): ModuleSeed {
  return {
    title,
    overview,
    readingMaterial: reading,
    quiz: { title: `${title} — Check`, passMark, questions },
  };
}

export const ADVANCED_PATHS: PathSeed[] = [
  // ── Fills an existing shell ──────────────────────────────────────────────
  {
    slug: "ctf-starter",
    title: "CTF Starter",
    description:
      "The habits that make challenges tractable: enumerate properly, recognise encodings, and work a stall methodically.",
    modules: [
      mod(
        "How to approach a challenge",
        "Turning 'I am stuck' into a list of things not yet checked.",
        "Nearly every stall is missing enumeration rather than a missing exploit. Write down what you were given, what you have examined, and what you have assumed without verifying — the answer is usually in the third list.",
        [Q.ctfMethod, Q.encoding],
      ),
      mod(
        "Encoding, hashing and encryption",
        "Three things that are routinely confused, with very different consequences.",
        "Encoding is reversible by anyone. Hashing is one-way. Encryption is reversible with a key. Treating Base64 as protection is a real production failure, not just a CTF trap.",
        [Q.encoding, Q.inputValidation],
      ),
      mod(
        "Reading the clues you are given",
        "Challenge text, file types and metadata as evidence.",
        "The framing of a challenge is part of the challenge. File magic bytes, timestamps and embedded metadata narrow the search space before any tool is opened.",
        [Q.ctfMethod, Q.inputValidation],
      ),
    ],
  },
  {
    slug: "red-team-fundamentals",
    title: "Red Team Fundamentals",
    description:
      "Offensive work done properly: scope discipline, methodical escalation, and proving impact without causing it.",
    modules: [
      mod(
        "Scope and authorisation",
        "What governs what you may touch, and why it is not negotiable.",
        "Scope is contractual, not technical. A host that resolves to the client's domain but is not in scope is out of bounds, and testing it is unauthorised access regardless of intent.",
        [Q.reconScope, Q.provingImpact],
      ),
      mod(
        "Enumeration and escalation",
        "Working systematically from foothold to objective.",
        "Escalation is an enumeration problem. SUID binaries, writable service definitions and permissive sudo entries are found by looking, not by guessing exploits.",
        [Q.privEscLinux, Q.reconScope],
      ),
      mod(
        "Proving impact responsibly",
        "Demonstrating risk without realising it.",
        "Show that access is possible, then stop. Exfiltrating real data or disrupting production to make a point converts an engagement into the incident you were hired to prevent.",
        [Q.provingImpact, Q.privEscLinux],
      ),
    ],
  },
  {
    slug: "threat-intelligence-analyst-path",
    title: "Threat Intelligence Analyst",
    description:
      "Turning reporting into decisions: assessing relevance, weighing confidence, and resisting interesting-but-irrelevant.",
    modules: [
      mod(
        "Relevance over novelty",
        "Deciding which intelligence matters to your estate.",
        "An actor who cannot reach you is not your threat. Relevance is a function of your exposure, not of how sophisticated or widely reported the actor is.",
        [Q.intelSources, Q.iocLifespan],
      ),
      mod(
        "Confidence and attribution",
        "Reading someone else's assessment without adopting their certainty.",
        "Attribution is an assessment built on partial visibility. Repeating another organisation's confidence as your own fact is how weak conclusions spread through an industry.",
        [Q.intelConfidence, Q.intelSources],
      ),
      mod(
        "From intelligence to detection",
        "Converting reporting into something the SOC can use.",
        "Hashes and domains decay in days; behaviour decays when tradecraft changes. Prioritise the technique described in a report over the indicator list appended to it.",
        [Q.iocLifespan, Q.intelSources],
      ),
    ],
  },

  // ── Genuinely new topics ─────────────────────────────────────────────────
  {
    slug: "purple-team-operations",
    title: "Purple Team Operations",
    description:
      "Emulate a technique, measure whether you detect it, close the gap, and prove the gap closed.",
    modules: [
      mod(
        "The purple loop",
        "Why the exercise is not finished until a rule changes.",
        "Purple team exists to improve detection, not to decide a winner. An exercise that ends with a findings list and no tuned rule has produced a report, not an improvement.",
        [Q.purpleLoop, Q.atomicTesting],
      ),
      mod(
        "Emulating techniques safely",
        "Running adversary behaviour in production without becoming the incident.",
        "Emulation needs a defined blast radius, a rollback, and someone in the SOC who knows it is happening — otherwise you are running an unannounced intrusion.",
        [Q.atomicTesting, Q.provingImpact],
      ),
      mod(
        "Measuring coverage",
        "Distinguishing a detection gap from a telemetry gap.",
        "A rule cannot fire on data you never collected. When emulation produces no alert, check collection before you touch the rule — coverage gaps masquerade as detection gaps constantly.",
        [Q.atomicTesting, Q.purpleLoop],
      ),
    ],
  },
  {
    slug: "container-and-kubernetes-security",
    title: "Container and Kubernetes Security",
    description:
      "Isolation boundaries, escape routes, and why cluster identity is the thing worth protecting.",
    modules: [
      mod(
        "What a container actually isolates",
        "Namespaces and cgroups, and where the boundary is thinner than assumed.",
        "A container is a process with a restricted view, not a virtual machine. Anything that widens that view — the host socket, privileged mode, root — collapses the boundary.",
        [Q.containerEscape, Q.leastPrivilege],
      ),
      mod(
        "Cluster identity and RBAC",
        "Why a service account binding is the highest-value target in a cluster.",
        "Service account tokens are mounted into pods by default. A workload bound to cluster-admin means one compromised container is a cluster takeover.",
        [Q.k8sRbac, Q.leastPrivilege],
      ),
      mod(
        "Supply chain for images",
        "Trusting what you run, and knowing what is inside it.",
        "An image is a build artefact with the same provenance problems as any other. Pinning by digest and scanning at build time are the minimum, not the finish line.",
        [Q.secretsHandling, Q.containerEscape],
      ),
    ],
  },
  {
    slug: "identity-and-access-management",
    title: "Identity and Access Management",
    description:
      "Authentication, authorisation and the standing access that quietly accumulates until it becomes the breach.",
    modules: [
      mod(
        "Authentication factors",
        "What each factor resists, and what it does not.",
        "Any code a user can read out can be relayed by a proxy in real time. Origin-bound hardware factors are the only ones that will not authenticate to an attacker's domain.",
        [Q.mfaTypes, Q.leastPrivilege],
      ),
      mod(
        "Authorisation and standing access",
        "Why least privilege decays, and what actually holds it in place.",
        "Access granted for a temporary need and never revoked is the usual failure. Expiry, not approval, is the control that keeps least privilege true six months later.",
        [Q.leastPrivilege, Q.k8sRbac],
      ),
      mod(
        "Detecting identity compromise",
        "Spotting an attacker who holds valid credentials.",
        "Valid credentials defeat signature-based detection entirely. Impossible travel, unusual API mixes and rare-but-high-impact actions are what remain.",
        [Q.mfaTypes, Q.intelSources],
      ),
    ],
  },
  {
    slug: "secure-coding-fundamentals",
    title: "Secure Coding Fundamentals",
    description:
      "Trust boundaries, input handling and secret management, from the perspective of the person writing the code.",
    modules: [
      mod(
        "Trust boundaries",
        "Identifying where untrusted data crosses into a context that acts on it.",
        "Injection of every kind is one problem: data crossing a boundary into a context that interprets it. Naming the boundaries in a design is most of the defence.",
        [Q.inputValidation, Q.encoding],
      ),
      mod(
        "Handling secrets",
        "Why a private repository is not a secret store.",
        "A private repository is one access-control mistake from public, and history keeps the secret forever. Short-lived credentials issued at runtime remove the prize entirely.",
        [Q.secretsHandling, Q.leastPrivilege],
      ),
      mod(
        "Dependencies and provenance",
        "Knowing what you actually ship.",
        "Most code in a release was written by someone else. Pinning, lockfiles and knowing which registry resolved a package are what stop a dependency becoming an entry point.",
        [Q.secretsHandling, Q.inputValidation],
      ),
    ],
  },
  {
    slug: "ot-ics-security",
    title: "OT and ICS Security",
    description:
      "Securing systems where availability and physical safety outrank confidentiality, and the boundary is the whole defence.",
    modules: [
      mod(
        "Why OT is different",
        "Safety, availability and equipment that cannot simply be patched.",
        "Isolating a controller mid-process can be more dangerous than the intrusion. OT response is a safety decision taken with engineering before it is a security one.",
        [Q.otSafety, Q.otSegmentation],
      ),
      mod(
        "Segmentation and the boundary",
        "What the diagram claims, and how to prove it.",
        "Segmentation is asserted far more often than it is verified. A single outbound flow from a controller settles the question regardless of what the architecture says.",
        [Q.otSegmentation, Q.otSafety],
      ),
      mod(
        "Monitoring industrial protocols",
        "Reading Modbus and S7comm well enough to spot manipulation.",
        "Industrial protocols were designed without authentication. Detection therefore rests on which host is issuing writes and whether the values are plausible, not on the protocol itself.",
        [Q.otSegmentation, Q.atomicTesting],
      ),
    ],
  },
  {
    slug: "security-operations-leadership",
    title: "Security Operations Leadership",
    description:
      "Running the function: metrics that mean something, sustainable on-call, and owning the call when it goes wrong.",
    modules: [
      mod(
        "Metrics that mean something",
        "Measuring capability rather than activity.",
        "Alerts closed per shift rewards speed over correctness. Detection and containment time on real incidents measures whether the function actually works.",
        [Q.metricsThatMatter, Q.onCallHealth],
      ),
      mod(
        "Sustainable operations",
        "Fatigue as an operational risk rather than a welfare footnote.",
        "Hour sixteen produces the misconfigured firewall rule and the host deleted instead of isolated. Rotation with a written handover is a control, not a courtesy.",
        [Q.onCallHealth, Q.metricsThatMatter],
      ),
      mod(
        "Communicating upwards",
        "Briefing executives so they can decide.",
        "Executives can handle uncertainty; they cannot handle being surprised later. Three facts, the open questions, and a stated time for the next update.",
        [Q.metricsThatMatter, Q.lawfulBasis],
      ),
    ],
  },
  {
    slug: "data-protection-and-compliance",
    title: "Data Protection and Compliance",
    description:
      "Obligations that shape incident response: lawful basis, retention as liability, and notification under pressure.",
    modules: [
      mod(
        "Lawful basis and proportionality",
        "Why a security purpose does not exempt you from data protection law.",
        "Monitoring tools process personal data. Establishing a lawful basis and assessing proportionality comes before deployment, not after a complaint.",
        [Q.lawfulBasis, Q.dataRetention],
      ),
      mod(
        "Retention as liability",
        "Holding less as a security control.",
        "Data you no longer need is still data an attacker can take. Reducing retention is one of the few controls that shrinks breach scope without ongoing effort.",
        [Q.dataRetention, Q.lawfulBasis],
      ),
      mod(
        "Notification under uncertainty",
        "Meeting a deadline before the scope is settled.",
        "The clock runs from awareness, not from certainty. Preparing the notification alongside the investigation is what makes filing honestly and on time possible at all.",
        [Q.lawfulBasis, Q.dataRetention],
      ),
    ],
  },
];
