import type { Address, StateOverride } from "viem";
import { AnvilForkSimulator, type CallClient, anvilForkConfigFromEnv } from "./anvilFork";
import { TenderlySimulator, type FetchLike, tenderlyConfigFromEnv } from "./tenderly";
import type { Simulator } from "./types";

/** Full env bag `makeSimulator` understands. */
export interface SimEnv {
  // Tenderly (primary)
  TENDERLY_ACCOUNT?: string;
  TENDERLY_PROJECT?: string;
  TENDERLY_ACCESS_KEY?: string;
  // anvil-fork (fallback)
  ANVIL_FORK_RPC_URL?: string;
  RPC_URL?: string;
  CHAIN_ID?: string;
  // shared / injectables (tests)
  defaultFrom?: Address;
  stateOverride?: StateOverride;
  fetchImpl?: FetchLike;
  client?: CallClient;
}

/**
 * Pick the simulation backend: Tenderly when fully configured (TENDERLY_ACCOUNT
 * + PROJECT + ACCESS_KEY), otherwise the offline anvil-fork fallback. This is the
 * single entry point the MCP server and CLI use so both simulate identically.
 */
export function makeSimulator(env: SimEnv = process.env as SimEnv): Simulator {
  const tenderly = tenderlyConfigFromEnv(env);
  if (tenderly) return new TenderlySimulator(tenderly);
  return new AnvilForkSimulator(anvilForkConfigFromEnv(env));
}
