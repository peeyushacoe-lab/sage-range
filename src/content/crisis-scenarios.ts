/**
 * Authored Crisis Command Center scenarios.
 *
 * Written rather than generated: the value of this exercise is that the
 * dilemmas are real ones, where the technically correct answer and the
 * commercially convenient answer pull apart. Every option carries a rationale
 * so the debrief can explain the trade-off rather than just marking it wrong.
 *
 * Scoring convention: exactly one option per inject is `ideal`. The others are
 * defensible-but-worse or actively harmful, never filler.
 */

import type { CrisisScenario } from "@/lib/crisis-engine";

export const RANSOMWARE_CRISIS: CrisisScenario = {
  slug: "meridian-health-ransomware",
  title: "Meridian Health — Ransomware Crisis",
  description:
    "You are the Incident Commander at Meridian Health, a private hospital group with 4,000 staff and an online patient portal. At 08:30 the SOC escalates something they cannot explain. Over the next eight hours you will run the technical response while the board, the regulator, the press and your own patients all demand answers. You cannot do everything — decide what matters most.",
  durationMinutes: 480,
  clockStart: "08:30",
  initial: { containment: 20, reputation: 75, morale: 70, financialLoss: 0 },
  injects: [
    {
      id: "soc-first-alert",
      atMinute: 0,
      channel: "SOC",
      title: "EDR: mass file modification on FS-CLIN-02",
      body: "Night shift flagged 14,000 file-modify events on the clinical file server in nine minutes, all from a service account. The analyst is not sure whether it is an indexing job or something else. The account, svc-backup, is used by the nightly backup task.",
      deadlineMinutes: 25,
      options: [
        {
          id: "isolate-verify",
          label: "Isolate FS-CLIN-02 and verify against the backup schedule",
          detail: "Network-isolate the host, keep it powered on, check whether a backup job was actually scheduled.",
          costMinutes: 15,
          effects: { containment: 18, morale: 3 },
          rationale:
            "Isolation stops the spread without destroying volatile evidence, and checking the schedule settles the question in minutes. Powering off would lose memory-resident indicators.",
          ideal: true,
        },
        {
          id: "power-off",
          label: "Power off the server immediately",
          costMinutes: 5,
          effects: { containment: 8, financialLoss: 40_000 },
          rationale:
            "Stops encryption but destroys memory artefacts you will want later, and takes clinical records offline before anyone has decided that is acceptable.",
        },
        {
          id: "monitor",
          label: "Keep watching — it is probably the backup job",
          costMinutes: 10,
          effects: { containment: -10, financialLoss: 180_000 },
          rationale:
            "The most expensive assumption in incident response. Mass modification by a service account outside its window is the classic first sign of ransomware.",
        },
      ],
      escalation: {
        containment: -15,
        financialLoss: 250_000,
        note: "Encryption ran unchecked for another twenty minutes across the clinical share.",
      },
    },
    {
      id: "soc-ransom-note",
      atMinute: 12,
      channel: "SOC",
      title: "Ransom note found on three hosts",
      body: "README_RESTORE.txt appears in every encrypted directory. It names the group as BlackCathedral and demands 40 BTC within 72 hours, threatening to publish 900GB of patient data. A Tor address is included.",
      deadlineMinutes: 30,
      options: [
        {
          id: "declare-major",
          label: "Declare a major incident and stand up the crisis team",
          detail: "Page the CISO, legal, comms and the on-call exec. Open a formal incident channel.",
          costMinutes: 15,
          effects: { containment: 10, morale: 8, reputation: 3 },
          rationale:
            "Formally declaring gets you the authority and the people you need. Everything downstream is harder if the organisation has not accepted that this is a crisis.",
          ideal: true,
        },
        {
          id: "quiet-handling",
          label: "Keep it inside the security team for now",
          costMinutes: 10,
          effects: { containment: 3, morale: -10, reputation: -5 },
          rationale:
            "Delaying the declaration buys quiet but costs you the mandate to shut systems down, and makes the later disclosure look like concealment.",
        },
        {
          id: "contact-attacker",
          label: "Open the Tor link and start a conversation",
          costMinutes: 20,
          effects: { containment: -5, reputation: -8 },
          rationale:
            "Engaging before you understand your own position tells the attacker you are panicking, and should never be an incident commander's first move.",
        },
      ],
      escalation: {
        containment: -10,
        morale: -10,
        note: "The team improvised without a declared incident; roles overlapped and two hosts were rebuilt before imaging.",
      },
    },
    {
      id: "infra-dc-compromise",
      atMinute: 15,
      channel: "INFRA",
      title: "Domain controller DC-01 shows anomalous replication",
      body: "DC-01 is replicating from a host that is not a domain controller. It looks like DCSync. If the attacker has the KRBTGT hash they can forge tickets for any account, and rebuilding around them will not remove their access.",
      deadlineMinutes: 40,
      options: [
        {
          id: "krbtgt-double-reset",
          label: "Plan a double KRBTGT reset and isolate the DC tier",
          detail: "Isolate tier-0, then reset KRBTGT twice with the replication interval between resets.",
          costMinutes: 45,
          effects: { containment: 25, morale: -5 },
          rationale:
            "A single reset leaves the previous key valid. The double reset is the only thing that actually invalidates forged golden tickets, and it must happen before you rebuild anything else.",
          ideal: true,
        },
        {
          id: "single-reset",
          label: "Reset KRBTGT once now",
          costMinutes: 20,
          effects: { containment: 10 },
          rationale:
            "Better than nothing, but Active Directory keeps the previous key valid for compatibility — the attacker's forged tickets keep working.",
        },
        {
          id: "defer-dc",
          label: "Deal with the DC after the file servers are contained",
          costMinutes: 10,
          effects: { containment: -12, financialLoss: 300_000 },
          rationale:
            "Domain-level compromise outranks file-level compromise. Cleaning file servers while the attacker holds the domain means cleaning them twice.",
        },
      ],
      escalation: {
        containment: -20,
        financialLoss: 400_000,
        note: "The attacker used forged tickets to reach the backup infrastructure.",
      },
    },
    {
      id: "exec-ceo-briefing",
      atMinute: 30,
      channel: "EXEC",
      title: "CEO wants a briefing in ten minutes",
      body: "The CEO has heard that 'the computers are down' and wants to know when it will be fixed. She has a call with the group's largest insurer at 10:00 and wants to know what to say.",
      deadlineMinutes: 30,
      options: [
        {
          id: "honest-unknowns",
          label: "Brief what is known, what is not, and when you will next update",
          detail: "Three facts, two open questions, next update at 10:30.",
          costMinutes: 15,
          effects: { reputation: 8, morale: 5 },
          rationale:
            "Executives can handle uncertainty; they cannot handle being surprised later. Committing to a next update time is what stops the ten-minute interruptions.",
          ideal: true,
        },
        {
          id: "optimistic",
          label: "Reassure her it will be resolved today",
          costMinutes: 5,
          effects: { reputation: -12, morale: -5 },
          rationale:
            "A promise you cannot keep. When it slips — and it will — you lose the credibility you need for the harder conversations this afternoon.",
        },
        {
          id: "defer-brief",
          label: "Send word that you are too busy to brief right now",
          costMinutes: 2,
          effects: { reputation: -10, morale: -8 },
          rationale:
            "The briefing is not a distraction from the response; it is part of it. An uninformed CEO makes decisions you will have to live with.",
        },
      ],
      escalation: {
        reputation: -12,
        note: "The CEO told the insurer the incident was 'a minor IT outage'. That statement will be revisited.",
      },
    },
    {
      id: "soc-lateral-spread",
      atMinute: 45,
      channel: "SOC",
      title: "Encryption spreading to the radiology network",
      body: "Radiology reports imaging workstations locking up. That segment holds scans for patients currently in theatre. Isolating it protects the rest of the estate but takes imaging offline mid-procedure.",
      deadlineMinutes: 25,
      options: [
        {
          id: "clinical-consult-isolate",
          label: "Isolate, but call the clinical lead first to sequence it safely",
          costMinutes: 20,
          effects: { containment: 15, reputation: 5, morale: 5 },
          rationale:
            "In healthcare the containment decision is a clinical decision. Two minutes with the clinical lead turns an outage into a managed handover.",
          ideal: true,
        },
        {
          id: "isolate-now",
          label: "Isolate immediately without consulting",
          costMinutes: 5,
          effects: { containment: 18, reputation: -10, morale: -8 },
          rationale:
            "Technically correct and organisationally damaging. Pulling imaging mid-procedure without warning is the decision clinicians will remember.",
        },
        {
          id: "leave-radiology",
          label: "Leave radiology connected until theatre lists finish",
          costMinutes: 10,
          effects: { containment: -15, financialLoss: 500_000 },
          rationale:
            "Understandable, but it hands the attacker another hour on a segment holding patient imaging.",
        },
      ],
      escalation: {
        containment: -18,
        financialLoss: 600_000,
        note: "Radiology encrypted in full. Imaging is unavailable for the rest of the day.",
      },
    },
    {
      id: "legal-gdpr",
      atMinute: 50,
      channel: "LEGAL",
      title: "Legal: does the 72-hour clock start now?",
      body: "General Counsel wants to know whether this is a notifiable personal data breach under UK GDPR, and when the 72-hour clock started. She notes that notifying without evidence of exfiltration may be premature, but late notification carries a penalty.",
      deadlineMinutes: 60,
      options: [
        {
          id: "clock-from-awareness",
          label: "Clock starts at awareness — prepare to notify, keep gathering evidence",
          detail: "Treat 08:30 as the awareness point and work towards notification while evidence firms up.",
          costMinutes: 20,
          effects: { reputation: 10, morale: 3 },
          rationale:
            "The clock runs from becoming aware, not from confirming scope. Preparing the notification in parallel is what lets you file inside 72 hours without guessing.",
          ideal: true,
        },
        {
          id: "wait-for-proof",
          label: "Wait until exfiltration is confirmed before starting the clock",
          costMinutes: 10,
          effects: { reputation: -15, financialLoss: 200_000 },
          rationale:
            "A common and costly reading. Regulators have repeatedly held that awareness of a likely breach starts the clock.",
        },
        {
          id: "notify-immediately",
          label: "Notify the ICO immediately with what little you have",
          costMinutes: 25,
          effects: { reputation: -3, morale: -5 },
          rationale:
            "Defensible and safe, but a notification with no scope invites follow-up you are not yet resourced to answer.",
        },
      ],
      escalation: {
        reputation: -18,
        financialLoss: 350_000,
        note: "No decision was recorded on the notification clock. The timeline gap became a finding in the regulator's review.",
      },
    },
    {
      id: "media-journalist",
      atMinute: 70,
      channel: "MEDIA",
      title: "Health journalist has the ransom note",
      body: "A reporter emails asking to confirm that Meridian has been hit by BlackCathedral. She quotes the note verbatim, so she has a source inside or from the leak site. She is publishing at 13:00 either way and offers you a comment.",
      deadlineMinutes: 45,
      options: [
        {
          id: "holding-statement",
          label: "Issue a holding statement confirming an incident, no speculation",
          detail: "Confirm you are responding to a cyber incident, that patient safety is the priority, and that more will follow.",
          costMinutes: 20,
          effects: { reputation: 12 },
          rationale:
            "You cannot stop the story; you can shape whether it says 'responding openly' or 'refused to comment'. Confirm only what you know to be true.",
          ideal: true,
        },
        {
          id: "no-comment",
          label: "Decline to comment",
          costMinutes: 5,
          effects: { reputation: -12 },
          rationale:
            "Guarantees the story runs with the attacker's framing and no counterweight from you.",
        },
        {
          id: "deny",
          label: "Deny that any patient data is involved",
          costMinutes: 10,
          effects: { reputation: -25, financialLoss: 150_000 },
          rationale:
            "You do not yet know this. A denial that is later contradicted turns an incident story into a dishonesty story.",
        },
      ],
      escalation: {
        reputation: -20,
        note: "The article ran at 13:00 quoting 'Meridian did not respond to requests for comment'.",
      },
    },
    {
      id: "law-enforcement",
      atMinute: 90,
      channel: "LAW_ENFORCEMENT",
      title: "Engage the NCA and NCSC?",
      body: "Your insurer's panel firm recommends reporting to the National Crime Agency and requesting NCSC support. Some on the exec worry that involving law enforcement makes the incident harder to keep quiet.",
      deadlineMinutes: 60,
      options: [
        {
          id: "report-both",
          label: "Report to the NCA and request NCSC support",
          costMinutes: 20,
          effects: { containment: 8, reputation: 8, morale: 3 },
          rationale:
            "Reporting costs you nothing you were going to keep anyway, and NCSC has visibility of this group's tooling that you do not.",
          ideal: true,
        },
        {
          id: "insurer-only",
          label: "Notify the insurer only",
          costMinutes: 10,
          effects: { reputation: -3 },
          rationale:
            "Protects the claim but forgoes intelligence that could shorten the response.",
        },
        {
          id: "no-report",
          label: "Do not involve law enforcement",
          costMinutes: 5,
          effects: { reputation: -10, containment: -5 },
          rationale:
            "Non-reporting rarely stays private and looks materially worse when it emerges later.",
        },
      ],
      escalation: {
        reputation: -8,
        note: "No external reporting decision was taken during the response window.",
      },
    },
    {
      id: "customer-portal",
      atMinute: 105,
      channel: "CUSTOMER",
      title: "Patient portal is down — 30,000 appointment bookings affected",
      body: "The portal shares authentication with the compromised domain. Leaving it up risks credential abuse; taking it down blocks appointment booking and prescription requests for 30,000 patients.",
      deadlineMinutes: 40,
      options: [
        {
          id: "down-with-alternative",
          label: "Take it down and publish a phone-based fallback",
          detail: "Offline notice with a staffed phone line for urgent prescriptions.",
          costMinutes: 30,
          effects: { containment: 12, reputation: 6, financialLoss: 80_000 },
          rationale:
            "Removes the risk while keeping the service obligation met. The fallback is what separates a controlled outage from an abandonment.",
          ideal: true,
        },
        {
          id: "down-silent",
          label: "Take it down with a generic maintenance notice",
          costMinutes: 10,
          effects: { containment: 12, reputation: -12 },
          rationale:
            "'Scheduled maintenance' during a publicised ransomware attack reads as a lie to every patient who sees the news at 13:00.",
        },
        {
          id: "keep-up",
          label: "Keep it online — patient access matters more",
          costMinutes: 5,
          effects: { containment: -18, financialLoss: 700_000 },
          rationale:
            "Shares authentication with a domain the attacker controls. This is how a contained incident becomes a credential-stuffing incident.",
        },
      ],
      escalation: {
        containment: -15,
        financialLoss: 500_000,
        note: "The portal stayed up unmanaged. Credential abuse was later detected against 1,400 patient accounts.",
      },
    },
    {
      id: "infra-backups",
      atMinute: 120,
      channel: "INFRA",
      title: "Backup integrity unknown",
      body: "Backups run to a NAS joined to the same domain. The last offline copy is eleven days old. Nobody can say yet whether the online backups were encrypted or tampered with.",
      deadlineMinutes: 45,
      options: [
        {
          id: "verify-offline-first",
          label: "Isolate the NAS and verify the eleven-day offline copy first",
          costMinutes: 40,
          effects: { containment: 15, morale: 5 },
          rationale:
            "Knowing you have one trustworthy restore point changes every decision that follows, including whether the ransom is worth discussing.",
          ideal: true,
        },
        {
          id: "restore-now",
          label: "Start restoring from the most recent online backup",
          costMinutes: 30,
          effects: { containment: -10, financialLoss: 400_000 },
          rationale:
            "Restoring from an unverified backup on a compromised domain risks reinfecting the environment you just cleaned.",
        },
        {
          id: "assume-lost",
          label: "Assume backups are lost and prepare to negotiate",
          costMinutes: 15,
          effects: { reputation: -8, morale: -10 },
          rationale:
            "Conceding before checking. The offline copy is old but may well be intact.",
        },
      ],
      escalation: {
        containment: -12,
        financialLoss: 450_000,
        note: "Backup verification was never started; recovery planning proceeded blind.",
      },
    },
    {
      id: "exec-board-emergency",
      atMinute: 150,
      channel: "EXEC",
      title: "Emergency board meeting — pay the ransom?",
      body: "The board convenes. The CFO notes 40 BTC is roughly £2.4m against an estimated £11m of disruption. The question is put to you directly: do we pay?",
      deadlineMinutes: 45,
      options: [
        {
          id: "recommend-not-yet",
          label: "Advise against paying now; revisit once backup viability is known",
          detail: "Set the decision point at the backup verification result rather than the clock.",
          costMinutes: 30,
          effects: { reputation: 10, morale: 8, containment: 5 },
          rationale:
            "The ransom decision is a business decision, but it should not be taken before the one fact that changes it. Tying it to backup viability gives the board a real choice.",
          ideal: true,
        },
        {
          id: "recommend-pay",
          label: "Recommend paying to shorten the outage",
          costMinutes: 20,
          effects: { reputation: -12, financialLoss: 2_400_000, containment: 5 },
          rationale:
            "Payment funds the group, breaches sanctions guidance in some cases, and buys a decryptor that is often slower than restoring from backup.",
        },
        {
          id: "refuse-engage",
          label: "Refuse to advise — it is a board matter",
          costMinutes: 10,
          effects: { reputation: -10, morale: -8 },
          rationale:
            "The commander owes the board a technical recommendation. Declining leaves them deciding on the CFO's spreadsheet alone.",
        },
      ],
      escalation: {
        reputation: -15,
        note: "The board took the ransom decision without technical input.",
      },
    },
    {
      id: "soc-exfil-confirmed",
      atMinute: 180,
      channel: "SOC",
      title: "Exfiltration confirmed — 340GB to an external host",
      body: "Netflow shows 340GB leaving over eleven hours on the two nights before the encryption. The destination is a hosting provider in a jurisdiction that will not respond quickly. Patient records are almost certainly included.",
      deadlineMinutes: 40,
      options: [
        {
          id: "trigger-notification",
          label: "Confirm the breach, trigger regulatory notification and scope the dataset",
          costMinutes: 35,
          effects: { reputation: 10, containment: 8 },
          rationale:
            "This is the fact that settles the notification question. Scoping the dataset now is what lets you tell patients something specific rather than something frightening.",
          ideal: true,
        },
        {
          id: "wait-scope",
          label: "Hold notification until the dataset is fully scoped",
          costMinutes: 20,
          effects: { reputation: -12, financialLoss: 300_000 },
          rationale:
            "Full scoping takes weeks. Waiting for it is how organisations miss the 72-hour window.",
        },
        {
          id: "downplay",
          label: "Report it internally as 'possible' exfiltration",
          costMinutes: 10,
          effects: { reputation: -20 },
          rationale:
            "Netflow of 340GB is not ambiguous. Softening it in the record is the sort of thing that surfaces badly in a later inquiry.",
        },
      ],
      escalation: {
        reputation: -22,
        financialLoss: 400_000,
        note: "Confirmed exfiltration sat unactioned for hours, compressing the notification timeline.",
      },
    },
    {
      id: "morale-night-shift",
      atMinute: 240,
      channel: "EXEC",
      title: "Your team has been running for eight hours",
      body: "Two analysts have been on since 23:00 yesterday. The SOC lead asks whether to push through the night or rotate. There is no second shift trained on this environment.",
      deadlineMinutes: 60,
      options: [
        {
          id: "rotate-handover",
          label: "Rotate now with a written handover, bring in the panel firm overnight",
          costMinutes: 30,
          effects: { morale: 18, containment: 5 },
          rationale:
            "Exhausted responders make the mistakes that extend incidents. A written handover is what makes rotation safe rather than disruptive.",
          ideal: true,
        },
        {
          id: "push-through",
          label: "Push through — momentum matters",
          costMinutes: 5,
          effects: { morale: -20, containment: -8, financialLoss: 150_000 },
          rationale:
            "Hour sixteen is where the misconfigured firewall rule and the deleted-instead-of-isolated host come from.",
        },
        {
          id: "stand-down",
          label: "Stand the team down until morning",
          costMinutes: 10,
          effects: { morale: 5, containment: -15, financialLoss: 400_000 },
          rationale:
            "Rest matters, but leaving an active intrusion entirely unattended overnight hands back everything you gained today.",
        },
      ],
      escalation: {
        morale: -22,
        containment: -8,
        note: "The team worked through unmanaged. Two analysts called in sick the following day.",
      },
    },
    {
      id: "customer-notification",
      atMinute: 300,
      channel: "CUSTOMER",
      title: "How do you tell 30,000 patients?",
      body: "Comms needs a decision on patient notification. The dataset is not fully scoped, but the story is public and patients are calling. Waiting for certainty means they hear it from the news first.",
      deadlineMinutes: 60,
      options: [
        {
          id: "notify-with-known",
          label: "Notify now with what is known, commit to a follow-up",
          detail: "Say what happened, what data is likely involved, what you are doing, and when you will write again.",
          costMinutes: 40,
          effects: { reputation: 15, financialLoss: 120_000 },
          rationale:
            "Patients forgive being told early and imprecisely far more readily than being told late and completely. The follow-up commitment is what makes the first letter credible.",
          ideal: true,
        },
        {
          id: "wait-full-scope",
          label: "Wait until the affected dataset is confirmed",
          costMinutes: 15,
          effects: { reputation: -18 },
          rationale:
            "By then every affected patient has read about it online. The letter arrives as confirmation of concealment.",
        },
        {
          id: "minimal-notice",
          label: "Publish a short website notice only",
          costMinutes: 20,
          effects: { reputation: -8 },
          rationale:
            "Meets the letter of the obligation and little else. Most affected patients will never see it.",
        },
      ],
      escalation: {
        reputation: -20,
        financialLoss: 200_000,
        note: "No patient communication went out on day one.",
      },
    },
    {
      id: "infra-restore-strategy",
      atMinute: 360,
      channel: "INFRA",
      title: "Restore into the existing domain, or rebuild clean?",
      body: "The offline backup verified clean. Restoring into the existing domain is roughly four days; building a clean forest and migrating is closer to three weeks. The attacker held domain admin.",
      deadlineMinutes: 60,
      options: [
        {
          id: "clean-rebuild-staged",
          label: "Build clean and migrate in stages, prioritising clinical systems",
          costMinutes: 45,
          effects: { containment: 22, reputation: 5, financialLoss: 300_000 },
          rationale:
            "With domain admin compromised you cannot prove the old forest is clean. Staging by clinical priority is what makes three weeks survivable.",
          ideal: true,
        },
        {
          id: "restore-in-place",
          label: "Restore into the existing domain to be back in four days",
          costMinutes: 25,
          effects: { containment: -10, financialLoss: 900_000 },
          rationale:
            "Fast, and the most common route to being ransomed a second time by the same actor within a month.",
        },
        {
          id: "hybrid-undecided",
          label: "Start restoring while the rebuild decision is finalised",
          costMinutes: 30,
          effects: { containment: -5, morale: -8, financialLoss: 250_000 },
          rationale:
            "Doing both halves the effort available to either and leaves the team without a clear target.",
        },
      ],
      escalation: {
        containment: -15,
        financialLoss: 600_000,
        note: "No recovery strategy was agreed; teams restored ad hoc into the compromised domain.",
      },
    },
    {
      id: "exec-board-presentation",
      atMinute: 420,
      channel: "EXEC",
      title: "Close-of-day board presentation",
      body: "The board wants twenty minutes: what happened, where you are, what it will cost, and what you need. This is the account that will be quoted back to you in the post-incident review.",
      deadlineMinutes: 60,
      options: [
        {
          id: "structured-account",
          label: "Timeline, current posture, cost range, and three specific asks",
          detail: "What is known, what is contained, an honest cost range with assumptions, and named decisions you need from them.",
          costMinutes: 45,
          effects: { reputation: 15, morale: 10 },
          rationale:
            "A board can act on specific asks and a range with stated assumptions. This is the briefing that gets the rebuild funded.",
          ideal: true,
        },
        {
          id: "technical-deep-dive",
          label: "Walk through the technical detail of the intrusion",
          costMinutes: 40,
          effects: { reputation: -5, morale: 3 },
          rationale:
            "Accurate and largely unusable. The board cannot approve anything from a Kerberos explanation.",
        },
        {
          id: "reassure-only",
          label: "Reassure them it is under control and details will follow",
          costMinutes: 20,
          effects: { reputation: -15 },
          rationale:
            "Squanders the one moment where you had the board's full attention and their willingness to spend.",
        },
      ],
      escalation: {
        reputation: -18,
        morale: -8,
        note: "The day closed with no board briefing. Recovery funding was deferred a week.",
      },
    },
  ],
};

export const CRISIS_SCENARIOS: CrisisScenario[] = [RANSOMWARE_CRISIS];

export function findCrisisScenario(slug: string): CrisisScenario | undefined {
  return CRISIS_SCENARIOS.find((s) => s.slug === slug);
}
