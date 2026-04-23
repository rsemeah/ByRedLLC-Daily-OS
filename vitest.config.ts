import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    // `server-only` throws outside Next.js; resolve it to a no-op for tests.
    alias: {
      "server-only": resolve(__dirname, "tests/helpers/server-only-stub.ts"),
      "@": resolve(__dirname),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/monday/**/*.ts",
        "lib/rate-limit.ts",
        "lib/observability/**/*.ts",
      ],
    },
    testTimeout: 10_000,
  },
})
