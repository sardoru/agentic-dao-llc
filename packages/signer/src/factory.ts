import { LocalSigner, localSignerFromEnv } from "./local";
import { TurnkeySigner } from "./turnkey";
import type { Signer } from "./types";

export interface SignerEnv {
  SIGNER_BACKEND?: string; // local | turnkey | kms
  SIGNER_PRIVATE_KEY?: string;
}

/**
 * Pick the signing backend from env. `local` (dev) is the only working backend in
 * v1; `turnkey`/`kms` return the stub and throw on use, so a mainnet attempt fails
 * loudly rather than silently using a dev key (build spec §8, §18).
 */
export function makeSigner(env: SignerEnv = process.env): Signer {
  const backend = (env.SIGNER_BACKEND ?? "local").toLowerCase();
  switch (backend) {
    case "local":
      return localSignerFromEnv(env);
    case "turnkey":
    case "kms":
      return new TurnkeySigner();
    default:
      throw new Error(`Unknown SIGNER_BACKEND '${backend}' (expected local | turnkey | kms)`);
  }
}

export { LocalSigner, TurnkeySigner };
