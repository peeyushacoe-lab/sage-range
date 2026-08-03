/**
 * Threat Intelligence Essentials — full lesson content.
 */

import {
  type Course, lesson, text, code, callout, check, cmd, diagram, note, out, stage, step, terminal, walkthrough, practice,
} from "./blocks";

export const THREAT_INTELLIGENCE: Course = {
  slug: "threat-intelligence-essentials",
  modules: [
    {
      title: "Relevance and collection",
      description: "Deciding what to pay attention to.",
      lessons: [
        lesson(
          "Intelligence requirements",
          "Starting from your decisions rather than from the feed.",
          10,
          [
            text(
              "Most threat intelligence programmes begin by buying a feed and then looking for something to do with it. That order produces volume without value.\n\nThe working order is the reverse: start from the **decisions your organisation needs to make**, and collect only what informs them. Everything else is reading.",
            ),
            code(
              `Poor requirement
  "Track all ransomware groups."
  Unbounded, informs no specific decision.

Workable requirement
  "Which ransomware groups target UK healthcare via
   third-party remote access, and what initial access
   techniques do they use?"
  Bounded, and the answer changes what we prioritise.`,
              "text",
            ),
            callout(
              "important",
              "If the answer changes nothing, do not collect it",
              "The test of a requirement is whether a plausible answer would alter a decision. If both answers lead to the same action, the question is curiosity rather than intelligence.",
            ),
            check(
              "What makes a threat intelligence requirement useful?",
              [
                "It covers as many threat actors as possible",
                "A plausible answer would change a decision the organisation makes",
                "It focuses on the most sophisticated actors",
                "It can be answered from open sources",
              ],
              1,
              "Intelligence exists to inform decisions. A requirement whose answer changes nothing produces reading material, however interesting it is.",
            ),
          ],
        ),
        lesson(
          "Sources and their biases",
          "Vendor reporting, open source and sharing communities.",
          8,
          [
            text(
              "Every source has a shape determined by how it sees the world. Recognising that is not cynicism; it is how you weight what you read.\n\n**Vendor reporting** is detailed and reflects that vendor's telemetry and customers — and often, quietly, their product roadmap. **Open source** is broad and uneven. **Sharing communities** are the most directly relevant and the least complete, because participation is voluntary.",
            ),
            callout(
              "info",
              "Visibility shapes conclusions",
              "A vendor with strong endpoint telemetry sees endpoint techniques. That is not distortion — it is a genuine limit, and it means their picture of an actor is partial in a predictable direction.",
            ),
            code(
              `Source type          Strength                Predictable gap
──────────────────   ─────────────────────   ─────────────────────
Vendor reporting     depth, telemetry        limited to their sensors
Government advisory  authority, breadth      slow, often sanitised
Open source          timely, wide            uneven, unverified
Sharing community    sector relevance        voluntary, incomplete
Internal telemetry   directly applicable     only what you can see`,
              "text",
            ),
            text(
              "Internal telemetry belongs on that list and is routinely forgotten. Your own incidents are the most relevant intelligence available to you, and the only source guaranteed to describe an actor who genuinely reached your estate rather than someone else's.",
            ),
            check(
              "A vendor report describes an actor as using exclusively endpoint-based techniques. What is the most careful reading?",
              [
                "The actor does not use network-based techniques",
                "The report reflects that vendor's telemetry, which may not cover network activity",
                "The report is unreliable",
                "The actor is unsophisticated",
              ],
              1,
              "Absence in a report reflects the reporter's visibility as much as the actor's behaviour. Treat coverage gaps as gaps, not as findings.",
            ),
          ],
        ),
        lesson(
          "Relevance over novelty",
          "An actor who cannot reach you is not your threat.",
          8,
          [
            text(
              "Sophisticated actors make compelling reading, and most organisations will never encounter one. Meanwhile the credential-stuffing operation that hits you weekly generates no headlines at all.\n\nRelevance is a function of **your** exposure: your sector, your geography, your technology, your suppliers. It is not a function of how interesting the actor is.",
            ),
            code(
              `Assessing relevance

  Does this actor target our sector?          ← sector
  Do they operate where we operate?           ← geography
  Do they exploit technology we run?          ← estate
  Do they target suppliers like ours?         ← third parties
  Are their techniques ones we cannot detect? ← control gaps

  Two or more yes: relevant. All no: interesting, not actionable.`,
              "text",
            ),
            callout(
              "warning",
              "The interesting-actor trap",
              "Programmes drift towards whatever is most engaging to read. A useful check: across the last quarter, how much of your output concerned actors who could plausibly reach you, and how much simply made good reading?",
            ),
            text(
              "Relevance is not static either. A supplier acquisition, a new market, or moving a workload onto a different platform can make a previously irrelevant actor relevant overnight — which is why requirements need revisiting rather than setting once and filing.",
            ),
            check(
              "A widely reported nation-state actor targets defence manufacturers in another region. You are a UK retailer. How should this be triaged?",
              [
                "High priority — the actor is highly capable",
                "Low relevance — different sector, geography and targeting profile",
                "High priority — techniques may be reused by others",
                "Ignore all nation-state reporting",
              ],
              1,
              "Capability is not relevance. Technique reuse is worth watching generally, but it does not make this specific actor a priority for a UK retailer.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Analysis",
      description: "Weighing evidence and stating confidence honestly.",
      lessons: [
        lesson(
          "Confidence and uncertainty",
          "Saying what you believe and how strongly, without hedging into uselessness.",
          10,
          [
            text(
              "Analysts face two failure modes. One is false certainty — stating an assessment as fact. The other is hedging so thoroughly that the reader learns nothing.\n\nThe discipline is to state a judgement **and** the confidence in it, with the reasoning visible so a reader can disagree on the evidence rather than on tone.",
            ),
            code(
              `Unusable      "There may possibly be some indication of
               potential targeting, though this is unclear."

Overconfident "This actor is targeting our organisation."

Useful        "We assess with moderate confidence that this
               actor is targeting our sector, based on three
               reported intrusions at comparable organisations
               in six months. We have no evidence of targeting
               against us specifically."`,
              "text",
            ),
            callout(
              "tip",
              "Confidence is about evidence, not feeling",
              "High confidence means multiple independent, reliable sources agree. Low confidence means a single source or significant gaps. Say which, and the reader can weigh it themselves.",
            ),
            check(
              "What distinguishes a useful assessment from an overconfident one?",
              [
                "It uses more technical detail",
                "It states a judgement, the confidence in it, and the evidence behind it",
                "It avoids drawing conclusions",
                "It cites more sources",
              ],
              1,
              "A judgement with stated confidence and visible reasoning can be challenged on its merits. A bare assertion cannot, which is what makes it dangerous.",
            ),
          ],
        ),
        lesson(
          "Attribution",
          "An assessment built on partial visibility, not an observation.",
          8,
          [
            text(
              "Attribution is the most quoted and least understood part of threat intelligence. It rests on infrastructure overlap, tooling similarity, operational timing, language artefacts and targeting patterns — all of which can be **imitated deliberately**.\n\nFalse-flag operations exist. Tooling leaks and gets reused. Infrastructure is resold.",
            ),
            callout(
              "warning",
              "Do not inherit someone else's confidence",
              "Repeating another organisation's high-confidence attribution as your own established fact launders an assessment into a claim. Cite it as their assessment.",
            ),
            text(
              "For most defenders attribution matters far less than it appears to. What changes your defences is the **technique**, not the name attached to it. Attribution matters for legal, insurance and diplomatic decisions — rarely for which detection you write next.",
            ),

            walkthrough(
              "Building an attribution assessment you can defend",
              "Two intrusions share a malware family. Work through what that supports, what it does not, and how to write the difference down.",
              [
                step(
                  "List the observations before interpreting any of them",
                  "Separate what you saw from what you concluded. Mixing the two is how a weak assessment ends up sounding certain.",
                  {
                    evidence: {
                      label: "Shared characteristics",
                      code: `- Same loader family (PlugX variant), compiled 4 days apart
- Both used a legitimate signed binary for DLL sideloading
- C2 infrastructure in the same /24, registered via same registrar
- Both targeted the manufacturing sector, 6 weeks apart
- Operator activity clusters 01:00-09:00 UTC in both cases`,
                    },
                    insight: "Five overlaps. Each has a very different evidential weight, and treating them as five equal points is the core error.",
                  },
                ),
                step(
                  "Discount what is commodity or coincidental",
                  "Malware families are shared, sold and stolen. Sector targeting is a function of what is profitable. Neither narrows the field much on its own.",
                  {
                    evidence: {
                      label: "Weight assessment",
                      code: `Loader family      LOW    — PlugX used by many groups, builder leaked
Sector overlap     LOW    — manufacturing broadly targeted
Working hours      LOW    — consistent with a large timezone band
Sideloading TTP    MEDIUM — common technique, specific host binary less so
Infrastructure     MEDIUM — same /24 and registrar is a real link`,
                    },
                    insight: "Nothing here is high confidence alone. That is the normal state of attribution evidence, not a failure of collection.",
                  },
                ),
                step(
                  "Look for the details that are expensive to fake",
                  "Operational habits — the specific staging directory, a typo in a hardcoded path, the order operations are performed in — are harder to copy than tooling, because they are unconscious.",
                  {
                    evidence: {
                      label: "Operational detail",
                      code: `Both intrusions:
  staged to C:\\Windows\\Temp\\vmware_tmp\\ (directory does not exist by default)
  archived with the same non-default rar switches: -m5 -v200m -hp
  disabled Defender via the same three registry writes, same order`,
                    },
                    insight: "A directory name that must be created, identical archive switches, and an identical sequence of registry writes. This is the strongest link in the set.",
                  },
                ),
                step(
                  "State the assessment at the right level of specificity",
                  "There are three separable claims: same malware, same operator, same sponsor. The evidence supports them to very different degrees, and collapsing them is what makes attribution reporting untrustworthy.",
                  {
                    evidence: {
                      label: "Assessment",
                      code: `Same tooling:   HIGH confidence
Same operator:  MODERATE confidence  (tradecraft overlap, infra proximity)
Same sponsor:   LOW confidence       (no evidence bearing on this)`,
                    },
                    insight: "The third line is the one a reader will assume you meant if you do not write it. Say it explicitly, even though it is the weakest.",
                  },
                ),
                step(
                  "Write down what would change your mind",
                  "An assessment without falsifiers is an opinion. Naming the observation that would overturn it makes the reasoning auditable, and gives collection something specific to look for.",
                  {
                    insight: "Here: evidence that the staging directory and rar switches appear in a public playbook or leaked toolkit would drop 'same operator' to LOW immediately.",
                  },
                ),
              ],
            ),
            check(
              "Why should defenders treat attribution cautiously?",
              [
                "Attribution is never accurate",
                "It rests on evidence that can be imitated, and rarely changes defensive action",
                "Only governments may attribute attacks",
                "It is irrelevant to security",
              ],
              1,
              "Attribution is a legitimate analytic product built on imitable evidence. It matters for some decisions, but seldom for which control you deploy.",
            ),
          ],
        ),
        lesson(
          "Structured techniques",
          "Analysis of competing hypotheses, applied lightly.",
          8,
          [
            text(
              "Structured analytic techniques exist to counter the mind's tendency to settle on the first plausible story and then collect support for it.\n\n**Analysis of competing hypotheses** is the most portable. List the possible explanations, list the evidence, and score each piece of evidence for how *inconsistent* it is with each hypothesis. The surviving hypothesis is the one least contradicted — which is not the same as the one with most support.",
            ),
            code(
              `Evidence                        H1: External   H2: Insider   H3: Misconfig
────────────────────────────    ───────────    ───────────   ─────────────
Access from unusual geography   consistent     inconsistent  inconsistent
Valid credentials used          consistent     consistent    consistent
No malware present              consistent     consistent    consistent
Access outside working hours    consistent     consistent    inconsistent
Data copied to personal cloud   consistent     consistent    inconsistent

H3 is contradicted twice. H1 and H2 both survive — collect to separate them.`,
              "text",
            ),
            callout(
              "tip",
              "The value is in being forced to list alternatives",
              "Most of the benefit arrives before any scoring happens. Writing down three hypotheses rather than one is what interrupts the pull towards the first plausible story and the search for evidence supporting it.",
            ),
            text(
              "Applied heavily these techniques become bureaucracy. Applied lightly — a five-minute matrix on a whiteboard during an incident — they reliably surface the explanation nobody had yet said out loud.",
            ),
            check(
              "In analysis of competing hypotheses, which hypothesis is preferred?",
              [
                "The one with the most supporting evidence",
                "The one with the least evidence inconsistent with it",
                "The one considered first",
                "The one requiring fewest assumptions",
              ],
              1,
              "Evidence consistent with everything discriminates between nothing. Inconsistency is what actually eliminates hypotheses, which is why the method scores on it.",
            ),
          ],
        ),
      ],
    },
    {
      title: "From intelligence to action",
      description: "Making reporting change something.",
      lessons: [
        lesson(
          "Indicators and their lifespan",
          "Why the appendix decays faster than the narrative.",
          8,
          [
            text(
              "A published report's indicator list is already partly stale — the report exists because someone detected the campaign, which usually means the operator has moved on.\n\nThat does not make indicators worthless. They are cheap to deploy, precise, and produce almost no false positives. They are simply a **floor**, not a strategy.",
            ),
            callout(
              "tip",
              "Retrospective search first",
              "The most valuable use of a fresh indicator list is searching backwards through your own history. Even expired indicators answer 'were we affected during that campaign?', which is a question you will be asked.",
            ),
            code(
              `Handling a fresh indicator list

  1. Retrospective search across available retention
  2. Block whatever is still live at the perimeter
  3. Extract the techniques described in the narrative
  4. Compare those against existing detection coverage
  5. Expire the indicators on a schedule

Step 1 answers a question. Steps 3 and 4 change your defences.`,
              "text",
            ),
            text(
              "Step five matters more than it looks. Lists that are never expired accumulate into blocklists nobody trusts, full of addresses reassigned to unrelated services years ago — and the false positives that follow erode confidence in every indicator you deploy afterwards.",
            ),

            terminal(
              "Checking whether a feed is still worth ingesting",
              "analyst@ti-box",
              [
                note("A feed supplies 40,000 indicators. The question is not how many — it is how many are still true, and whether any ever matched."),
                cmd("wc -l feed_ips.txt && head -3 feed_ips.txt"),
                out(`40218 feed_ips.txt
185.244.25.171,2024-11-02,c2
91.203.44.18,2025-01-17,c2
45.9.148.99,2023-06-30,scanner`),
                note("First check the age distribution. An indicator's usefulness decays fast, and the decay rate differs enormously by type."),
                cmd("awk -F, '{print substr($2,1,4)}' feed_ips.txt | sort | uniq -c | sort -k2"),
                out(`   9114 2023
  18402 2024
  11288 2025
    414 2026`),
                note("Two-thirds of this feed predates 2025. IP addresses get reassigned — an address that hosted C2 in 2023 is very likely someone's mail server now."),
                cmd("awk -F, '$2 < \"2025-01-01\"' feed_ips.txt | ti-check --resolve-current | head -4"),
                out(`185.244.25.171  now: unassigned, no PTR
45.9.148.99     now: shared hosting, 812 domains
203.0.113.44    now: CDN edge node  <-- blocking this would break traffic
198.51.100.7    now: corporate mail relay  <-- blocking this would break mail`),
                note("Two of four old indicators now point at infrastructure you would damage yourself by blocking. This is the concrete cost of stale intelligence."),
                note("Now the question that actually decides renewal: did any of it ever fire?"),
                cmd("siem-query --index proxy,firewall --last 180d --match-file feed_ips.txt --summary"),
                out(`Indicators matched at least once:      11 / 40218  (0.03%)
Total matches:                        847
  of which from indicators <90d old:  831
  of which from indicators >1y old:    16 (all 2 addresses, both CDN)`),
                note("Eleven indicators out of forty thousand ever matched, and the recent ones did nearly all the work. The old bulk is not neutral — it generated sixteen false positives."),
                note("The decision is not 'drop the feed'. It is 'ingest indicators newer than ninety days and expire the rest automatically'. Volume was never the value."),
              ],
            ),

            practice(
              "Write a one-liner that keeps only the indicators first seen on or after 1 January 2026, discarding the rest of the feed.",
              ["awk", "2026-01-01"],
              `awk -F, '$2 >= "2026-01-01"' feed_ips.txt`,
              "ISO dates compare correctly as strings, so no parsing is needed. Expiring by age is the practical answer to indicator decay — old addresses get reassigned, and blocking a reassigned address damages your own operations.",
              {
                setup: {
                  label: "feed_ips.txt — address, first_seen, category",
                  code: `185.244.25.171,2024-11-02,c2
91.203.44.18,2026-01-17,c2
45.9.148.99,2023-06-30,scanner`,
                },
              },
            ),
            check(
              "What is the most valuable immediate use of a newly published indicator list?",
              [
                "Blocking each indicator permanently",
                "Searching historical logs to determine whether you were already affected",
                "Adding them to a threat intelligence platform",
                "Sharing them with peers",
              ],
              1,
              "Blocking helps going forward but the campaign has likely moved on. Retrospective search answers whether you were already compromised — which is the more urgent question.",
            ),
          ],
        ),
        lesson(
          "Mapping to ATT&CK",
          "Turning a report into technique coverage you can test.",
          10,
          [
            text(
              "ATT&CK gives a shared vocabulary for behaviour. Mapping a report to techniques converts prose into something you can check your detections against, and check systematically.\n\nThe workflow: read the report, extract techniques, compare against your existing coverage, and turn each gap into a purple-team test rather than an assumption.",
            ),
            code(
              `Report says                          Technique      Have detection?
──────────────────────────────────   ────────────   ───────────────
Macro document dropping a payload    T1566.001      Yes
Encoded PowerShell execution         T1059.001      Yes
Scheduled task for persistence       T1053.005      Yes
DCSync against domain controller     T1003.006      No  ← gap
Exfiltration over DNS                T1048.003      Untested`,
              "text",
              "Two actionable outcomes from one report.",
            ),
            callout(
              "important",
              "Untested is not covered",
              "A rule that exists but has never been exercised is an assumption. Treat 'untested' as a separate state from 'covered', or your coverage map will flatter you.",
            ),

            diagram(
              "An intrusion report, mapped technique by technique",
              "Mapping is only useful if each stage points at something you could detect or prevent. Read each node as a question: would we have seen this?",
              [
                stage("Spearphishing attachment", "T1566.001", "A macro-enabled document reaches three finance mailboxes. Detectable at the mail gateway by attachment type and sender reputation; preventable by disabling macros from the internet."),
                stage("User execution", "T1204.002", "One recipient enables content. The only control left at this point is the endpoint, which is why the earlier stages matter so much more."),
                stage("Command and scripting interpreter", "T1059.001", "The macro spawns PowerShell with an encoded command. Parent-child telemetry catches this cleanly — Office spawning an interpreter has almost no legitimate use."),
                stage("Ingress tool transfer", "T1105", "A second-stage implant is fetched over HTTPS from a three-week-old domain. Domain age and destination reputation are the signal; the traffic itself looks ordinary."),
                stage("OS credential dumping", "T1003.001", "LSASS is accessed for credential material. Handle-access telemetry with a process filter is one of the highest-value detections available on Windows."),
                stage("Remote services", "T1021.002", "Harvested credentials are used for SMB admin shares to two servers. Look for a workstation authenticating to servers it has never touched before."),
                stage("Exfiltration to cloud storage", "T1567.002", "Data leaves via a consumer file-sharing service. Volume asymmetry on a workstation is the practical detection, since the destination is legitimate."),
              ],
            ),
            check(
              "You map a report and find a technique with no detection. What is the most useful next step?",
              [
                "Add the report's indicators to a blocklist",
                "Emulate the technique to confirm the gap, then build and validate a detection",
                "Note it in the risk register",
                "Purchase a tool that claims to cover it",
              ],
              1,
              "Emulation confirms whether the gap is real — it may be telemetry rather than logic — and gives you the data to build and validate against.",
            ),
          ],
        ),
        lesson(
          "Writing for decision-makers",
          "Bottom line first, then the evidence, then the caveats.",
          8,
          [
            text(
              "An intelligence product that is not read has failed regardless of its analytic quality. Executives read the first paragraph and skim the rest, so the assessment belongs there — not in a conclusion at the end.\n\nStructure that works: **bottom line up front**, then what it means for this organisation, then the evidence, then the caveats.",
            ),
            code(
              `Weak opening
  "This report examines the activities of a threat group
   first observed in 2023, which has been linked to..."

Strong opening
  "We assess with moderate confidence that our sector faces
   an elevated risk of ransomware via third-party remote
   access over the next quarter. We recommend prioritising
   the supplier access review already scheduled for Q4."`,
              "text",
            ),
            callout(
              "tip",
              "Name the decision you want made",
              "A product ending in 'organisations should remain vigilant' has asked for nothing. Recommend something specific enough that someone can approve or reject it.",
            ),
            check(
              "Where should the assessment appear in an intelligence product for executives?",
              [
                "In a conclusion, after the supporting evidence",
                "In the opening paragraph, with evidence and caveats following",
                "In an appendix with the indicators",
                "Distributed throughout for emphasis",
              ],
              1,
              "Readers may only read the first paragraph. Burying the assessment behind the evidence guarantees some decision-makers never reach it.",
            ),
          ],
        ),
      ],
    },
  ],
};
