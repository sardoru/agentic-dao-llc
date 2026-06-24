import { type Address, type Hex, type PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BaseSigner } from "./base";
import type { BaseTxFields } from "./types";

export interface LocalSignerConfig {
  /** 0x-prefixed 32-byte private key. DEV ONLY — never a mainnet key (build spec §8, §18). */
  privateKey: Hex;
}

/**
 * Dev signer: an in-process viem account from a private key, behind the same
 * policy-gated {@link BaseSigner}. The key lives in env/keystore and is never
 * passed into the agent brain's context — the brain only ever requests a signature.
 *
 * Production swaps this for Turnkey/KMS behind the identical `Signer` interface;
 * mainnet is explicitly gated on that hardened custody (build spec §21).
 */
export class LocalSigner extends BaseSigner {
  private readonly account: PrivateKeyAccount;

  constructor(cfg: LocalSignerConfig) {
    super();
    if (!/^0x[0-9a-fA-F]{64}$/.test(cfg.privateKey)) {
      throw new Error("LocalSigner: SIGNER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
    }
    this.account = privateKeyToAccount(cfg.privateKey);
  }

  async address(): Promise<Address> {
    return this.account.address;
  }

  protected async signTxFields(fields: BaseTxFields): Promise<Hex> {
    // EIP-1559 (type-2) transaction. Caller supplies nonce + gas + fees + chainId.
    return this.account.signTransaction({
      type: "eip1559",
      to: fields.to,
      data: fields.data ?? "0x",
      value: fields.value ?? 0n,
      nonce: fields.nonce,
      gas: fields.gas,
      maxFeePerGas: fields.maxFeePerGas,
      maxPriorityFeePerGas: fields.maxPriorityFeePerGas,
      chainId: fields.chainId,
    });
  }
}

/**
 * Build a LocalSigner from env. Reads `SIGNER_PRIVATE_KEY` (dev). Encrypted-keystore
 * decryption (`SIGNER_KEYSTORE_PATH` + `SIGNER_KEYSTORE_PASSWORD`) is a documented
 * TODO — see GitHub issue "signer: encrypted keystore decryption" — and intentionally
 * not implemented here so no half-built key handling ships.
 */
export function localSignerFromEnv(env: { SIGNER_PRIVATE_KEY?: string } = process.env): LocalSigner {
  const pk = env.SIGNER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "LocalSigner: SIGNER_PRIVATE_KEY is not set. DEV ONLY — set a Base Sepolia test key; never a mainnet key.",
    );
  }
  return new LocalSigner({ privateKey: pk as Hex });
}
