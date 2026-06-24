// AUTO-GENERATED from reserved-matters.yaml by scripts/gen-reserved-matters.mjs.
// Do NOT edit by hand. Run `pnpm gen:reserved` to regenerate.
// CI (`pnpm check:reserved`) asserts this file agrees with the YAML source
// and legal/reserved-matters-schedule.md (build spec §14, §16.3).

import type { Hex } from "viem";

export interface ReservedMatter {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly legalOnly: boolean;
  readonly description: string;
  readonly selectorSignatures: readonly string[];
  readonly selectors: readonly Hex[];
}

export const RESERVED_MATTERS_VERSION = "1.0";

export const RESERVED_MATTERS: readonly ReservedMatter[] = [
  {
    id: "CHANGE_GUARDIAN_SET",
    title: "Change the guardian set",
    role: "GUARDIAN_ADMIN",
    legalOnly: false,
    description: "Add, remove, or replace guardian signers, or transfer any constitutional admin role. Every AccessControl role grant/revoke is reserved.",
    selectorSignatures: ["grantRole(bytes32,address)", "revokeRole(bytes32,address)", "renounceRole(bytes32,address)"],
    selectors: ["0x2f2ff15d", "0xd547741f", "0x36568abe"],
  },
  {
    id: "CHANGE_TIMELOCK_DELAY",
    title: "Change the timelock minimum delay",
    role: "TIMELOCK_ADMIN",
    legalOnly: false,
    description: "Alter the execution delay that gives the guardian its veto window.",
    selectorSignatures: ["updateDelay(uint256)"],
    selectors: ["0x64d62353"],
  },
  {
    id: "CHANGE_AGENT_CAPS_OR_ROLES",
    title: "Change agent spending caps or Roles configuration",
    role: "ROLES_ADMIN",
    legalOnly: false,
    description: "Modify any agent's allowed targets, allowed selectors, or per-tx / per-epoch spending allowances.",
    selectorSignatures: ["setSpendingCap(address,address,uint256,uint256)", "setTargetAllowed(address,address,bytes4,bool)", "setAgentActive(address,bool)"],
    selectors: ["0xd8804832", "0x6a3722c5", "0xacb5cb8e"],
  },
  {
    id: "CHANGE_AGENT_MANDATE",
    title: "Change an agent mandate",
    role: "REGISTRY_ADMIN",
    legalOnly: false,
    description: "Update the mandate hash/URI bound to an agent account in the AgentRegistry.",
    selectorSignatures: ["updateMandate(address,bytes32,string)"],
    selectors: ["0xb51e77d5"],
  },
  {
    id: "MINT_OR_BURN_MEMBERSHIP",
    title: "Admit or remove members (mint/burn membership)",
    role: "MEMBERSHIP_ADMIN",
    legalOnly: false,
    description: "Mint or burn the soulbound membership token, i.e. admit or remove members.",
    selectorSignatures: ["mintMembership(address,uint256)", "burnMembership(uint256)"],
    selectors: ["0x23d91713", "0xe5961754"],
  },
  {
    id: "UPGRADE_CONTRACTS",
    title: "Upgrade a constitutional contract",
    role: "UPGRADE_ADMIN",
    legalOnly: false,
    description: "Replace the implementation of an upgradeable constitutional contract. Wyoming algorithmic management requires upgradeability; the upgrade authority is itself reserved and triggers an articles-amendment obligation.",
    selectorSignatures: ["upgradeTo(address)", "upgradeToAndCall(address,bytes)"],
    selectors: ["0x3659cfe6", "0x4f1ef286"],
  },
  {
    id: "AMEND_CONSTITUTION",
    title: "Amend the articles / operating agreement / Reserved Matters schedule",
    role: "GUARDIAN_ADMIN",
    legalOnly: true,
    description: "Amend the articles of organization, the operating agreement, the code-deference clause, or this Reserved Matters schedule.",
    selectorSignatures: [],
    selectors: [],
  },
  {
    id: "DISSOLUTION",
    title: "Dissolve the company",
    role: "GUARDIAN_ADMIN",
    legalOnly: true,
    description: "Wind up and dissolve the DAO LLC.",
    selectorSignatures: [],
    selectors: [],
  },
];

/** Flat set of every reserved 4-byte selector, for O(1) lookup in the policy engine. */
export const RESERVED_SELECTORS: readonly Hex[] = [
  "0x2f2ff15d",
  "0xd547741f",
  "0x36568abe",
  "0x64d62353",
  "0xd8804832",
  "0x6a3722c5",
  "0xacb5cb8e",
  "0xb51e77d5",
  "0x23d91713",
  "0xe5961754",
  "0x3659cfe6",
  "0x4f1ef286",
];

export const RESERVED_SELECTOR_SET: ReadonlySet<Hex> = new Set(RESERVED_SELECTORS);
