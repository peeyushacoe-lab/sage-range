"use client";

import { useState, useMemo } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const PACKETS = [
  { no: 1,  time: "0.000000",   src: "192.168.1.10",   dst: "8.8.8.8",        proto: "DNS",   info: "Standard query A google.com",
    detail: "DNS standard query to Google public resolver — normal system traffic." },
  { no: 2,  time: "0.001203",   src: "8.8.8.8",        dst: "192.168.1.10",   proto: "DNS",   info: "Standard query response A 142.250.80.46",
    detail: "DNS response from 8.8.8.8 resolving google.com to 142.250.80.46 — normal." },
  { no: 3,  time: "0.023451",   src: "192.168.1.10",   dst: "185.220.101.47", proto: "TCP",   info: "SYN → 4444",
    detail: "TCP SYN to 185.220.101.47:4444 — port 4444 is a well-known Metasploit default listener port. This host initiated a connection to an external IP on a non-standard port." },
  { no: 4,  time: "0.024890",   src: "185.220.101.47", dst: "192.168.1.10",   proto: "TCP",   info: "SYN-ACK ← 4444",
    detail: "Remote host 185.220.101.47 acknowledged the connection — the server is actively listening on port 4444. Connection established." },
  { no: 5,  time: "0.025100",   src: "192.168.1.10",   dst: "185.220.101.47", proto: "TCP",   info: "ACK — connection established",
    detail: "Three-way handshake complete. Session active between 192.168.1.10 and 185.220.101.47:4444." },
  { no: 6,  time: "30.025800",  src: "192.168.1.10",   dst: "185.220.101.47", proto: "HTTP",  info: "GET /update HTTP/1.1",
    detail: "HTTP GET beacon to C2. Interval: 30 seconds from session start. Consistent periodic check-in characteristic of C2 beaconing." },
  { no: 7,  time: "60.027200",  src: "192.168.1.10",   dst: "185.220.101.47", proto: "HTTP",  info: "GET /update HTTP/1.1",
    detail: "Second beacon — exactly 30 seconds after packet 6. Jitter-free beaconing indicates automated malware, not manual activity." },
  { no: 8,  time: "90.028400",  src: "192.168.1.10",   dst: "185.220.101.47", proto: "HTTP",  info: "GET /update HTTP/1.1",
    detail: "Third beacon — 30-second pattern confirmed across three intervals. This is a C2 heartbeat loop." },
  { no: 9,  time: "120.029600", src: "192.168.1.10",   dst: "185.220.101.47", proto: "HTTP",  info: "GET /update HTTP/1.1",
    detail: "Fourth beacon — pattern continues. The regularity and non-standard port strongly indicate automated C2 communication." },
  { no: 10, time: "120.031000", src: "192.168.1.10",   dst: "142.250.80.46",  proto: "HTTPS", info: "TLS ClientHello to 142.250.80.46",
    detail: "HTTPS connection to 142.250.80.46 (Google CDN) — legitimate HTTPS traffic, unrelated to the C2 session." },
];

const HTTP_HEADERS = `GET /update HTTP/1.1
Host: 185.220.101.47
User-Agent: Mozilla/5.0 (compatible; MSIE 9.0; Windows; Meterpreter)
Accept: */*
Connection: keep-alive`;

const HEX_DUMP = `4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00
b8 00 00 00 00 00 00 00  40 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00`;

function PacketTable({
  filterIp,
  filterProto,
  expandedRow,
  onRowClick,
}: {
  filterIp: string;
  filterProto: string;
  expandedRow: number | null;
  onRowClick: (no: number) => void;
}) {
  const visible = useMemo(() => {
    const ip = filterIp.trim().toLowerCase();
    return PACKETS.filter((p) => {
      const matchIp = !ip || p.src.includes(ip) || p.dst.includes(ip);
      const matchProto = filterProto === "ALL" || p.proto === filterProto;
      return matchIp && matchProto;
    });
  }, [filterIp, filterProto]);

  return (
    <div className="overflow-x-auto rounded-lg border border-edge mb-2">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-edge bg-surface-1">
            <th className="px-3 py-2 text-left text-ink-3">No.</th>
            <th className="px-3 py-2 text-left text-ink-3">Time</th>
            <th className="px-3 py-2 text-left text-ink-3">Source</th>
            <th className="px-3 py-2 text-left text-ink-3">Destination</th>
            <th className="px-3 py-2 text-left text-ink-3">Proto</th>
            <th className="px-3 py-2 text-left text-ink-3">Info</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-4 text-center text-ink-3">No packets match filter</td></tr>
          )}
          {visible.map((p) => {
            const isC2 = p.dst === "185.220.101.47" || p.src === "185.220.101.47";
            const expanded = expandedRow === p.no;
            return (
              <>
                <tr
                  key={p.no}
                  onClick={() => onRowClick(p.no)}
                  className={`border-b border-edge-subtle cursor-pointer transition-colors ${
                    isC2 ? "bg-danger-wash hover:bg-danger-wash" : "hover:bg-surface-2"
                  } ${expanded ? "border-b-0" : ""}`}
                >
                  <td className="px-3 py-1.5 text-ink-3">{p.no}</td>
                  <td className="px-3 py-1.5 text-ink-3">{p.time}</td>
                  <td className="px-3 py-1.5 text-ink-2">{p.src}</td>
                  <td className={`px-3 py-1.5 font-medium ${isC2 ? "text-danger" : "text-ink-2"}`}>{p.dst}</td>
                  <td className="px-3 py-1.5">
                    <span className={`text-[10px] font-bold px-1 py-px rounded ${
                      p.proto === "HTTP" ? "text-warn bg-warn-wash" :
                      p.proto === "TCP"  ? "text-info bg-info-wash" :
                      p.proto === "DNS"  ? "text-ink-2 bg-surface-2" :
                      "text-ok bg-ok-wash"
                    }`}>{p.proto}</span>
                  </td>
                  <td className={`px-3 py-1.5 ${isC2 ? "text-danger" : "text-ink-2"}`}>{p.info}</td>
                </tr>
                {expanded && (
                  <tr key={`${p.no}-detail`} className={`border-b border-edge-subtle ${isC2 ? "bg-danger-wash" : "bg-surface-1"}`}>
                    <td colSpan={6} className="px-4 py-2.5">
                      <p className={`text-xs leading-relaxed ${isC2 ? "text-danger" : "text-ink-2"}`}>{p.detail}</p>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-ink-3 px-3 py-1.5 border-t border-edge-subtle">
        {visible.length} of {PACKETS.length} packets · click any row to expand · {PACKETS.filter(p => p.dst === "185.220.101.47" || p.src === "185.220.101.47").length} flagged packets
      </p>
    </div>
  );
}

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase().replace(/[01345789@$]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s" }[c] ?? c));
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
  const [filterIp, setFilterIp] = useState("");
  const [filterProto, setFilterProto] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

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
        <p className="text-ink-2 text-sm mb-3">
          Examine this packet capture. Filter by IP or protocol to isolate suspicious traffic. Click any row to expand packet details.
        </p>

        {/* Filter bar */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            type="text"
            value={filterIp}
            onChange={(e) => setFilterIp(e.target.value)}
            placeholder="Filter by IP…"
            className="flex-1 min-w-0 rounded border border-edge bg-surface-1 px-3 py-1.5 text-xs font-mono text-ink-2 placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
          />
          <select
            value={filterProto}
            onChange={(e) => setFilterProto(e.target.value)}
            className="rounded border border-edge bg-surface-1 px-2 py-1.5 text-xs font-mono text-ink-2 focus:outline-none focus:border-ok-edge"
          >
            <option value="ALL">All protocols</option>
            {["DNS", "TCP", "HTTP", "HTTPS"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filterIp || filterProto !== "ALL") && (
            <button
              onClick={() => { setFilterIp(""); setFilterProto("ALL"); }}
              className="text-xs text-ink-3 hover:text-ink-2 px-2"
            >
              clear
            </button>
          )}
        </div>

        <PacketTable
          filterIp={filterIp}
          filterProto={filterProto}
          expandedRow={expandedRow}
          onRowClick={(no) => setExpandedRow(expandedRow === no ? null : no)}
        />

        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2 mt-4">
            <p className="text-sm text-ink-2 font-medium">What is the attacker&apos;s C2 IP address?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-danger font-mono">{t1Error}</p>}
          </form>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Extract the User-Agent" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-ink-2 text-sm mb-3">
          The following HTTP headers were captured from the malicious beacon request. Identify
          the attack tool based on the User-Agent string.
        </p>
        <div className="rounded-lg bg-surface-0 border border-edge p-4 mb-4">
          <pre className="font-mono text-xs text-warn whitespace-pre-wrap">{HTTP_HEADERS}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-ink-2 font-medium">What tool is revealed by the User-Agent string?</p>
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
                  <span className="text-sm font-mono text-ink">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-danger font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-ok">
            Correct — Meterpreter beacon confirmed. Flag: SAGE&#123;m3t3rpr3t3r_b34c0n&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Decode the Payload" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-ink-2 text-sm mb-3">
          A payload was extracted from the C2 session. The hex dump is shown below.
          The first two bytes identify the file type.
        </p>
        <div className="rounded-lg bg-surface-0 border border-edge p-4 mb-2">
          <pre className="font-mono text-xs text-cyan-300 whitespace-pre-wrap">{HEX_DUMP}</pre>
        </div>
        <p className="text-xs text-ink-3 mb-4">
          The magic bytes <span className="font-mono text-warn">4D 5A</span> (ASCII: MZ) are
          the signature of a well-known Windows executable format.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-ink-2 font-medium">What file type is this payload?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-danger font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-ok">
            Correct — MZ header identifies a PE executable. Flag: SAGE&#123;PE_executable&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-ok-edge bg-ok-wash p-5 space-y-3">
          <h3 className="font-bold text-ok text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-ink-3">Task 1 —</span> <span className="text-ok">SAGE&#123;185.220.101.47&#125;</span></li>
            <li><span className="text-ink-3">Task 2 —</span> <span className="text-ok">SAGE&#123;m3t3rpr3t3r_b34c0n&#125;</span></li>
            <li><span className="text-ink-3">Task 3 —</span> <span className="text-ok">SAGE&#123;PE_executable&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
