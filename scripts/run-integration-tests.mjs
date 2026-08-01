/**
 * Runner for the integration suites.
 *
 * The guard lives here rather than in a vitest setup file because npm
 * guarantees the working directory for a package script, whereas a vitest
 * worker does not — and a guard that silently fails to find .env would wave
 * the run through, which is the one outcome that must not happen.
 *
 * These specs create and delete rows. Running them against production means
 * test fixtures appearing in and disappearing from live data.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    const matches = [
      ...readFileSync(file, "utf8").matchAll(/^\s*DATABASE_URL\s*=\s*(.*)$/gm),
    ];
    // Last non-empty wins, matching how dotenv and node --env-file resolve a
    // duplicated key. Taking the first would pick up an empty placeholder and
    // silently conclude there is no database configured.
    for (let i = matches.length - 1; i >= 0; i--) {
      const value = matches[i][1].trim().replace(/^["']|["']$/g, "");
      if (value) return value;
    }
  }
  return "";
}

/** A database whose name or host mentions test/dev/local is treated as safe. */
function looksLikeTestDatabase(url) {
  return /(^|[^a-z])(test|dev|local|staging|scratch)([^a-z]|$)/i.test(url);
}

const url = resolveDatabaseUrl();

if (!url) {
  console.error(
    "\nIntegration tests need DATABASE_URL. Point it at a scratch database, not production.\n",
  );
  process.exit(1);
}

if (!looksLikeTestDatabase(url) && process.env.ALLOW_PROD_DB_TESTS !== "1") {
  // Redact credentials before echoing anything back.
  const host = url.replace(/^.*@/, "").replace(/\?.*$/, "");
  console.error(
    [
      "",
      "Refusing to run integration tests against this database.",
      `  target: ${host}`,
      "",
      "These specs write and delete rows. Nothing about that URL says test,",
      "dev, local, staging or scratch, so it is being treated as production.",
      "",
      "  • point DATABASE_URL at a scratch database, or",
      "  • set ALLOW_PROD_DB_TESTS=1 if you really mean it",
      "",
      "Note: __tests__/api/hunts.test.ts also needs `npm run dev` running,",
      "since it makes real HTTP calls to localhost:3000.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--config", "vitest.integration.config.ts"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
);

child.on("exit", (code) => process.exit(code ?? 1));
