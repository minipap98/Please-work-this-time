import { defineConfig } from "vitest/config";

// Shared code must run anywhere: the tests run in Node with no DOM so a browser
// API slipping in fails here before it reaches the mobile app.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{spec,test}.ts"],
  },
});
