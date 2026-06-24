import { type Address, type Chain, getAddress, isAddress } from "viem";
import { baseSepolia } from "viem/chains";

/** The eight constitutional contract addresses, loaded from env. */
export interface ContractAddresses {
  membershipToken?: Address;
  governor?: Address;
  timelock?: Address;
  agentRegistry?: Address;
  rolesModifier?: Address;
  treasurySafe?: Address;
  guardianSafe?: Address;
  rationaleAnchor?: Address;
}

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  chain: Chain;
  addresses: ContractAddresses;
}

/** The process-env shape this package reads. Pass any subset; missing values stay undefined. */
export interface ChainEnv {
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
}

/** Parse an optional checksummed address from env; undefined if blank, throws if malformed. */
function optAddress(name: string, value: string | undefined): Address | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (!isAddress(value)) throw new Error(`${name} is not a valid address: ${value}`);
  return getAddress(value);
}

/**
 * Resolve a viem chain object from the configured chain id. v1 targets Base Sepolia
 * (84532); the spec keeps chain config swappable, so an unknown id falls back to a
 * minimal custom Chain rather than throwing — addresses + RPC still drive everything.
 */
export function resolveChain(chainId: number, rpcUrl: string): Chain {
  if (chainId === baseSepolia.id) return baseSepolia;
  return {
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    testnet: true,
  };
}

/** Build the chain config from an env bag (defaults to Base Sepolia / public RPC). */
export function loadChainConfig(env: ChainEnv = process.env as ChainEnv): ChainConfig {
  const rpcUrl =
    env.RPC_URL && env.RPC_URL.trim() !== "" ? env.RPC_URL : "https://sepolia.base.org";
  const chainId =
    env.CHAIN_ID && env.CHAIN_ID.trim() !== "" ? Number(env.CHAIN_ID) : baseSepolia.id;
  if (!Number.isInteger(chainId) || chainId <= 0)
    throw new Error(`CHAIN_ID must be a positive integer, got: ${env.CHAIN_ID}`);

  return {
    rpcUrl,
    chainId,
    chain: resolveChain(chainId, rpcUrl),
    addresses: {
      membershipToken: optAddress("MEMBERSHIP_TOKEN", env.MEMBERSHIP_TOKEN),
      governor: optAddress("GOVERNOR", env.GOVERNOR),
      timelock: optAddress("TIMELOCK", env.TIMELOCK),
      agentRegistry: optAddress("AGENT_REGISTRY", env.AGENT_REGISTRY),
      rolesModifier: optAddress("ROLES_MODIFIER", env.ROLES_MODIFIER),
      treasurySafe: optAddress("TREASURY_SAFE", env.TREASURY_SAFE),
      guardianSafe: optAddress("GUARDIAN_SAFE", env.GUARDIAN_SAFE),
      rationaleAnchor: optAddress("RATIONALE_ANCHOR", env.RATIONALE_ANCHOR),
    },
  };
}

/** Assert a required address is configured, with a clear error naming the env var. */
export function requireAddress(
  addresses: ContractAddresses,
  key: keyof ContractAddresses,
  envName: string,
): Address {
  const addr = addresses[key];
  if (!addr) throw new Error(`${envName} is not set — deploy Phase 1/2 contracts and fill .env`);
  return addr;
}
