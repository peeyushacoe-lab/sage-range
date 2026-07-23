"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

type DnsRow = { id: number; time: string; query: string; type: string; len: number };

const DNS_LOG: DnsRow[] = [
  { id: 1, time: "11:02:01", query: "www.google.com", type: "A", len: 14 },
  { id: 2, time: "11:02:03", query: "api.stripe.com", type: "A", len: 14 },
  { id: 3, time: "11:02:41", query: "4a6f696e2074686973207365637572652053514c2064617461.corp-updates.net", type: "TXT", len: 69 },
  { id: 4, time: "11:02:41", query: "6261736520666f722065786669617373206578616d706c65.corp-updates.net", type: "TXT", len: 67 },
  { id: 5, time: "11:02:42", query: "6c74726174696f6e206f76657220646e73207175657269657", type: "TXT", len: 51 },
  { id: 6, time: "11:03:15", query: "mail.office365.com", type: "A", len: 19 },
];

const VOLUME_STATS = `Query volume to corp-updates.net (last 10 min): 1,340 queries
Average query length to this domain: 61 bytes (baseline for legitimate domains: ~15-25 bytes)
Query type distribution: 100% TXT (baseline: <2% TXT across the environment)
Requesting host: FIN-WKSTN-19 (Finance department, no prior contact with this domain)`;

function hexToAscii(hex: string): string {
  try {
    let out = "";
    for (let i = 0; i < hex.length; i += 2) {
      const byte = hex.slice(i, i + 2);
      if (!/^[0-9a-f]{2}$/i.test(byte)) return "";
      out += String.fromCharCode(parseInt(byte, 16));
    }
    return out;
  } catch {
    return "";
  }
}

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DnsExfiltrationDetectionClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Answer, setT3Answer] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function submitT1(e: React.FormEvent) {
    e.preventDefault();
    if (t1Choice === "DNS tunneling / exfiltration") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the subdomain labels of the TXT queries — they aren't normal hostnames.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Answer.trim().toLowerCase().includes("join this secure sql data")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The subdomain label is hex-encoded — decode it (e.g. 4a='J', 6f='o'...) to reveal the exfiltrated text fragment.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{dns_3xfil_txt_tunn3l}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider the record type used, the abnormal query volume, and the fact this is a covert channel out of the network.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Spot the Abnormal Queries" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The DNS resolver log for <code className="text-amber-300">FIN-WKSTN-19</code> mixes normal browsing traffic
          with something else. Click any row to inspect it.
        </p>
        <div className="rounded-lg border border-white/8 mb-2 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">Time</th>
                <th className="px-3 py-2 text-left text-zinc-500">Query</th>
                <th className="px-3 py-2 text-left text-zinc-500">Type</th>
                <th className="px-3 py-2 text-right text-zinc-500">Length</th>
              </tr>
            </thead>
            <tbody>
              {DNS_LOG.map((row) => {
                const suspicious = row.type === "TXT";
                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${
                        suspicious ? "text-red-300 hover:bg-red-950/20" : "text-zinc-400 hover:bg-white/3"
                      } ${expanded === row.id ? "bg-white/5" : ""}`}
                    >
                      <td className="px-3 py-2">{row.time}</td>
                      <td className="px-3 py-2 truncate max-w-xs">{row.query}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2 text-right">{row.len}B</td>
                    </tr>
                    {expanded === row.id && suspicious && (
                      <tr key={`${row.id}-d`} className="border-b border-white/5">
                        <td colSpan={4} className="px-4 py-3 bg-zinc-950">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Full label decoded from hex</p>
                          <pre className="text-xs text-amber-300 whitespace-pre-wrap">{hexToAscii(row.query.split(".")[0]) || "(partial fragment)"}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this pattern represent?</p>
            <div className="flex flex-wrap gap-3">
              {["Normal DNS caching", "DNS tunneling / exfiltration", "A DNS server outage", "DHCP misconfiguration"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — hex-encoded data stuffed into TXT query subdomains is a classic DNS tunneling signature. Flag: SAGE&#123;dns_tunn3l_sp0tt3d&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Decode the Exfiltrated Fragment" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The first TXT query's subdomain label is hex-encoded ASCII. Decode it two characters at a time
          (each pair is one byte, e.g. <code className="text-amber-300">4a</code> = <code className="text-amber-300">J</code>).
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Subdomain label</p>
          <pre className="text-xs text-amber-300 whitespace-pre-wrap break-all">4a6f696e2074686973207365637572652053514c2064617461</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What text is hidden in this hex string?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="Decoded text..." className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — it decodes to &quot;Join this secure SQL data&quot;, a fragment of a larger stolen dataset being smuggled out one query at a time.</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Confirm the Technique" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">Volume analysis over the last 10 minutes confirms the scale of the exfiltration.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{VOLUME_STATS}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Submit the flag naming this exfiltration technique and record type used.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — DNS is nearly always allowed outbound, making TXT-record tunneling an effective covert exfil channel. Flag: SAGE&#123;dns_3xfil_txt_tunn3l&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;dns_tunn3l_sp0tt3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">Decoded: &quot;Join this secure SQL data&quot;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;dns_3xfil_txt_tunn3l&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
