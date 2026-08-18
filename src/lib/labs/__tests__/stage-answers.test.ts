import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { STAGE_ANSWERS, checkStageAnswer } from "../stage-answers";

const LAB_COMPONENTS = join(process.cwd(), "src/app/labs/[slug]/_components");

describe("lab stage answers", () => {
  it("accepts the canonical answer for every keyed stage", () => {
    const rejected: string[] = [];
    for (const [slug, stages] of Object.entries(STAGE_ANSWERS)) {
      for (const [stage, key] of Object.entries(stages)) {
        if (!key.any) continue;
        for (const clause of key.any) {
          // Every clause that names a specific answer has to accept it.
          const candidate =
            clause.flag ??
            clause.exact?.[0] ??
            (clause.includes ? clause.includes.join(" ") : undefined) ??
            clause.prefix;
          if (candidate === undefined) continue;
          if (!checkStageAnswer(slug, stage, candidate).correct) {
            rejected.push(`${slug}/${stage}: ${candidate}`);
          }
        }
      }
    }
    expect(rejected).toEqual([]);
  });

  it("rejects an answer that is simply wrong", () => {
    for (const [slug, stages] of Object.entries(STAGE_ANSWERS)) {
      for (const [stage, key] of Object.entries(stages)) {
        if (!key.any) continue;
        expect(checkStageAnswer(slug, stage, "definitely not the answer").correct).toBe(false);
      }
    }
  });

  it("only reveals a flag once the answer is right", () => {
    const [slug, stages] = Object.entries(STAGE_ANSWERS).find(([, s]) =>
      Object.values(s).some((k) => k.reveal && k.any?.[0]?.flag),
    )!;
    const [stage, key] = Object.entries(stages).find(([, k]) => k.reveal && k.any?.[0]?.flag)!;
    expect(checkStageAnswer(slug, stage, "wrong").reveal).toBeUndefined();
    expect(checkStageAnswer(slug, stage, key.any![0].flag!).reveal).toBe(key.reveal);
  });

  it("keeps the answer key out of the client bundle", () => {
    // A "use client" file that imports this module would ship every flag in the
    // range to the browser — the exact problem the module exists to fix. Match
    // the import itself, not the name: the components reference the path in
    // comments explaining where the answers went.
    const IMPORTS_KEY = /(?:from|import\()\s*["'][^"']*stage-answers["']/;
    const offenders = readdirSync(LAB_COMPONENTS)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => {
        const source = readFileSync(join(LAB_COMPONENTS, f), "utf8");
        return source.includes('"use client"') && IMPORTS_KEY.test(source);
      });
    expect(offenders).toEqual([]);
  });

  it("leaves no flag literals in the lab components", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(LAB_COMPONENTS).filter((f) => f.endsWith(".tsx"))) {
      const source = readFileSync(join(LAB_COMPONENTS, file), "utf8");
      for (const match of source.matchAll(/SAGE(?:&#123;|\{)([^{}&]*?)(?:&#125;|\})/g)) {
        const inner = match[1];
        // Placeholders and the deliberately planted flag in the beginner CTF —
        // finding that one in the page source is the whole exercise.
        if (inner === "..." || inner === "…" || inner === "") continue;
        if (file === "welcome-ctf-client.tsx") continue;
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
