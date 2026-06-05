"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const PACKETS = [
  { no: 1,   time: "0.000000", src: "192.168.1.10",   dst: "8.8.8.8",          proto: "DNS",  info: "Standard query A google.com" },
  { no: 2,   time: "0.001203", src: "8.8.8.8",         dst: "192.168.1.10",    proto: "DNS",  info: "Standard query response" },
  { no: 3,   time: "0.023451", src: "192.168.1.10",   dst: "185.220.101.47",   proto: "TCP",  info: "SYN → 4444" },
  { no: 4,   time: "0.024890", src: "185.220.101.47", dst: "192.168.1.10",     proto: "TCP",  info: "SYN-ACK ← 4444" },
  { no: 5,   time: "0.025100", src: "192.168.1.10",   dst: "185.220.101.47",   proto: "TCP",  info: "ACK" },
  { no: 6,   time: "30.025800", src: "192.168.1.10",  dst: "185.220.101.47",   proto: "HTTP", info: "GET /update HTTP/1.1" },
  { no: 7,   time: "60.027200", src: "192.168.1.10",  dst: "185.220.101.47",   proto: "HTTP", info: "GET /update HTTP/1.1" },
  { no: 8,   time: "90.028400", src: "192.168.1.10",  dst: "185.220.101.47",   proto: "HTTP", info: "GET /update HTTP/1.1" },
  { no: 9,   time: "120.029600", src: "192.168.1.10", dst: "185.220.101.47",   proto: "HTTP", info: "GET /update HTTP/1.1" },
  { no: 10,  time: "120.031000", src: "192.168.1.10", dst: "142.250.80.46",    proto: "HTTPS", info: "TLS ClientHello" },
];

const HTTP_HEADERS = `GET /update HTTP/1.1
Host: 185.220.101.47
User-Agent: Mozilla/5.0 (compatible; MSIE 9.0; Windows; Meterpreter)
Accept: */*
Connection: keep-alive`;

const HEX_DUMP = `4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00
b8 00 00 00 00 00 00 00  40 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function NetworkForensics101Client({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Choice, setT2Choice] = useState("");
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
    if (checkFlag(t1Answer, "SAGE{185.220.101.47}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look for the IP with repeated beaconing to port 4444.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Metasploit") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Examine the User-Agent string for tool-specific identifiers.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const norm = t3Answer.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase().replace(/\s+/g, "_");
    if (norm === "pe_executable" || norm === "pe") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The first two bytes (4D 5A / MZ) identify a well-known file format.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Identify C2 Traffic" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Examine this packet capture table. One destination IP stands out as a command-and-control
          server based on repeated beaconing behavior to a non-standard port.
        </p>
        <div className="overflow-x-auto rounded-lg border border-white/8 mb-4">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">No.</th>
                <th className="px-3 py-2 text-left text-zinc-500">Time</th>
                <th className="px-3 py-2 text-left text-zinc-500">Source</th>
                <th className="px-3 py-2 text-left text-zinc-500">Destination</th>
                <th className="px-3 py-2 text-left text-zinc-500">Protocol</th>
                <th className="px-3 py-2 text-left text-zinc-500">Info</th>
              </tr>
            </thead>
            <tbody>
              {PACKETS.map((p) => {
                const isC2 = p.dst === "185.220.101.47";
                return (
                  <tr
                    key={p.no}
                    className={`border-b border-white/5 ${isC2 ? "bg-red-950/30 text-red-300" : "text-zinc-400"}`}
                  >
                    <td className="px-3 py-1.5">{p.no}</td>
                    <td className="px-3 py-1.5">{p.time}</td>
                    <td className="px-3 py-1.5">{p.src}</td>
                    <td className={`px-3 py-1.5 ${isC2 ? "text-red-300 font-bold" : ""}`}>{p.dst}</td>
                    <td className="px-3 py-1.5">{p.proto}</td>
                    <td className="px-3 py-1.5">{p.info}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Hint: look for the destination with repeated 30-second intervals on port 4444 — classic beacon jitter.
        </p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the attacker&apos;s C2 IP address?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Extract the User-Agent" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The following HTTP headers were captured from the malicious beacon request. Identify
          the attack tool based on the User-Agent string.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{HTTP_HEADERS}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What tool is revealed by the User-Agent string?</p>
            <div className="flex flex-wrap gap-3">
              {["Cobalt Strike", "Metasploit", "Empire", "Sliver"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t2choice"
                    value={opt}
                    checked={t2Choice === opt}
                    onChange={() => setT2Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — Meterpreter beacon confirmed. Flag: SAGE&#123;m3t3rpr3t3r_b34c0n&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Decode the Payload" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          A payload was extracted from the C2 session. The hex dump is shown below.
          The first two bytes identify the file type.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-2">
          <pre className="font-mono text-xs text-cyan-300 whitespace-pre-wrap">{HEX_DUMP}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          The magic bytes <span className="font-mono text-amber-300">4D 5A</span> (ASCII: MZ) are
          the signature of a well-known Windows executable format.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What file type is this payload?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — MZ header identifies a PE executable. Flag: SAGE&#123;PE_executable&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;185.220.101.47&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;m3t3rpr3t3r_b34c0n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;PE_executable&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
