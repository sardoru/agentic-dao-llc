// ABI for AgentRegistry
// Signatures pinned to docs/interfaces.md
export const AgentRegistryAbi = [
  // Functions
  {
    type: "function",
    name: "registerAgent",
    inputs: [
      { name: "agentAccount", type: "address" },
      { name: "mandateHash", type: "bytes32" },
      { name: "mandateURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deactivateAgent",
    inputs: [{ name: "agentAccount", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMandate",
    inputs: [
      { name: "agentAccount", type: "address" },
      { name: "newHash", type: "bytes32" },
      { name: "mandateURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mandateOf",
    inputs: [{ name: "agentAccount", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "principal", type: "address" },
          { name: "mandateHash", type: "bytes32" },
          { name: "mandateURI", type: "string" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentAccount", type: "address", indexed: true },
      { name: "principal", type: "address", indexed: true },
      { name: "mandateHash", type: "bytes32", indexed: false },
      { name: "mandateURI", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AgentMandateUpdated",
    inputs: [
      { name: "agentAccount", type: "address", indexed: true },
      { name: "oldHash", type: "bytes32", indexed: false },
      { name: "newHash", type: "bytes32", indexed: false },
      { name: "mandateURI", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AgentDeactivated",
    inputs: [{ name: "agentAccount", type: "address", indexed: true }],
    anonymous: false,
  },
] as const;
