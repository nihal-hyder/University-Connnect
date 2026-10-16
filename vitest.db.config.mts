import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Database authorisation tests. They run against the LOCAL Supabase stack
 * (`npm run db:start` + `npm run db:reset`) using the seeded demo accounts,
 * and refuse to run against any non-local URL.
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    setupFiles: ["tests/support/load-env.ts"],
  },
});
