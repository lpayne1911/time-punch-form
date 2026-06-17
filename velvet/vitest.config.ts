import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests cover the pure, deterministic logic (no DB / network): moderation
// severity, billing entitlements, verification levels, webhook signatures, tag
// sanitization, and shop/event math.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
