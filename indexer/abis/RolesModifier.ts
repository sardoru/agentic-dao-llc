// ABI for RolesModifier — minimal in-house Zodiac-Roles stand-in (v1)
// Signatures pinned to docs/interfaces.md
export const RolesModifierAbi = [
  // Functions
  {
    type: "function",
    name: "execTransactionWithRole",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "agent", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setSpendingCap",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
      { name: "perTx", type: "uint256" },
      { name: "perEpoch", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTargetAllowed",
    inputs: [
      { name: "agent", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAgentActive",
    inputs: [
      { name: "agent", type: "address" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "epochSpend",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "AgentExecuted",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "to", type: "address", indexed: false },
      { name: "selector", type: "bytes4", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ExecutionSuccess",
    inputs: [{ name: "txHash", type: "bytes32", indexed: false }],
    anonymous: false,
  },
] as const;
