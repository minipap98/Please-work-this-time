import { defineConfig } from "vitest/config";

// Pure helpers only (no React Native imports); the app itself is checked by `tsc` and `expo export`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
