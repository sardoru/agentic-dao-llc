// RationaleAnchor event handlers: RationaleAnchored
import { ponder } from "ponder:registry";
import { rationale, proposal } from "ponder:schema";

// ---------------------------------------------------------------------------
// RationaleAnchored — store the rationale record and, if refId matches a
// known proposal (first 32 bytes of the proposalId in big-endian), update
// the proposal row with the rationale URI + hash.
// ---------------------------------------------------------------------------
ponder.on(
  "RationaleAnchor:RationaleAnchored",
  async ({ event, context }) => {
    const { db } = context;
    const args = event.args;

    const refId = args.refId as string;
    const ipfsURI = args.ipfsURI;
    const contentHash = args.contentHash as string;

    // Upsert rationale row.
    await db
      .insert(rationale)
      .values({
        refId,
        ipfsURI,
        contentHash,
        timestamp: Number(event.block.timestamp),
        txHash: event.transaction.hash,
      })
      .onConflictDoUpdate(() => ({
        ipfsURI,
        contentHash,
        timestamp: Number(event.block.timestamp),
        txHash: event.transaction.hash,
      }));

    // Attempt to match refId → proposalId.
    // Convention: refId == bytes32(proposalId) — i.e., the 32-byte big-endian
    // encoding of the uint256 proposalId.  We derive proposalId by parsing
    // the hex string back to a bigint.
    try {
      const proposalId = BigInt(refId);
      const proposalRow = await db.find(proposal, { id: proposalId });
      if (proposalRow) {
        await db
          .update(proposal, { id: proposalId })
          .set({ rationaleURI: ipfsURI, rationaleContentHash: contentHash });
      }
    } catch {
      // refId is not a plain uint256 — not a proposal rationale, that's fine.
    }
  }
);
