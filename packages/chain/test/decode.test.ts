import { describe, expect, it } from "vitest";
import { type Address, type Hex, encodeFunctionData, toFunctionSelector } from "viem";
import { RESERVED_SELECTOR_SET } from "@agentic-dao/policy";
import { decodeProposalCalls, decodeTx, selectorOf } from "../src/decode";
import { membershipTokenAbi, timelockAbi } from "../src/abis";

const TARGET: Address = "0x3333333333333333333333333333333333333333";
const MEMBER: Address = "0x1111111111111111111111111111111111111111";

const erc20Transfer = encodeFunctionData({
  abi: [
    { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  ],
  functionName: "transfer",
  args: [TARGET, 1000n],
});

describe("selectorOf", () => {
  it("returns the leading 4 bytes lowercased", () => {
    expect(selectorOf(erc20Transfer)).toBe(toFunctionSelector("transfer(address,uint256)"));
    expect(selectorOf(erc20Transfer)).toBe("0xa9059cbb");
  });

  it("returns 0x for bare value transfers / empty calldata", () => {
    expect(selectorOf("0x")).toBe("0x");
    expect(selectorOf("0x12" as Hex)).toBe("0x"); // < 4 bytes
  });
});

describe("decodeTx → ProposedAction shape", () => {
  it("decodes target + selector + value without an ABI", () => {
    const d = decodeTx({ to: TARGET, data: erc20Transfer, value: 0n });
    expect(d.target).toBe(TARGET);
    expect(d.selector).toBe("0xa9059cbb");
    expect(d.value).toBe(0n);
    expect(d.functionName).toBeUndefined();
  });

  it("resolves functionName + args when a matching ABI is supplied", () => {
    const data = encodeFunctionData({ abi: membershipTokenAbi, functionName: "delegate", args: [MEMBER] });
    const d = decodeTx({ to: TARGET, data }, membershipTokenAbi);
    expect(d.functionName).toBe("delegate");
    expect(d.args?.[0]).toBe(MEMBER);
    expect(d.selector).toBe(toFunctionSelector("delegate(address)"));
  });

  it("does not throw on an unknown selector for the supplied ABI", () => {
    const d = decodeTx({ to: TARGET, data: erc20Transfer }, membershipTokenAbi);
    expect(d.functionName).toBeUndefined();
    expect(d.selector).toBe("0xa9059cbb"); // raw shape still usable by policy
  });

  it("flags a reserved selector that policy will deny (updateDelay)", () => {
    const data = encodeFunctionData({ abi: timelockAbi, functionName: "updateDelay", args: [1n] });
    const d = decodeTx({ to: TARGET, data }, timelockAbi);
    expect(RESERVED_SELECTOR_SET.has(d.selector)).toBe(true);
  });

  it("treats empty calldata as a bare value transfer", () => {
    const d = decodeTx({ to: TARGET, value: 5n });
    expect(d.selector).toBe("0x");
    expect(d.value).toBe(5n);
    expect(d.data).toBe("0x");
  });
});

describe("decodeProposalCalls", () => {
  it("decodes a batch of (targets, values, calldatas)", () => {
    const calls = decodeProposalCalls([TARGET, TARGET], [0n, 7n], [erc20Transfer, "0x"]);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.selector).toBe("0xa9059cbb");
    expect(calls[1]?.selector).toBe("0x");
    expect(calls[1]?.value).toBe(7n);
  });

  it("throws on mismatched array lengths", () => {
    expect(() => decodeProposalCalls([TARGET], [0n, 1n], ["0x"])).toThrow(/length mismatch/);
  });
});
