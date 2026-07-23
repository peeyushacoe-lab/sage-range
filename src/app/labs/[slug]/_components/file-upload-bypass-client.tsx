"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const FILTER_CODE = `// Server-side upload validation (avatar_upload.php)
$ext = strtolower(pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION));
$blocked = ['php', 'phtml', 'php3', 'php5'];

if (in_array($ext, $blocked)) {
    die("File type not allowed.");
}
move_uploaded_file($_FILES['avatar']['tmp_name'], "uploads/" . $_FILES['avatar']['name']);`;

const ATTEMPT_LOG = `POST /avatar_upload.php  filename="shell.php"    -> 403 "File type not allowed."
POST /avatar_upload.php  filename="shell.phP"    -> 403 "File type not allowed."
POST /avatar_upload.php  filename="shell.pht"    -> 200 OK
GET  /uploads/shell.pht?cmd=id                    -> 200 OK  "uid=33(www-data) gid=33(www-data)"`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function FileUploadBypassClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
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
    if (t1Choice === "It's an incomplete deny-list — it doesn't cover every executable PHP extension") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at what the $blocked array actually contains versus every extension a web server might execute as PHP.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{pht_extension_bypass}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Which extension succeeded in the attempt log, despite the filter? Format as a flag.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Use an allow-list of safe extensions, validate content-type, and store uploads outside the web root") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. A deny-list will always be a step behind — what's the more robust class of fix?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Review the Filter" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An avatar upload feature validates file extensions before saving.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{FILTER_CODE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the fundamental weakness of this filter?</p>
            <div className="flex flex-col gap-2">
              {[
                "It doesn't check file size",
                "It's an incomplete deny-list — it doesn't cover every executable PHP extension",
                "It uses PHP, which is inherently insecure",
                "There is no weakness",
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
          <p className="text-sm font-mono text-sage-400">Correct — deny-lists must enumerate every dangerous extension; Apache's mod_php config often executes lesser-known extensions like .phtml and .pht too. Flag: SAGE&#123;1nc0mpl3t3_d3ny_l1st&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Find the Bypass" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Here are the attacker's actual upload attempts against this endpoint:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ATTEMPT_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the extension that bypassed the filter.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — .pht wasn't in the deny-list but is still executed as PHP by the server, giving the attacker code execution as www-data. Flag: SAGE&#123;pht_extension_bypass&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Fix It Properly" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The team wants a durable fix, not just adding .pht to the blocked list.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the more robust approach?</p>
            <div className="flex flex-col gap-2">
              {[
                "Add every known PHP-executable extension to the deny-list, one by one",
                "Use an allow-list of safe extensions, validate content-type, and store uploads outside the web root",
                "Rename uploaded files to random strings only",
                "Require a CAPTCHA before upload",
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
            Correct — allow-listing only known-safe extensions (jpg, png, gif), validating actual content type, and
            storing uploads outside the web root (or serving them with a non-executable content-disposition) closes
            the whole vulnerability class at once. Flag: SAGE&#123;4ll0w_l1st_4nd_1s0l4t3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;1nc0mpl3t3_d3ny_l1st&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;pht_extension_bypass&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4ll0w_l1st_4nd_1s0l4t3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
