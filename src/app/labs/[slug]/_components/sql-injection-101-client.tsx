"use client";

import { useState } from "react";
import { TaskShell, QueryDisplay, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

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

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Authentication Bypass" unlocked completed={done("task_1")}>
        <Task1 onComplete={() => void saveStage("task_1")} completed={done("task_1")} />
        {!done("task_1") && <HintPanel labId={labId} stage="task_1" />}
      </TaskShell>
      <TaskShell number={2} title="UNION Data Extraction" unlocked={done("task_1")} completed={done("task_2")}>
        <Task2 onComplete={() => void saveStage("task_2")} completed={done("task_2")} />
        {!done("task_2") && <HintPanel labId={labId} stage="task_2" />}
      </TaskShell>
      <TaskShell number={3} title="Boolean Blind SQLi" unlocked={done("task_2")} completed={done("task_3")}>
        <Task3 onComplete={() => void saveStage("task_3")} completed={done("task_3")} />
        {!done("task_3") && <HintPanel labId={labId} stage="task_3" />}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;cl4ss1c_0r_1_eq_1&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;un10n_s3l3ct_d4t4_l34k&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;bl1nd_bl00l3an_sqli_m4st3r&#125;</span></li>
          </ul>
          <p className="text-xs text-zinc-400">Submit any flag from above for credit.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task 1 — Authentication Bypass
// ---------------------------------------------------------------------------
function Task1({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const query = `SELECT * FROM users WHERE username = '${user}' AND password = '${pass}'`;

  function attempt(e: React.FormEvent) {
    e.preventDefault();
    if (isAuthBypass(user) || isAuthBypass(pass)) {
      setOutput(`> ${query}\n\n[!] auth bypass — query returned all rows\n[+] logged in as: admin@sageforge.local\n[+] flag: SAGE{cl4ss1c_0r_1_eq_1}`);
      if (!completed) onComplete();
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
      <p className="text-xs text-amber-500">
        Hint: try <code className="font-mono">&apos; OR &apos;1&apos;=&apos;1</code> in either field.
      </p>
    </div>
  );
}

function isAuthBypass(s: string): boolean {
  const n = s.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    /' *or *'?\d+'?='?\d+/.test(n) || /' *or *true/.test(n) ||
    n.includes("' or 1=1") || n.includes("'or'1'='1") ||
    (n.endsWith("--") && n.includes("'"))
  );
}

// ---------------------------------------------------------------------------
// Task 2 — UNION Data Extraction
// ---------------------------------------------------------------------------
function Task2({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [category, setCategory] = useState("");
  const [output, setOutput] = useState<"idle" | "normal" | "union">("idle");
  const query = `SELECT name, description FROM products WHERE category = '${category}'`;

  function search(e: React.FormEvent) {
    e.preventDefault();
    const lower = category.toLowerCase();
    if (lower.includes("union") && lower.includes("select")) {
      setOutput("union");
      if (!completed) onComplete();
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

      {output === "union" && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-red-400">[!] UNION injection detected — extra rows appended</p>
          <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs space-y-1">
            <p className="text-red-300">email: admin@sageforge.local</p>
            <p className="text-red-300">password_hash: admin123</p>
            <p className="text-sage-400 mt-2">flag: SAGE&#123;un10n_s3l3ct_d4t4_l34k&#125;</p>
          </div>
        </div>
      )}

      <p className="text-xs text-amber-500">
        Hint: try <code className="font-mono">electronics&apos; UNION SELECT email, password FROM users--</code>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task 3 — Boolean Blind SQLi
// ---------------------------------------------------------------------------
function Task3({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [trueDetected, setTrueDetected] = useState(false);
  const [falseDetected, setFalseDetected] = useState(false);
  const [flagRevealed, setFlagRevealed] = useState(completed);
  const query = `SELECT id FROM users WHERE username = '${input}'`;

  function check(e: React.FormEvent) {
    e.preventDefault();
    const lower = input.toLowerCase().replace(/\s+/g, " ").trim();
    const isBool = (lower.includes("' and ") || lower.includes("' or ")) && lower.includes("--");

    if (isBool) {
      const isFalse = lower.includes("='0") || lower.includes("= 0--") || lower.includes("1=0");
      if (isFalse) { setResult("✗ User not found"); setFalseDetected(true); }
      else { setResult("✓ User exists"); setTrueDetected(true); }
    } else if (lower === "admin") {
      setResult("✓ User exists");
    } else if (input.trim()) {
      setResult("✗ User not found");
    }
  }

  if (trueDetected && falseDetected && !flagRevealed) {
    setFlagRevealed(true);
    if (!completed) onComplete();
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
        <p className={`font-mono text-sm font-medium ${result.startsWith("✓") ? "text-sage-400" : "text-red-400"}`}>
          {result}
        </p>
      )}
      {(trueDetected || falseDetected) && !flagRevealed && (
        <p className="text-xs text-amber-500 font-mono">[~] boolean branch detected — try the opposite condition to confirm.</p>
      )}
      {flagRevealed && (
        <div className="rounded border border-sage-500/30 bg-sage-500/5 p-4 font-mono text-sm space-y-1">
          <p className="text-red-400 text-xs">[!] blind boolean injection confirmed — both branches exercised</p>
          <p className="text-sage-400">flag: SAGE&#123;bl1nd_bl00l3an_sqli_m4st3r&#125;</p>
        </div>
      )}
      <div className="text-xs text-amber-500 space-y-1">
        <p>Hint — true: <code className="font-mono">admin&apos; AND &apos;1&apos;=&apos;1--</code></p>
        <p>Hint — false: <code className="font-mono">admin&apos; AND &apos;1&apos;=&apos;0--</code></p>
      </div>
    </div>
  );
}
