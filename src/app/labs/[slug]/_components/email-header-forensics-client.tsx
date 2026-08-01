"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, reportWrong } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * Email Header Forensics.
 *
 * A convincing supplier-impersonation message. Everything needed to call it is
 * in the headers: SPF/DKIM/DMARC results, the true originating host, and a
 * display name that does not match the envelope.
 */

const HEADERS = `Return-Path: <billing@northwind-finance.co>
Delivered-To: a.patel@meridian-health.uk
Received: from mx01.meridian-health.uk (10.30.1.4)
        by mbx03.meridian-health.uk with LMTP id 8Kd2Lm
        for <a.patel@meridian-health.uk>; Thu, 31 Jul 2026 09:14:22 +0100
Received: from vps-91224.hostwinds-cloud.net (198.51.100.203)
        by mx01.meridian-health.uk with ESMTPS id 4Wq0Zt
        (version=TLS1_2 cipher=ECDHE-RSA-AES256-GCM-SHA384)
        for <a.patel@meridian-health.uk>; Thu, 31 Jul 2026 09:14:19 +0100
Authentication-Results: mx01.meridian-health.uk;
        spf=fail (sender IP is 198.51.100.203)
          smtp.mailfrom=northwind-finance.co;
        dkim=none (message not signed);
        dmarc=fail (p=quarantine sp=quarantine) header.from=northwind-finance.com
From: "Northwind Finance — Accounts" <billing@northwind-finance.co>
Reply-To: <accounts.northwind@mailbox-secure.org>
To: <a.patel@meridian-health.uk>
Subject: Updated remittance details — invoice INV-88214 outstanding
Date: Thu, 31 Jul 2026 09:14:17 +0100
Message-ID: <20260731081417.9f2a1c@vps-91224.hostwinds-cloud.net>
X-Mailer: PHPMailer 6.8.0 (https://github.com/PHPMailer/PHPMailer)
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="b1_9f2a1c"`;

const BODY = `Dear Anita,

Please note our banking details have changed as of this week. The outstanding
balance on INV-88214 (£48,200.00) should now be remitted to:

    Account name : Northwind Finance Ltd
    Sort code    : 04-29-09
    Account no   : 88213004

Kindly confirm once processed. Apologies for any inconvenience.

Regards,
Michael Trent
Accounts Receivable, Northwind Finance Ltd`;

const LEGIT = `For reference — the genuine supplier domain on file:

  Domain on all previous invoices : northwind-finance.com
  Registered                      : 2011-03-04
  Usual sending host              : mail.northwind-finance.com (203.0.113.44)
  SPF record                      : v=spf1 include:_spf.northwind-finance.com -all
  DKIM                            : selector nw2024, always signed`;

function normalise(v: string): string {
  return v.trim().toLowerCase().replace(/^sage\{/, "").replace(/\}$/, "");
}

export function EmailHeaderForensicsClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1, setT1] = useState("");
  const [e1, setE1] = useState("");
  const [t2, setT2] = useState("");
  const [e2, setE2] = useState("");
  const [t3, setT3] = useState("");
  const [e3, setE3] = useState("");

  const done = (s: string) => completed.includes(s);

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function submitOne(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t1) === "198.51.100.203") {
      setE1("");
      void saveStage("task_1");
    } else {
      reportWrong(labId, "task_1");
      setE1("Read the Received chain from the bottom up — the earliest hop is the origin.");
    }
  }

  function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t2).replace(/^\./, "");
    if (v === "northwind-finance.co" || v === ".co" || v === "co") {
      setE2("");
      void saveStage("task_2");
    } else {
      reportWrong(labId, "task_2");
      setE2("Compare the sending domain against the genuine one, character by character.");
    }
  }

  function submitThree(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t3);
    if (v === "reply-to" || v === "replyto" || v === "reply to") {
      setE3("");
      void saveStage("task_3");
    } else {
      reportWrong(labId, "task_3");
      setE3("Which header would silently redirect the victim's reply elsewhere?");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Brief</p>
        <p className="mt-2 text-sm text-zinc-400">
          Accounts Payable escalated this before paying. £48,200 was nearly sent to a new
          account. Establish whether it is genuine using the headers alone.
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Full headers</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {HEADERS}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Message body</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-400">
          {BODY}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Known-good reference</p>
        <pre className="overflow-x-auto rounded-lg border border-sage-500/25 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-400">
          {LEGIT}
        </pre>
      </div>

      <TaskShell number={1} title="Where did it actually come from?" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          Ignore the From header — it is trivially forged. Give the IP of the host that
          actually submitted this message.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">
            Correct — 198.51.100.203, a rented VPS, not the supplier&apos;s mail server.
          </p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="ip address" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="Spot the lookalike domain" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          The sending domain is one character away from the real one. Give the domain the
          message was actually sent from.
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct — northwind-finance.co, not .com. Note the DMARC line evaluates
            header.from as the .com domain, which is why it fails.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="domain" className="w-80 max-w-full" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="The header that steals the conversation" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          Even a suspicious recipient who replies would be talking to the attacker. Name
          the header responsible.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — Reply-To points at mailbox-secure.org, an unrelated domain. SPF fail,
            DKIM none, DMARC fail, lookalike domain and a redirected reply: this is a
            textbook invoice-fraud attempt and should never have reached a mailbox.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="header name" />
            {e3 && <p className="mt-2 text-xs text-red-400">{e3}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_3" />
      </TaskShell>
    </div>
  );
}
