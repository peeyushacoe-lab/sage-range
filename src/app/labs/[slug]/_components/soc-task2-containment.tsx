"use client";

import { useState } from "react";
import { HintPanel } from "./hint-panel";

import { Icon } from "@/components/ui/icon";
const CONTAINMENT_STEPS = [
  { id: "preserve", label: "Preserve forensic evidence — export SIEM/EDR logs before any changes", required: true },
  { id: "block_c2", label: "Block identified C2 server at perimeter firewall — terminate active beacon", required: true },
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
      <div className="rounded-lg border border-ok-edge bg-ok-wash p-4 text-sm">
        <p className="text-ok font-medium mb-2">Containment plan accepted <Icon name="check" size={14} className="inline-block shrink-0" /></p>
        <p className="text-ink-2">Correct sequence: Preserve evidence → Block C2 + Isolate host → Reset credentials → Notify CISO/Legal</p>
        <p className="text-ink-3 mt-2">Proceed to Task 3 — threat hunt for lateral movement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-info-edge bg-info-wash p-4 text-sm">
        <p className="text-info font-medium mb-1">New intelligence</p>
        <p className="text-ink-2">The attacker is actively beaconing every 5 minutes. The compromised user&apos;s session is still active on the affected workstation. You have a 10-minute window before they escalate privileges further. Select all correct containment actions — avoid steps that would destroy evidence or cause unnecessary business disruption.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm font-medium text-ink-2">Select all appropriate containment steps:</p>
        <div className="space-y-2">
          {CONTAINMENT_STEPS.map((step) => (
            <label
              key={step.id}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selected.has(step.id)
                  ? "border-ok-edge bg-ok-wash"
                  : "border-edge hover:border-edge-strong"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(step.id)}
                onChange={() => toggle(step.id)}
                className="mt-0.5 accent-emerald-500 shrink-0"
              />
              <span className="text-sm text-ink-2">{step.label}</span>
            </label>
          ))}
        </div>

        {wrong.length > 0 && (
          <div className="rounded border border-danger-edge bg-danger-wash p-3 text-sm text-danger">
            {wrong.map((w) => <p key={w} className="flex items-center gap-1"><Icon name="cross" size={12} /> {w}</p>)}
          </div>
        )}

        <HintPanel labId={labId} stage="task_2" />

        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="rounded bg-accent-fill px-5 py-2.5 text-sm font-medium text-white hover:bg-ok-wash hover:text-white disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit containment plan"}
        </button>
      </form>
    </div>
  );
}
