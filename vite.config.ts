import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { normalizeBasePath } from "./scripts/base-path.ts";

const APP_VERSION = readFileSync(new URL("./VERSION", import.meta.url), "utf8").trim();

// The build reads BASE_PATH so one artifact serves at "/", under a project
// subpath and on a custom domain. `--mode test` adds the harness entry; a
// production build never emits it.
export default defineConfig(({ mode }) => {
  const testMode = mode === "test";
  return {
    base: normalizeBasePath(process.env.BASE_PATH),
    publicDir: "public",
    plugins: [tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: testMode
        ? {
            preserveEntrySignatures: "strict",
            input: { index: "index.html", tests: "src/entry/test-entry.ts" },
            output: {
              entryFileNames: (chunk) =>
                chunk.name === "tests" ? "test-entry.js" : "assets/[name]-[hash].js",
            },
          }
        : undefined,
    },
  };
});
