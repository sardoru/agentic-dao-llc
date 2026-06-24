import { createConfig } from "ponder";
import { MembershipTokenAbi } from "./abis/MembershipToken.js";
import { DaoGovernorAbi } from "./abis/DaoGovernor.js";
import { TimelockControllerAbi } from "./abis/TimelockController.js";
import { AgentRegistryAbi } from "./abis/AgentRegistry.js";
import { RolesModifierAbi } from "./abis/RolesModifier.js";
import { RationaleAnchorAbi } from "./abis/RationaleAnchor.js";

// Base Sepolia chainId = 84532
// All addresses come from env; fall back to zero address so the app
// typechecks and codegen passes even when contracts are not yet deployed.
const ZERO = "0x0000000000000000000000000000000000000000" as const;

const addr = (key: string) => (process.env[key] as `0x${string}` | undefined) ?? ZERO;

// Small startBlock so Ponder starts scanning from a known safe point rather
// than block 0 (Base Sepolia genesis).  Override with env PONDER_START_BLOCK.
const START_BLOCK = process.env["PONDER_START_BLOCK"]
  ? Number(process.env["PONDER_START_BLOCK"])
  : 10_000_000;

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      rpc: process.env["PONDER_RPC_URL_84532"] ?? "https://sepolia.base.org",
    },
  },
  contracts: {
    MembershipToken: {
      chain: "baseSepolia",
      abi: MembershipTokenAbi,
      address: addr("MEMBERSHIP_TOKEN"),
      startBlock: START_BLOCK,
    },
    DaoGovernor: {
      chain: "baseSepolia",
      abi: DaoGovernorAbi,
      address: addr("GOVERNOR"),
      startBlock: START_BLOCK,
    },
    TimelockController: {
      chain: "baseSepolia",
      abi: TimelockControllerAbi,
      address: addr("TIMELOCK"),
      startBlock: START_BLOCK,
    },
    AgentRegistry: {
      chain: "baseSepolia",
      abi: AgentRegistryAbi,
      address: addr("AGENT_REGISTRY"),
      startBlock: START_BLOCK,
    },
    RolesModifier: {
      chain: "baseSepolia",
      abi: RolesModifierAbi,
      address: addr("ROLES_MODIFIER"),
      startBlock: START_BLOCK,
    },
    RationaleAnchor: {
      chain: "baseSepolia",
      abi: RationaleAnchorAbi,
      address: addr("RATIONALE_ANCHOR"),
      startBlock: START_BLOCK,
    },
  },
});
