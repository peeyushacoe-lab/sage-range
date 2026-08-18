"use client";

import { useState } from "react";
import { TaskShell, QueryDisplay, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

import { Icon } from "@/components/ui/icon";
const PRODUCTS: Record<string, { name: string; desc: string }[]> = {
  electronics: [
    { name: "Wireless Adapter", desc: "802.11ac dual-band USB dongle" },
    { name: "Logic Analyser", desc: "8-channel 24 MHz USB analyser" },
  ],
  clothing: [
    { name: "Operator Hoodie", desc: "Black, preshrunk, no logo" },
    { name: "Tactical Tee", desc: "Moisture-wicking, charcoal" },
  ],
  tools: [
    { name: "Rubber Ducky", desc: "HID keystroke injection device" },
    { name: "Flipper Zero", desc: "Multi-protocol pen-test tool" },
  ],
};

export function SqlInjection101Client({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  const [revealed, addReveal] = useRevealedFlags(labId);

  /**
   * Send the payload the learner actually typed for marking.
   *
   * The three tasks simulate a vulnerable app, so the browser still decides what
   * the fake database appears to return — but whether that earns the stage, and
   * what flag it reveals, is the server's call.
   */
  async function submitPayload(stage: string, payload: string): Promise<string | null> {
    const verdict = await verifyStage(labId, stage, payload);
    if (!verdict.correct) return null;
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, verdict.reveal);
    return verdict.reveal ?? "";
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Authentication Bypass" unlocked completed={done("task_1")}>
        <Task1 submit={(payload) => submitPayload("task_1", payload)} completed={done("task_1")} flag={revealed.task_1} />
        {!done("task_1") && <HintPanel labId={labId} stage="task_1" />}
      </TaskShell>
      <TaskShell number={2} title="UNION Data Extraction" unlocked={done("task_1")} completed={done("task_2")}>
        <Task2 submit={(payload) => submitPayload("task_2", payload)} completed={done("task_2")} flag={revealed.task_2} />
        {!done("task_2") && <HintPanel labId={labId} stage="task_2" />}
      </TaskShell>
      <TaskShell number={3} title="Boolean Blind SQLi" unlocked={done("task_2")} completed={done("task_3")}>
        <Task3 submit={(payload) => submitPayload("task_3", payload)} completed={done("task_3")} flag={revealed.task_3} />
        {!done("task_3") && <HintPanel labId={labId} stage="task_3" />}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
          <p className="text-xs text-zinc-400">Submit any flag from above for credit.</p>
        </div>
      )}
    </div>
  );
}

/** Each task submits the payload the learner typed and gets back its flag, or null. */
type TaskProps = {
  submit: (payload: string) => Promise<string | null>;
  completed: boolean;
  flag?: string;
};

// ---------------------------------------------------------------------------
// Task 1 — Authentication Bypass
// ---------------------------------------------------------------------------
function Task1({ submit, completed, flag }: TaskProps) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const query = `SELECT * FROM users WHERE username = '${user}' AND password = '${pass}'`;

  async function attempt(e: React.FormEvent) {
    e.preventDefault();
    const earned = completed ? (flag ?? "") : await submit(`${user} | ${pass}`);
    if (earned !== null) {
      setOutput(`> ${query}\n\n[!] auth bypass — query returned all rows\n[+] logged in as: admin@sageforge.local\n[+] flag: ${earned || flag || "(see Room Complete)"}`);
    } else if (user && pass) {
      setOutput(`> ${query}\n\n[!] invalid credentials\n\nHint: classic payloads target the WHERE clause.`);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-300 text-sm">A small startup left their login form vulnerable. Bypass authentication and retrieve the admin flag.</p>
      <QueryDisplay query={query} />
      <form onSubmit={attempt} className="space-y-3 max-w-sm">
        <MonoInput value={user} onChange={setUser} placeholder="Username" className="w-full" />
        <MonoInput value={pass} onChange={setPass} placeholder="Password" className="w-full" />
        <SubmitBtn label="Log in" />
      </form>
      {output && (
        <pre className={`mt-2 rounded p-3 text-xs font-mono whitespace-pre-wrap border ${completed ? "bg-sage-500/5 border-sage-500/30 text-sage-300" : "bg-black/60 border-white/5 text-zinc-300"}`}>
          {output}
        </pre>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Task 2 — UNION Data Extraction
// ---------------------------------------------------------------------------
function Task2({ submit, completed, flag }: TaskProps) {
  const [category, setCategory] = useState("");
  const [output, setOutput] = useState<"idle" | "normal" | "union" | "col_error">("idle");
  const query = `SELECT name, description FROM products WHERE category = '${category}'`;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const lower = category.toLowerCase();
    if (lower.includes("union") && lower.includes("select")) {
      // Whether the injected SELECT has the right column count is the server's
      // call — a mismatch comes back as "not correct", which is the same thing
      // the simulated database would say.
      const earned = completed ? (flag ?? "") : await submit(category);
      setOutput(earned === null ? "col_error" : "union");
    } else {
      setOutput(PRODUCTS[lower] ? "normal" : "idle");
    }
  }

  const normalRows = PRODUCTS[category.toLowerCase()] ?? [];

  return (
    <div className="space-y-4">
      <p className="text-zinc-300 text-sm">This product search appends your input directly. Use a UNION attack to extract data from other tables.</p>
      <QueryDisplay query={query} />
      <form onSubmit={search} className="flex gap-2 max-w-md">
        <MonoInput value={category} onChange={setCategory} placeholder="electronics / clothing / tools" className="flex-1" />
        <SubmitBtn label="Search" />
      </form>

      {output === "normal" && (
        <div className="space-y-2">
          {normalRows.map((p) => (
            <div key={p.name} className="rounded border border-white/8 bg-zinc-950 px-4 py-3">
              <p className="font-medium text-sm text-zinc-100">{p.name}</p>
              <p className="text-xs text-zinc-500">{p.desc}</p>
            </div>
          ))}
        </div>
      )}

      {output === "col_error" && (
        <p className="text-xs font-mono text-red-400">[!] ERROR: The used SELECT statements have a different number of columns — UNION requires matching column counts.</p>
      )}

      {output === "union" && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-red-400">[!] UNION injection detected — extra rows appended</p>
          <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs space-y-1">
            <p className="text-red-300">email: admin@sageforge.local</p>
            <p className="text-red-300">password_hash: admin123</p>
            <p className="text-sage-400 mt-2">flag: {flag ?? "SAGE{…}"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task 3 — Boolean Blind SQLi
// ---------------------------------------------------------------------------
function Task3({ submit, completed, flag }: TaskProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [payloads, setPayloads] = useState<string[]>([]);
  const [flagRevealed, setFlagRevealed] = useState(completed);
  const query = `SELECT id FROM users WHERE username = '${input}'`;

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const lower = input.toLowerCase().replace(/\s+/g, " ").trim();
    const isBool = (lower.includes("' and ") || lower.includes("' or ")) && lower.includes("--");

    if (isBool) {
      const isFalse = lower.includes("='0") || lower.includes("= 0--") || lower.includes("1=0");
      if (isFalse) setResult({ ok: false, text: "User not found" });
      else setResult({ ok: true, text: "User exists" });
      // Credit needs both branches, so both payloads go to the server together —
      // it decides whether the pair demonstrates a blind boolean injection.
      const tried = [...payloads, input];
      setPayloads(tried);
      if (!flagRevealed) {
        const earned = await submit(tried.join(" | "));
        if (earned !== null) setFlagRevealed(true);
      }
    } else if (lower === "admin") {
      setResult({ ok: true, text: "User exists" });
    } else if (input.trim()) {
      setResult({ ok: false, text: "User not found" });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-300 text-sm">This endpoint only reveals &quot;user exists&quot; or &quot;not found.&quot; Use boolean conditions to infer data from the binary response.</p>
      <QueryDisplay query={query} />
      <form onSubmit={check} className="flex gap-2 max-w-md">
        <MonoInput value={input} onChange={setInput} placeholder="Enter username" className="flex-1" />
        <SubmitBtn label="Check" />
      </form>

      {result && (
        <p className={`font-mono text-sm font-medium flex items-center gap-1.5 ${result.ok ? "text-sage-400" : "text-red-400"}`}>
          <Icon name={result.ok ? "check" : "cross"} size={13} />
          {result.text}
        </p>
      )}
      {payloads.length > 0 && !flagRevealed && (
        <p className="text-xs text-amber-500 font-mono">[~] boolean branch detected — try the opposite condition to confirm.</p>
      )}
      {flagRevealed && (
        <div className="rounded border border-sage-500/30 bg-sage-500/5 p-4 font-mono text-sm space-y-1">
          <p className="text-red-400 text-xs">[!] blind boolean injection confirmed — both branches exercised</p>
          <p className="text-sage-400">flag: {flag ?? "SAGE{…}"}</p>
        </div>
      )}
    </div>
  );
}
