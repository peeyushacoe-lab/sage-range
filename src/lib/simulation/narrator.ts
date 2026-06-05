import type { CompanyProfile, AnalystProfile } from "./types";
import type { OrganizationHealth } from "./runtime/social/sentiment";
import type { LeadershipAssessment } from "./runtime/coaching";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3";

async function chat(system: string, user: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        options: { temperature: 0.75 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    return data?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function generateCompanyProfile(industry: string): Promise<CompanyProfile> {
  const system = `You generate fictional but realistic company profiles for cybersecurity incident simulations. Respond with valid JSON only — no markdown fences.`;
  const prompt = `Create a fictional ${industry} company for a cybersecurity simulation.
Return JSON with exactly these fields:
{
  "name": "<company name>",
  "industry": "${industry}",
  "size": "<e.g. 320 employees>",
  "city": "<city, country>",
  "employees": [
    { "name": "<full name>", "title": "<job title>", "department": "Finance", "riskLevel": "HIGH", "traits": ["opens attachments", "works remotely"] },
    { "name": "<full name>", "title": "<job title>", "department": "IT", "riskLevel": "MEDIUM", "traits": ["uses shadow IT"] },
    { "name": "<full name>", "title": "<job title>", "department": "Security", "riskLevel": "LOW", "traits": ["reports phishing", "security-aware"] }
  ],
  "systems": ["Active Directory", "Exchange Server", "<3 more relevant systems>"],
  "securityPosture": "<2 sentence description of their current security maturity>"
}`;

  const raw = await chat(system, prompt);
  if (raw) {
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        return JSON.parse(raw.slice(start, end + 1)) as CompanyProfile;
      }
    } catch { /* fall through */ }
  }

  return {
    name: "Northwind Capital Partners",
    industry,
    size: "280 employees",
    city: "Chicago, IL",
    employees: [
      { name: "Sarah Chen", title: "Finance Manager", department: "Finance", riskLevel: "HIGH", traits: ["clicks attachments", "works remotely"] },
      { name: "Mike Dawson", title: "Senior IT Engineer", department: "IT", riskLevel: "MEDIUM", traits: ["uses shadow IT", "disables MFA occasionally"] },
      { name: "Alice Park", title: "Security Analyst", department: "Security", riskLevel: "LOW", traits: ["reports phishing", "follows security policy"] },
    ],
    systems: ["Active Directory", "Exchange Server", "Bloomberg Terminal", "SharePoint", "VPN Gateway"],
    securityPosture:
      "Mid-maturity security program with EDR on most endpoints. No in-house SOC — relies on MSSP for monitoring during business hours only.",
  };
}

export async function narrateAction(
  actionLabel: string,
  stageBlocker: boolean,
  companyName: string,
  stageLabel: string,
  context = ""
): Promise<string> {
  const system = `You are a SOC incident narrative engine. Write terse, realistic analyst updates. 2 sentences max. No bullet points.${context}`;
  const prompt = `A SOC analyst at ${companyName} took this action during a "${stageLabel}" incident: "${actionLabel}".
Containment success: ${stageBlocker ? "Yes — the attack progression has been halted." : "No — the response helps but the attack is ongoing."}
Write a brief SOC update describing the immediate effect.`;

  return (await chat(system, prompt)) ?? (stageBlocker
    ? `Action executed: ${actionLabel}. Containment confirmed — attack progression halted.`
    : `Action executed: ${actionLabel}. Response team tracking ongoing attacker activity.`);
}

export async function narrateStageAdvance(
  from: string,
  to: string,
  companyName: string,
  context = ""
): Promise<string> {
  const system = `You are a SIEM escalation engine. Write realistic, terse escalation alerts. 2 sentences max.${context}`;
  const prompt = `A cyber attack against ${companyName} just escalated from "${from}" to "${to}". Write the SIEM escalation alert.`;

  return (await chat(system, prompt)) ??
    `ESCALATION: Incident progressed from ${from} to ${to} at ${companyName}. Immediate analyst response required.`;
}

export async function generatePhishingEmail(
  companyName: string,
  targetName: string,
  targetTitle: string
): Promise<string> {
  const system = `You write realistic phishing email subject lines and one-line previews for cybersecurity training simulations. Be concise — one line only.`;
  const prompt = `Write a realistic phishing email notification line for a simulation. Target: ${targetName} (${targetTitle}) at ${companyName}. Format: "INBOUND MAIL → ${targetName}: '<subject>' from <spoofed sender>" — one line, no quotes around the whole thing.`;

  return (await chat(system, prompt)) ??
    `INBOUND MAIL → ${targetName}: 'Q4 Invoice — Urgent Action Required' from accounting@invoice-secure[.]net`;
}

export async function generateEmployeeClick(
  employeeName: string,
  companyName: string
): Promise<string> {
  const system = `You write terse EDR/endpoint alert narratives for cybersecurity simulations. One line only.`;
  const prompt = `Write an EDR alert line: ${employeeName} at ${companyName} opened a malicious Office attachment and a macro executed, establishing a C2 connection. One line, terse, realistic.`;

  return (await chat(system, prompt)) ??
    `EDR ALERT: ${employeeName} opened malicious attachment — macro executed, C2 beacon active`;
}

export async function narrateEmployeeStateMSG(
  employeeName: string,
  title: string,
  stage: string,
  reactionType: "PANIC" | "REPORT" | "RUMOR",
  companyName: string
): Promise<string> {
  const toneMap = {
    PANIC: "is panicking and sending frantic messages, unable to access systems and not knowing why",
    REPORT: "noticed something suspicious and is reporting it to IT helpdesk — not realising it's an attack in progress",
    RUMOR: "is spreading worried speculation to colleagues about system instability, causing confusion",
  };
  const system = `You write realistic Slack/Teams/email snippets from employees during a live cybersecurity incident. Write as a direct quote. One sentence max. No speaker prefix — just the message text.`;
  const prompt = `A ${title} named ${employeeName} at ${companyName} during the "${stage.replace(/_/g, " ")}" phase ${toneMap[reactionType]}. Write their message.`;

  const raw = await chat(system, prompt);
  const msg = raw?.replace(/^["']|["']$/g, "").trim() ?? null;
  const fallbacks = {
    PANIC: `MSG from ${employeeName}: "IT PLEASE HELP — I can't access anything and something is very wrong!"`,
    REPORT: `MSG from ${employeeName}: "Hey, I got a weird email earlier — not sure if I should be worried about it?"`,
    RUMOR: `MSG from ${employeeName}: "Heard from a few people that there's some kind of system issue going on — anyone know what's happening?"`,
  };
  return msg ? `MSG from ${employeeName}: "${msg}"` : fallbacks[reactionType];
}

export async function narrateEmployeeReaction(
  employeeName: string,
  title: string,
  stage: string,
  companyName: string
): Promise<string> {
  const system = `You write realistic Slack/Teams/email snippets from employees during a live cybersecurity incident. Write as a direct quote. One sentence. No speaker prefix — just the message text.`;
  const prompt = `A ${title} named ${employeeName} at ${companyName} is experiencing the "${stage.replace(/_/g, " ")}" phase of a cyberattack. Write a realistic one-sentence Slack message they might send to the IT helpdesk right now — confused, not knowing it's an attack.`;

  const raw = await chat(system, prompt);
  const msg = raw?.replace(/^["']|["']$/g, "").trim() ?? null;
  return msg
    ? `MSG from ${employeeName}: "${msg}"`
    : `MSG from ${employeeName}: "Hey IT, something weird is going on with my computer. Can you take a look?"`;
}

export async function generateCoachingPlan(
  profile: AnalystProfile,
  assessment: LeadershipAssessment,
  orgHealth: OrganizationHealth,
  outcome: "CONTAINED" | "BREACHED"
): Promise<string[]> {
  const weakTraits = [...profile.traits].sort((a, b) => a.score - b.score).slice(0, 2);
  const traitSummary = weakTraits.map((t) => `${t.label} (score ${t.score}/100)`).join(", ");

  const system = `You are a cybersecurity incident response coach giving post-simulation feedback. Write exactly 3 short, specific, actionable coaching points. Each point on its own line, starting with "•". No headers, no preamble, no explanation beyond the 3 lines.`;
  const prompt = `Analyst completed a ${outcome === "CONTAINED" ? "successful containment" : "failed simulation — network was breached"}.

Decision speed: ${profile.decisionSpeed}
Weakest skill areas: ${traitSummary || "general"}
Leadership grade: ${assessment.leadershipGrade} (Technical ${assessment.technicalScore}/100, Operational ${assessment.operationalScore}/100)
Org outcome: ${assessment.orgOutcome} — Panic ${orgHealth.panicIndex}, Trust in SOC ${orgHealth.trustInSOC}, Stability ${orgHealth.operationalStability}

Write 3 specific coaching recommendations.`;

  const raw = await chat(system, prompt);
  if (raw) {
    const lines = raw
      .split("\n")
      .map((l) => l.replace(/^[•\-\*\d\.\s]+/, "").trim())
      .filter((l) => l.length > 15)
      .slice(0, 3);
    if (lines.length >= 2) return lines;
  }
  return getFallbackCoaching(profile, assessment, orgHealth);
}

function getFallbackCoaching(
  profile: AnalystProfile,
  assessment: LeadershipAssessment,
  orgHealth: OrganizationHealth
): string[] {
  const tips: string[] = [];
  const weakest = [...profile.traits].sort((a, b) => a.score - b.score)[0];

  if (weakest && weakest.score < 40) tips.push(`Develop your ${weakest.label.toLowerCase()} capability — it was your lowest-scoring dimension this simulation.`);
  if (orgHealth.panicIndex > 55) tips.push("Issue status updates to stakeholders before they escalate — high organisational panic signals an information vacuum during the incident.");
  if (orgHealth.trustInSOC < 50) tips.push("Explain containment actions to affected teams before executing — unexplained system outages destroy SOC trust faster than the attack itself.");
  if (assessment.operationalScore < 50) tips.push("Balance technical containment speed against operational impact — aggressive isolation can collapse operations as severely as the attacker.");
  if (profile.decisionSpeed === "SLOW") tips.push("Practice triage speed in early stages — delayed initial response gives attackers time to establish persistence before you can act.");
  if (tips.length === 0) tips.push("Strong overall performance. Seek out high-ambiguity scenarios to stress-test your decision-making under uncertainty.");

  return tips.slice(0, 3);
}
