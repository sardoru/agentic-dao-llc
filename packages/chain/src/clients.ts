import {
  http,
  createPublicClient,
  createWalletClient,
  type Account,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { type ChainConfig, type ChainEnv, loadChainConfig } from "./env";

/**
 * A read-only viem public client for the configured chain. Used by every call
 * helper that reads on-chain state (votes, quorum, proposal state, mandates).
 */
export function makePublicClient(config: ChainConfig): PublicClient<Transport, Chain> {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

/**
 * A wallet client for a given account. The account itself is supplied by the
 * signer package (key isolation) — this factory only binds chain + transport.
 * Callers still build, sign, and broadcast through the policy-gated Signer; this
 * is the low-level viem handle for that.
 */
export function makeWalletClient(config: ChainConfig, account: Account): WalletClient<Transport, Chain, Account> {
  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

/** Convenience: load env + build a public client in one call. */
export function publicClientFromEnv(env: ChainEnv = process.env as ChainEnv): {
  config: ChainConfig;
  client: PublicClient<Transport, Chain>;
} {
  const config = loadChainConfig(env);
  return { config, client: makePublicClient(config) };
}
