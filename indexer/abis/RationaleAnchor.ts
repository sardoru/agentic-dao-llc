// ABI for RationaleAnchor — joins on-chain actions to off-chain reasoning
// Signatures pinned to docs/interfaces.md
export const RationaleAnchorAbi = [
  // Functions
  {
    type: "function",
    name: "anchor",
    inputs: [
      { name: "refId", type: "bytes32" },
      { name: "ipfsURI", type: "string" },
      { name: "contentHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "RationaleAnchored",
    inputs: [
      { name: "refId", type: "bytes32", indexed: true },
      { name: "ipfsURI", type: "string", indexed: false },
      { name: "contentHash", type: "bytes32", indexed: false },
    ],
    anonymous: false,
  },
] as const;
