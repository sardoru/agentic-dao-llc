import type { Address, Hex } from "viem";
import { BaseSigner } from "./base";
import type { BaseTxFields } from "./types";

/**
 * Production custody target (Turnkey / KMS / HSM) behind the SAME policy-gated
 * `Signer` interface. Intentionally a stub: mainnet is explicitly gated on hardened
 * custody (build spec §8, §21), and shipping a half-built remote-signing path would
 * be worse than none. The policy guard in {@link BaseSigner} still applies the moment
 * this is implemented.
 */
export class TurnkeySigner extends BaseSigner {
  async address(): Promise<Address> {
    throw new Error("TurnkeySigner not implemented — mainnet is gated on hardened custody");
  }

  protected async signTxFields(_fields: BaseTxFields): Promise<Hex> {
    throw new Error("TurnkeySigner not implemented — mainnet is gated on hardened custody");
  }
}
