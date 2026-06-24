// MembershipToken event handlers: Transfer (mint/burn), DelegateChanged,
// DelegateVotesChanged
import { ponder } from "ponder:registry";
import { member } from "ponder:schema";

// ---------------------------------------------------------------------------
// Transfer — mint (from == 0x0) creates a member row;
//             burn (to == 0x0) marks the member as removed.
// Soulbound: from != 0 && to != 0 will never occur (contract reverts).
// ---------------------------------------------------------------------------
ponder.on("MembershipToken:Transfer", async ({ event, context }) => {
  const { db } = context;
  const ZERO = "0x0000000000000000000000000000000000000000" as const;

  const from = event.args.from as `0x${string}`;
  const to = event.args.to as `0x${string}`;

  if (from === ZERO) {
    // Mint: create member row.
    await db
      .insert(member)
      .values({
        address: to,
        delegatedAgent: undefined,
        votingWeight: 0n,
        participationCount: 0,
        totalProposalsInScope: 0,
        updatedAt: Number(event.block.timestamp),
      })
      .onConflictDoUpdate(() => ({
        // If already present (re-mint edge case), just refresh timestamp.
        updatedAt: Number(event.block.timestamp),
      }));
  }
  // Burns (to == ZERO): keep the row for audit history but could add a
  // `burned` boolean in a future schema version.
});

// ---------------------------------------------------------------------------
// DelegateChanged — update which agent a member delegates to.
// ---------------------------------------------------------------------------
ponder.on(
  "MembershipToken:DelegateChanged",
  async ({ event, context }) => {
    const { db } = context;
    const delegator = event.args.delegator as `0x${string}`;
    const toDelegate = event.args.toDelegate as `0x${string}`;

    const row = await db.find(member, { address: delegator });
    if (row) {
      await db
        .update(member, { address: delegator })
        .set({
          delegatedAgent: toDelegate,
          updatedAt: Number(event.block.timestamp),
        });
    } else {
      // Create member record if somehow missing (index re-org / ordering edge).
      await db.insert(member).values({
        address: delegator,
        delegatedAgent: toDelegate,
        votingWeight: 0n,
        participationCount: 0,
        totalProposalsInScope: 0,
        updatedAt: Number(event.block.timestamp),
      });
    }
  }
);

// ---------------------------------------------------------------------------
// DelegateVotesChanged — update voting weight on the delegate's row.
// The delegate here is the agent address; also update the member's weight if
// the member has delegated to themselves.
// ---------------------------------------------------------------------------
ponder.on(
  "MembershipToken:DelegateVotesChanged",
  async ({ event, context }) => {
    const { db } = context;
    const delegate = event.args.delegate as `0x${string}`;

    // A member may be their own delegate; update their member row.
    const memberRow = await db.find(member, { address: delegate });
    if (memberRow) {
      await db
        .update(member, { address: delegate })
        .set({
          votingWeight: event.args.newVotes,
          updatedAt: Number(event.block.timestamp),
        });
    }
  }
);
