"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const EMAIL_HEADERS = `From: "IT Support" <support@micros0ft-helpdesk.com>
Reply-To: exfil@protonmail.com
X-Originating-IP: 91.108.4.33
Received: from mail.micros0ft-helpdesk.com (91.108.4.33)
Message-ID: <18a3bc@micros0ft-helpdesk.com>
Subject: Urgent: Your account has been compromised
Date: Wed, 01 Apr 2026 09:14:22 +0000`;

const WHOIS_OUTPUT = `Domain: micros0ft-helpdesk.com
Registrar: Namecheap
Creation Date: 2026-04-01
Registrant Country: RU
Name Server: ns1.bulletproof-hosting.biz
Name Server: ns2.bulletproof-hosting.biz
DNSSEC: unsigned`;

const PIVOT_DOMAINS = [
  { domain: "micros0ft-helpdesk.com", ns: "ns1.bulletproof-hosting.biz" },
  { domain: "paypa1-verify.net",      ns: "ns1.bulletproof-hosting.biz" },
  { domain: "g00gle-accounts.org",    ns: "ns1.bulletproof-hosting.biz" },
  { domain: "amazon-sec-alert.co",    ns: "ns1.bulletproof-hosting.biz" },
];

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function OsintInvestigationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Answer, setT3Answer] = useState("");
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
    if (checkFlag(t1Answer, "SAGE{91.108.4.33}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look for the X-Originating-IP header value.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{ns1.bulletproof-hosting.biz}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Check the Name Server field in the WHOIS output.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{4_d0m41ns_s4me_1nfr4}") || t3Answer.trim() === "4") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Count all domains sharing the nameserver infrastructure.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Email Header Analysis" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          A phishing email was received by an employee. Analyze the raw email headers
          to identify the true originating IP address.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{EMAIL_HEADERS}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          The <span className="font-mono text-amber-300">X-Originating-IP</span> and{" "}
          <span className="font-mono text-amber-300">Received:</span> headers reveal the true sender IP.
        </p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the originating IP of this phishing email?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — originating IP identified. Flag: SAGE&#123;91.108.4.33&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Domain Registration Lookup" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Pivot from the phishing domain. A WHOIS lookup on the sender domain reveals
          suspicious registration details.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{WHOIS_OUTPUT}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Bulletproof hosting providers are commonly used by threat actors to resist law-enforcement takedowns.
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What nameserver is used by this malicious domain?</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — bulletproof NS identified. Flag: SAGE&#123;ns1.bulletproof-hosting.biz&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Infrastructure Pivot" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          A passive DNS lookup reveals additional domains sharing the same nameserver.
          This technique exposes the full phishing infrastructure.
        </p>
        <div className="overflow-x-auto rounded-lg border border-white/8 mb-4">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">Domain</th>
                <th className="px-3 py-2 text-left text-zinc-500">Nameserver</th>
              </tr>
            </thead>
            <tbody>
              {PIVOT_DOMAINS.map((d, i) => (
                <tr key={i} className="border-b border-white/5 text-amber-300">
                  <td className="px-3 py-2">{d.domain}</td>
                  <td className="px-3 py-2 text-red-400">{d.ns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">
              How many phishing domains share this nameserver infrastructure?
            </p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="Enter number or SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 4 domains share the same bulletproof NS. Flag: SAGE&#123;4_d0m41ns_s4me_1nfr4&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;91.108.4.33&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;ns1.bulletproof-hosting.biz&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4_d0m41ns_s4me_1nfr4&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
