/**
 * Threat Intelligence Essentials — full lesson content.
 */

import { type Course, lesson, text, code, callout, check } from "./blocks";

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
