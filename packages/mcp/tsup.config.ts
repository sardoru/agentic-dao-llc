import { defineConfig } from "tsup";

export default defineConfig({
  // server.ts is the bin entry (build spec §11); index.ts is the library surface.
  entry: ["src/index.ts", "src/server.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
});
