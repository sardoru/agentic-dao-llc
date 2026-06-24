import { parseAbi } from "viem";

/**
 * Human-readable ABI fragments, written verbatim against `docs/interfaces.md`
 * (the canonical on-chain coherence contract). If a signature changes it must
 * change in interfaces.md first, then here, then in the indexer.
 *
 * `parseAbi` turns these into the strongly-typed viem ABI objects used by every
 * contract-call helper in this package.
 */

/** MembershipToken — soulbound ERC721Votes + AccessControl. */
export const membershipTokenAbi = parseAbi([
  // reads / writes
  "function mintMembership(address member, uint256 tokenId) external",
  "function burnMembership(uint256 tokenId) external",
  "function delegate(address delegatee) external",
  "function getVotes(address account) external view returns (uint256)",
  "function clock() external view returns (uint48)",
  "function CLOCK_MODE() external pure returns (string)",
  // events
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
]);

/** DaoGovernor — OZ Governor stack. */
export const governorAbi = parseAbi([
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256)",
  "function state(uint256 proposalId) external view returns (uint8)",
  "function proposalVotes(uint256 proposalId) external view returns (uint256 against, uint256 forVotes, uint256 abstain)",
  "function quorum(uint256 timepoint) external view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) external view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) external view returns (uint256)",
  "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external payable returns (uint256)",
  "function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external pure returns (uint256)",
  // events
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
  "event ProposalQueued(uint256 proposalId, uint256 etaSeconds)",
  "event ProposalExecuted(uint256 proposalId)",
  "event ProposalCanceled(uint256 proposalId)",
]);

/** TimelockController — OZ. */
export const timelockAbi = parseAbi([
  "function getMinDelay() external view returns (uint256)",
  "function updateDelay(uint256 newDelay) external",
  "function cancel(bytes32 id) external",
  // events
  "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",
  "event Cancelled(bytes32 indexed id)",
  "event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
]);

/** AgentRegistry. */
export const agentRegistryAbi = parseAbi([
  "struct AgentRecord { address principal; bytes32 mandateHash; string mandateURI; bool active; }",
  "function registerAgent(address agentAccount, bytes32 mandateHash, string mandateURI) external",
  "function deactivateAgent(address agentAccount) external",
  "function updateMandate(address agentAccount, bytes32 newHash, string mandateURI) external",
  "function mandateOf(address agentAccount) external view returns (AgentRecord)",
  // events
  "event AgentRegistered(address indexed agentAccount, address indexed principal, bytes32 mandateHash, string mandateURI)",
  "event AgentMandateUpdated(address indexed agentAccount, bytes32 oldHash, bytes32 newHash, string mandateURI)",
  "event AgentDeactivated(address indexed agentAccount)",
]);

/** RolesModifier — minimal in-house Zodiac-Roles stand-in (v1). */
export const rolesModifierAbi = parseAbi([
  "function execTransactionWithRole(address to, uint256 value, bytes data, address agent) external returns (bool)",
  "function setSpendingCap(address agent, address token, uint256 perTx, uint256 perEpoch) external",
  "function setTargetAllowed(address agent, address target, bytes4 selector, bool allowed) external",
  "function setAgentActive(address agent, bool active) external",
  "function epochSpend(address agent, address token) external view returns (uint256)",
  // events
  "event AgentExecuted(address agent, address to, bytes4 selector, address token, uint256 amount)",
  "event ExecutionSuccess(bytes32 txHash)",
]);

/** RationaleAnchor — joins on-chain actions to off-chain reasoning. */
export const rationaleAnchorAbi = parseAbi([
  "function anchor(bytes32 refId, string ipfsURI, bytes32 contentHash) external",
  "event RationaleAnchored(bytes32 indexed refId, string ipfsURI, bytes32 contentHash)",
]);

export const abis = {
  membershipToken: membershipTokenAbi,
  governor: governorAbi,
  timelock: timelockAbi,
  agentRegistry: agentRegistryAbi,
  rolesModifier: rolesModifierAbi,
  rationaleAnchor: rationaleAnchorAbi,
} as const;
