#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Scripted end-to-end agent — local anvil (build spec §5 Phase 4/6, §19, issue #1).
//
// Boots a local anvil, deploys the FULL system via the production `Deploy.s.sol`
// wiring, then drives the REAL agent runtime (`GovernanceCore` → policy → signer →
// signed tx) against the live chain. This is the spec's "scripted reference agent":
// it proves the policy chokepoint, the simulation-first gate, the rationale gate,
// the Reserved-Matter denial, the full propose→vote→queue→execute lifecycle, a
// bounded operational execution metered by the Roles modifier, and a guardian veto.
//
// Everything is testnet/local — anvil dev keys only, never a real key or real funds.
// Run:  pnpm e2e:local      (or: node scripts/e2e-local.mjs)
// Requires: anvil + forge on PATH; `pnpm build` already run (imports the dist barrels).
// ─────────────────────────────────────────────────────────────────────────────
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  http,
  encodeFunctionData,
  parseEther,
  pad,
  toHex,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { hashMandate, validateMandate } from "../packages/policy/dist/index.js";
import {
  makeContracts,
  makePublicClient,
  loadChainConfig,
  descriptionHash,
  selectorOf,
} from "../packages/chain/dist/index.js";
import { makeSimulator } from "../packages/sim/dist/index.js";
import { LocalSigner } from "../packages/signer/dist/index.js";
import { GovernanceCore, StubIpfsClient } from "../packages/mcp/dist/index.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.E2E_PORT ?? 8546);
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 31337;

// Standard anvil dev accounts (mnemonic "test test ... junk"). PUBLIC TEST KEYS.
const A = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    pk: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    pk: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    pk: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    pk: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    pk: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    pk: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  },
  {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    pk: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    pk: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  },
];
// Role assignment (deployer != guardian, enforced by Deploy.s.sol).
const DEPLOYER = A[0],
  GUARDIAN = A[1];
const MEMBER1 = A[2],
  MEMBER2 = A[3],
  MEMBER3 = A[4];
const AGENT1 = A[5],
  AGENT2 = A[6],
  OPAGENT = A[7];
const PAYEE = getAddress("0x000000000000000000000000000000000000bEEF");

// Fast governance timing so the demo runs in seconds (anvil time-warps do the waiting).
const VOTING_DELAY = 2,
  VOTING_PERIOD = 6,
  MIN_DELAY = 3;

const CHAIN = {
  id: CHAIN_ID,
  name: "anvil-e2e",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true,
};

// ── inline ABI fragments for things outside the chain package's wrappers ──
const TREASURY_ABI = [
  {
    type: "function",
    name: "withdrawETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
];
const UPDATE_DELAY_ABI = [
  {
    type: "function",
    name: "updateDelay",
    stateMutability: "nonpayable",
    inputs: [{ name: "newDelay", type: "uint256" }],
    outputs: [],
  },
];
const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];
const MEMBERSHIP_ABI = [
  {
    type: "function",
    name: "mintMembership",
    stateMutability: "nonpayable",
    inputs: [
      { name: "member", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
];
const ROLES_ABI = [
  {
    type: "function",
    name: "setAgentActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setTargetAllowed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setSpendingCap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
      { name: "perTx", type: "uint256" },
      { name: "perEpoch", type: "uint256" },
    ],
    outputs: [],
  },
];
const TIMELOCK_ABI = [
  {
    type: "function",
    name: "hashOperationBatch",
    stateMutability: "pure",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "payloads", type: "bytes[]" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "isOperationPending",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "isOperation",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
  },
];

// ── tiny test harness ──
let PASS = 0;
const ok = (c, m) => {
  if (!c) throw new Error(`ASSERT FAILED: ${m}`);
  PASS++;
  console.log(`   ✓ ${m}`);
};
const step = (m) => console.log(`\n▶ ${m}`);
const sub = (m) => console.log(`   · ${m}`);

async function main() {
  step("Boot local anvil");
  const anvil = spawn("anvil", ["--port", String(PORT), "--silent"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  let anvilErr = "";
  anvil.stderr?.on("data", (d) => {
    anvilErr += d.toString();
  });
  anvil.on("exit", (code) => {
    if (code) console.error(`anvil exited early (code ${code}):\n${anvilErr}`);
  });
  process.on("exit", () => {
    try {
      anvil.kill("SIGKILL");
    } catch {
      /* noop */
    }
  });
  process.on("SIGINT", () => {
    try {
      anvil.kill("SIGKILL");
    } catch {
      /* noop */
    }
    process.exit(1);
  });

  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  await waitFor(
    async () => {
      try {
        await pub.getBlockNumber();
        return true;
      } catch {
        return false;
      }
    },
    "anvil RPC",
    20000,
  );
  sub(`anvil up at ${RPC} (chainId ${CHAIN_ID})`);

  // ── Deploy via the production wiring (Deploy.s.sol → DAODeployer) ──
  step("Deploy contracts via Deploy.s.sol (the shipping constitutional wiring)");
  const addrs = deploy();
  for (const [k, v] of Object.entries(addrs)) sub(`${k.padEnd(16)} ${v}`);
  ok(
    addrs.MembershipToken &&
      addrs.DaoGovernor &&
      addrs.GuardedTimelock &&
      addrs.AgentRegistry &&
      addrs.RolesModifier &&
      addrs.Treasury,
    "all core contracts deployed",
  );

  // chain-package contract wrappers + a sim pointed at this anvil
  const config = loadChainConfig({
    RPC_URL: RPC,
    CHAIN_ID: String(CHAIN_ID),
    MEMBERSHIP_TOKEN: addrs.MembershipToken,
    GOVERNOR: addrs.DaoGovernor,
    TIMELOCK: addrs.GuardedTimelock,
    AGENT_REGISTRY: addrs.AgentRegistry,
    ROLES_MODIFIER: addrs.RolesModifier,
    RATIONALE_ANCHOR: addrs.RationaleAnchor,
    TREASURY_SAFE: addrs.Treasury,
    GUARDIAN_SAFE: addrs.Guardian,
  });
  const cpub = makePublicClient(config);
  const contracts = makeContracts(cpub, config.addresses);
  const simulator = makeSimulator({ ANVIL_FORK_RPC_URL: RPC, CHAIN_ID: String(CHAIN_ID) });

  const test = createTestClient({ chain: CHAIN, mode: "anvil", transport: http(RPC) });
  const wallet = (acct) =>
    createWalletClient({
      account: privateKeyToAccount(acct.pk),
      chain: CHAIN,
      transport: http(RPC),
    });

  // ── Seed: fund treasury, mint membership, delegate, register agent, configure Roles ──
  step("Seed the org (members, delegation, treasury, agent registration, Roles caps)");
  await test.setBalance({ address: addrs.Treasury, value: parseEther("100") });
  sub("treasury funded with 100 ETH (anvil_setBalance, mirrors vm.deal)");

  const guardianW = wallet(GUARDIAN);
  await send(
    pub,
    guardianW,
    addrs.MembershipToken,
    encodeFunctionData({
      abi: MEMBERSHIP_ABI,
      functionName: "mintMembership",
      args: [MEMBER1.address, 1n],
    }),
  );
  await send(
    pub,
    guardianW,
    addrs.MembershipToken,
    encodeFunctionData({
      abi: MEMBERSHIP_ABI,
      functionName: "mintMembership",
      args: [MEMBER2.address, 2n],
    }),
  );
  await send(
    pub,
    guardianW,
    addrs.MembershipToken,
    encodeFunctionData({
      abi: MEMBERSHIP_ABI,
      functionName: "mintMembership",
      args: [MEMBER3.address, 3n],
    }),
  );
  sub("guardian minted 3 soulbound membership tokens");

  await send(
    pub,
    wallet(MEMBER1),
    addrs.MembershipToken,
    contracts.token.delegateRequest(AGENT1.address).data,
  );
  await send(
    pub,
    wallet(MEMBER2),
    addrs.MembershipToken,
    contracts.token.delegateRequest(AGENT2.address).data,
  );
  await send(
    pub,
    wallet(MEMBER3),
    addrs.MembershipToken,
    contracts.token.delegateRequest(MEMBER3.address).data,
  );
  // Advance time so the delegation checkpoints are strictly in the past — OZ
  // Governor.propose/castVote read getVotes at clock()-1 (mirrors Base.t.sol warp+1).
  await warp(test, 2);
  ok(
    (await contracts.token.getVotes(AGENT1.address)) === 1n,
    "member1 → agent1 delegation gives 1 vote",
  );
  ok(
    (await contracts.token.getVotes(AGENT2.address)) === 1n,
    "member2 → agent2 delegation gives 1 vote",
  );
  ok(
    (await contracts.token.getVotes(MEMBER3.address)) === 1n,
    "member3 self-delegation gives 1 vote",
  );

  // Deploy the demo ERC20 the bounded op moves, and fund the Roles modifier with it.
  const mUSD = await deployMockERC20(pub, guardianW);
  sub(`demo ERC20 (mUSD) deployed: ${mUSD}`);
  await send(
    pub,
    guardianW,
    mUSD,
    encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "mint",
      args: [addrs.RolesModifier, 1_000_000_000_000n],
    }),
  );

  // Mandates (machine-readable bounds). Governance agent + a separate bounded-op agent.
  const govMandate = buildGovMandate(addrs);
  const opMandate = buildOpMandate(addrs, mUSD);
  for (const [m, name] of [
    [govMandate, "governance"],
    [opMandate, "op"],
  ]) {
    const v = validateMandate(m);
    ok(v.valid, `${name} mandate is schema-valid`);
  }
  const govHash = hashMandate(govMandate);
  await send(
    pub,
    wallet(MEMBER1),
    addrs.AgentRegistry,
    contracts.registry.registerAgentRequest(AGENT1.address, govHash, "ipfs://e2e-gov-mandate").data,
  );
  sub(`agent1 registered with on-chain mandateHash ${govHash.slice(0, 18)}…`);

  // Guardian configures the Roles modifier for the op agent (a Reserved Matter).
  const transferSel = selectorOf(
    encodeFunctionData({ abi: ERC20_ABI, functionName: "transfer", args: [PAYEE, 1n] }),
  );
  await send(
    pub,
    guardianW,
    addrs.RolesModifier,
    encodeFunctionData({
      abi: ROLES_ABI,
      functionName: "setAgentActive",
      args: [OPAGENT.address, true],
    }),
  );
  await send(
    pub,
    guardianW,
    addrs.RolesModifier,
    encodeFunctionData({
      abi: ROLES_ABI,
      functionName: "setTargetAllowed",
      args: [OPAGENT.address, mUSD, transferSel, true],
    }),
  );
  await send(
    pub,
    guardianW,
    addrs.RolesModifier,
    encodeFunctionData({
      abi: ROLES_ABI,
      functionName: "setSpendingCap",
      args: [OPAGENT.address, mUSD, 1_000_000_000n, 10_000_000_000n],
    }),
  );
  sub("guardian set op agent active + allow-listed transfer + caps (perTx 1000 mUSD)");

  // ── Build the runtime cores (the agents) ──
  const govCore = makeCore({
    mandate: govMandate,
    agent: AGENT1,
    contracts,
    simulator,
    config,
    addrs,
  });
  const a2Core = makeCore({
    mandate: voterMandate(addrs, AGENT2.address),
    agent: AGENT2,
    contracts,
    simulator,
    config,
    addrs,
  });
  const m3Core = makeCore({
    mandate: voterMandate(addrs, MEMBER3.address),
    agent: MEMBER3,
    contracts,
    simulator,
    config,
    addrs,
  });
  const opCore = makeCore({
    mandate: opMandate,
    agent: OPAGENT,
    contracts,
    simulator,
    config,
    addrs,
  });

  // ── Mandate hash verification through the runtime ──
  step("Runtime verifies the on-chain mandate hash (tamper-evidence)");
  const gm = await govCore.getMandate(AGENT1.address);
  ok(gm.ok && gm.data.verified, "getMandate: local doc hash matches AgentRegistry");

  // ── Negative proofs: the policy chokepoint denies before any broadcast ──
  step("Policy chokepoint denies non-compliant actions (no broadcast)");
  const happy = treasuryPayment(addrs, "0.5", "E2E: pay 0.5 ETH from treasury to payee");

  const rNoRat = await govCore.createProposal({ ...happy.input, rationale: "" });
  ok(!rNoRat.ok && rNoRat.rule === "RATIONALE_REQUIRED", "no rationale → RATIONALE_REQUIRED");

  const rNoSim = await govCore.createProposal({
    ...happy.input,
    rationale: "valid but not simulated",
  });
  ok(
    !rNoSim.ok && rNoSim.rule === "SIMULATION_REQUIRED",
    "no prior simulation → SIMULATION_REQUIRED",
  );

  const reservedAction = {
    kind: "propose",
    proposalType: "PARAM_TUNE_NONRESERVED",
    targets: [getAddress(addrs.GuardedTimelock)],
    selectors: [
      selectorOf(
        encodeFunctionData({ abi: UPDATE_DELAY_ABI, functionName: "updateDelay", args: [99n] }),
      ),
    ],
    values: [0n],
  };
  const rReserved = await govCore.simulateAction(reservedAction, {
    from: AGENT1.address,
    to: addrs.GuardedTimelock,
    data: encodeFunctionData({ abi: UPDATE_DELAY_ABI, functionName: "updateDelay", args: [99n] }),
    value: 0n,
  });
  ok(
    !rReserved.ok && rReserved.rule === "RESERVED_MATTER",
    "updateDelay (a Reserved Matter) → RESERVED_MATTER, not constructable",
  );

  const overCap = await opCore.opExecute({
    target: mUSD,
    selector: transferSel,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [PAYEE, 2_000_000_000n],
    }),
    value: 0n,
    token: mUSD,
    amount: 2_000_000_000n,
    epochSpend: 0n,
    rationale: "over the per-tx cap",
  });
  ok(
    !overCap.ok && overCap.rule === "PER_TX_CAP_EXCEEDED",
    "op over the per-tx cap → PER_TX_CAP_EXCEEDED",
  );

  // ── Full lifecycle through the runtime: propose → vote → queue → execute ──
  step("Governance lifecycle through the runtime (propose → vote → queue → execute)");
  const pid1 = await proposeViaRuntime(
    pub,
    govCore,
    AGENT1,
    happy,
    "agent1: invoice is valid, within budget",
  );
  ok((await contracts.governor.state(pid1)) === 0, "proposal state = Pending");

  await warp(test, VOTING_DELAY + 1);
  ok((await contracts.governor.state(pid1)) === 1, "after votingDelay → Active");

  await voteViaRuntime(pub, govCore, AGENT1, pid1, 1, "agent1: FOR");
  await voteViaRuntime(pub, a2Core, AGENT2, pid1, 1, "agent2: FOR");
  await voteViaRuntime(pub, m3Core, MEMBER3, pid1, 1, "member3: FOR");
  const [against1, for1] = await contracts.governor.proposalVotes(pid1);
  ok(for1 === 3n && against1 === 0n, "tally = 3 FOR / 0 AGAINST");

  await warp(test, VOTING_PERIOD + 1);
  ok((await contracts.governor.state(pid1)) === 4, "after votingPeriod → Succeeded");

  const dh1 = descriptionHash(happy.description);
  await send(
    pub,
    wallet(DEPLOYER),
    addrs.DaoGovernor,
    contracts.governor.queueRequest(happy.targets, happy.values, happy.calldatas, dh1).data,
  );
  ok((await contracts.governor.state(pid1)) === 5, "queue → Queued in the timelock");

  let prematureReverted = false;
  try {
    const ex = contracts.governor.executeRequest(happy.targets, happy.values, happy.calldatas, dh1);
    const h = await wallet(DEPLOYER).sendTransaction({ to: ex.to, data: ex.data, value: ex.value });
    const rc = await pub.waitForTransactionReceipt({ hash: h });
    prematureReverted = rc.status === "reverted";
  } catch {
    prematureReverted = true;
  }
  ok(prematureReverted, "execute BEFORE the timelock delay reverts (guardian veto window holds)");

  await warp(test, MIN_DELAY + 1);
  const payeeBefore = await pub.getBalance({ address: PAYEE });
  const ex1 = contracts.governor.executeRequest(happy.targets, happy.values, happy.calldatas, dh1);
  await send(pub, wallet(DEPLOYER), addrs.DaoGovernor, ex1.data, ex1.value);
  ok((await contracts.governor.state(pid1)) === 7, "after minDelay → Executed");
  ok(
    (await pub.getBalance({ address: PAYEE })) - payeeBefore === parseEther("0.5"),
    "treasury paid payee exactly 0.5 ETH",
  );

  // ── Bounded operational execution (metered by the Roles modifier) ──
  step("Bounded operational execution within cap (Roles-metered, sim-gated)");
  const opAmount = 500_000_000n; // 500 mUSD, within perTx 1000
  const transferData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [PAYEE, opAmount],
  });
  const opAction = {
    kind: "opExecute",
    target: mUSD,
    selector: transferSel,
    value: 0n,
    token: mUSD,
    amount: opAmount,
  };
  const opTx = contracts.roles.execTransactionWithRoleRequest(
    mUSD,
    0n,
    transferData,
    OPAGENT.address,
  );
  const opSim = await opCore.simulateAction(opAction, {
    from: OPAGENT.address,
    to: opTx.to,
    data: opTx.data,
    value: 0n,
  });
  ok(opSim.ok, "op simulates successfully (opens the sim-gate)");
  const opWrite = await opCore.opExecute({
    target: mUSD,
    selector: transferSel,
    data: transferData,
    value: 0n,
    token: mUSD,
    amount: opAmount,
    epochSpend: 0n,
    rationale: "pay recurring invoice in mUSD, within cap",
  });
  ok(opWrite.ok, "opExecute passes policy + signer, returns a signed tx");
  await broadcast(pub, opWrite.data.signedTx, "op");
  ok(
    (await pub.readContract({
      address: mUSD,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [PAYEE],
    })) === opAmount,
    "payee received 500 mUSD via the scoped Roles modifier",
  );
  ok(
    (await contracts.roles.epochSpend(OPAGENT.address, mUSD)) === opAmount,
    "Roles modifier metered 500 mUSD against the epoch cap",
  );

  // ── Guardian veto: cancel a separate queued proposal inside the delay window ──
  step("Guardian veto (cancel a queued proposal inside the delay window)");
  const cancelPay = treasuryPayment(addrs, "0.25", "E2E cancel: pay 0.25 ETH to payee");
  const pid2 = await proposeViaRuntime(
    pub,
    govCore,
    AGENT1,
    cancelPay,
    "agent1: routine payment (will be vetoed)",
  );
  await warp(test, VOTING_DELAY + 1);
  await voteViaRuntime(pub, govCore, AGENT1, pid2, 1, "agent1: FOR");
  await voteViaRuntime(pub, a2Core, AGENT2, pid2, 1, "agent2: FOR");
  await voteViaRuntime(pub, m3Core, MEMBER3, pid2, 1, "member3: FOR");
  await warp(test, VOTING_PERIOD + 1);
  const dh2 = descriptionHash(cancelPay.description);
  await send(
    pub,
    wallet(DEPLOYER),
    addrs.DaoGovernor,
    contracts.governor.queueRequest(cancelPay.targets, cancelPay.values, cancelPay.calldatas, dh2)
      .data,
  );
  ok((await contracts.governor.state(pid2)) === 5, "second proposal Queued");

  // OZ GovernorTimelockControl salts the timelock op with bytes20(governor) ^ descHash.
  const salt = toHex(
    BigInt(pad(getAddress(addrs.DaoGovernor), { dir: "right", size: 32 })) ^ BigInt(dh2),
    { size: 32 },
  );
  const opId = await pub.readContract({
    address: addrs.GuardedTimelock,
    abi: TIMELOCK_ABI,
    functionName: "hashOperationBatch",
    args: [
      cancelPay.targets,
      cancelPay.values,
      cancelPay.calldatas,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      salt,
    ],
  });
  ok(
    await pub.readContract({
      address: addrs.GuardedTimelock,
      abi: TIMELOCK_ABI,
      functionName: "isOperationPending",
      args: [opId],
    }),
    "timelock op is pending",
  );
  await send(
    pub,
    guardianW,
    addrs.GuardedTimelock,
    encodeFunctionData({ abi: TIMELOCK_ABI, functionName: "cancel", args: [opId] }),
  );
  ok(
    !(await pub.readContract({
      address: addrs.GuardedTimelock,
      abi: TIMELOCK_ABI,
      functionName: "isOperation",
      args: [opId],
    })),
    "guardian cancelled the queued op",
  );

  await warp(test, MIN_DELAY + 1);
  let vetoHeld = false;
  try {
    const ex = contracts.governor.executeRequest(
      cancelPay.targets,
      cancelPay.values,
      cancelPay.calldatas,
      dh2,
    );
    const h = await wallet(DEPLOYER).sendTransaction({ to: ex.to, data: ex.data, value: ex.value });
    const rc = await pub.waitForTransactionReceipt({ hash: h });
    vetoHeld = rc.status === "reverted";
  } catch {
    vetoHeld = true;
  }
  ok(vetoHeld, "execute of the vetoed proposal reverts — the guardian cancel held");

  console.log(
    `\n✅ scripted end-to-end agent complete — ${PASS} assertions passed against live anvil\n`,
  );
  anvil.kill("SIGKILL");
}

// ── runtime helpers ──────────────────────────────────────────────────────────

/** Assemble a GovernanceCore for one agent: real sim + signer + stub IPFS + chain wrappers. */
function makeCore({ mandate, agent, contracts, simulator, config, addrs }) {
  const deps = {
    indexer: { listProposals: notUsed, getProposal: notUsed, getQuorumStatus: notUsed },
    simulator,
    signer: new LocalSigner({ privateKey: agent.pk }),
    ipfs: new StubIpfsClient(),
    contracts,
    mandate,
    agentAccount: getAddress(agent.address),
    // gas/fees generous for anvil; nonce is refreshed live before each write.
    txDefaults: {
      chainId: config.chainId,
      gas: 3_000_000n,
      maxFeePerGas: 50_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      nonce: 0,
    },
  };
  const core = new GovernanceCore(deps);
  core.__deps = deps; // keep a handle so we can refresh the nonce per write
  core.__addrs = addrs;
  return core;
}
const notUsed = async () => {
  throw new Error("indexer not used in the e2e harness");
};

/** Simulate + create a proposal through the runtime, broadcast the signed tx, return the proposalId. */
async function proposeViaRuntime(pub, core, agent, p, rationale) {
  await refreshNonce(pub, core, agent.address);
  const sim = await core.simulateAction(p.action, {
    from: agent.address,
    to: core.__addrs.DaoGovernor,
    data: p.proposeData(core),
    value: 0n,
  });
  if (!sim.ok) sub(`sim error: ${sim.error} (rule ${sim.rule ?? "-"})`);
  ok(sim.ok, `simulate propose "${p.description.slice(0, 32)}…"`);
  await refreshNonce(pub, core, agent.address);
  const res = await core.createProposal({ ...p.input, rationale });
  ok(
    res.ok,
    `createProposal passes policy + signer (rationale pinned ${res.ok ? res.data.rationale.uri.slice(0, 16) : ""}…)`,
  );
  await broadcast(pub, res.data.signedTx, "propose");
  // proposalId = governor.hashProposal(targets, values, calldatas, descHash)
  return coreContracts(core).governor.hashProposal(
    p.targets,
    p.values,
    p.calldatas,
    descriptionHash(p.description),
  );
}

/** Simulate + cast a vote through the runtime, broadcast it. */
async function voteViaRuntime(pub, core, agent, proposalId, support, reason) {
  const action = { kind: "castVote", proposalId, support };
  const tx = coreContracts(core).governor.castVoteWithReasonRequest(proposalId, support, reason);
  await refreshNonce(pub, core, agent.address);
  const sim = await core.simulateAction(action, {
    from: agent.address,
    to: tx.to,
    data: tx.data,
    value: 0n,
  });
  ok(sim.ok, `simulate vote (${reason})`);
  await refreshNonce(pub, core, agent.address);
  const res = await core.castVote({ proposalId, support, reason });
  ok(res.ok, `castVote passes policy + signer (${reason})`);
  await broadcast(pub, res.data.signedTx, "vote");
}

function coreContracts(core) {
  return core.__deps.contracts;
}

async function refreshNonce(pub, core, address) {
  core.__deps.txDefaults.nonce = await pub.getTransactionCount({
    address: getAddress(address),
    blockTag: "pending",
  });
}

async function broadcast(pub, signedTx, label) {
  const hash = await pub.sendRawTransaction({ serializedTransaction: signedTx });
  const rc = await pub.waitForTransactionReceipt({ hash });
  ok(rc.status === "success", `broadcast ${label} tx mined (status success)`);
  return rc;
}

/** Send a plain admin/seed tx via a wallet client (auto nonce); assert success. */
async function send(pub, walletClient, to, data, value = 0n) {
  const hash = await walletClient.sendTransaction({ to: getAddress(to), data, value });
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`seed tx to ${to} reverted`);
  return rc;
}

async function warp(test, seconds) {
  await test.increaseTime({ seconds });
  await test.mine({ blocks: 1 });
}

// ── proposal payload builder (mirrors GovernanceCore's action construction) ──
function treasuryPayment(addrs, eth, description) {
  const targets = [getAddress(addrs.Treasury)];
  const values = [0n];
  const calldatas = [
    encodeFunctionData({
      abi: TREASURY_ABI,
      functionName: "withdrawETH",
      args: [PAYEE, parseEther(eth)],
    }),
  ];
  const input = { proposalType: "TREASURY_PAYMENT", targets, values, calldatas, description };
  const action = {
    kind: "propose",
    proposalType: "TREASURY_PAYMENT",
    targets,
    selectors: calldatas.map(selectorOf),
    values,
  };
  return {
    targets,
    values,
    calldatas,
    description,
    input,
    action,
    proposeData: (core) =>
      coreContracts(core).governor.proposeRequest(targets, values, calldatas, description).data,
  };
}

// ── mandates ──
const COMMON = {
  version: "1.0",
  requireSimulation: true,
  rationaleStorage: "ipfs",
  createdAt: "2026-01-01T00:00:00Z",
  expiresAt: "2030-12-31T23:59:59Z",
};
function buildGovMandate(addrs) {
  return {
    ...COMMON,
    agentId: "e2e-governance-agent",
    principal: getAddress(MEMBER1.address),
    agentAccount: getAddress(AGENT1.address),
    guardian: getAddress(addrs.Guardian),
    scope: {
      canPropose: true,
      canVote: true,
      proposalTypes: ["TREASURY_PAYMENT", "TEXT_SIGNAL", "PARAM_TUNE_NONRESERVED"],
      // timelock is included ONLY so the Reserved-Matter guard (not the target
      // allow-list) is what denies the updateDelay attempt — isolating that proof.
      allowedTargets: [getAddress(addrs.Treasury), getAddress(addrs.GuardedTimelock)],
      forbiddenSelectors: [],
      spendingCap: null,
    },
  };
}
function voterMandate(addrs, agentAccount) {
  return {
    ...COMMON,
    agentId: `e2e-voter-${agentAccount.slice(2, 8)}`,
    principal: getAddress(agentAccount),
    agentAccount: getAddress(agentAccount),
    guardian: getAddress(addrs.Guardian),
    scope: {
      canPropose: false,
      canVote: true,
      proposalTypes: [],
      allowedTargets: [],
      forbiddenSelectors: [],
      spendingCap: null,
    },
  };
}
function buildOpMandate(addrs, mUSD) {
  return {
    ...COMMON,
    agentId: "e2e-op-agent",
    principal: getAddress(MEMBER2.address),
    agentAccount: getAddress(OPAGENT.address),
    guardian: getAddress(addrs.Guardian),
    scope: {
      canPropose: false,
      canVote: false,
      proposalTypes: [],
      allowedTargets: [getAddress(mUSD)],
      forbiddenSelectors: [],
      spendingCap: {
        token: getAddress(mUSD),
        perTx: "1000000000",
        perEpoch: "10000000000",
        epochSeconds: 604800,
      },
    },
  };
}

// ── forge deploy + parse ──
function deploy() {
  // Compile everything (incl. test/MockERC20 which the bounded-op demo deploys) so the
  // harness works on a fresh checkout — `forge script` alone wouldn't build test/ contracts.
  const b = spawnSync("forge", ["build"], { cwd: resolve(ROOT, "contracts"), encoding: "utf8" });
  if (b.status !== 0) {
    console.error((b.stdout ?? "") + (b.stderr ?? ""));
    throw new Error("forge build failed");
  }
  const env = {
    ...process.env,
    GUARDIAN_SAFE: GUARDIAN.address,
    VOTING_DELAY: String(VOTING_DELAY),
    VOTING_PERIOD: String(VOTING_PERIOD),
    TIMELOCK_MIN_DELAY: String(MIN_DELAY),
    PROPOSAL_THRESHOLD: "1",
    QUORUM_NUMERATOR: "30",
  };
  const r = spawnSync(
    "forge",
    [
      "script",
      "script/Deploy.s.sol:Deploy",
      "--rpc-url",
      RPC,
      "--broadcast",
      "--private-key",
      DEPLOYER.pk,
      "--skip-simulation",
    ],
    { cwd: resolve(ROOT, "contracts"), env, encoding: "utf8" },
  );
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  if (r.status !== 0) {
    console.error(out);
    throw new Error("forge script Deploy failed");
  }
  const grab = (label) => {
    const m = out.match(new RegExp(`${label}:\\s*(0x[0-9a-fA-F]{40})`));
    if (!m) {
      console.error(out);
      throw new Error(`could not parse ${label} from forge output`);
    }
    return getAddress(m[1]);
  };
  return {
    MembershipToken: grab("MembershipToken"),
    GuardedTimelock: grab("TimelockController"),
    DaoGovernor: grab("DaoGovernor"),
    AgentRegistry: grab("AgentRegistry"),
    RolesModifier: grab("RolesModifier"),
    RationaleAnchor: grab("RationaleAnchor"),
    Treasury: grab("Treasury"),
    Guardian: grab("Guardian"),
  };
}

async function deployMockERC20(pub, walletClient) {
  const art = JSON.parse(
    readFileSync(resolve(ROOT, "contracts/out/Base.t.sol/MockERC20.json"), "utf8"),
  );
  const hash = await walletClient.deployContract({ abi: art.abi, bytecode: art.bytecode.object });
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (!rc.contractAddress) throw new Error("MockERC20 deploy produced no address");
  return getAddress(rc.contractAddress);
}

async function waitFor(fn, what, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timed out waiting for ${what}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
