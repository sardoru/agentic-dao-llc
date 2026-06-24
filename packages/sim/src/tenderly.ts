import { type Address, numberToHex } from "viem";
import type { AssetDelta, SimulationResult, Simulator, TxRequest } from "./types";

/** A minimal fetch-shaped transport so the Tenderly client is unit-testable. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export interface TenderlyConfig {
  account: string;
  project: string;
  accessKey: string;
  chainId: number;
  /** Default `from` when a TxRequest omits one. */
  defaultFrom?: Address;
  /** Injectable transport (defaults to global fetch). */
  fetchImpl?: FetchLike;
}

/** Shape of the slice of the Tenderly response we consume (the API returns much more). */
interface TenderlyResponse {
  transaction?: {
    status?: boolean;
    gas_used?: number;
    error_message?: string;
    transaction_info?: {
      asset_changes?: Array<{
        token_info?: { contract_address?: string; symbol?: string };
        from?: string;
        to?: string;
        raw_amount?: string;
        amount?: string;
      }>;
    };
  };
  error?: { message?: string };
}

/**
 * Tenderly simulate-API backend (build spec §9 primary). POSTs the tx to
 * `/account/{acct}/project/{proj}/simulate` with the `X-Access-Key` header and maps
 * the response onto the uniform {@link SimulationResult}.
 */
export class TenderlySimulator implements Simulator {
  readonly backend = "tenderly" as const;
  private readonly cfg: TenderlyConfig;
  private readonly fetchImpl: FetchLike;

  constructor(cfg: TenderlyConfig) {
    this.cfg = cfg;
    const f = cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (!f) throw new Error("TenderlySimulator: no fetch implementation available");
    this.fetchImpl = f;
  }

  async simulate(tx: TxRequest): Promise<SimulationResult> {
    const url = `https://api.tenderly.co/api/v1/account/${this.cfg.account}/project/${this.cfg.project}/simulate`;
    const from = tx.from ?? this.cfg.defaultFrom;
    if (!from) throw new Error("TenderlySimulator: tx.from is required (no defaultFrom configured)");

    const body = {
      network_id: String(this.cfg.chainId),
      from,
      to: tx.to,
      input: tx.data ?? "0x",
      value: tx.value !== undefined ? numberToHex(tx.value) : "0x0",
      gas: tx.gas !== undefined ? Number(tx.gas) : 8_000_000,
      save: false,
      save_if_fails: false,
      simulation_type: "full",
    };

    let res;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Key": this.cfg.accessKey },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`TenderlySimulator: request failed: ${(err as Error).message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`TenderlySimulator: HTTP ${res.status} ${text}`.trim());
    }

    const json = (await res.json()) as TenderlyResponse;
    if (json.error) throw new Error(`TenderlySimulator: ${json.error.message ?? "unknown error"}`);

    const t = json.transaction;
    const success = t?.status === true;
    const assetChanges = (t?.transaction_info?.asset_changes ?? []).flatMap((c): AssetDelta[] => {
      const raw = c.raw_amount ?? c.amount;
      if (!raw) return [];
      const token = c.token_info?.contract_address as Address | undefined;
      const symbol = c.token_info?.symbol;
      const out: AssetDelta[] = [];
      if (c.from) out.push({ token, account: c.from as Address, delta: `-${raw}`, symbol });
      if (c.to) out.push({ token, account: c.to as Address, delta: raw, symbol });
      return out;
    });

    return {
      success,
      gasUsed: BigInt(t?.gas_used ?? 0),
      revertReason: success ? undefined : (t?.error_message ?? "reverted"),
      assetChanges: assetChanges.length ? assetChanges : undefined,
      backend: this.backend,
    };
  }
}

/** Read Tenderly config off an env bag; returns undefined when not fully configured. */
export function tenderlyConfigFromEnv(env: {
  TENDERLY_ACCOUNT?: string;
  TENDERLY_PROJECT?: string;
  TENDERLY_ACCESS_KEY?: string;
  CHAIN_ID?: string;
  defaultFrom?: Address;
  fetchImpl?: FetchLike;
}): TenderlyConfig | undefined {
  const { TENDERLY_ACCOUNT, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = env;
  if (!TENDERLY_ACCOUNT || !TENDERLY_PROJECT || !TENDERLY_ACCESS_KEY) return undefined;
  return {
    account: TENDERLY_ACCOUNT,
    project: TENDERLY_PROJECT,
    accessKey: TENDERLY_ACCESS_KEY,
    chainId: env.CHAIN_ID ? Number(env.CHAIN_ID) : 84532,
    defaultFrom: env.defaultFrom,
    fetchImpl: env.fetchImpl,
  };
}
