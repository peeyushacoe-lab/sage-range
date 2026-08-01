import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * `npm test` runs the pure suites only.
 *
 * The integration specs create and delete rows in whatever DATABASE_URL points
 * at. Since .env now holds a production URL — which the seed and smoke scripts
 * need — an absent-minded `npm test` would otherwise write to the live
 * database. They are opt-in via `npm run test:integration`, which refuses
 * to run against a database that does not look like a test one.
 */
const INTEGRATION = [
  "**/__tests__/api/**",
  "**/src/app/api/**/__tests__/**",
  "**/__tests__/tickets.test.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", ...INTEGRATION],
    // Integration specs talk to a real Postgres; give them room to connect.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
