import { http, type Address, type Hex, type StateOverride, createPublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import type { SimulationResult, Simulator, TxRequest } from "./types";

/** The slice of a viem public client the fork simulator needs (eases mocking). */
export interface CallClient {
  call(args: {
    account?: Address;
    to: Address;
    data?: Hex;
    value?: bigint;
    gas?: bigint;
    stateOverride?: StateOverride;
  }): Promise<{ data?: Hex }>;
  estimateGas(args: {
    account?: Address;
    to: Address;
    data?: Hex;
    value?: bigint;
  }): Promise<bigint>;
}

export interface AnvilForkConfig {
  /** RPC URL of an `anvil --fork-url <base-sepolia>` node, or the live RPC for read-only eth_call. */
  rpcUrl: string;
  chainId?: number;
  defaultFrom?: Address;
  /** State overrides applied to every call (e.g. fund the agent so the call doesn't revert on gas). */
  stateOverride?: StateOverride;
  /** Injectable client for tests; built from rpcUrl when omitted. */
  client?: CallClient;
}

/**
 * Offline-friendly fallback backend (build spec §9). Forks Base Sepolia with
 * `anvil --fork-url` (or points at any RPC) and dry-runs via `eth_call` + optional
 * state overrides. `eth_call` reverting maps to `success:false` with the decoded
 * reason; gas is estimated separately so a successful call still reports gasUsed.
 */
export class AnvilForkSimulator implements Simulator {
  readonly backend = "anvil-fork" as const;
  private readonly client: CallClient;
  private readonly cfg: AnvilForkConfig;

  constructor(cfg: AnvilForkConfig) {
    this.cfg = cfg;
    this.client =
      cfg.client ??
      (createPublicClient({
        chain:
          cfg.chainId === baseSepolia.id || cfg.chainId === undefined
            ? baseSepolia
            : { ...baseSepolia, id: cfg.chainId },
        transport: http(cfg.rpcUrl),
      }) as unknown as CallClient);
  }

  async simulate(tx: TxRequest): Promise<SimulationResult> {
    const from = tx.from ?? this.cfg.defaultFrom;
    const common = { account: from, to: tx.to, data: tx.data, value: tx.value } as const;

    try {
      await this.client.call({ ...common, gas: tx.gas, stateOverride: this.cfg.stateOverride });
    } catch (err) {
      return {
        success: false,
        gasUsed: 0n,
        revertReason: extractRevertReason(err),
        backend: this.backend,
      };
    }

    // Call succeeded — best-effort gas estimate (don't fail the sim if estimation can't run).
    let gasUsed = 0n;
    try {
      gasUsed = await this.client.estimateGas(common);
    } catch {
      gasUsed = 0n;
    }

    return { success: true, gasUsed, backend: this.backend };
  }
}

/** Pull a human revert reason out of a thrown viem/RPC error. */
export function extractRevertReason(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { shortMessage?: string; details?: string; message?: string };
    return e.shortMessage ?? e.details ?? e.message ?? "reverted";
  }
  return String(err);
}

/** Read anvil-fork config off an env bag (always available as the fallback). */
export function anvilForkConfigFromEnv(env: {
  ANVIL_FORK_RPC_URL?: string;
  RPC_URL?: string;
  CHAIN_ID?: string;
  defaultFrom?: Address;
  stateOverride?: StateOverride;
  client?: CallClient;
}): AnvilForkConfig {
  const rpcUrl = env.ANVIL_FORK_RPC_URL ?? env.RPC_URL ?? "https://sepolia.base.org";
  return {
    rpcUrl,
    chainId: env.CHAIN_ID ? Number(env.CHAIN_ID) : 84532,
    defaultFrom: env.defaultFrom,
    stateOverride: env.stateOverride,
    client: env.client,
  };
}
