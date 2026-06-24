// ABI for MembershipToken — soulbound ERC721Votes + AccessControl
// Signatures pinned to docs/interfaces.md
export const MembershipTokenAbi = [
  // Functions
  {
    type: "function",
    name: "mintMembership",
    inputs: [
      { name: "member", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burnMembership",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "clock",
    inputs: [],
    outputs: [{ name: "", type: "uint48" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CLOCK_MODE",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "pure",
  },
  // Events
  {
    type: "event",
    name: "DelegateChanged",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "fromDelegate", type: "address", indexed: true },
      { name: "toDelegate", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DelegateVotesChanged",
    inputs: [
      { name: "delegate", type: "address", indexed: true },
      { name: "previousVotes", type: "uint256", indexed: false },
      { name: "newVotes", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Transfer event (ERC721)
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
    anonymous: false,
  },
] as const;
