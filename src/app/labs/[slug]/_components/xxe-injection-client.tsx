"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const NORMAL_REQUEST = `POST /api/import HTTP/1.1
Content-Type: application/xml

<?xml version="1.0"?>
<order>
  <item>Widget A</item>
  <qty>4</qty>
</order>`;

const MALICIOUS_REQUEST = `POST /api/import HTTP/1.1
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE order [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<order>
  <item>&xxe;</item>
  <qty>4</qty>
</order>`;

const SERVER_RESPONSE = `200 OK
{ "item": "root:x:0:0:root:/root:/bin/bash\\ndaemon:x:1:1:daemon:...", "qty": 4 }`;

export function XxeInjectionClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  async function submitT1(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_1", t1Choice);
    if (verdict.correct) {
      setT1Error("");
      markDone("task_1", verdict.reveal);
    } else {
      setT1Error("Incorrect. Look at what <!ENTITY xxe SYSTEM ...> declares, and how &xxe; is used inside the XML body.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Answer);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Which local file's contents were leaked back in the response? Format as a flag.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. What specific parser feature is responsible for resolving external entities like this?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Compare the Requests" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An order-import API accepts XML. Here's a normal request, followed by a malicious one:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{NORMAL_REQUEST}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{MALICIOUS_REQUEST}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is the &lt;!ENTITY xxe SYSTEM ...&gt; declaration?</p>
            <div className="flex flex-col gap-2">
              {[
                "A comment ignored by the parser",
                "A custom entity that loads the contents of a local file",
                "An XML namespace declaration",
                "A schema validation rule",
              ].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — a DOCTYPE-declared external entity pointing at a file:// URI tells a vulnerable parser to read that file and substitute its contents wherever &xxe; is referenced. Flag: {revealed.task_1 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Confirm the Disclosure" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The server's response to the malicious request:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SERVER_RESPONSE}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag which local file's contents were disclosed.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — the "item" field now contains the contents of /etc/passwd instead of a product name. Flag: {revealed.task_2 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Fix the Parser" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The dev team wants to keep accepting XML uploads, safely.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is the correct fix?</p>
            <div className="flex flex-col gap-2">
              {[
                "Reject any XML containing the word 'ENTITY'",
                "Disable external entity and DTD processing in the XML parser configuration",
                "Switch from XML to a different file extension",
                "Add rate limiting to the endpoint",
              ].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t3" value={opt} checked={t3Choice === opt} onChange={() => setT3Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — most XML libraries process external entities and DTDs by default; explicitly disabling that
            feature (e.g. libxml2's LIBXML_NOENT/resolve_entities settings) closes the vulnerability at its source,
            unlike keyword blacklisting which is easily bypassed. Flag: {revealed.task_3 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
