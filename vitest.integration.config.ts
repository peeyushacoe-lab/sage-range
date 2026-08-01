import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Integration suites — they create and delete rows in a real Postgres.
 *
 * Separate config rather than an env-var prefix so the command works the same
 * on Windows and macOS. scripts/run-integration-tests.mjs refuses to run against a
 * database that does not look like a throwaway one.
 *
 * Note: __tests__/api/hunts.test.ts additionally expects a dev server on
 * localhost:3000 — run `npm run dev` alongside it or those specs fail on
 * `fetch failed`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "__tests__/api/**/*.test.ts",
      "src/app/api/**/__tests__/**/*.test.ts",
      "__tests__/tickets.test.ts",
    ],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
