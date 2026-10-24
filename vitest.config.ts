import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // allow importing server modules (dodo-sync → supabase/admin) in tests
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
