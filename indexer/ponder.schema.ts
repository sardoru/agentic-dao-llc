// ponder.schema.ts — derived views for the Agentic DAO LLC dashboard
// Build spec §10: proposal, vote, member, agent, treasuryEvent, rationale
import { index, onchainTable, primaryKey, relations } from "ponder";

// ---------------------------------------------------------------------------
// Agent table
// Populated by AgentRegistry events.  `opSpendEpoch` accumulates spend tracked
// by the RolesModifier within the current epoch; reset externally when a new
// epoch begins (or we track cumulative and the API computes epoch delta).
// ---------------------------------------------------------------------------
export const agent = onchainTable(
  "agent",
  (t) => ({
    // The agent Safe / EOA address that holds delegated authority.
    account: t.hex().primaryKey(),
    // Human member who delegated.
    principal: t.hex().notNull(),
    // keccak256 of canonical mandate JSON stored on IPFS.
    mandateHash: t.text().notNull(),
    // ipfs://... URI of the mandate document.
    mandateURI: t.text().notNull(),
    // Whether the agent is currently active in the registry.
    active: t.boolean().notNull().default(true),
    // Running sum of operational spend tracked by RolesModifier (wei-equivalent bigint).
    opSpendCumulative: t.bigint().notNull().default(0n),
    // Block timestamp of last update (for epoch-spend tracking off-chain).
    updatedAt: t.integer().notNull().default(0),
    // Total number of proposals created by this agent.
    proposalCount: t.integer().notNull().default(0),
    // Total number of votes cast by this agent.
    voteCount: t.integer().notNull().default(0),
  }),
  (table) => ({
    principalIdx: index().on(table.principal),
  }),
);

// ---------------------------------------------------------------------------
// Member table
// Represents a human LLC member holding a soulbound token.
// Populated by MembershipToken Transfer (mint) and DelegateChanged events.
// ---------------------------------------------------------------------------
export const member = onchainTable(
  "member",
  (t) => ({
    // Member wallet address.
    address: t.hex().primaryKey(),
    // The agent this member has delegated their voting power to (may be self).
    delegatedAgent: t.hex(),
    // Current voting weight as reported by DelegateVotesChanged.
    votingWeight: t.bigint().notNull().default(0n),
    // Count of proposals the member (via their agent) participated in.
    participationCount: t.integer().notNull().default(0),
    // Count of total proposals in scope for this member (for participation rate).
    totalProposalsInScope: t.integer().notNull().default(0),
    updatedAt: t.integer().notNull().default(0),
  }),
  (table) => ({
    delegatedAgentIdx: index().on(table.delegatedAgent),
  }),
);

// ---------------------------------------------------------------------------
// Proposal table
// Populated by DaoGovernor ProposalCreated and subsequent lifecycle events.
// ---------------------------------------------------------------------------
export const proposal = onchainTable(
  "proposal",
  (t) => ({
    // OZ Governor proposalId (uint256 stored as bigint).
    id: t.bigint().primaryKey(),
    // The agent address that called propose().
    proposerAgent: t.hex().notNull(),
    // The human principal the proposer agent acts for (joined from AgentRegistry).
    proposerPrincipal: t.hex(),
    // JSON-encoded decoded calldata summary (targets / selectors / values).
    // Stored as text to avoid deep JSONB; dashboard parses.
    targetsJson: t.text().notNull(),
    valuesJson: t.text().notNull(),
    calldatasJson: t.text().notNull(),
    // Full proposal description string.
    description: t.text().notNull(),
    // Governor proposal state as uint8 (0=Pending,1=Active,2=Canceled,3=Defeated,
    //   4=Succeeded,5=Queued,6=Expired,7=Executed).
    state: t.integer().notNull().default(0),
    // Tally from VoteCast accumulation.
    votesFor: t.bigint().notNull().default(0n),
    votesAgainst: t.bigint().notNull().default(0n),
    votesAbstain: t.bigint().notNull().default(0n),
    // Snapshot timestamp (voteStart) and deadline (voteEnd) from ProposalCreated.
    snapshotBlock: t.bigint().notNull(),
    deadlineBlock: t.bigint().notNull(),
    // Timelock ETA (seconds since epoch) once queued.
    timelockEta: t.bigint(),
    // Rationale: populated when a RationaleAnchored event references this proposalId.
    rationaleURI: t.text(),
    rationaleContentHash: t.text(),
    // Block number and timestamp of creation.
    createdAtBlock: t.bigint().notNull(),
    createdAtTimestamp: t.integer().notNull(),
  }),
  (table) => ({
    proposerAgentIdx: index().on(table.proposerAgent),
    stateIdx: index().on(table.state),
  }),
);

// ---------------------------------------------------------------------------
// Vote table
// One row per (proposalId, voter) — upserted on each VoteCast.
// ---------------------------------------------------------------------------
export const vote = onchainTable(
  "vote",
  (t) => ({
    // Composite PK: proposalId + voter address.
    proposalId: t.bigint().notNull(),
    voter: t.hex().notNull(),
    // Human principal behind the voter agent (joined from AgentRegistry at index time).
    principal: t.hex(),
    // 0=Against, 1=For, 2=Abstain
    support: t.integer().notNull(),
    // Voting weight applied.
    weight: t.bigint().notNull(),
    // Reason string from castVoteWithReason.
    reason: t.text().notNull().default(""),
    // Block timestamp when vote was cast.
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.proposalId, table.voter] }),
    proposalIdx: index().on(table.proposalId),
    voterIdx: index().on(table.voter),
  }),
);

// ---------------------------------------------------------------------------
// TreasuryEvent table
// Populated by RolesModifier AgentExecuted events and Timelock CallExecuted
// events (which represent executed proposals touching the treasury).
// ---------------------------------------------------------------------------
export const treasuryEvent = onchainTable(
  "treasury_event",
  (t) => ({
    // Unique id: txHash-logIndex
    id: t.text().primaryKey(),
    // Source: "roles_modifier" | "timelock"
    source: t.text().notNull(),
    // Agent that triggered the execution (for roles_modifier events).
    agent: t.hex(),
    // Target contract called.
    target: t.hex().notNull(),
    // 4-byte selector (hex).
    selector: t.text().notNull().default("0x00000000"),
    // Token address (zero = native ETH).
    token: t.hex(),
    // Amount spent (bigint).
    amount: t.bigint().notNull().default(0n),
    // Proposal ID if this is a timelock execution (null for operational spends).
    proposalId: t.bigint(),
    // Timelock operation id (bytes32 as hex text) for timelock events.
    timelockOpId: t.text(),
    // Block timestamp.
    timestamp: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (table) => ({
    agentIdx: index().on(table.agent),
    proposalIdx: index().on(table.proposalId),
    timestampIdx: index().on(table.timestamp),
  }),
);

// ---------------------------------------------------------------------------
// Rationale table
// Populated by RationaleAnchor RationaleAnchored events.
// The refId is an arbitrary bytes32 (e.g. proposalId hash or action hash).
// ---------------------------------------------------------------------------
export const rationale = onchainTable("rationale", (t) => ({
  // bytes32 refId as hex text (primary key).
  refId: t.text().primaryKey(),
  ipfsURI: t.text().notNull(),
  contentHash: t.text().notNull(),
  // Block timestamp when anchored.
  timestamp: t.integer().notNull(),
  txHash: t.text().notNull(),
}));

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const proposalRelations = relations(proposal, ({ many }) => ({
  votes: many(vote),
}));

export const voteRelations = relations(vote, ({ one }) => ({
  proposal: one(proposal, {
    fields: [vote.proposalId],
    references: [proposal.id],
  }),
}));

export const agentRelations = relations(agent, ({ many }) => ({
  treasuryEvents: many(treasuryEvent),
}));

export const treasuryEventRelations = relations(treasuryEvent, ({ one }) => ({
  agentRecord: one(agent, {
    fields: [treasuryEvent.agent],
    references: [agent.account],
  }),
}));
