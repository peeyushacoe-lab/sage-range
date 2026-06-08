"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

type RobotsEntry = {
  path: string;
  note: string;
  interesting: boolean;
};

const ROBOTS_ENTRIES: RobotsEntry[] = [
  { path: "/admin-panel-9f3a2/", note: "Hidden admin panel with obfuscated path. Disallowing it tells crawlers — and attackers — it exists.", interesting: true },
  { path: "/backup/",            note: "Backup directory disallowed. Backup files are commonly misconfigured to be world-readable.", interesting: true },
  { path: "/staging/",          note: "Staging environment disallowed. Often has weaker security controls than production.", interesting: true },
];

type FfufRow = {
  path: string;
  status: number;
  size: number;
  risk: "critical" | "high" | "medium" | "low";
  response: string;
  analysis: string;
};

const FFUF_ROWS: FfufRow[] = [
  {
    path: "/admin-panel-9f3a2/",
    status: 403,
    size: 289,
    risk: "high",
    response: `HTTP/1.1 403 Forbidden
Server: nginx/1.24.0
Content-Type: text/html

<html><body><h1>403 Forbidden</h1>
<p>Access to /admin-panel-9f3a2/ is restricted.</p>
</body></html>`,
    analysis: "403 means the path EXISTS but is access-controlled. The panel is there — just needs valid credentials or an auth bypass.",
  },
  {
    path: "/backup/",
    status: 200,
    size: 4096,
    risk: "medium",
    response: `HTTP/1.1 200 OK
Server: nginx/1.24.0
Content-Type: text/html

<html><body>
<h1>Index of /backup/</h1>
<a href="db_dump_2026.sql">db_dump_2026.sql</a>  (2.0 MB)
<a href="config.bak">config.bak</a>  (4.2 KB)
</body></html>`,
    analysis: "Directory listing is enabled. Two files exposed: a database dump and a config backup. Both are likely to contain credentials.",
  },
  {
    path: "/backup/db_dump_2026.sql",
    status: 200,
    size: 2097152,
    risk: "critical",
    response: `HTTP/1.1 200 OK
Content-Type: application/sql
Content-Length: 2097152

-- MySQL dump
-- Host: localhost    Database: production
-- Target Server Version: 8.0.33

CREATE TABLE users (
  id int NOT NULL,
  email varchar(255) NOT NULL,
  password_hash varchar(60) NOT NULL,
  ...
);

INSERT INTO users VALUES (1,'admin@target.com','$2y$10$abc...hash...');`,
    analysis: "CRITICAL: Full database dump with 2M rows. Contains hashed user passwords. Offline cracking or plaintext reuse attacks are now feasible.",
  },
  {
    path: "/staging/",
    status: 200,
    size: 1024,
    risk: "medium",
    response: `HTTP/1.1 200 OK
Server: nginx/1.24.0
X-Powered-By: PHP/8.1.0

<html><body>
<h1>Staging Environment</h1>
<!-- TODO: remove debug=true before prod merge -->
<a href="index.html">App</a>
</body></html>`,
    analysis: "Staging is live and accessible. The HTML comment reveals a debug flag — debug=true often enables verbose errors, stack traces, or admin endpoints.",
  },
  {
    path: "/.git/",
    status: 200,
    size: 4096,
    risk: "critical",
    response: `HTTP/1.1 200 OK
Content-Type: text/html

<html><body>
<h1>Index of /.git/</h1>
<a href="config">config</a>
<a href="HEAD">HEAD</a>
<a href="logs/">logs/</a>
<a href="objects/">objects/</a>
<a href="refs/">refs/</a>
</body></html>`,
    analysis: "Exposed .git directory. Full git object store is accessible — git-dumper can reconstruct the entire source code history including deleted files and credentials.",
  },
  {
    path: "/.git/config",
    status: 200,
    size: 147,
    risk: "critical",
    response: `HTTP/1.1 200 OK
Content-Type: text/plain

[core]
  repositoryformatversion = 0
  filemode = true
[remote "origin"]
  url = https://github.com/target-corp/production-app
  fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
  remote = origin`,
    analysis: "CRITICAL: git config exposes the GitHub repository URL. The entire production codebase is now discoverable. May contain secrets in commit history.",
  },
];

const RISK_COLORS: Record<FfufRow["risk"], string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-amber-400 border-amber-500/40 bg-amber-500/10",
  low:      "text-zinc-400 border-zinc-600 bg-zinc-800",
};

const STATUS_COLORS: Record<number, string> = {
  200: "text-sage-400",
  403: "text-amber-400",
};

type CrtRow = {
  subdomain: string;
  issued: string;
  interesting: boolean;
  note: string;
};

const CRT_ROWS: CrtRow[] = [
  { subdomain: "dev.target.com",           issued: "2026-01-15", interesting: false, note: "Development environment. Expected subdomain. May have different auth requirements." },
  { subdomain: "api.target.com",           issued: "2026-01-15", interesting: false, note: "API subdomain. Useful for direct API enumeration but likely rate-limited." },
  { subdomain: "admin-staging.target.com", issued: "2025-11-02", interesting: true,  note: "⭐ HIGH VALUE: Combines admin access with staging security posture. Older cert — possibly forgotten. Worth direct investigation." },
  { subdomain: "mail.target.com",          issued: "2026-01-20", interesting: false, note: "Mail server. Less likely to have exploitable web attack surface." },
];

export function WebReconClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expandedRobots, setExpandedRobots] = useState<string | null>(null);
  const [expandedFfuf, setExpandedFfuf] = useState<string | null>(null);
  const [expandedCrt, setExpandedCrt] = useState<string | null>(null);
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
      setT1Error("Incorrect. Click the Disallow entries and look for the admin path.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "/.git/config") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Click each result row and read the analysis — one poses a CRITICAL risk.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "admin-staging.target.com") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Click the subdomains and check which one has the highest value note.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — robots.txt Discovery */}
      <TaskShell number={1} title="robots.txt Discovery" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The <code className="font-mono text-amber-300">robots.txt</code> file instructs crawlers
          which paths to skip — but <code className="font-mono text-amber-300">Disallow</code> entries act as a roadmap.
          Click each entry to understand why it is interesting.
        </p>

        <div className="rounded-lg bg-zinc-950 border border-white/8 overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-white/5 font-mono text-xs text-zinc-500">
            https://target.com/robots.txt
          </div>
          <div className="px-4 py-3 font-mono text-xs border-b border-white/5">
            <p className="text-zinc-500">User-agent: *</p>
          </div>
          <div className="divide-y divide-white/5">
            {ROBOTS_ENTRIES.map((r) => (
              <div key={r.path}>
                <button
                  className="w-full text-left px-4 py-2.5 font-mono text-xs hover:bg-white/3 transition-colors flex items-center gap-3 group"
                  onClick={() => setExpandedRobots(expandedRobots === r.path ? null : r.path)}
                >
                  <span className="text-zinc-500 shrink-0">Disallow:</span>
                  <span className={r.interesting ? "text-amber-300 flex-1" : "text-zinc-400 flex-1"}>{r.path}</span>
                  <span className="shrink-0 text-zinc-600 group-hover:text-zinc-400">
                    {expandedRobots === r.path ? "▲" : "▼"}
                  </span>
                </button>
                {expandedRobots === r.path && (
                  <div className="px-4 py-2.5 bg-zinc-900/60 border-t border-white/5 text-xs text-zinc-300 leading-relaxed">
                    {r.note}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-2.5 font-mono text-xs text-zinc-500">Allow: /</div>
          </div>
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
          ffuf discovers hidden paths. Click each result row to see the HTTP response and risk assessment.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-white/5 font-mono text-xs text-zinc-500">
            $ ffuf -w common.txt -u https://target.com/FUZZ — {FFUF_ROWS.length} results
          </div>
          <div className="divide-y divide-white/5">
            {FFUF_ROWS.map((row) => (
              <div key={row.path}>
                <button
                  className="w-full text-left px-4 py-2.5 font-mono text-xs hover:bg-white/3 transition-colors flex items-center gap-3 group"
                  onClick={() => setExpandedFfuf(expandedFfuf === row.path ? null : row.path)}
                >
                  <span className={`w-10 shrink-0 font-bold ${STATUS_COLORS[row.status] ?? "text-zinc-400"}`}>
                    {row.status}
                  </span>
                  <span className="text-amber-300 flex-1 truncate text-left">{row.path}</span>
                  <span className="text-zinc-600 text-[10px] shrink-0">{(row.size / 1024).toFixed(0)}KB</span>
                  <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${RISK_COLORS[row.risk]}`}>
                    {row.risk}
                  </span>
                  <span className="text-zinc-600 group-hover:text-zinc-400 shrink-0">
                    {expandedFfuf === row.path ? "▲" : "▼"}
                  </span>
                </button>
                {expandedFfuf === row.path && (
                  <div className="border-t border-white/5">
                    <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-zinc-900/50">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">HTTP Response</p>
                        <pre className="font-mono text-xs text-cyan-300 whitespace-pre-wrap leading-relaxed">{row.response}</pre>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Analysis</p>
                        <div className={`rounded border px-3 py-2 text-xs leading-relaxed ${RISK_COLORS[row.risk]}`}>
                          {row.analysis}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

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
          Certificate Transparency logs record every TLS certificate issued.
          Click each subdomain to evaluate its attack surface.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-white/5 font-mono text-xs text-zinc-500">
            crt.sh results for target.com
          </div>
          <div className="divide-y divide-white/5">
            {CRT_ROWS.map((row) => (
              <div key={row.subdomain}>
                <button
                  className="w-full text-left px-4 py-2.5 font-mono text-xs hover:bg-white/3 transition-colors flex items-center gap-3 group"
                  onClick={() => setExpandedCrt(expandedCrt === row.subdomain ? null : row.subdomain)}
                >
                  <span className={`flex-1 ${row.interesting ? "text-red-300" : "text-amber-300"}`}>{row.subdomain}</span>
                  <span className="text-zinc-500 shrink-0">{row.issued}</span>
                  {row.interesting && (
                    <span className="shrink-0 text-[9px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
                      interesting
                    </span>
                  )}
                  <span className="text-zinc-600 group-hover:text-zinc-400 shrink-0">
                    {expandedCrt === row.subdomain ? "▲" : "▼"}
                  </span>
                </button>
                {expandedCrt === row.subdomain && (
                  <div className={`px-4 py-2.5 border-t border-white/5 text-xs leading-relaxed ${
                    row.interesting ? "text-amber-300 bg-amber-950/10" : "text-zinc-400 bg-zinc-900/40"
                  }`}>
                    {row.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

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
