"use client";

import { useState } from "react";
import { HintPanel } from "./hint-panel";

const CONTAINMENT_STEPS = [
  { id: "preserve", label: "Preserve forensic evidence — export SIEM/EDR logs before any changes", required: true },
  { id: "block_c2", label: "Block 198.51.100.42 at perimeter firewall — terminate C2 channel", required: true },
  { id: "isolate", label: "Isolate finance-ws01 from the network — quarantine the compromised host", required: true },
  { id: "reset_creds", label: "Reset finance.user credentials — invalidate compromised account", required: true },
  { id: "notify", label: "Notify CISO and legal — mandatory for potential data breach", required: true },
  { id: "reimage", label: "Reimage finance-ws01 immediately without forensic capture", required: false },
  { id: "shutdown", label: "Shut down all company systems — halt all business operations", required: false },
] as const;

type StepId = (typeof CONTAINMENT_STEPS)[number]["id"];

export function SocTask2Containment({ labId, alreadyDone }: { labId: string; alreadyDone: boolean }) {
  const [selected, setSelected] = useState<Set<StepId>>(new Set());
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [wrong, setWrong] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  function toggle(id: StepId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missed = CONTAINMENT_STEPS.filter((s) => s.required && !selected.has(s.id)).map((s) => s.id);
    const wrongPicks = CONTAINMENT_STEPS.filter((s) => !s.required && selected.has(s.id)).map((s) => s.label);

    if (missed.length > 0 || wrongPicks.length > 0) {
      setWrong(wrongPicks.length > 0 ? wrongPicks : ["You missed required containment steps. Review the options."]);
      return;
    }

    setPending(true);
    try {
      await fetch("/api/labs/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, stage: "task_2", response: JSON.stringify([...selected]) }),
      });
      setSubmitted(true);
      setWrong([]);
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-sage-500/30 bg-sage-500/5 p-4 text-sm">
          <p className="text-sage-500 font-medium mb-2">Containment plan accepted ✓</p>
          <p className="text-zinc-400">Correct sequence: Preserve evidence → Block C2 + Isolate host → Reset credentials → Notify CISO/Legal</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500 font-mono">Flag revealed</p>
          <p className="font-mono text-sage-500 mt-1">SAGE&#123;1r_c0nt41nm3nt_f1rst&#125;</p>
          <p className="text-xs text-zinc-600 mt-1">Submit this in the flag form to record your solve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
        <p className="text-blue-400 font-medium mb-1">New intelligence</p>
        <p className="text-zinc-300">The attacker is actively beaconing to 198.51.100.42 every 5 minutes. finance.user&apos;s session is still active on finance-ws01. You have a 10-minute window before they escalate privileges. Select all correct containment actions — avoid steps that would destroy evidence or cause unnecessary business disruption.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm font-medium text-zinc-300">Select all appropriate containment steps:</p>
        <div className="space-y-2">
          {CONTAINMENT_STEPS.map((step) => (
            <label
              key={step.id}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selected.has(step.id)
                  ? "border-sage-500/40 bg-sage-500/5"
                  : "border-white/8 hover:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(step.id)}
                onChange={() => toggle(step.id)}
                className="mt-0.5 accent-emerald-500 shrink-0"
              />
              <span className="text-sm text-zinc-300">{step.label}</span>
            </label>
          ))}
        </div>

        {wrong.length > 0 && (
          <div className="rounded border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
            {wrong.map((w) => <p key={w}>✗ {w}</p>)}
          </div>
        )}

        <HintPanel labId={labId} stage="task_2" />

        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="rounded bg-sage-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-sage-700 hover:text-white disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit containment plan"}
        </button>
      </form>
    </div>
  );
}
