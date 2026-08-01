/**
 * Crisis scenario: insider IP theft at a manufacturer.
 *
 * A third distinct shape. There is no external adversary to contain and no
 * public leak to get ahead of — the suspect is an employee who is still in the
 * building, and almost every decision has an employment-law or evidential
 * consequence that a purely technical instinct gets wrong.
 */

import type { CrisisScenario } from "@/lib/crisis-engine";

export const INSIDER_CRISIS: CrisisScenario = {
  slug: "kestrel-insider-ip-theft",
  title: "Kestrel Industrial — The Departing Engineer",
  description:
    "You are the Incident Commander at Kestrel Industrial, which makes turbine control systems. At 08:00 DLP flags a senior design engineer copying CAD archives to personal storage. She resigned nine days ago, works her last day on Friday, and is joining a competitor. She is at her desk right now. Every move you make from here is evidence someone will examine.",
  durationMinutes: 480,
  clockStart: "08:00",
  initial: { containment: 25, reputation: 85, morale: 65, financialLoss: 0 },
  injects: [
    {
      id: "dlp-alert",
      atMinute: 0,
      channel: "SOC",
      title: "DLP: 4.2GB of CAD archives to personal cloud storage",
      body: "Overnight, 4.2GB moved from the engineering share to a personal cloud account. The user is a senior design engineer on notice. The transfer is still running.",
      deadlineMinutes: 25,
      options: [
        {
          id: "block-preserve",
          label: "Block the destination, preserve logs, do not alert the user",
          detail: "Network block on the storage domain, snapshot the endpoint and proxy logs, say nothing yet.",
          costMinutes: 20,
          effects: { containment: 22, morale: 3 },
          rationale:
            "Stops the loss while keeping the evidence intact and the subject unaware. Tipping her off now costs you everything still on the endpoint.",
          ideal: true,
        },
        {
          id: "confront-now",
          label: "Have her line manager ask her about it immediately",
          costMinutes: 15,
          effects: { containment: -15, reputation: -10, financialLoss: 300_000 },
          rationale:
            "An untrained confrontation before evidence is preserved gives her time to wipe the device and hands her lawyer a process failure.",
        },
        {
          id: "disable-account",
          label: "Disable her account outright",
          costMinutes: 10,
          effects: { containment: 12, morale: -12 },
          rationale:
            "Stops the transfer and announces the investigation. It also strands legitimate work and starts the clock on her knowing.",
        },
      ],
      escalation: {
        containment: -20,
        financialLoss: 500_000,
        note: "The transfer completed. The full turbine control design archive left the business.",
      },
    },
    {
      id: "legal-employment",
      atMinute: 25,
      channel: "LEGAL",
      title: "Legal: do not touch her personal device",
      body: "Employment counsel warns that examining personal accounts or devices without process risks making everything you find inadmissible and exposes Kestrel to a claim. She asks what you have already accessed.",
      deadlineMinutes: 45,
      options: [
        {
          id: "corporate-only",
          label: "Confine the investigation to corporate systems and document the boundary",
          costMinutes: 25,
          effects: { reputation: 12, containment: 8 },
          rationale:
            "Everything you need — the transfer, the volume, the destination — is visible in corporate telemetry. Staying inside that boundary is what keeps the evidence usable.",
          ideal: true,
        },
        {
          id: "check-personal",
          label: "Pull what you can from her personal cloud account via the corporate SSO link",
          costMinutes: 20,
          effects: { reputation: -20, financialLoss: 400_000 },
          rationale:
            "Contaminates the investigation and converts a straightforward IP theft case into a contested privacy claim.",
        },
        {
          id: "seize-phone",
          label: "Ask security to take her personal phone when she arrives",
          costMinutes: 15,
          effects: { reputation: -25, morale: -15, financialLoss: 500_000 },
          rationale:
            "No lawful basis, and it hands her the story: that Kestrel detained an employee and seized her property.",
        },
      ],
      escalation: {
        reputation: -15,
        note: "No evidential boundary was set. Counsel later could not confirm what had been accessed.",
      },
    },
    {
      id: "hr-coordination",
      atMinute: 60,
      channel: "EXEC",
      title: "HR wants to walk her out now",
      body: "HR's instinct is immediate suspension and escort from the building. The engineering director objects: she is the only person who understands the control loop redesign due for handover Thursday.",
      deadlineMinutes: 45,
      options: [
        {
          id: "suspend-with-handover",
          label: "Suspend on full pay today, but capture the handover in writing first",
          detail: "One structured handover session, supervised, then suspension pending investigation.",
          costMinutes: 40,
          effects: { containment: 15, reputation: 8, morale: 5 },
          rationale:
            "Protects the investigation and the business. Suspension on full pay is neutral, not punitive, which matters if the explanation turns out to be innocent.",
          ideal: true,
        },
        {
          id: "walk-out-now",
          label: "Suspend and escort her out immediately",
          costMinutes: 15,
          effects: { containment: 12, morale: -15, financialLoss: 350_000 },
          rationale:
            "Defensible, and it loses the handover and signals guilt to a floor of engineers who will draw their own conclusions.",
        },
        {
          id: "let-her-finish",
          label: "Let her work her notice while you investigate quietly",
          costMinutes: 20,
          effects: { containment: -18, financialLoss: 600_000 },
          rationale:
            "Leaves someone under active investigation with continued access to the material in question.",
        },
      ],
      escalation: {
        morale: -15,
        containment: -10,
        note: "HR acted without coordination. She was escorted out mid-morning in front of the team.",
      },
    },
    {
      id: "soc-scope-what-taken",
      atMinute: 110,
      channel: "SOC",
      title: "Scoping: what actually left?",
      body: "The 4.2GB includes the full turbine control firmware source, 900 CAD assemblies, and — unexpectedly — an HR folder containing salary data for 40 staff. That last one changes the legal picture.",
      deadlineMinutes: 45,
      options: [
        {
          id: "split-tracks",
          label: "Split it: IP theft on one track, personal-data breach on the other",
          costMinutes: 35,
          effects: { containment: 15, reputation: 10 },
          rationale:
            "The salary data makes this a notifiable personal data breach as well as an IP matter. They have different clocks, different obligations and different audiences; running them together loses one.",
          ideal: true,
        },
        {
          id: "ip-focus",
          label: "Focus on the IP; the HR folder was probably incidental",
          costMinutes: 15,
          effects: { reputation: -18, financialLoss: 250_000 },
          rationale:
            "Intent is irrelevant to the notification obligation. Forty employees' salary data left the business.",
        },
        {
          id: "hr-first",
          label: "Prioritise the HR data and pause the IP investigation",
          costMinutes: 25,
          effects: { containment: -8, morale: -5 },
          rationale:
            "Over-corrects. The IP is the material loss and the evidence trail is perishable.",
        },
      ],
      escalation: {
        reputation: -20,
        financialLoss: 300_000,
        note: "The salary data in the export went unnoticed until the following week.",
      },
    },
    {
      id: "infra-other-egress",
      atMinute: 150,
      channel: "INFRA",
      title: "This was not the first transfer",
      body: "Retrospective log review shows similar transfers on four occasions over the past eleven weeks — before she resigned. Two predate the competitor's job advert.",
      deadlineMinutes: 45,
      options: [
        {
          id: "widen-timeline",
          label: "Widen the investigation window and re-scope from first transfer",
          costMinutes: 40,
          effects: { containment: 20, reputation: 8 },
          rationale:
            "Changes the case from an opportunistic exit to a sustained pattern, which affects notification scope, the legal route and whether anyone else was involved.",
          ideal: true,
        },
        {
          id: "current-only",
          label: "Keep the case to today's transfer to stay simple",
          costMinutes: 15,
          effects: { containment: -15, reputation: -12 },
          rationale:
            "Understates the loss in every subsequent conversation, and the earlier transfers will surface in disclosure anyway.",
        },
        {
          id: "assume-coordinated",
          label: "Treat it as coordinated theft and investigate her colleagues",
          costMinutes: 30,
          effects: { morale: -22, reputation: -8 },
          rationale:
            "Investigating a team on no evidence beyond proximity does more damage to the department than the theft did.",
        },
      ],
      escalation: {
        containment: -15,
        note: "The earlier transfers were never scoped; the true volume of loss remained unknown.",
      },
    },
    {
      id: "exec-competitor",
      atMinute: 200,
      channel: "EXEC",
      title: "Do we contact the competitor?",
      body: "The CEO wants to call his counterpart at the competitor and warn them what their new hire is bringing. Legal has not been consulted. It would feel very satisfying.",
      deadlineMinutes: 45,
      options: [
        {
          id: "lawyer-letter",
          label: "Route it through counsel as a formal preservation letter",
          costMinutes: 30,
          effects: { reputation: 12, containment: 8 },
          rationale:
            "A solicitor's letter putting them on notice preserves your position and obliges them to act. An informal call risks defamation and tips off the person you are investigating.",
          ideal: true,
        },
        {
          id: "ceo-calls",
          label: "Let the CEO make the call",
          costMinutes: 15,
          effects: { reputation: -20, financialLoss: 300_000 },
          rationale:
            "An unverified accusation about a named individual, made informally, is how an IP case becomes a defamation case.",
        },
        {
          id: "say-nothing",
          label: "Say nothing to the competitor",
          costMinutes: 10,
          effects: { containment: -10 },
          rationale:
            "Forgoes the preservation obligation that would stop the material spreading inside their business.",
        },
      ],
      escalation: {
        reputation: -12,
        note: "No preservation notice was served. The material was in use at the competitor within a month.",
      },
    },
    {
      id: "morale-team",
      atMinute: 260,
      channel: "EXEC",
      title: "The engineering floor knows something happened",
      body: "Her desk is empty and her account is disabled. Rumours are running: theft, misconduct, redundancies. The engineering director asks what he is allowed to tell his team.",
      deadlineMinutes: 60,
      options: [
        {
          id: "acknowledge-bounded",
          label: "Confirm an investigation is underway, give no detail, and say when you will update",
          costMinutes: 25,
          effects: { morale: 15, reputation: 5 },
          rationale:
            "Silence lets the worst rumour win, and detail prejudices the investigation and her rights. Acknowledging with a stated next update is the only honest position available.",
          ideal: true,
        },
        {
          id: "full-disclosure",
          label: "Tell the team what she is accused of",
          costMinutes: 15,
          effects: { morale: -10, reputation: -20, financialLoss: 200_000 },
          rationale:
            "Prejudices the investigation, breaches her rights, and exposes Kestrel to a claim regardless of what she did.",
        },
        {
          id: "no-comment-internal",
          label: "Instruct managers to say nothing at all",
          costMinutes: 10,
          effects: { morale: -20 },
          rationale:
            "The rumour fills the gap within a day, and it is always worse than the truth.",
        },
      ],
      escalation: {
        morale: -22,
        note: "Nothing was said internally. By Friday the floor believed there had been arrests.",
      },
    },
    {
      id: "legal-ico-salary",
      atMinute: 320,
      channel: "LEGAL",
      title: "Notifying 40 staff about their own salary data",
      body: "The salary folder is a personal data breach affecting colleagues who are still in the building. Counsel asks how you want to handle notification.",
      deadlineMinutes: 60,
      options: [
        {
          id: "notify-directly",
          label: "Notify the 40 individually, in person where possible, then the ICO",
          costMinutes: 40,
          effects: { reputation: 12, morale: 10 },
          rationale:
            "These are colleagues, not customers. Hearing it from their employer in person rather than from a form letter is the difference between a breach handled well and a breach that poisons the department.",
          ideal: true,
        },
        {
          id: "email-notice",
          label: "Send a standard breach notification email",
          costMinutes: 20,
          effects: { morale: -12, reputation: -5 },
          rationale:
            "Meets the obligation and lands badly with people who sit forty feet from the incident room.",
        },
        {
          id: "defer-notification",
          label: "Defer notification until the investigation concludes",
          costMinutes: 15,
          effects: { reputation: -20, morale: -15, financialLoss: 250_000 },
          rationale:
            "The clock does not pause for a concurrent investigation, and colleagues finding out late is its own damage.",
        },
      ],
      escalation: {
        reputation: -18,
        morale: -15,
        note: "The affected staff were not notified on day one; two learned of it informally.",
      },
    },
    {
      id: "infra-controls",
      atMinute: 380,
      channel: "INFRA",
      title: "Why was 4.2GB able to leave at all?",
      body: "DLP was in monitor-only mode for the engineering share, a temporary exception granted eighteen months ago during a CAD migration and never reversed. Enforcing it now will break three legitimate workflows.",
      deadlineMinutes: 60,
      options: [
        {
          id: "enforce-with-exceptions",
          label: "Enforce now, with named, time-boxed exceptions for the three workflows",
          costMinutes: 45,
          effects: { containment: 20, morale: 5, financialLoss: 80_000 },
          rationale:
            "The temporary exception that outlived its reason is the actual root cause. Enforcing with explicit, expiring exceptions is what stops the same gap reopening.",
          ideal: true,
        },
        {
          id: "enforce-hard",
          label: "Enforce immediately with no exceptions",
          costMinutes: 20,
          effects: { containment: 18, morale: -18, financialLoss: 300_000 },
          rationale:
            "Correct in principle and it stops three delivery workflows mid-project, which guarantees the next exception request is granted quietly.",
        },
        {
          id: "defer-enforcement",
          label: "Leave monitor-only until after the project handover",
          costMinutes: 10,
          effects: { containment: -18, financialLoss: 400_000 },
          rationale:
            "Recreates exactly the decision that caused this, for exactly the same reason.",
        },
      ],
      escalation: {
        containment: -15,
        note: "DLP stayed in monitor-only mode. The exception is still open.",
      },
    },
    {
      id: "exec-board-insider",
      atMinute: 430,
      channel: "EXEC",
      title: "Board briefing — and the question of prosecution",
      body: "The board wants your assessment and asks whether to pursue criminal proceedings, civil action, or neither. They want a recommendation, not options.",
      deadlineMinutes: 50,
      options: [
        {
          id: "civil-first",
          label: "Recommend civil action for return and destruction, with the evidence preserved for criminal referral",
          detail: "Injunctive relief to recover the material, keeping the criminal route open.",
          costMinutes: 45,
          effects: { reputation: 15, containment: 10, morale: 8 },
          rationale:
            "Civil action gets the material back and stops its use, which is the actual business objective. Preserving the criminal option keeps leverage without surrendering control of the timeline.",
          ideal: true,
        },
        {
          id: "criminal-only",
          label: "Recommend immediate criminal referral",
          costMinutes: 30,
          effects: { reputation: -5, containment: -8 },
          rationale:
            "Hands the timeline and the evidence to someone else, and does nothing quickly about the material already at the competitor.",
        },
        {
          id: "drop-it",
          label: "Recommend no action to avoid publicity",
          costMinutes: 20,
          effects: { reputation: -15, morale: -20, financialLoss: 600_000 },
          rationale:
            "Signals internally that IP theft carries no consequence, which is the most expensive message a manufacturer can send its engineers.",
        },
      ],
      escalation: {
        reputation: -15,
        morale: -10,
        note: "The day closed with no legal position agreed and the material still in use elsewhere.",
      },
    },
  ],
};
