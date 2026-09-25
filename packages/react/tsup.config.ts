import { defineConfig } from "tsup";

const shared = { format: ["esm", "cjs"] as const, dts: true, sourcemap: true };

export default defineConfig([
  // Client entry: keep the directive so Next.js treats it as a client module
  // (esbuild strips directives from bundled source).
  { ...shared, entry: { index: "src/index.tsx" }, clean: true, banner: { js: '"use client";' } },
  { ...shared, entry: { server: "src/server.ts" } },
]);
