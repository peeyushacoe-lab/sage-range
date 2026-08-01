"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * Build Pipeline Compromise — INSANE.
 *
 * Nothing here is anomalous in isolation. The finding only exists once the
 * learner correlates three sources: a published artefact whose hash does not
 * match what the build produced, a dependency resolved from the wrong registry,
 * and a runner step that ran outside the committed pipeline definition.
 */

const BUILD_LOG = `CI build #4471 — release/2.8.0 — runner ci-linux-07
--------------------------------------------------------------
09:02:11  Checkout 8f3c1a2 (release/2.8.0)
09:02:19  Restoring cache: node_modules-8f3c1a2
09:02:44  npm ci --ignore-scripts
09:03:51    added 1,204 packages in 67s
09:03:52  npm run build
09:05:30    build succeeded — dist/app.bundle.js (1,884,112 bytes)
09:05:31  sha256sum dist/app.bundle.js
09:05:31    b1e77c3f0a94d2856ec1f0a3b9d47215c6a8e0f31d92b4c7a508e6f1237d4b9a
09:05:33  [step: post-build-optimise]
09:05:33    fetching https://cdn.build-tools-cache.io/opt.js
09:06:12    optimisation complete — dist/app.bundle.js (1,891,904 bytes)
09:06:14  Publishing artefact to registry
09:06:40    published sha256 4a7e2b91d0c53f8a6e2b4d17c9f0a385b6d1e04c72a9f38b05e1c6a2d947f083
09:06:41  Build succeeded`;

const PIPELINE_YAML = `# .ci/pipeline.yml — as committed at 8f3c1a2
stages:
  - install
  - build
  - publish

install:
  script:
    - npm ci --ignore-scripts

build:
  script:
    - npm run build
    - sha256sum dist/app.bundle.js

publish:
  script:
    - ci-publish dist/app.bundle.js

# (no post-build-optimise stage is defined in this file)`;

const DEPS = `npm ci resolution report (abridged)

  react@18.3.1              registry.npmjs.org        ok
  next@15.2.4               registry.npmjs.org        ok
  lodash@4.17.21            registry.npmjs.org        ok
  @corp/ui-kit@2.4.0        registry.npmjs.org        ok   <-- internal package name
  @corp/telemetry@9.9.9     registry.npmjs.org        ok   <-- internal package name
  zod@3.23.8                registry.npmjs.org        ok

Internal registry (npm.corp.internal) versions on file:
  @corp/ui-kit      2.4.0
  @corp/telemetry   1.2.7     (9.9.9 does not exist internally)`;

const REGISTRY = `Published artefact — release 2.8.0

  Artefact sha256 : 4a7e2b91d0c53f8a6e2b4d17c9f0a385b6d1e04c72a9f38b05e1c6a2d947f083
  Build-log sha256: b1e77c3f0a94d2856ec1f0a3b9d47215c6a8e0f31d92b4c7a508e6f1237d4b9a
  Size at build   : 1,884,112 bytes
  Size published  : 1,891,904 bytes
  Signed by       : ci-linux-07 (valid)
  Reproducible    : NO — rebuild from 8f3c1a2 yields b1e77c3f...`;

function normalise(v: string): string {
  return v.trim().toLowerCase().replace(/^sage\{/, "").replace(/\}$/, "");
}

export function BuildPipelineCompromiseClient({
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
    const v = normalise(t1);
    if (v === "post-build-optimise" || v === "post build optimise") {
      setE1("");
      void saveStage("task_1");
    } else {
      setE1("Compare the build log against the committed pipeline definition. Name the step that should not exist.");
    }
  }

  function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t2).replace(/@9\.9\.9$/, "");
    if (v === "@corp/telemetry" || v === "corp/telemetry") {
      setE2("");
      void saveStage("task_2");
    } else {
      setE2("An internal package was resolved from a public registry at a version that does not exist internally.");
    }
  }

  function submitThree(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t3);
    if (v.startsWith("b1e77c3f")) {
      setE3("");
      void saveStage("task_3");
    } else {
      setE3("Which hash represents the artefact the source actually produces?");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-[10px] uppercase tracking-widest text-red-400">Brief — INSANE</p>
        <p className="mt-2 text-sm text-zinc-400">
          Release 2.8.0 shipped to 40,000 customers yesterday. A downstream user reports
          the bundle contacting a host nobody recognises. The build is green, signed, and
          nothing in isolation looks wrong. Prove what happened using only these four
          sources.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Build log</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
            {BUILD_LOG}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Committed pipeline</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
            {PIPELINE_YAML}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Dependency resolution</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
            {DEPS}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Registry record</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
            {REGISTRY}
          </pre>
        </div>
      </div>

      <TaskShell number={1} title="The step that was never committed" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          The build ran something the repository does not define. Name the step.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">
            Correct — post-build-optimise. It fetched a script from an external host and
            rewrote the bundle after the hash was taken. The order is the attack: hash,
            then modify, then publish.
          </p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="step name" className="w-80 max-w-full" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="Dependency confusion" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          One internal package was resolved from the public registry. Name it.
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct — @corp/telemetry. Version 9.9.9 does not exist internally; an attacker
            published a higher version publicly and the resolver preferred it. This is how
            the malicious step reached the runner in the first place.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="package name" className="w-80 max-w-full" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="Prove the artefact was altered" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          Give the first eight characters of the hash the source actually produces — the
          one a clean rebuild reproduces, not the one that shipped.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — b1e77c3f. The published artefact is 4a7e2b91 and 7,792 bytes larger.
            The signature is valid because the runner signed what it was given, which is
            precisely why a valid signature is not evidence of integrity. Reproducible
            builds are what would have caught this at publish time.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="first 8 hex chars" />
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
