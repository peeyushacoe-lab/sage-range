"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const FFUF_OUTPUT = `$ ffuf -w /usr/share/wordlists/dirb/common.txt -u https://target.com/FUZZ

/admin-panel-9f3a2/    [Status: 403, Size: 289]
/backup/               [Status: 200, Size: 4096]
/backup/db_dump_2026.sql [Status: 200, Size: 2097152]
/staging/              [Status: 200, Size: 1024]
/staging/index.html    [Status: 200, Size: 512]
/.git/                 [Status: 200, Size: 4096]
/.git/config           [Status: 200, Size: 147]`;

export function WebReconClient({
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
    if (t1Answer.toLowerCase().includes("admin-panel-9f3a2")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which Disallow path contains 'admin' in the robots.txt?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "/.git/config") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. An exposed .git directory leaks full source code, commit history, and credentials.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "admin-staging.target.com") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Which subdomain suggests a non-production admin interface that may be less hardened?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — robots.txt Discovery */}
      <TaskShell number={1} title="robots.txt Discovery" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The <code className="font-mono text-amber-300">robots.txt</code> file instructs search engine crawlers
          which paths to skip. Ironically, <code className="font-mono text-amber-300">Disallow</code> entries
          act as a roadmap of sensitive paths attackers should investigate first.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">https://target.com/robots.txt</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{`User-agent: *
Disallow: /admin-panel-9f3a2/
Disallow: /backup/
Disallow: /staging/
Allow: /`}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What hidden admin path is revealed by robots.txt?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="/admin-panel-..."
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — /admin-panel-9f3a2/ was disclosed. Flag: SAGE&#123;r0b0ts_txt_4dm1n_p4th&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Directory Brute Force */}
      <TaskShell number={2} title="Directory Brute Force" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Directory brute-forcing with tools like <code className="font-mono text-amber-300">ffuf</code> or
          <code className="font-mono text-amber-300"> dirb</code> reveals paths not linked from the UI.
          An exposed <code className="font-mono text-amber-300">.git</code> directory is one of the most critical findings possible.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{FFUF_OUTPUT}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          <code className="font-mono text-amber-300">/.git/config</code> exposes the remote URL, branch names,
          and sometimes credentials. A full <code className="font-mono text-amber-300">git clone</code> via
          <code className="font-mono text-amber-300"> git-dumper</code> retrieves the entire source code history.
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which discovered file poses the highest risk?</p>
            <div className="flex flex-col gap-2">
              {["/backup/db_dump_2026.sql", "/staging/index.html", "/admin-panel-9f3a2/ (403)", "/.git/config"].map((opt) => (
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
            Correct — an exposed .git/config leaks full source history. Flag: SAGE&#123;g1t_c0nf1g_3xp0s3d&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Certificate Transparency */}
      <TaskShell number={3} title="Certificate Transparency" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          Certificate Transparency logs (via <code className="font-mono text-amber-300">crt.sh</code>) record every
          TLS certificate issued for a domain. Subdomains appear in these logs even if not publicly advertised —
          a passive recon goldmine.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">crt.sh results for target.com:</p>
          <table className="font-mono text-xs w-full">
            <thead>
              <tr className="text-zinc-500 border-b border-white/8">
                <th className="text-left pr-8 py-1">Subdomain</th>
                <th className="text-left py-1">Issued</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-amber-300">
                <td className="pr-8 py-0.5">dev.target.com</td>
                <td className="py-0.5">2026-01-15</td>
              </tr>
              <tr className="text-amber-300">
                <td className="pr-8 py-0.5">api.target.com</td>
                <td className="py-0.5">2026-01-15</td>
              </tr>
              <tr className="text-red-400">
                <td className="pr-8 py-0.5">admin-staging.target.com</td>
                <td className="py-0.5">2025-11-02 <span className="text-zinc-500 ml-2">← interesting</span></td>
              </tr>
              <tr className="text-amber-300">
                <td className="pr-8 py-0.5">mail.target.com</td>
                <td className="py-0.5">2026-01-20</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Staging environments often lack the hardening of production — outdated software, debug endpoints,
          weak credentials, and disabled WAF rules are common findings.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which subdomain is most interesting for further testing?</p>
            <div className="flex flex-col gap-2">
              {["dev.target.com", "api.target.com", "admin-staging.target.com", "mail.target.com"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t3choice"
                    value={opt}
                    checked={t3Choice === opt}
                    onChange={() => setT3Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — admin-staging combines admin access with reduced security controls. Flag: SAGE&#123;4dm1n_st4g1ng_subd0m41n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r0b0ts_txt_4dm1n_p4th&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;g1t_c0nf1g_3xp0s3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4dm1n_st4g1ng_subd0m41n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
