// ABI for TimelockController — OZ
// Signatures pinned to docs/interfaces.md
export const TimelockControllerAbi = [
  // Functions
  {
    type: "function",
    name: "getMinDelay",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "updateDelay",
    inputs: [{ name: "newDelay", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancel",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "CallScheduled",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "index", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
      { name: "predecessor", type: "bytes32", indexed: false },
      { name: "delay", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Cancelled",
    inputs: [{ name: "id", type: "bytes32", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "CallExecuted",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "index", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MinDelayChange",
    inputs: [
      { name: "oldDuration", type: "uint256", indexed: false },
      { name: "newDuration", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
