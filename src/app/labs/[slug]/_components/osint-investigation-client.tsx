"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

type HeaderField = {
  field: string;
  value: string;
  suspicious: boolean;
  analysis: string;
};

const EMAIL_HEADER_FIELDS: HeaderField[] = [
  { field: "From",              value: '"IT Support" <support@micros0ft-helpdesk.com>', suspicious: true,  analysis: "Domain is 'micros0ft-helpdesk.com' — zero (0) replacing letter 'o' in 'microsoft'. Classic typosquatting to fool visual inspection." },
  { field: "Reply-To",         value: "exfil@protonmail.com",                           suspicious: true,  analysis: "Reply-To differs from From. Replies go to an anonymous ProtonMail account — not a Microsoft email address. Clear exfil redirect." },
  { field: "X-Originating-IP", value: "91.108.4.33",                                   suspicious: true,  analysis: "Originating IP 91.108.4.33 resolves to a Telegram infrastructure block — commonly abused for bot-based phishing campaigns." },
  { field: "Received",         value: "from mail.micros0ft-helpdesk.com (91.108.4.33)", suspicious: false, analysis: "Received header corroborates the originating IP. Consistent with a single-hop send — the phishing infrastructure sent directly." },
  { field: "Subject",          value: "Urgent: Your account has been compromised",      suspicious: false, analysis: "Urgency language is a classic social engineering technique but not a header IOC on its own." },
  { field: "Date",             value: "Wed, 01 Apr 2026 09:14:22 +0000",               suspicious: false, analysis: "Date appears valid. No timezone anomaly or future-dating detected." },
];

type PivotDomain = {
  domain: string;
  ns: string;
  registrar: string;
  country: string;
  created: string;
  detail: string;
};

const PIVOT_DOMAINS: PivotDomain[] = [
  {
    domain: "micros0ft-helpdesk.com",
    ns: "ns1.bulletproof-hosting.biz",
    registrar: "Namecheap",
    country: "RU",
    created: "2026-04-01",
    detail: "Registered day-of-attack. RU registrant using bulletproof NS. Typosquatting on microsoft.com. Used in this phishing campaign.",
  },
  {
    domain: "paypa1-verify.net",
    ns: "ns1.bulletproof-hosting.biz",
    registrar: "Namecheap",
    country: "RU",
    created: "2026-03-28",
    detail: "Paypal typosquat (1 replacing l). Same NS, registrar, and country — same threat actor. Created 4 days before campaign.",
  },
  {
    domain: "g00gle-accounts.org",
    ns: "ns1.bulletproof-hosting.biz",
    registrar: "Namecheap",
    country: "RU",
    created: "2026-03-15",
    detail: "Google typosquat (zeros replacing o's). Oldest domain in the cluster — possibly used for credential phishing before this campaign.",
  },
  {
    domain: "amazon-sec-alert.co",
    ns: "ns1.bulletproof-hosting.biz",
    registrar: "Namecheap",
    country: "RU",
    created: "2026-04-02",
    detail: "Amazon security alert lure. Registered the day after micros0ft-helpdesk.com — same campaign wave, expanding to additional brands.",
  },
];

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function OsintInvestigationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [examinedHeaders, setExaminedHeaders] = useState<Set<string>>(new Set());
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Answer, setT3Answer] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  const suspiciousHeaders = EMAIL_HEADER_FIELDS.filter((h) => h.suspicious);
  const examinedSuspicious = suspiciousHeaders.filter((h) => examinedHeaders.has(h.field));
  const allSuspiciousExamined = examinedSuspicious.length === suspiciousHeaders.length;

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function examineHeader(field: string) {
    setExaminedHeaders((prev) => new Set([...prev, field]));
  }

  function submitT1(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t1Answer, "SAGE{91.108.4.33}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Examine the X-Originating-IP header.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{ns1.bulletproof-hosting.biz}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Click each domain row to see its WHOIS data and find the shared nameserver.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{4_d0m41ns_s4me_1nfr4}") || t3Answer.trim() === "4") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Count all domains sharing the nameserver infrastructure.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Email Header Analysis */}
      <TaskShell number={1} title="Email Header Analysis" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          A phishing email was received by an employee. Click each header to analyze it.
          Identify the true originating IP address.
        </p>

        <div className="rounded-lg border border-white/8 overflow-hidden mb-4">
          <div className="px-3 py-2 bg-zinc-900 border-b border-white/5 text-xs text-zinc-500 font-mono">
            Raw Email Headers — click to analyze
          </div>
          <div className="divide-y divide-white/5">
            {EMAIL_HEADER_FIELDS.map((h) => {
              const isExamined = examinedHeaders.has(h.field);
              return (
                <div key={h.field}>
                  <button
                    className="w-full text-left px-3 py-2.5 font-mono text-xs hover:bg-white/3 transition-colors flex items-start gap-3 group"
                    onClick={() => examineHeader(h.field)}
                  >
                    <span className="text-zinc-500 shrink-0 w-36 pt-px">{h.field}:</span>
                    <span className={`flex-1 break-all ${
                      isExamined && h.suspicious ? "text-red-300" : "text-amber-300"
                    }`}>{h.value}</span>
                    {isExamined ? (
                      <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${
                        h.suspicious
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-sage-500/30 bg-sage-500/10 text-sage-500"
                      }`}>
                        {h.suspicious ? "SUSPICIOUS" : "OK"}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-zinc-600 group-hover:text-zinc-400">click to analyze</span>
                    )}
                  </button>
                  {isExamined && (
                    <div className="px-3 py-2.5 bg-zinc-950 border-t border-white/5 text-xs text-zinc-400 leading-relaxed">
                      {h.analysis}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!allSuspiciousExamined && (
          <p className="text-xs text-zinc-500 mb-3">
            Examine all {suspiciousHeaders.length} suspicious headers to unlock the answer form.
            ({examinedSuspicious.length}/{suspiciousHeaders.length} examined)
          </p>
        )}

        {allSuspiciousExamined && !done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the originating IP of this phishing email?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="SAGE{...} or IP address"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — originating IP identified. Flag: SAGE&#123;91.108.4.33&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Domain Registration Lookup */}
      <TaskShell number={2} title="Domain Registration Lookup" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          A passive DNS pivot reveals domains sharing the same bulletproof nameserver.
          Click each domain row to see its WHOIS data and identify the shared infrastructure.
        </p>

        <div className="rounded-lg border border-white/8 overflow-hidden mb-4">
          <div className="px-3 py-2 bg-zinc-900 border-b border-white/5 text-xs font-mono grid grid-cols-4 gap-2 text-zinc-500">
            <span>Domain</span><span>Nameserver</span><span>Country</span><span>Registered</span>
          </div>
          <div className="divide-y divide-white/5">
            {PIVOT_DOMAINS.map((d) => (
              <div key={d.domain}>
                <button
                  className="w-full text-left px-3 py-2.5 font-mono text-xs hover:bg-white/3 transition-colors grid grid-cols-4 gap-2"
                  onClick={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)}
                >
                  <span className="text-amber-300 truncate">{d.domain}</span>
                  <span className="text-red-400 truncate">{d.ns.split(".")[0]}...</span>
                  <span className="text-zinc-400">{d.country}</span>
                  <span className="text-zinc-400 flex items-center gap-2">
                    {d.created}
                    <span className="text-zinc-600">{expandedDomain === d.domain ? "▲" : "▼"}</span>
                  </span>
                </button>
                {expandedDomain === d.domain && (
                  <div className="px-4 py-3 bg-zinc-950 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                      <div className="space-y-1.5">
                        <p><span className="text-zinc-500">Domain: </span><span className="text-amber-300 font-mono">{d.domain}</span></p>
                        <p><span className="text-zinc-500">Registrar: </span><span className="text-zinc-300">{d.registrar}</span></p>
                        <p><span className="text-zinc-500">Registrant Country: </span><span className="text-zinc-300">{d.country}</span></p>
                        <p><span className="text-zinc-500">Created: </span><span className="text-zinc-300">{d.created}</span></p>
                      </div>
                      <div className="space-y-1.5">
                        <p><span className="text-zinc-500">NS1: </span><span className="text-red-400 font-mono">{d.ns}</span></p>
                        <p><span className="text-zinc-500">NS2: </span><span className="text-red-400 font-mono">{d.ns.replace("ns1", "ns2")}</span></p>
                        <p><span className="text-zinc-500">DNSSEC: </span><span className="text-zinc-300">unsigned</span></p>
                      </div>
                    </div>
                    <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                      {d.detail}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What nameserver is shared by all these malicious domains?</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="SAGE{...} or nameserver hostname"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — bulletproof NS identified. Flag: SAGE&#123;ns1.bulletproof-hosting.biz&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Infrastructure Pivot */}
      <TaskShell number={3} title="Infrastructure Pivot" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          All domains sharing the same nameserver are linked to the same threat actor.
          Count the full infrastructure exposure.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="text-xs text-zinc-500 mb-3">Infrastructure cluster — ns1.bulletproof-hosting.biz</p>
          <div className="space-y-1.5">
            {PIVOT_DOMAINS.map((d, i) => (
              <div key={d.domain} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-zinc-600 w-4 text-right shrink-0">{i + 1}.</span>
                <span className="text-amber-300">{d.domain}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-red-400 truncate">{d.ns}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-white/5">
            All 4 domains registered by same entity, same NS, same country — unified phishing infrastructure.
          </p>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">
              How many phishing domains share this nameserver infrastructure?
            </p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="Enter number or SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 4 domains share the same bulletproof NS. Flag: SAGE&#123;4_d0m41ns_s4me_1nfr4&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;91.108.4.33&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;ns1.bulletproof-hosting.biz&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4_d0m41ns_s4me_1nfr4&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
