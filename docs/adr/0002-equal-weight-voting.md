# ADR 0002 — Equal-Weight Voting via Soulbound ERC721Votes

**Status:** Accepted

---

## Context

The system needs a voting token that grants delegated governance power to AI agents. Two
primary models exist:

**Option A — ERC20Votes (token-weighted):** Voting power is proportional to the number of
governance tokens held. This is the standard pattern for DeFi protocols and capital-weighted
DAOs. The vote source would be an `ERC20Votes` token where members hold varying balances.

**Option B — ERC721Votes (one-member-one-vote, soulbound):** Each member holds exactly one
non-transferable NFT. Voting power per token = 1. All members have equal governance weight
regardless of capital contribution.

Option B was chosen for v1. The vote source is kept behind an interface so Option A can be
swapped in a future version.

---

## Decision

`MembershipToken` is a soulbound (non-transferable) `ERC721Votes` contract. Each member
holds exactly one token with ID equal to their registration sequence. Voting power is
exactly 1 per member, delegatable in full to a single agent Safe address.

**Soulbound enforcement:** The `_update` hook reverts on any transfer where `from != address(0)`
and `to != address(0)`. Mint (from == 0) and burn (to == 0) are allowed; lateral transfers
are not. `approve` and `setApprovalForAll` are also reverted.

**Clock mode:** Timestamp-based (`clock()` returns `uint48(block.timestamp)`,
`CLOCK_MODE()` returns `"mode=timestamp"`). This is consistent with Base Sepolia's
block-time variability and the OZ v5 recommendation for L2s.

**Vote source interface:** `DaoGovernor` is constructed with `IVotes token` rather than a
concrete type. The `GovernorVotes` module reads `token.getVotes(address)`. Swapping to a
weighted ERC20Votes implementation requires only deploying a new token, re-delegating, and
constructing a new Governor pointing at it — no other contract changes. This swap is a
Reserved Matter (new Governor deployment triggers articles amendment).

---

## Consequences

**Positive:**

- **Reduced securities surface.** Equal voting weight with no proportional economic return
  reduces the likelihood of membership tokens being characterized as "investment contracts"
  under the Howey test. Non-transferability further reduces the trading/speculative surface.
  See threat-model.md §8.1 for the caveat that securities analysis requires counsel.
- **Simple quorum math.** Quorum is `quorumFraction * totalSupply / 100`, where
  `totalSupply` equals the number of members. The math is predictable and auditable.
- **Correlated-failure protection.** Equal weight means no single member (or their agent)
  has outsized voting power. A large token holder cannot override consensus unilaterally.
- **Alignment with Wyoming DAO LLC intent.** Member-managed LLCs default to equal voting
  unless the operating agreement specifies otherwise.

**Negative / trade-offs:**

- Capital-weighted governance (proportional to investment or contribution) is not supported
  in v1. If a member contributes 10x the capital of another, they have the same vote.
  This is a deliberate design choice for v1 but may not suit all use cases.
- One member = one delegation. A member cannot split their vote across multiple agents in
  v1 (ERC721 delegates fully). If partial delegation is needed, this requires a custom
  `Votes` implementation — note as future work.

**Follow-up:**

- `test_SoulboundTransferReverts` in the adversarial suite confirms non-transferability.
- If the DAO moves to token-weighted governance, file a new ADR, redeploy the vote token,
  and treat the Governor reconfiguration as a Reserved Matter requiring articles amendment.
- Legal counsel should review whether the equal-weight design achieves the intended
  securities treatment in the applicable jurisdiction before any public member solicitation.
