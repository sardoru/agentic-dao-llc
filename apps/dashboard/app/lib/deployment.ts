// Live Base Sepolia pilot deployment (CGP-001 Working Committee DAO).
// Single source for the Contracts page + the Agents page. All contracts are
// verified on Basescan ("Pass - Verified") and mirrored on Sourcify (exact-match).
// Mirrors contracts/deployments/base-sepolia.json + pilot-agents-base-sepolia.json.

export const CHAIN = { name: "Base Sepolia", id: 84532 } as const;
export const EXPLORER = "https://sepolia.basescan.org";
export const SOURCIFY = "https://sourcify.dev/#/lookup";

export const basescan = (addr: string) => `${EXPLORER}/address/${addr}`;
export const sourcify = (addr: string) => `${SOURCIFY}/${addr}`;

export interface DeployedContract {
  name: string;
  address: `0x${string}`;
  role: string;
  verified: boolean;
}

export interface NamedAccount {
  name: string;
  address: `0x${string}`;
  role: string;
}

export type AgentKind = "operational" | "governance" | "advisory";

export interface DeployedAgent {
  id: string;
  address: `0x${string}`;
  kind: AgentKind;
  summary: string;
  canPropose: boolean;
  canVote: boolean;
  status: "active" | "registered";
  cap: string | null;
  mandateHash: `0x${string}`;
}

export const PRINCIPAL = "0xD3013c2b198E80806de8e7886237De5eBB8880ED" as const;
export const GUARDIAN = "0x924C2CF41cc502EfA98416EE42A8a05e3923baDB" as const;

export const CONTRACTS: DeployedContract[] = [
  {
    name: "DaoGovernor",
    address: "0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5",
    role: "Equal-weight Governor. Agents propose & vote; holds no admin roles.",
    verified: true,
  },
  {
    name: "GuardedTimelock",
    address: "0xCCea7837Ae5C555c13F9bb984A39C39d4C8736CD",
    role: "Execution delay + guardian veto. The guardian is the sole canceller.",
    verified: true,
  },
  {
    name: "MembershipToken",
    address: "0x6521A771CA57fD2e22C76486FE17830E3D742c01",
    role: "Soulbound membership. Voting weight is delegated to agent accounts.",
    verified: true,
  },
  {
    name: "AgentRegistry",
    address: "0xCc6A8ADd07B1fD670Da953750d8eFDa599186319",
    role: "Binds each agent's machine-readable mandate hash + URI on-chain.",
    verified: true,
  },
  {
    name: "RolesModifier",
    address: "0xf3CBebdD405031c4BA0806aF62a796a78084afFc",
    role: "Per-tx / per-epoch spending caps + allow-list on bounded operations.",
    verified: true,
  },
  {
    name: "RationaleAnchor",
    address: "0x84F19BA66D0a779C38FF14102ddd448996136037",
    role: "Commits the keccak256 of each decision rationale on-chain.",
    verified: true,
  },
  {
    name: "Treasury",
    address: "0x902f219A170240218D022b35d58B4328B44562D3",
    role: "ETH / ERC-20 vault. Owner is the Timelock.",
    verified: true,
  },
];

export const ACCOUNTS: NamedAccount[] = [
  {
    name: "Guardian (demo)",
    address: GUARDIAN,
    role: "Holds the veto + every constitutional admin role. (Replace with a multisig for a live pilot.)",
  },
  {
    name: "Deployer / principal",
    address: PRINCIPAL,
    role: "Registered the agents as principal; renounced all admin roles after deploy.",
  },
];

export const AGENTS: DeployedAgent[] = [
  {
    id: "OPS-01",
    address: "0x4e9C86Fd2758A200734d2e7C6F72288dd5Be97c6",
    kind: "operational",
    summary:
      "Operations. Pays the committee's allow-listed operating expenses; drafts larger spends for ratification.",
    canPropose: true,
    canVote: false,
    status: "active",
    cap: "$500 / tx · $2,000 / week USDC",
    mandateHash: "0x85aec66ef8abb0c436ce196ef89672fe0048e7675619b6b5a5083e9b59c463cb",
  },
  {
    id: "TREAS-01",
    address: "0xc9dc10c15bCBB9b1b6BEE3C6187172C2e22dC384",
    kind: "operational",
    summary:
      "Treasury. Rebalances the ring-fenced float among allow-listed addresses; votes on routine treasury matters.",
    canPropose: true,
    canVote: true,
    status: "active",
    cap: "$1,000 / tx · $5,000 / week USDC",
    mandateHash: "0x8a633ddc1fb17fb1e35a46e638a7909b40ba08c3352bfc15ca091e7da324cef4",
  },
  {
    id: "GOV-01",
    address: "0x3f073C95B25D7F16770595402352e71F6345dbBe",
    kind: "governance",
    summary:
      "Governance. Drafts and posts proposals, votes on routine matters. No spending authority.",
    canPropose: true,
    canVote: true,
    status: "registered",
    cap: null,
    mandateHash: "0xfb0b2d3386ec268819863a64741afef8b6e0f83e3eb3f916b2d743fc2c73b5dd",
  },
  {
    id: "DILIGENCE-01",
    address: "0x63695C0b2Ee628B753bCaB2947B9059639084a65",
    kind: "advisory",
    summary:
      "Monitoring (read / propose-only). Watches CougarDAO portfolio + MetaStreet risk, drafts memos. Zero execution authority.",
    canPropose: true,
    canVote: false,
    status: "registered",
    cap: null,
    mandateHash: "0x0a36e27c71a6ba37b334e2eda2a99715616a9e70744abb42fddfbe0c69dc66ce",
  },
];
