import { readFileSync } from "node:fs";
import { getAddress, type Address } from "viem";
import { type Mandate, validateMandate } from "@agentic-dao/policy";
import { loadChainConfig, makeContracts, makePublicClient } from "@agentic-dao/chain";
import { makeSimulator } from "@agentic-dao/sim";
import { makeSigner } from "@agentic-dao/signer";
import { GovernanceCore } from "./core";
import { IndexerClient, indexerUrlFromEnv } from "./indexer";
import { type IpfsClient, StubIpfsClient } from "./ipfs";

/**
 * Env the runtime reads to assemble the chokepoint — an explicit superset of every
 * per-package env bag (chain / sim / signer / indexer) so it structurally overlaps
 * each consumer (avoids TS's excess-/weak-type checks) while staying a string record.
 */
export type RuntimeEnv = {
  // runtime-specific
  MANDATE_PATH?: string;
  AGENT_ACCOUNT?: string;
  IPFS_PROVIDER?: string;
  IPFS_TOKEN?: string;
  RATIFICATION_BASE_URL?: string;
  // chain
  RPC_URL?: string;
  CHAIN_ID?: string;
  MEMBERSHIP_TOKEN?: string;
  GOVERNOR?: string;
  TIMELOCK?: string;
  AGENT_REGISTRY?: string;
  ROLES_MODIFIER?: string;
  TREASURY_SAFE?: string;
  GUARDIAN_SAFE?: string;
  RATIONALE_ANCHOR?: string;
  // sim
  TENDERLY_ACCOUNT?: string;
  TENDERLY_PROJECT?: string;
  TENDERLY_ACCESS_KEY?: string;
  ANVIL_FORK_RPC_URL?: string;
  // signer
  SIGNER_BACKEND?: string;
  SIGNER_PRIVATE_KEY?: string;
  // indexer
  INDEXER_URL?: string;
  NEXT_PUBLIC_INDEXER_URL?: string;
} & Record<string, string | undefined>;

/** Load + structurally validate a mandate JSON doc from disk. */
export function loadMandate(path: string): Mandate {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = validateMandate(raw);
  if (!result.valid) {
    throw new Error(`Invalid mandate at ${path}:\n  - ${result.errors.join("\n  - ")}`);
  }
  return raw as Mandate;
}

/**
 * Pick the IPFS client. Real Pinata/web3.storage live behind {@link IpfsClient},
 * env-gated; until credentials + a real client are wired (tracked as a GitHub issue)
 * the deterministic {@link StubIpfsClient} runs so the full pin→hash→anchor path works.
 */
export function makeIpfsClient(env: RuntimeEnv): IpfsClient {
  // Real providers are not yet implemented; always return the stub for now.
  // When implemented: if (env.IPFS_PROVIDER === "pinata" && env.IPFS_TOKEN) return new PinataClient(...)
  void env;
  return new StubIpfsClient();
}

/**
 * Assemble the {@link GovernanceCore} from env. Used by BOTH the MCP server and the
 * CLI so the two never diverge (build spec §12). Throws with a clear message if the
 * mandate path / agent account are missing — the chokepoint must not start half-wired.
 */
export function buildCore(env: RuntimeEnv = process.env): GovernanceCore {
  const mandatePath = env.MANDATE_PATH;
  if (!mandatePath)
    throw new Error("MANDATE_PATH is not set — point it at the agent's mandate JSON doc.");
  const mandate = loadMandate(mandatePath);

  const agentAccount: Address = env.AGENT_ACCOUNT
    ? getAddress(env.AGENT_ACCOUNT)
    : mandate.agentAccount;

  const config = loadChainConfig(env);
  const publicClient = makePublicClient(config);
  const contracts = makeContracts(publicClient, config.addresses);

  return new GovernanceCore({
    indexer: new IndexerClient({ baseUrl: indexerUrlFromEnv(env) }),
    simulator: makeSimulator(env),
    signer: makeSigner(env),
    ipfs: makeIpfsClient(env),
    contracts,
    mandate,
    agentAccount,
    txDefaults: { chainId: config.chainId },
    ratificationBaseUrl: env.RATIFICATION_BASE_URL,
  });
}
