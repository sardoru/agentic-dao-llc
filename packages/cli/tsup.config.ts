import { defineConfig } from "tsup";

export default defineConfig({
  // cli.ts is the bin entry (build spec §12); index.ts is the library surface.
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
});
