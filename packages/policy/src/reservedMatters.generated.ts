// AUTO-GENERATED from reserved-matters.yaml by scripts/gen-reserved-matters.mjs.
// Do NOT edit by hand. Run `pnpm gen:reserved` to regenerate.
// CI (`pnpm check:reserved`) asserts this file agrees with the YAML source
// and legal/reserved-matters-schedule.md (build spec §14, §16.3).

import type { Address, Hex } from "viem";

export type ReservedEnforcement = "selector" | "target" | "cap" | "legal";

export interface ReservedMatter {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly category: string;
  readonly profiles: readonly string[];
  readonly enforcement: ReservedEnforcement;
  readonly status: string;
  readonly legalOnly: boolean;
  readonly description: string;
  readonly enforcementNote: string;
  readonly selectorSignatures: readonly string[];
  readonly selectors: readonly Hex[];
  readonly targets: readonly string[];
}

export const RESERVED_MATTERS_VERSION = "1.0";
export const RESERVED_MATTERS_PROFILE = "pilot";
export const RESERVED_MATTERS_ENTITY = "CougarDAO Working Committee DAO (sandbox)";

export const RESERVED_MATTERS: readonly ReservedMatter[] = [
  {
    id: "RM-CONST-001",
    title: "Change the guardian set",
    role: "GUARDIAN_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "active",
    legalOnly: false,
    description: "Add, remove, or replace guardian signers, or transfer any constitutional admin role. Every AccessControl role grant/revoke is reserved.",
    enforcementNote: "",
    selectorSignatures: ["grantRole(bytes32,address)", "revokeRole(bytes32,address)", "renounceRole(bytes32,address)"],
    selectors: ["0x2f2ff15d", "0xd547741f", "0x36568abe"],
    targets: [],
  },
  {
    id: "RM-CONST-002",
    title: "Change the timelock minimum delay",
    role: "TIMELOCK_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "active",
    legalOnly: false,
    description: "Alter the execution delay that gives the guardian its veto window (GuardedTimelock.updateDelay, re-gated to TIMELOCK_ADMIN).",
    enforcementNote: "",
    selectorSignatures: ["updateDelay(uint256)"],
    selectors: ["0x64d62353"],
    targets: [],
  },
  {
    id: "RM-CONST-003",
    title: "Change agent spending caps or Roles configuration",
    role: "ROLES_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "active",
    legalOnly: false,
    description: "Modify any agent's allowed targets, allowed selectors, active flag, or per-tx / per-epoch spending allowances in the RolesModifier.",
    enforcementNote: "",
    selectorSignatures: ["setSpendingCap(address,address,uint256,uint256)", "setTargetAllowed(address,address,bytes4,bool)", "setAgentActive(address,bool)"],
    selectors: ["0xd8804832", "0x6a3722c5", "0xacb5cb8e"],
    targets: [],
  },
  {
    id: "RM-CONST-004",
    title: "Change an agent mandate",
    role: "REGISTRY_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "active",
    legalOnly: false,
    description: "Update the mandate hash/URI bound to an agent account in the AgentRegistry. (registerAgent / deactivateAgent are principal- or REGISTRY_ADMIN-gated and recorded in the schedule, but the enforced runtime selector is updateMandate.)",
    enforcementNote: "",
    selectorSignatures: ["updateMandate(address,bytes32,string)"],
    selectors: ["0xb51e77d5"],
    targets: [],
  },
  {
    id: "RM-CONST-005",
    title: "Admit or remove members (mint/burn membership)",
    role: "MEMBERSHIP_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "active",
    legalOnly: false,
    description: "Mint or burn the soulbound membership token, i.e. admit or remove members of the entity.",
    enforcementNote: "",
    selectorSignatures: ["mintMembership(address,uint256)", "burnMembership(uint256)"],
    selectors: ["0x23d91713", "0xe5961754"],
    targets: [],
  },
  {
    id: "RM-CONST-006",
    title: "Upgrade a constitutional contract",
    role: "UPGRADE_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "selector",
    status: "planned",
    legalOnly: false,
    description: "Replace the implementation of an upgradeable constitutional contract. Wyoming algorithmic management requires upgradeability; the upgrade authority is itself reserved and triggers an articles-amendment obligation. Forward-looking: no UUPS proxy is wired yet (the runtime denies these selectors defensively in advance).",
    enforcementNote: "",
    selectorSignatures: ["upgradeTo(address)", "upgradeToAndCall(address,bytes)"],
    selectors: ["0x3659cfe6", "0x4f1ef286"],
    targets: [],
  },
  {
    id: "RM-CONST-007",
    title: "Amend the articles / operating agreement / Reserved Matters schedule",
    role: "GUARDIAN_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "legal",
    status: "active",
    legalOnly: true,
    description: "Amend the articles of organization, the operating agreement, the code-deference clause, or this Reserved Matters schedule.",
    enforcementNote: "",
    selectorSignatures: [],
    selectors: [],
    targets: [],
  },
  {
    id: "RM-CONST-008",
    title: "Dissolve the entity",
    role: "GUARDIAN_ADMIN",
    category: "constitutional",
    profiles: ["pilot", "production"],
    enforcement: "legal",
    status: "active",
    legalOnly: true,
    description: "Wind up and dissolve the DAO LLC (or, for the pilot, the sandbox sub-entity).",
    enforcementNote: "",
    selectorSignatures: [],
    selectors: [],
    targets: [],
  },
  {
    id: "RM-PILOT-001",
    title: "Move funds beyond the ring-fenced pilot float",
    role: "ROLES_ADMIN",
    category: "pilot_guard",
    profiles: ["pilot"],
    enforcement: "cap",
    status: "active",
    legalOnly: false,
    description: "Any treasury movement exceeding the capped sandbox float (${PILOT_FLOAT_CAP}) or to an address outside the pilot allowlist. The sandbox is funded with a small, capped budget only.",
    enforcementNote: "Primary enforcement is the agent-account allowance cap in the RolesModifier (PER_TX_CAP_EXCEEDED / PER_EPOCH_CAP_EXCEEDED); this entry makes the ceiling a hard Reserved Matter as defense-in-depth. The metered selectors stay callable within caps, so they are NOT added to RESERVED_SELECTOR_SET.",
    selectorSignatures: ["transfer(address,uint256)", "transferFrom(address,address,uint256)"],
    selectors: ["0xa9059cbb", "0x23b872dd"],
    targets: ["${PILOT_TREASURY}"],
  },
  {
    id: "RM-PILOT-002",
    title: "Execute any action against CougarDAO production assets or contracts",
    role: "GUARDIAN_ADMIN",
    category: "pilot_guard",
    profiles: ["pilot"],
    enforcement: "target",
    status: "active",
    legalOnly: false,
    description: "The sandbox may only ADVISE on CougarDAO matters (draft memos, monitor, alert). It may not call, sign for, or hold authority over any CougarDAO production contract, deed, treasury, or the $COUG token. ALL selectors on these targets are forbidden — denied by target in the runtime BEFORE any per-mandate allow-list is consulted.",
    enforcementNote: "",
    selectorSignatures: [],
    selectors: [],
    targets: ["0xa78ce0420a057bd27f214318920a8ff77035f29b", "${COUGARDAO_GOVERNANCE_CORE}", "${COUGARDAO_TREASURY}", "${FABRICA_DEED_NFT}"],
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

/**
 * Reserved TARGET addresses (resolved literals): the policy engine denies ANY
 * action whose target is one of these, before the per-mandate allow-list is
 * consulted. In the pilot this is the CougarDAO ring-fence (RM-PILOT-002).
 */
export const RESERVED_TARGETS: readonly Address[] = [
  "0xA78ce0420a057Bd27f214318920A8ff77035f29b",
];

export const RESERVED_TARGET_SET: ReadonlySet<string> = new Set(RESERVED_TARGETS.map((a) => a.toLowerCase()));

/**
 * Deploy-time symbolic targets that ops MUST resolve into the reserved-target
 * set before mainnet (supply them via EvalContext.reservedTargets at runtime).
 * See config/pilot.addresses.example.json.
 */
export const RESERVED_TARGET_PLACEHOLDERS: readonly string[] = [
  "${COUGARDAO_GOVERNANCE_CORE}",
  "${COUGARDAO_TREASURY}",
  "${FABRICA_DEED_NFT}",
];
