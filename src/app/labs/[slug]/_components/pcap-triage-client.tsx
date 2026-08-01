"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, reportWrong } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * PCAP Triage — reading a capture without a GUI.
 *
 * The learner is given conversation statistics rather than raw packets: real
 * triage starts by finding the interesting flow among thousands, not by
 * reading bytes. Every answer is derivable from the data shown.
 */

type Conversation = {
  id: number;
  src: string;
  dst: string;
  proto: string;
  port: number;
  packets: number;
  bytes: number;
  duration: string;
};

const CONVERSATIONS: Conversation[] = [
  { id: 1, src: "10.20.4.15", dst: "142.250.187.14", proto: "TCP", port: 443, packets: 1_204, bytes: 1_840_112, duration: "00:04:12" },
  { id: 2, src: "10.20.4.15", dst: "10.20.1.10", proto: "UDP", port: 53, packets: 88, bytes: 9_240, duration: "00:12:40" },
  { id: 3, src: "10.20.4.15", dst: "52.96.104.18", proto: "TCP", port: 443, packets: 2_310, bytes: 3_120_880, duration: "00:11:02" },
  { id: 4, src: "10.20.4.88", dst: "185.244.25.171", proto: "TCP", port: 8443, packets: 4_806, bytes: 11_400, duration: "02:41:18" },
  { id: 5, src: "10.20.4.15", dst: "10.20.1.25", proto: "TCP", port: 445, packets: 412, bytes: 88_400, duration: "00:01:55" },
  { id: 6, src: "10.20.4.88", dst: "10.20.1.10", proto: "UDP", port: 53, packets: 1_902, bytes: 214_800, duration: "02:41:20" },
  { id: 7, src: "10.20.4.31", dst: "13.107.42.14", proto: "TCP", port: 443, packets: 940, bytes: 1_204_600, duration: "00:06:30" },
];

const BEACON_DETAIL = `Flow 4 — 10.20.4.88 → 185.244.25.171:8443

Inter-arrival times between the first twenty client packets (seconds):
  60.02  59.98  60.01  60.00  59.97  60.03  60.00  59.99
  60.01  60.02  59.98  60.00  60.01  59.99  60.00  60.02
  59.98  60.01  60.00  59.99

Mean payload per client packet : 118 bytes
Mean payload per server packet : 96 bytes
TLS: client hello present, certificate self-signed, CN=localhost
Total bytes over 2h41m       : 11,400`;

const DNS_DETAIL = `Flow 6 — 10.20.4.88 → 10.20.1.10:53 (internal resolver)

Top queried names by count:
  951  x1f4a9d2.updates-cdn.info
  948  a7b3c0e1.updates-cdn.info
    2  ctldl.windowsupdate.com
    1  time.windows.com

Response codes: NXDOMAIN 1,899 | NOERROR 3
Query type distribution: A 100%
Average label length before .updates-cdn.info : 8 characters, hex charset only`;

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/^sage\{/, "").replace(/\}$/, "");
}

export function PcapTriageClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [t1, setT1] = useState("");
  const [e1, setE1] = useState("");
  const [t2, setT2] = useState("");
  const [e2, setE2] = useState("");
  const [t3, setT3] = useState("");
  const [e3, setE3] = useState("");

  const done = (s: string) => completed.includes(s);

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function submitOne(e: React.FormEvent) {
    e.preventDefault();
    // The beaconing flow: tiny payloads, enormous duration, high packet count.
    if (normalise(t1) === "4" || normalise(t1) === "flow 4" || normalise(t1) === "185.244.25.171") {
      setE1("");
      void saveStage("task_1");
    } else {
      reportWrong(labId, "task_1");
      setE1("Not that one. Look for volume that does not match duration.");
    }
  }

  function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t2) === "60") {
      setE2("");
      void saveStage("task_2");
    } else {
      reportWrong(labId, "task_2");
      setE2("Read the inter-arrival times — they barely vary. Answer in seconds.");
    }
  }

  function submitThree(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t3) === "updates-cdn.info") {
      setE3("");
      void saveStage("task_3");
    } else {
      reportWrong(labId, "task_3");
      setE3("Give the parent domain only, without the changing label.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Capture summary</p>
        <p className="mt-2 text-sm text-zinc-400">
          A three-hour capture from the finance VLAN. 41,000 packets, seven conversations
          after filtering out broadcast noise. One host is not behaving like the others.
          Click a row to expand it.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Destination</th>
              <th className="px-3 py-2 text-left">Proto/Port</th>
              <th className="px-3 py-2 text-right">Packets</th>
              <th className="px-3 py-2 text-right">Bytes</th>
              <th className="px-3 py-2 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {CONVERSATIONS.map((c) => (
              <tr
                key={c.id}
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="cursor-pointer text-zinc-300 hover:bg-white/3"
              >
                <td className="px-3 py-2 text-zinc-600">{c.id}</td>
                <td className="px-3 py-2">{c.src}</td>
                <td className="px-3 py-2">{c.dst}</td>
                <td className="px-3 py-2">{c.proto}/{c.port}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.packets.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.bytes.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expanded === 4 && (
        <pre className="overflow-x-auto rounded-lg border border-amber-500/30 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
          {BEACON_DETAIL}
        </pre>
      )}
      {expanded === 6 && (
        <pre className="overflow-x-auto rounded-lg border border-amber-500/30 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
          {DNS_DETAIL}
        </pre>
      )}
      {expanded !== null && expanded !== 4 && expanded !== 6 && (
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-500">
          {`Flow ${expanded} — nothing anomalous.\nVolume, duration and destination are consistent with normal user traffic.`}
        </pre>
      )}

      <TaskShell number={1} title="Find the suspicious conversation" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          Six of these flows are ordinary. One transfers almost nothing but stays open for
          hours. Give its flow number.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">Correct — flow 4 to 185.244.25.171:8443.</p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="flow number" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="Measure the beacon interval" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          Expand that flow. Human traffic is irregular; automation is not. What is the
          beacon interval, in seconds?
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct — 60 seconds, with jitter under 0.05s. Effectively no jitter at all.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="seconds" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="Identify the second channel" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          The same host has a second unusual flow. Expand it and name the parent domain
          being abused — not the full query name, which changes every time.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — updates-cdn.info. Near-total NXDOMAIN with hex labels is textbook DGA
            or tunnelling; the beacon and the DNS activity share a host.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="domain" />
            {e3 && <p className="mt-2 text-xs text-red-400">{e3}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_3" />
      </TaskShell>
    </div>
  );
}
