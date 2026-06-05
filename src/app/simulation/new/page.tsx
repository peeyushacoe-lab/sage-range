"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GENERATING_STEPS = [
  "Creating company...",
  "Populating employees...",
  "Briefing attacker...",
  "Seeding infrastructure...",
  "Generating world...",
];

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY:   "border-sage-500/40 text-sage-400",
  MEDIUM: "border-amber-400/40 text-amber-400",
  HARD:   "border-orange-400/40 text-orange-400",
  INSANE: "border-red-400/40 text-red-400",
};

const PERSONA_STYLES: Record<string, { label: string; color: string; badge: string }> = {
  ransomware_gang:  { label: "RANSOMWARE GANG",  color: "text-red-400",    badge: "border-red-500/40 bg-red-500/8 text-red-400" },
  nation_state_apt: { label: "NATION-STATE APT",  color: "text-purple-400", badge: "border-purple-500/40 bg-purple-500/8 text-purple-400" },
  insider:          { label: "MALICIOUS INSIDER", color: "text-amber-400",  badge: "border-amber-500/40 bg-amber-500/8 text-amber-400" },
  hacktivist:       { label: "HACKTIVIST",        color: "text-cyan-400",   badge: "border-cyan-500/40 bg-cyan-500/8 text-cyan-400" },
  cybercriminal:    { label: "CYBERCRIMINAL",     color: "text-orange-400", badge: "border-orange-500/40 bg-orange-500/8 text-orange-400" },
};

const SCENARIOS = [
  {
    id: "ransomware_bank",
    title: "Operation Double Lock",
    subtitle: "Ransomware targeting a financial institution",
    briefing:
      "Threat intelligence has flagged a known ransomware group targeting financial institutions — three banks compromised in 90 days. Meridian Capital Group's Exchange Server is showing anomalous authentication attempts. Your SOC has 45 minutes before the attackers establish persistence.",
    difficulty: "HARD" as const,
    estimatedMinutes: 45,
    personaId: "ransomware_gang",
    learningObjectives: [
      "Recognise phishing-to-ransomware kill chain progression",
      "Deploy email gateway and EDR controls before lateral movement",
      "Communicate breach scope to executives under pressure",
    ],
    tags: ["ransomware", "finance", "phishing"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "Colonial Pipeline 2021 / Change Healthcare 2024",
  },
  {
    id: "apt_healthcare",
    title: "Shadow Protocol",
    subtitle: "Nation-state APT conducting medical research espionage",
    briefing:
      "A nation-state group has been conducting quiet reconnaissance against medical research networks for weeks — no visible IOCs until now. DNS query volume anomaly detected at 02:14. Low-and-slow lateral movement campaign ending in silent data exfiltration. You likely already have a foothold.",
    difficulty: "INSANE" as const,
    estimatedMinutes: 60,
    personaId: "nation_state_apt",
    learningObjectives: [
      "Identify APT indicators vs. ransomware noise",
      "Apply threat hunting methodology against LOTL techniques",
      "Manage patient data breach notification under HIPAA",
    ],
    tags: ["apt", "healthcare", "nation-state"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "HAFNIUM Exchange exploitation / Volt Typhoon",
  },
  {
    id: "insider_tech",
    title: "The Inside Job",
    subtitle: "Malicious insider at a technology company",
    briefing:
      "HR has flagged a senior engineer who gave notice three weeks ago. Repository access logs show unexplained bulk download activity outside business hours. The employee has legitimate admin credentials and knows the network architecture. No external C2 activity — entirely internal.",
    difficulty: "MEDIUM" as const,
    estimatedMinutes: 35,
    personaId: "insider",
    learningObjectives: [
      "Identify insider threat behavioural indicators",
      "Apply privilege monitoring and access anomaly detection",
      "Recognise data exfiltration through legitimate channels",
    ],
    tags: ["insider", "data-theft", "tech"],
    templateSlug: "insider-threat",
    realWorldAnalogue: "Tesla source code theft 2023 / AWS insider breach",
  },
  {
    id: "hacktivist_gov",
    title: "Blackout 23",
    subtitle: "Hacktivist disruption campaign against a government agency",
    briefing:
      "A hacktivist collective announced a 48-hour disruption campaign following a controversial policy decision. Your agency was named on social media 6 hours ago. Spearphishing against public-facing staff has already begun. Their goal: systems down and on the news.",
    difficulty: "MEDIUM" as const,
    estimatedMinutes: 40,
    personaId: "hacktivist",
    learningObjectives: [
      "Distinguish hacktivist TTPs from criminal/APT campaigns",
      "Manage continuity under coordinated attack",
      "Control external communications and prevent media escalation",
    ],
    tags: ["hacktivist", "government", "disruption"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "Anonymous OpOlympics / LulzSec government campaigns",
  },
  {
    id: "credential_startup",
    title: "Silent Harvest",
    subtitle: "Credential theft targeting a cloud-native startup",
    briefing:
      "Employee credentials for Forge AI were exposed in a third-party breach list published on a dark web forum yesterday. No SOC, no MFA, all infrastructure cloud-hosted. The attacker is pivoting from compromised credentials into AWS and the GitHub repository.",
    difficulty: "EASY" as const,
    estimatedMinutes: 25,
    personaId: "cybercriminal",
    learningObjectives: [
      "Understand cloud-first environments with weak controls",
      "Implement MFA and credential reset under active attack",
      "Recognise credential stuffing and account takeover patterns",
    ],
    tags: ["credentials", "startup", "aws"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: undefined,
  },
];

const TEMPLATES = [
  {
    slug: "phishing-to-ransomware",
    name: "Phishing to Ransomware",
    industry: "Financial Services",
    difficulty: "MEDIUM",
    duration: "45–90 min",
    description:
      "A targeted phishing campaign escalates to full ransomware deployment. Investigate the kill chain, contain the attacker, and make crisis decisions that affect the entire organization.",
    stages: ["Phishing", "Compromise", "Lateral Movement", "Domain Takeover", "Exfiltration", "Ransomware"],
  },
  {
    slug: "insider-threat",
    name: "Insider Threat: The Disgruntled Admin",
    industry: "Healthcare",
    difficulty: "HARD",
    duration: "30–60 min",
    description:
      "A privileged IT administrator begins abusing access after a denied promotion. Identify the threat, revoke access, and contain the breach before patient records hit the dark web.",
    stages: ["Suspicious Access", "Privilege Abuse", "Data Staging", "Active Exfil", "Breach"],
  },
  {
    slug: "cloud-misconfiguration",
    name: "Cloud Misconfiguration Crisis",
    industry: "Technology",
    difficulty: "MEDIUM",
    duration: "30–60 min",
    description:
      "A public S3 bucket is discovered containing AWS credentials. The attacker pivots through IAM roles, accesses production databases, and exfiltrates 450,000 customer records.",
    stages: ["Discovery", "Credential Theft", "Lateral Movement", "Data Exfil"],
  },
  {
    slug: "supply-chain-attack",
    name: "Supply Chain Compromise",
    industry: "Software Development",
    difficulty: "HARD",
    duration: "45–90 min",
    description:
      "A backdoor is discovered in a widely-used npm package your company depends on. Assess impact, notify the vendor, patch all systems, and navigate a PR firestorm.",
    stages: ["Detection", "Scope Analysis", "Vendor Notification", "Patch", "Customer Notification"],
  },
  {
    slug: "data-breach",
    name: "Data Breach: SQL Injection",
    industry: "E-Commerce",
    difficulty: "MEDIUM",
    duration: "30–60 min",
    description:
      "Your WAF blocked a SQL injection attempt — but logs show it succeeded 6 hours ago. GDPR requires notification within 72 hours. The regulatory clock is already running.",
    stages: ["Detection", "Containment", "Forensics", "Regulatory Notification", "Customer Notification"],
  },
];

export default function NewSimulation() {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!starting) return;
    const interval = setInterval(() => {
      setGeneratingStep((s) => (s + 1) % GENERATING_STEPS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [starting]);

  // Auto-start when instructor assigns a specific scenario
  useEffect(() => {
    const scenarioId = new URLSearchParams(window.location.search).get("scenario");
    if (!scenarioId) return;
    const match = SCENARIOS.find((s) => s.id === scenarioId);
    if (match) startScenario(match.id, match.templateSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScenario(scenarioId: string, templateSlug: string) {
    setStarting(scenarioId);
    setGeneratingStep(0);
    setError(null);
    try {
      const res = await fetch("/api/simulation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug, scenarioId }),
      });
      if (!res.ok) { setError("Failed to start. Try again."); setStarting(null); return; }
      const { sessionId } = (await res.json()) as { sessionId: string };
      router.push(`/simulation/${sessionId}`);
    } catch {
      setError("Network error. Is the server running?");
      setStarting(null);
    }
  }

  async function startTemplate(slug: string) {
    setStarting(slug);
    setGeneratingStep(0);
    setError(null);
    try {
      const res = await fetch("/api/simulation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: slug }),
      });
      if (!res.ok) { setError("Failed to start. Try again."); setStarting(null); return; }
      const { sessionId } = (await res.json()) as { sessionId: string };
      router.push(`/simulation/${sessionId}`);
    } catch {
      setError("Network error. Is the server running?");
      setStarting(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition tracking-wide">
        ← Dashboard
      </Link>

      <div className="mt-8 mb-6">
        <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-2">Mission Select</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Choose Your Simulation</h1>
        <p className="text-zinc-400 mt-2 text-sm max-w-2xl leading-relaxed">
          AI generates a unique company, employees, and attack narrative for every run. No two incidents are identical.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { label: "LIVE ORG SIMULATION",   color: "border-sage-500/30 text-sage-400" },
          { label: "ADVERSARY PERSONAS",     color: "border-red-500/30 text-red-400" },
          { label: "MITRE ATT&CK MAPPING",  color: "border-blue-400/30 text-blue-400" },
          { label: "EXECUTIVE PRESSURE",     color: "border-amber-400/30 text-amber-400" },
        ].map((b) => (
          <span key={b.label} className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded border ${b.color} bg-white/3`}>
            {b.label}
          </span>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* REDai Scenario Marketplace */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm uppercase tracking-widest text-zinc-300 font-semibold">REDai Scenario Marketplace</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest border border-red-500/40 bg-red-500/8 text-red-400 rounded px-2 py-0.5">AI-POWERED</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {SCENARIOS.map((s) => {
            const isStarting = starting === s.id;
            const persona = PERSONA_STYLES[s.personaId];
            const diffStyle = DIFFICULTY_STYLES[s.difficulty];
            return (
              <div key={s.id} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5 hover:border-white/15 transition-colors">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${persona.badge}`}>
                    {persona.label}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${diffStyle}`}>
                    {s.difficulty}
                  </span>
                  <span className="text-xs text-zinc-600">{s.estimatedMinutes} min</span>
                  {s.realWorldAnalogue && (
                    <span className="ml-auto text-[10px] text-zinc-600 font-mono italic">↗ {s.realWorldAnalogue}</span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white mb-0.5">{s.title}</h3>
                <p className={`text-xs font-medium mb-2 ${persona.color}`}>{s.subtitle}</p>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">{s.briefing}</p>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Learning Objectives</p>
                    <ul className="space-y-0.5">
                      {s.learningObjectives.map((o) => (
                        <li key={o} className="flex items-start gap-1.5 text-xs text-zinc-400">
                          <span className={`mt-0.5 shrink-0 w-1 h-1 rounded-full ${persona.color.replace("text-", "bg-")}`} />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => startScenario(s.id, s.templateSlug)}
                    disabled={!!starting}
                    className="shrink-0 min-w-[180px] rounded-lg bg-zinc-800 border border-white/10 px-5 py-2.5 text-sm font-bold text-white hover:border-white/30 hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-center"
                  >
                    {isStarting ? (
                      <span className="flex flex-col items-center gap-0.5">
                        <span>Generating world...</span>
                        <span className="text-xs font-normal opacity-70">{GENERATING_STEPS[generatingStep]}</span>
                      </span>
                    ) : "Deploy Scenario →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Mode callout */}
      <Link
        href="/simulation/team"
        className="flex items-center justify-between gap-4 rounded-xl border border-sage-500/20 bg-sage-500/5 px-6 py-4 mb-8 hover:border-sage-500/40 hover:bg-sage-500/8 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <span className="shrink-0 rounded border border-sage-500/40 bg-sage-500/10 px-2 py-1 text-xs font-bold uppercase tracking-widest text-sage-400">Team Mode</span>
          <div>
            <p className="text-sm font-semibold text-white">Run a live IR exercise with your team.</p>
            <p className="text-xs text-zinc-500 mt-0.5">Each player takes a role: IR Lead, Forensics, Legal, Comms.</p>
          </div>
        </div>
        <span className="text-sage-400 text-sm font-semibold group-hover:translate-x-0.5 transition-transform">Start Team Room →</span>
      </Link>

      {/* Classic Templates */}
      <div>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-5">Classic Simulations</h2>
        <div className="flex flex-col gap-4">
          {TEMPLATES.map((t) => {
            const isStarting = starting === t.slug;
            const diffStyle = DIFFICULTY_STYLES[t.difficulty] ?? DIFFICULTY_STYLES.MEDIUM;
            return (
              <div key={t.slug} className="rounded-xl border border-white/6 bg-zinc-900/30 p-5 hover:border-white/12 transition-colors">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">{t.industry}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${diffStyle}`}>{t.difficulty}</span>
                  <span className="text-xs text-zinc-600">{t.duration}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{t.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">{t.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {t.stages.map((st, i) => (
                    <span key={st} className="flex items-center gap-1.5 text-xs text-zinc-500">
                      {i > 0 && <span className="text-zinc-700">→</span>}
                      <span>{st}</span>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => startTemplate(t.slug)}
                  disabled={!!starting}
                  className="rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-sage-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isStarting ? (
                    <span className="flex items-center gap-2">
                      <span>Generating...</span>
                      <span className="text-xs font-normal opacity-70">{GENERATING_STEPS[generatingStep]}</span>
                    </span>
                  ) : "Deploy Mission →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-10 text-xs text-zinc-600 text-center leading-relaxed">
        Your performance, decisions, and leadership grade are visible to recruiters. Treat this as a live incident.
      </p>
    </main>
  );
}
