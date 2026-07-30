"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

import { Icon } from "@/components/ui/icon";
export function WelcomeCtfClient({
  labId,
  completedStages: initial,
  alreadySolved,
}: {
  labId: string;
  completedStages: string[];
  alreadySolved: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>(initial);
  const [answers, setAnswers] = useState({ t1: "", t2: "", t3: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
    router.refresh();
  }

  function checkFlag(stage: "task_1" | "task_2" | "task_3", value: string, expected: string) {
    const strip = (s: string) =>
      s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase().replace(/[01345789@$]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s" }[c] ?? c));
    if (strip(value) === strip(expected)) {
      setErrors((p) => ({ ...p, [stage]: "" }));
      void saveStage(stage);
    } else {
      setErrors((p) => ({ ...p, [stage]: "Incorrect flag. Try again." }));
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Source Code Recon" unlocked completed={done("task_1")}>
        <p className="text-ink-2 text-sm mb-3">
          Every CTF starts with reading what&apos;s in front of you. This page
          contains a hidden flag — not in the visible text, but in the HTML source.
        </p>
        <p className="text-sm text-ink-2 mb-4">
          Scan the source code carefully. Flags follow the format{" "}
          <code className="text-ok font-mono">SAGE&#123;...&#125;</code>
        </p>
        {/* Real HTML comment rendered into the DOM — visible in DevTools / page source */}
        <div dangerouslySetInnerHTML={{ __html: "<!-- SAGE{w3lc0me_t0_th3_r4nge} -->" }} />
        {!done("task_1") && (
          <AnswerRow
            value={answers.t1}
            onChange={(v) => setAnswers((p) => ({ ...p, t1: v }))}
            onSubmit={() => checkFlag("task_1", answers.t1, "SAGE{w3lc0me_t0_th3_r4nge}")}
            error={errors["task_1"]}
          />
        )}
        {!done("task_1") && <HintPanel labId={labId} stage="task_1" />}
      </TaskShell>

      <TaskShell number={2} title="Not Encryption" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-ink-2 text-sm mb-3">
          A developer claims this is &quot;encrypted.&quot; Base64 is encoding,
          not encryption. Decode to find the flag.
        </p>
        <div className="rounded-lg bg-surface-0 border border-edge p-4 mb-3">
          <code className="font-mono text-sm text-warn break-all">
            U0FHRXtiNHNlNjRfaXNfbjB0X2VuY3J5cHRpMG59
          </code>
        </div>
        <p className="text-xs text-warn mb-4">
          Hint: use <code className="font-mono">atob(&quot;...&quot;)</code> in the
          browser console or any base64 decoder.
        </p>
        {!done("task_2") && (
          <AnswerRow
            value={answers.t2}
            onChange={(v) => setAnswers((p) => ({ ...p, t2: v }))}
            onSubmit={() => checkFlag("task_2", answers.t2, "SAGE{b4se64_is_n0t_encrypti0n}")}
            error={errors["task_2"]}
          />
        )}
        {!done("task_2") && <HintPanel labId={labId} stage="task_2" />}
      </TaskShell>

      <TaskShell number={3} title="Secret in the Code" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-ink-2 text-sm mb-3">
          A junior developer pushed credentials to production. Scan this commit
          diff for the hardcoded token.
        </p>
        <div className="rounded-lg bg-surface-0 border border-edge p-4 mb-4 overflow-x-auto">
          <pre className="font-mono text-xs leading-relaxed">
            <span className="text-ink-3">diff --git a/config/auth.js b/config/auth.js{"\n"}</span>
            <span className="text-ok">+const API_ENDPOINT = &apos;https://api.sageforge.local/v1&apos;;{"\n"}</span>
            <span className="text-ok">+const SECRET_TOKEN = &apos;SAGE&#123;h4rdc0d3d_s3cr3ts_l34k&#125;&apos;;{"\n"}</span>
            <span className="text-ok">+const TIMEOUT_MS = 30000;{"\n"}</span>
            <span className="text-ink-3">{"\n"}</span>
            <span className="text-ink-2">{" // TODO: move to environment variables\n"}</span>
          </pre>
        </div>
        {!done("task_3") && (
          <AnswerRow
            value={answers.t3}
            onChange={(v) => setAnswers((p) => ({ ...p, t3: v }))}
            onSubmit={() => checkFlag("task_3", answers.t3, "SAGE{h4rdc0d3d_s3cr3ts_l34k}")}
            error={errors["task_3"]}
          />
        )}
        {!done("task_3") && <HintPanel labId={labId} stage="task_3" />}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-ok-edge bg-ok-wash p-5 space-y-3">
          <h3 className="font-bold text-ok text-base">Room Complete <Icon name="check" size={14} className="inline-block shrink-0" /></h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-ink-3">Task 1 —</span> <span className="text-ok">SAGE&#123;w3lc0me_t0_th3_r4nge&#125;</span></li>
            <li><span className="text-ink-3">Task 2 —</span> <span className="text-ok">SAGE&#123;b4se64_is_n0t_encrypti0n&#125;</span></li>
            <li><span className="text-ink-3">Task 3 —</span> <span className="text-ok">SAGE&#123;h4rdc0d3d_s3cr3ts_l34k&#125;</span></li>
          </ul>
          {!alreadySolved && (
            <p className="text-xs text-ink-2 border-t border-edge pt-3">
              One last step: submit <code className="text-ok font-mono">SAGE&#123;h4rdc0d3d_s3cr3ts_l34k&#125;</code> in the flag box below to earn your XP.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerRow({
  value, onChange, onSubmit, error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-2">
      <div className="flex gap-2 max-w-md">
        <MonoInput
          value={value}
          onChange={onChange}
          placeholder="SAGE{...}"
          className="flex-1"
        />
        <SubmitBtn label="Submit" />
      </div>
      {error && <p className="text-xs text-danger font-mono">{error}</p>}
    </form>
  );
}
