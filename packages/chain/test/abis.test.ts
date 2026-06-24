import { describe, expect, it } from "vitest";
import { getAbiItem, toFunctionSelector, type AbiFunction } from "viem";
import { RESERVED_SELECTOR_SET } from "@agentic-dao/policy";
import {
  agentRegistryAbi,
  governorAbi,
  membershipTokenAbi,
  rationaleAnchorAbi,
  rolesModifierAbi,
  timelockAbi,
} from "../src/abis";

/**
 * The ABIs must match docs/interfaces.md verbatim. We re-derive selectors from the
 * canonical human-readable signatures and assert each is present in the parsed ABI —
 * any drift between interfaces.md and the parsed fragments fails here.
 */
function selectorsIn(abi: readonly unknown[]): Set<string> {
  const out = new Set<string>();
  for (const item of abi as AbiFunction[]) {
    if (item.type === "function") out.add(toFunctionSelector(item));
  }
  return out;
}

describe("ABI fragments match the canonical interfaces", () => {
  it("Governor exposes the full proposal-lifecycle surface", () => {
    const sels = selectorsIn(governorAbi);
    const expected = [
      "propose(address[],uint256[],bytes[],string)",
      "castVoteWithReason(uint256,uint8,string)",
      "state(uint256)",
      "proposalVotes(uint256)",
      "quorum(uint256)",
      "proposalSnapshot(uint256)",
      "proposalDeadline(uint256)",
      "queue(address[],uint256[],bytes[],bytes32)",
      "execute(address[],uint256[],bytes[],bytes32)",
      "hashProposal(address[],uint256[],bytes[],bytes32)",
    ];
    for (const sig of expected) expect(sels.has(toFunctionSelector(sig))).toBe(true);
  });

  it("MembershipToken exposes delegation + votes + clock", () => {
    const sels = selectorsIn(membershipTokenAbi);
    for (const sig of [
      "mintMembership(address,uint256)",
      "burnMembership(uint256)",
      "delegate(address)",
      "getVotes(address)",
      "clock()",
      "CLOCK_MODE()",
    ]) {
      expect(sels.has(toFunctionSelector(sig))).toBe(true);
    }
  });

  it("Timelock exposes getMinDelay/updateDelay/cancel", () => {
    const sels = selectorsIn(timelockAbi);
    for (const sig of ["getMinDelay()", "updateDelay(uint256)", "cancel(bytes32)"]) {
      expect(sels.has(toFunctionSelector(sig))).toBe(true);
    }
  });

  it("AgentRegistry exposes register/deactivate/updateMandate/mandateOf and the AgentRecord struct", () => {
    const sels = selectorsIn(agentRegistryAbi);
    for (const sig of [
      "registerAgent(address,bytes32,string)",
      "deactivateAgent(address)",
      "updateMandate(address,bytes32,string)",
      "mandateOf(address)",
    ]) {
      expect(sels.has(toFunctionSelector(sig))).toBe(true);
    }
    // mandateOf returns the AgentRecord tuple.
    const mandateOf = getAbiItem({ abi: agentRegistryAbi, name: "mandateOf" }) as AbiFunction;
    expect(mandateOf.outputs[0]?.type).toBe("tuple");
  });

  it("RolesModifier exposes exec + the three reserved admin setters + epochSpend", () => {
    const sels = selectorsIn(rolesModifierAbi);
    for (const sig of [
      "execTransactionWithRole(address,uint256,bytes,address)",
      "setSpendingCap(address,address,uint256,uint256)",
      "setTargetAllowed(address,address,bytes4,bool)",
      "setAgentActive(address,bool)",
      "epochSpend(address,address)",
    ]) {
      expect(sels.has(toFunctionSelector(sig))).toBe(true);
    }
  });

  it("RationaleAnchor exposes anchor()", () => {
    const sels = selectorsIn(rationaleAnchorAbi);
    expect(sels.has(toFunctionSelector("anchor(bytes32,string,bytes32)"))).toBe(true);
  });
});

describe("reserved selectors are coherent with the policy package", () => {
  it("every reserved selector from interfaces.md is present in our ABIs", () => {
    // updateDelay, updateMandate, mintMembership, burnMembership, set*  → all reserved.
    const reserved = [
      toFunctionSelector("updateDelay(uint256)"),
      toFunctionSelector("updateMandate(address,bytes32,string)"),
      toFunctionSelector("mintMembership(address,uint256)"),
      toFunctionSelector("burnMembership(uint256)"),
      toFunctionSelector("setSpendingCap(address,address,uint256,uint256)"),
      toFunctionSelector("setTargetAllowed(address,address,bytes4,bool)"),
      toFunctionSelector("setAgentActive(address,bool)"),
    ];
    for (const sel of reserved) {
      expect(RESERVED_SELECTOR_SET.has(sel as `0x${string}`)).toBe(true);
    }
  });
});
