"use client";

import { useState } from "react";

const LOGS = {
  "auth.log": `2026-05-09 08:14:03  sshd: Failed password for root from 203.0.113.18 port 44121 ssh2
2026-05-09 08:14:05  sshd: Failed password for admin from 203.0.113.18 port 44123 ssh2
2026-05-09 08:14:07  sshd: Failed password for ubuntu from 203.0.113.18 port 44125 ssh2
2026-05-09 08:16:31  sshd: Connection reset by 203.0.113.18 — max auth retries exceeded
2026-05-09 09:41:15  sshd: Failed password for hr.manager from 45.33.32.156 port 53201 ssh2
2026-05-09 09:42:01  sshd: Failed password for finance.director from 45.33.32.156 port 53204 ssh2
2026-05-09 09:42:47  sshd: Failed password for it.admin from 45.33.32.156 port 53211 ssh2
2026-05-09 09:43:33  sshd: Failed password for finance.user from 45.33.32.156 port 53218 ssh2
2026-05-09 09:44:19  sshd: Failed password for ceo.assistant from 45.33.32.156 port 53225 ssh2
2026-05-09 12:00:07  sshd: Accepted password for it.support from 10.0.0.15 port 22 ssh2
2026-05-09 13:55:00  sshd: Failed password for finance.user from 45.33.32.156 port 59881 ssh2
2026-05-09 13:55:07  sshd: Failed password for finance.user from 45.33.32.156 port 59882 ssh2
2026-05-09 13:55:14  sshd: Failed password for finance.user from 45.33.32.156 port 59883 ssh2
2026-05-09 13:55:21  sshd: Failed password for finance.user from 45.33.32.156 port 59884 ssh2
2026-05-09 14:32:07  sudo: it.support : TTY=pts/1 ; PWD=/var/log ; USER=root ; COMMAND=/usr/sbin/service apache2 restart`,

  "sysmon": `2026-05-09 14:03:14  EventID 1   ProcessCreate  finance-ws01
  Image:       C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE (PID 3910)
  CommandLine: "WINWORD.EXE" /q "Q1_Invoice_Final.docm"
  User:        CORP\\finance.user

2026-05-09 14:09:28  EventID 1   ProcessCreate  finance-ws01
  Image:       C:\\Windows\\System32\\cmd.exe (PID 4203)
  ParentImage: WINWORD.EXE (PID 3910)
  CommandLine: cmd.exe /c powershell
  User:        CORP\\finance.user

2026-05-09 14:09:29  EventID 1   ProcessCreate  finance-ws01
  Image:       C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe (PID 4204)
  ParentImage: cmd.exe (PID 4203)
  CommandLine: powershell -nop -w hidden -enc UwB0AGEAcgB0AC0AUwBsAGUAZQBwACAALQBTAGUAYwBvAG4AZA...
  User:        CORP\\finance.user

2026-05-09 14:09:33  EventID 3   NetworkConnect  finance-ws01
  Image:          powershell.exe (PID 4204)
  SourceIP:       10.10.20.45     SourcePort:      52831
  DestinationIP:  198.51.100.71   DestinationPort: 443

2026-05-09 14:10:07  EventID 13  RegistryValueSet  finance-ws01
  TargetObject: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WindowsHelper
  Details:      C:\\Users\\finance.user\\AppData\\Roaming\\svchost32.exe

2026-05-09 14:10:51  EventID 1   ProcessCreate  finance-ws01
  Image:       C:\\Windows\\System32\\whoami.exe (PID 4288)
  ParentImage: powershell.exe (PID 4204)

2026-05-09 14:11:03  EventID 1   ProcessCreate  finance-ws01
  Image:       C:\\Windows\\System32\\net.exe (PID 4301)
  CommandLine: net.exe user /domain
  ParentImage: powershell.exe (PID 4204)`,

  "dns": `2026-05-09 09:15:22  workstation-03   A?   windows-update.microsoft.com → 40.101.41.17
2026-05-09 10:30:14  hr-ws01          A?   outlook.office365.com → 52.97.146.129
2026-05-09 13:48:31  finance-ws01     A?   mail.corp.internal → 10.0.0.25
2026-05-09 14:09:31  finance-ws01     A?   cdn.azure-update[.]net → 198.51.100.71
2026-05-09 14:09:33  finance-ws01     A?   api.azure-update[.]net → 198.51.100.71
2026-05-09 14:15:00  finance-ws01     TXT? bH4ks93x.azure-update[.]net → (beaconing)
2026-05-09 14:20:00  finance-ws01     TXT? bH4ks93x.azure-update[.]net → (beaconing)
2026-05-09 14:25:00  finance-ws01     TXT? bH4ks93x.azure-update[.]net → (beaconing)
2026-05-09 15:01:45  workstation-11   A?   teams.microsoft.com → 52.113.194.132`,
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
  { value: "spear_phishing", label: "Spear-phishing email with malicious document attachment" },
  { value: "credential_spray", label: "Credential compromise via SSH password spray" },
  { value: "web_exploit", label: "Remote code execution on a public-facing web application" },
  { value: "supply_chain", label: "Supply chain compromise via software dependency" },
  { value: "insider", label: "Insider threat — legitimate employee abusing own access" },
];

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
  const [processName, setProcessName] = useState("");
  const [compromisedAccount, setCompromisedAccount] = useState("");
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(!!prev);
  const [responseId, setResponseId] = useState(prev?.id ?? "");
  const [isPending, setIsPending] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(
    prevEval ? (JSON.parse(prevEval.response) as EvalResult) : null
  );
  const [evalPending, setEvalPending] = useState(false);
  const [results, setResults] = useState<Record<string, boolean> | null>(null);

  async function submitInvestigation(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim() || summary.trim().length < 80) return;

    setIsPending(true);
    try {
      const res = await fetch("/api/labs/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId,
          stage: "investigation",
          response: JSON.stringify({ ip, accessVector, processName, compromisedAccount, summary }),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setResponseId(data.id);
        setSubmitted(true);

        const normalizedIp = ip.trim().replace(/^sage\{|\}$/gi, "");
        setResults({
          ip:      normalizedIp === "198.51.100.71",
          access:  accessVector === "spear_phishing",
          process: processName.trim().toLowerCase().includes("winword"),
          account: compromisedAccount.trim().toLowerCase().replace(/^corp\\/, "").includes("finance.user"),
        });
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
          SIEM correlation has triggered on multiple anomalous telemetry sources recorded between 08:00–15:30 UTC. Authentication, endpoint, and DNS data are available below. Determine the nature of the compromise and complete the analyst report.
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
        <div className="rounded-b rounded-tr border border-white/10 bg-zinc-950 p-4 overflow-x-auto max-h-64 overflow-y-auto">
          {LOGS[tab].split("\n").map((line, i) => (
            <p key={i} className="text-xs font-mono leading-5 whitespace-pre text-zinc-300">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Investigation form */}
      {!submitted ? (
        <form onSubmit={submitInvestigation} className="space-y-5">
          <h3 className="font-semibold text-lg">Analyst report</h3>

          <Field label="C2 server IP address">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="x.x.x.x"
              className="input-field"
            />
          </Field>

          <Field label="Initial access vector">
            <Select value={accessVector} onChange={setAccessVector} options={ACCESS_OPTIONS} />
          </Field>

          <Field label="Which process was the initial foothold? (the first process to spawn the malicious chain)">
            <input
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              placeholder="ProcessName.exe"
              className="input-field"
            />
          </Field>

          <Field label="Compromised account (username)">
            <input
              value={compromisedAccount}
              onChange={(e) => setCompromisedAccount(e.target.value)}
              placeholder="username"
              className="input-field"
            />
          </Field>

          <Field label={`Incident summary (min 80 chars — ${summary.length} typed)`}>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="Describe what happened, how the attacker got in, what commands were run, and how they established persistence…"
              className="input-field resize-y"
            />
          </Field>

          <button
            type="submit"
            disabled={isPending || summary.trim().length < 80}
            className="rounded bg-sage-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-sage-700 hover:text-white disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Submit report"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <h3 className="font-semibold text-lg">Report submitted</h3>

          {results && (
            <div className="rounded-lg border border-white/10 divide-y divide-white/10 text-sm">
              <Result
                label="C2 server IP"
                correct={results.ip}
                hint={!results.ip ? "Authentication failures don't confirm compromise. Check where the payload phoned home — look across all three log sources." : undefined}
              />
              <Result
                label="Initial access vector"
                correct={results.access}
                hint={!results.access ? "No credential attack fully succeeded. The actual entry point left traces in a different log source." : undefined}
              />
              <Result
                label="Initial foothold process"
                correct={results.process}
                hint={!results.process ? "Check Sysmon EventID 1 at 14:03 — what is the earliest process in the chain and what file did it open?" : undefined}
              />
              <Result
                label="Compromised account"
                correct={results.account}
                hint={!results.account ? "Cross-reference which account's session was active on the compromised workstation during the Sysmon events." : undefined}
              />
            </div>
          )}

          <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-4 text-sm">
            <p className="text-zinc-300 font-medium">Report recorded ✓</p>
            <p className="text-zinc-500 mt-1">Proceed to Task 2 — containment planning.</p>
          </div>

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
  correct,
  hint,
}: {
  label: string;
  correct: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between p-3 gap-4">
      <div>
        <p className="text-zinc-400 text-xs">{label}</p>
        <p className={correct ? "text-sage-500" : "text-zinc-300"}>{correct ? "Correct ✓" : "Incorrect"}</p>
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
