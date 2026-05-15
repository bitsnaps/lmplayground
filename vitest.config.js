import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["netlify/functions/**/*.js"],
    },
  },
  resolve: {
    alias: {
      // Allow tests to import from function source
    },
  },
});
