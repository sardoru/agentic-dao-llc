# Canonical on-chain interface (coherence contract)

This file pins the **exact external function and event signatures** shared across three
packages so they cannot drift:

- `contracts/` must expose these signatures verbatim.
- `packages/chain` ABIs are written against them.
- `indexer/` indexes these events.

If a signature must change, change it **here first**, then in all three. Selectors used by
the Reserved Matters policy come from `reserved-matters.yaml` and must match the contract
functions below.

## MembershipToken — soulbound ERC721Votes + AccessControl
```solidity
function mintMembership(address member, uint256 tokenId) external;      // MEMBERSHIP_ADMIN (reserved)
function burnMembership(uint256 tokenId) external;                      // MEMBERSHIP_ADMIN (reserved)
function delegate(address delegatee) external;                         // inherited (Votes)
function getVotes(address account) external view returns (uint256);
function clock() external view returns (uint48);                       // timestamp mode
function CLOCK_MODE() external pure returns (string memory);           // "mode=timestamp"
// events: DelegateChanged(address,address,address), DelegateVotesChanged(address,uint256,uint256)
```

## DaoGovernor — OZ Governor stack
```solidity
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256);
function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256);
function state(uint256 proposalId) external view returns (uint8);
function proposalVotes(uint256 proposalId) external view returns (uint256 against, uint256 forVotes, uint256 abstain);
function quorum(uint256 timepoint) external view returns (uint256);
function proposalSnapshot(uint256 proposalId) external view returns (uint256);
function proposalDeadline(uint256 proposalId) external view returns (uint256);
function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external returns (uint256);
function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external payable returns (uint256);
function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external pure returns (uint256);
// events: ProposalCreated(...), VoteCast(address,uint256,uint8,uint256,string), ProposalQueued(uint256,uint256),
//         ProposalExecuted(uint256), ProposalCanceled(uint256)
```

## TimelockController — OZ
```solidity
function getMinDelay() external view returns (uint256);
function updateDelay(uint256 newDelay) external;                       // TIMELOCK_ADMIN (reserved)
function cancel(bytes32 id) external;                                  // CANCELLER = guardian
// events: CallScheduled(bytes32,uint256,address,uint256,bytes,bytes32,uint256), Cancelled(bytes32),
//         CallExecuted(bytes32,uint256,address,uint256,bytes)
```

## AgentRegistry
```solidity
struct AgentRecord { address principal; bytes32 mandateHash; string mandateURI; bool active; }
function registerAgent(address agentAccount, bytes32 mandateHash, string mandateURI) external;   // msg.sender == principal
function deactivateAgent(address agentAccount) external;                                          // principal or REGISTRY_ADMIN
function updateMandate(address agentAccount, bytes32 newHash, string mandateURI) external;        // REGISTRY_ADMIN (reserved)
function mandateOf(address agentAccount) external view returns (AgentRecord memory);
// events: AgentRegistered(address,address,bytes32,string), AgentMandateUpdated(address,bytes32,bytes32,string),
//         AgentDeactivated(address)
```

## RolesModifier — minimal in-house Zodiac-Roles stand-in (v1; swap to audited Zodiac before mainnet)
```solidity
function execTransactionWithRole(address to, uint256 value, bytes data, address agent) external returns (bool);
function setSpendingCap(address agent, address token, uint256 perTx, uint256 perEpoch) external; // ROLES_ADMIN (reserved)
function setTargetAllowed(address agent, address target, bytes4 selector, bool allowed) external; // ROLES_ADMIN (reserved)
function setAgentActive(address agent, bool active) external;                                     // ROLES_ADMIN (reserved)
function epochSpend(address agent, address token) external view returns (uint256);
// events: AgentExecuted(address agent, address to, bytes4 selector, address token, uint256 amount),
//         ExecutionSuccess(bytes32 txHash)
```

## RationaleAnchor — joins on-chain actions to off-chain reasoning
```solidity
function anchor(bytes32 refId, string ipfsURI, bytes32 contentHash) external;
// event: RationaleAnchored(bytes32 indexed refId, string ipfsURI, bytes32 contentHash)
```
