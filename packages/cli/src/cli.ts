#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { buildCli } from "./program";

// Load .env (build spec §12: the CLI loads .env via dotenv). Never commit real secrets.
loadEnv();

buildCli()
  .parseAsync(process.argv)
  .catch((err) => {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  });
