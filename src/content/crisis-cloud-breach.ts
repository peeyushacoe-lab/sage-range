/**
 * Crisis scenario: SaaS supply-chain compromise at a fintech.
 *
 * Deliberately shaped unlike the ransomware day. There is no encryption event
 * to force a decision, so the pressure comes from ambiguity: the intrusion is
 * in a third party you do not control, evidence arrives slowly, and the
 * commercially convenient reading is available at every step.
 */

import type { CrisisScenario } from "@/lib/crisis-engine";

export const CLOUD_BREACH_CRISIS: CrisisScenario = {
  slug: "northwind-saas-compromise",
  title: "Northwind Financial — Supply-Chain Compromise",
  description:
    "You are the Incident Commander at Northwind Financial. Your customer-support platform is a SaaS product used by 200 agents and holding records for 1.9 million customers. At 09:00 the vendor emails to say they are 'investigating anomalous activity'. They will not say more. Everything you need to know sits inside someone else's estate — and the FCA, your customers and your board will not accept that as an answer.",
  durationMinutes: 480,
  clockStart: "09:00",
  initial: { containment: 30, reputation: 80, morale: 75, financialLoss: 0 },
  injects: [
    {
      id: "vendor-first-notice",
      atMinute: 0,
      channel: "INFRA",
      title: "Vendor: 'investigating anomalous activity'",
      body: "A three-line email from your SaaS support platform's security team. No scope, no timeline, no indicators. Your contract entitles you to notification within 24 hours of a confirmed breach — this is not yet a confirmed breach.",
      deadlineMinutes: 30,
      options: [
        {
          id: "invoke-contract",
          label: "Invoke the incident clause and demand specifics in writing",
          detail: "Formally request scope, indicators, and affected tenant confirmation, with a deadline.",
          costMinutes: 20,
          effects: { containment: 12, reputation: 5 },
          rationale:
            "A written, contractual request creates the record you will need later and usually produces detail that an informal chat does not. Doing it in hour one rather than hour six is what makes the timeline defensible.",
          ideal: true,
        },
        {
          id: "wait-for-update",
          label: "Wait for their next update before acting",
          costMinutes: 5,
          effects: { containment: -12, reputation: -8 },
          rationale:
            "Hands the pace of your incident to a third party who has every commercial reason to move slowly.",
        },
        {
          id: "cut-access-now",
          label: "Disable the integration immediately",
          costMinutes: 15,
          effects: { containment: 8, reputation: -10, financialLoss: 220_000 },
          rationale:
            "Defensible instinct, but cutting your entire support function on three lines of vendor email is a decision you cannot yet justify to the business.",
        },
      ],
      escalation: {
        containment: -15,
        note: "No formal request was made. The vendor's next substantive update arrived seven hours later.",
      },
    },
    {
      id: "soc-oauth-tokens",
      atMinute: 20,
      channel: "SOC",
      title: "Unusual API reads via the vendor's OAuth token",
      body: "Your own logs show the vendor's integration token pulling customer records at roughly 40x its normal rate since 04:12 this morning. The token has read access to the full customer table. This is your telemetry, not theirs.",
      deadlineMinutes: 30,
      options: [
        {
          id: "revoke-and-preserve",
          label: "Revoke the token, preserve the logs, keep the account for analysis",
          costMinutes: 20,
          effects: { containment: 25, morale: 5 },
          rationale:
            "Revoking stops the bleeding without destroying the audit trail that proves what was taken. This is now your incident, not just the vendor's.",
          ideal: true,
        },
        {
          id: "throttle",
          label: "Rate-limit the token but leave it active",
          costMinutes: 15,
          effects: { containment: 5, financialLoss: 400_000 },
          rationale:
            "Slows exfiltration without stopping it, and leaves you explaining why you knowingly left an abused credential live.",
        },
        {
          id: "delete-integration",
          label: "Delete the integration and its credentials outright",
          costMinutes: 10,
          effects: { containment: 15, reputation: -5, morale: -8 },
          rationale:
            "Stops it, but deleting the integration can take its audit history with it — the evidence you need to scope the breach.",
        },
      ],
      escalation: {
        containment: -20,
        financialLoss: 600_000,
        note: "The token kept reading for another two hours at 40x baseline.",
      },
    },
    {
      id: "legal-fca",
      atMinute: 45,
      channel: "LEGAL",
      title: "Legal: FCA and ICO obligations",
      body: "General Counsel notes two clocks now run: the ICO's 72 hours for personal data, and the FCA's expectation of prompt notification for operational incidents at a regulated firm. She asks which you are treating as started.",
      deadlineMinutes: 60,
      options: [
        {
          id: "both-clocks",
          label: "Treat both as started now and prepare parallel notifications",
          costMinutes: 30,
          effects: { reputation: 12, morale: 3 },
          rationale:
            "A regulated firm is judged on promptness as much as accuracy. Starting both clocks at awareness, and preparing in parallel, is the only approach that survives a later review.",
          ideal: true,
        },
        {
          id: "ico-only",
          label: "Start the ICO clock only; the FCA can wait for confirmation",
          costMinutes: 15,
          effects: { reputation: -12, financialLoss: 250_000 },
          rationale:
            "The FCA's expectation is not contingent on your certainty. Late notification by a regulated firm is its own finding.",
        },
        {
          id: "vendor-notifies",
          label: "Take the position that the vendor is the controller and must notify",
          costMinutes: 20,
          effects: { reputation: -20, financialLoss: 500_000 },
          rationale:
            "You are the controller of your customers' data; the vendor is a processor. This reading is both wrong and the kind of wrong that reads as evasion.",
        },
      ],
      escalation: {
        reputation: -18,
        financialLoss: 300_000,
        note: "Neither regulator was engaged on day one. The delay became the headline finding.",
      },
    },
    {
      id: "exec-cfo-pressure",
      atMinute: 70,
      channel: "EXEC",
      title: "CFO: 'is this actually our breach?'",
      body: "The CFO argues that since the intrusion is in the vendor's estate, this is the vendor's incident and Northwind should say so publicly. It is a genuinely tempting position and it is being put to you in front of the exec team.",
      deadlineMinutes: 45,
      options: [
        {
          id: "own-it",
          label: "State plainly that it is our breach, and our customers, whoever was compromised",
          costMinutes: 25,
          effects: { reputation: 15, morale: 10 },
          rationale:
            "Customers did not choose your vendor; you did. Firms that deflect to suppliers reliably come out worse, and the position collapses the moment the vendor names you.",
          ideal: true,
        },
        {
          id: "blame-vendor",
          label: "Publicly attribute the incident to the vendor",
          costMinutes: 15,
          effects: { reputation: -22, morale: -10 },
          rationale:
            "Reads as buck-passing to every customer whose data you chose to place there, and poisons the vendor relationship you now depend on for evidence.",
        },
        {
          id: "stay-silent",
          label: "Say nothing publicly until the vendor speaks",
          costMinutes: 10,
          effects: { reputation: -10 },
          rationale:
            "Cedes the narrative and leaves customers hearing it from the vendor's press release rather than from you.",
        },
      ],
      escalation: {
        reputation: -15,
        note: "The exec team briefed externally that this was 'a third-party matter'.",
      },
    },
    {
      id: "soc-scope-records",
      atMinute: 110,
      channel: "SOC",
      title: "Scoping: how many customers?",
      body: "Log analysis suggests between 400,000 and 1.9 million records were read — the range is wide because query-level logging was only enabled on some endpoints. Narrowing it will take three days. Comms want a number now.",
      deadlineMinutes: 45,
      options: [
        {
          id: "publish-range",
          label: "Give the range with its basis, and commit to narrowing it",
          costMinutes: 30,
          effects: { reputation: 12, containment: 5 },
          rationale:
            "A stated range with a stated reason is credible. A precise number you cannot support is the thing you get held to when it turns out wrong.",
          ideal: true,
        },
        {
          id: "lowball",
          label: "Report the lower bound as the figure",
          costMinutes: 15,
          effects: { reputation: -25, financialLoss: 400_000 },
          rationale:
            "Every subsequent upward revision is reported as a new breach and as evidence you minimised the first one.",
        },
        {
          id: "no-number",
          label: "Refuse to give any figure until scoping completes",
          costMinutes: 20,
          effects: { reputation: -10 },
          rationale:
            "Understandable, but three days of silence on scale invites others to estimate for you.",
        },
      ],
      escalation: {
        reputation: -18,
        note: "No scoping position was agreed; three inconsistent figures reached the press.",
      },
    },
    {
      id: "customer-agents-locked",
      atMinute: 140,
      channel: "CUSTOMER",
      title: "200 support agents have no system",
      body: "With the integration revoked, agents cannot see customer records. Call waiting times are climbing and vulnerable-customer cases are in the queue. Operations wants the integration restored with a read-only token.",
      deadlineMinutes: 45,
      options: [
        {
          id: "readonly-scoped",
          label: "Restore a narrowly scoped, short-lived token with per-record audit",
          detail: "Single-record lookup only, no bulk export, full query logging, 24-hour expiry.",
          costMinutes: 40,
          effects: { containment: 10, reputation: 8, financialLoss: 60_000 },
          rationale:
            "Restores the duty of care to customers without restoring the capability that was abused. The audit requirement is what makes it defensible.",
          ideal: true,
        },
        {
          id: "restore-full",
          label: "Restore the original integration to get agents working",
          costMinutes: 15,
          effects: { containment: -25, financialLoss: 800_000 },
          rationale:
            "Reinstates the exact access path being actively abused, before you know how the attacker got it.",
        },
        {
          id: "keep-down",
          label: "Keep it down until the vendor confirms containment",
          costMinutes: 10,
          effects: { reputation: -12, morale: -10, financialLoss: 350_000 },
          rationale:
            "Safest technically and hardest to justify to a vulnerable customer who cannot reach anyone for three days.",
        },
      ],
      escalation: {
        reputation: -15,
        financialLoss: 400_000,
        note: "Agents worked blind for the rest of the day; two vulnerable-customer cases were mishandled.",
      },
    },
    {
      id: "media-leak-site",
      atMinute: 180,
      channel: "MEDIA",
      title: "Sample data posted on a leak forum",
      body: "A forum post offers 1.9 million Northwind customer records, with a 500-row sample. The sample is genuine — the records match your database. A journalist has already seen it.",
      deadlineMinutes: 40,
      options: [
        {
          id: "confirm-and-act",
          label: "Confirm the sample is genuine, notify customers today, offer monitoring",
          costMinutes: 40,
          effects: { reputation: 15, financialLoss: 250_000 },
          rationale:
            "The data is public. Confirming quickly and acting is the only route that leaves you credible, and offering monitoring converts an abstract harm into something you are visibly addressing.",
          ideal: true,
        },
        {
          id: "verify-first",
          label: "Refuse to comment until the full dataset is verified",
          costMinutes: 20,
          effects: { reputation: -18 },
          rationale:
            "You already know the sample matches. Waiting for completeness while customers read about it is a distinction nobody outside the incident room accepts.",
        },
        {
          id: "dispute",
          label: "State publicly that the data may be from another source",
          costMinutes: 15,
          effects: { reputation: -28, financialLoss: 300_000 },
          rationale:
            "It matches your database. A denial that is disproved within a day turns a breach story into a credibility story.",
        },
      ],
      escalation: {
        reputation: -25,
        financialLoss: 350_000,
        note: "The leak was reported before Northwind said anything. Customers learned from the press.",
      },
    },
    {
      id: "infra-other-integrations",
      atMinute: 220,
      channel: "INFRA",
      title: "What else holds a token?",
      body: "Someone asks the obvious question nobody has yet: how many other third parties hold long-lived tokens against your customer data? Nobody can answer without a manual review.",
      deadlineMinutes: 60,
      options: [
        {
          id: "audit-all-tokens",
          label: "Audit every third-party token now and expire anything unused",
          costMinutes: 50,
          effects: { containment: 22, morale: 5 },
          rationale:
            "The question that turns one incident into a programme. If one vendor held over-scoped standing access, others almost certainly do.",
          ideal: true,
        },
        {
          id: "defer-audit",
          label: "Note it for the post-incident review",
          costMinutes: 5,
          effects: { containment: -10 },
          rationale:
            "Reasonable prioritisation and a genuine gamble: you do not yet know whether the same actor holds another way in.",
        },
        {
          id: "revoke-everything",
          label: "Revoke every third-party token immediately",
          costMinutes: 30,
          effects: { containment: 15, reputation: -12, financialLoss: 500_000 },
          rationale:
            "Thorough and indiscriminate — it takes down payments, KYC and reporting integrations that were never implicated.",
        },
      ],
      escalation: {
        containment: -12,
        note: "No token audit was started. Two further over-scoped integrations were found weeks later.",
      },
    },
    {
      id: "law-enforcement-ncsc",
      atMinute: 260,
      channel: "LAW_ENFORCEMENT",
      title: "NCSC offers assistance",
      body: "NCSC has seen the leak post and offers support. Accepting means sharing indicators and some detail about your estate. The vendor has asked you not to share anything that identifies them.",
      deadlineMinutes: 60,
      options: [
        {
          id: "accept-and-share",
          label: "Accept, and share indicators — including the vendor's involvement",
          costMinutes: 25,
          effects: { containment: 12, reputation: 8 },
          rationale:
            "A vendor's commercial preference does not override your reporting obligations, and NCSC may already be tracking this actor across their other customers.",
          ideal: true,
        },
        {
          id: "accept-redacted",
          label: "Accept but withhold the vendor's identity",
          costMinutes: 20,
          effects: { containment: 3, reputation: -5 },
          rationale:
            "Preserves the relationship at the cost of the one detail that would let others be warned.",
        },
        {
          id: "decline",
          label: "Decline to keep the incident contained commercially",
          costMinutes: 10,
          effects: { containment: -8, reputation: -12 },
          rationale:
            "Forgoes intelligence you cannot get elsewhere, and declining looks materially worse if it later emerges.",
        },
      ],
      escalation: {
        reputation: -10,
        note: "The NCSC offer went unanswered.",
      },
    },
    {
      id: "morale-blame",
      atMinute: 300,
      channel: "EXEC",
      title: "The vendor was signed off by your team",
      body: "It emerges that the security review which approved this vendor two years ago flagged the over-scoped token and was overruled on delivery grounds. The engineer who raised it still works here and is visibly upset.",
      deadlineMinutes: 60,
      options: [
        {
          id: "vindicate-publicly",
          label: "State plainly in the incident record that the risk was raised and overruled",
          costMinutes: 25,
          effects: { morale: 20, reputation: 8 },
          rationale:
            "Recording it protects the person who was right and makes the organisational failure visible, which is the only thing that changes the next sign-off. Suppressing it teaches everyone not to raise risks.",
          ideal: true,
        },
        {
          id: "stay-neutral",
          label: "Keep the sign-off history out of the incident record for now",
          costMinutes: 10,
          effects: { morale: -18, reputation: -5 },
          rationale:
            "Reads as protecting the decision-makers over the person who was right, and it will surface anyway.",
        },
        {
          id: "blame-engineer",
          label: "Note that the integration was approved by the security team",
          costMinutes: 10,
          effects: { morale: -30, reputation: -10 },
          rationale:
            "Technically true, materially dishonest, and the fastest way to ensure nobody raises an inconvenient risk again.",
        },
      ],
      escalation: {
        morale: -20,
        note: "The sign-off history went unaddressed. The engineer resigned within the month.",
      },
    },
    {
      id: "customer-notification-scale",
      atMinute: 360,
      channel: "CUSTOMER",
      title: "Notifying up to 1.9 million people",
      body: "Comms need a decision. Notifying everyone means contacting customers who may not be affected. Notifying only the confirmed 400,000 risks a second wave of letters when scoping widens.",
      deadlineMinutes: 60,
      options: [
        {
          id: "notify-all-once",
          label: "Notify the full population once, explaining the range honestly",
          costMinutes: 45,
          effects: { reputation: 15, financialLoss: 400_000 },
          rationale:
            "Expensive and final. A single honest communication beats two rounds, where the second reads as an admission the first was incomplete.",
          ideal: true,
        },
        {
          id: "notify-confirmed",
          label: "Notify the confirmed 400,000 now and the rest if scoping widens",
          costMinutes: 30,
          effects: { reputation: -12, financialLoss: 200_000 },
          rationale:
            "Cheaper today, and it commits you to a second letter that will be reported as a worsening breach.",
        },
        {
          id: "website-only",
          label: "Publish a notice and let customers check whether they are affected",
          costMinutes: 20,
          effects: { reputation: -18, financialLoss: 100_000 },
          rationale:
            "Shifts the work onto the people you failed. Most affected customers will never see it.",
        },
      ],
      escalation: {
        reputation: -22,
        financialLoss: 300_000,
        note: "No customer notification went out on day one.",
      },
    },
    {
      id: "exec-board-close",
      atMinute: 420,
      channel: "EXEC",
      title: "Board briefing — and the vendor question",
      body: "The board wants your assessment and one decision: do we terminate the vendor immediately, or keep them while we migrate? Termination is emotionally satisfying and operationally severe.",
      deadlineMinutes: 60,
      options: [
        {
          id: "managed-exit",
          label: "Recommend a managed exit with contractual conditions, not immediate termination",
          detail: "Conditions on evidence sharing and remediation, with a migration timeline and named checkpoints.",
          costMinutes: 45,
          effects: { reputation: 15, containment: 10, morale: 8 },
          rationale:
            "Immediate termination ends your access to their evidence mid-investigation and strands 200 agents. A conditional exit keeps leverage and gets you out.",
          ideal: true,
        },
        {
          id: "terminate-now",
          label: "Recommend immediate termination",
          costMinutes: 30,
          effects: { reputation: -8, containment: -10, financialLoss: 700_000 },
          rationale:
            "Satisfying and self-defeating: you lose the evidence trail and the support platform in the same afternoon.",
        },
        {
          id: "retain-vendor",
          label: "Recommend retaining the vendor once they remediate",
          costMinutes: 25,
          effects: { reputation: -15 },
          rationale:
            "Hard to defend to customers or the regulator without a migration commitment attached.",
        },
      ],
      escalation: {
        reputation: -15,
        morale: -8,
        note: "The board took the vendor decision without a technical recommendation.",
      },
    },
  ],
};
