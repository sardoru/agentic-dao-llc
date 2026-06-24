import { describe, expect, it } from "vitest";
import { baseSepolia } from "viem/chains";
import { loadChainConfig, requireAddress, resolveChain } from "../src/env";

const ADDR = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

describe("loadChainConfig", () => {
  it("defaults to Base Sepolia / public RPC when env is empty", () => {
    const cfg = loadChainConfig({});
    expect(cfg.chainId).toBe(84532);
    expect(cfg.chain.id).toBe(baseSepolia.id);
    expect(cfg.rpcUrl).toBe("https://sepolia.base.org");
  });

  it("loads + checksums configured addresses", () => {
    const cfg = loadChainConfig({ GOVERNOR: ADDR.toLowerCase(), AGENT_REGISTRY: ADDR });
    expect(cfg.addresses.governor).toBe(ADDR); // checksummed
    expect(cfg.addresses.agentRegistry).toBe(ADDR);
    expect(cfg.addresses.timelock).toBeUndefined();
  });

  it("throws on a malformed address", () => {
    expect(() => loadChainConfig({ GOVERNOR: "0xnothex" })).toThrow(/not a valid address/);
  });

  it("throws on a non-positive chain id", () => {
    expect(() => loadChainConfig({ CHAIN_ID: "0" })).toThrow(/positive integer/);
  });

  it("resolves a swappable custom chain for a non-Base id", () => {
    const chain = resolveChain(11155420, "https://op");
    expect(chain.id).toBe(11155420);
    expect(chain.testnet).toBe(true);
  });
});

describe("requireAddress", () => {
  it("returns a configured address", () => {
    const cfg = loadChainConfig({ GOVERNOR: ADDR });
    expect(requireAddress(cfg.addresses, "governor", "GOVERNOR")).toBe(ADDR);
  });

  it("throws a clear error when an address is missing", () => {
    const cfg = loadChainConfig({});
    expect(() => requireAddress(cfg.addresses, "governor", "GOVERNOR")).toThrow(/GOVERNOR is not set/);
  });
});
