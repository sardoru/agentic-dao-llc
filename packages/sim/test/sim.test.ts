import { describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import { AnvilForkSimulator, type CallClient } from "../src/anvilFork";
import { TenderlySimulator, type FetchLike } from "../src/tenderly";
import { makeSimulator } from "../src/factory";

const FROM: Address = "0x1111111111111111111111111111111111111111";
const TO: Address = "0x3333333333333333333333333333333333333333";
const DATA: Hex = "0xa9059cbb";

function mockFetch(body: unknown, ok = true, status = 200): FetchLike {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

describe("TenderlySimulator (mocked transport)", () => {
  it("maps a successful response → success + gas + asset deltas", async () => {
    const fetchImpl = mockFetch({
      transaction: {
        status: true,
        gas_used: 51234,
        transaction_info: {
          asset_changes: [
            { token_info: { contract_address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", symbol: "USDC" }, from: FROM, to: TO, raw_amount: "1000000" },
          ],
        },
      },
    });
    const sim = new TenderlySimulator({ account: "a", project: "p", accessKey: "k", chainId: 84532, defaultFrom: FROM, fetchImpl });
    const r = await sim.simulate({ to: TO, data: DATA });
    expect(r.success).toBe(true);
    expect(r.gasUsed).toBe(51234n);
    expect(r.backend).toBe("tenderly");
    expect(r.assetChanges).toHaveLength(2);
    expect(r.assetChanges?.[0]).toMatchObject({ account: FROM, delta: "-1000000", symbol: "USDC" });
    expect(r.assetChanges?.[1]).toMatchObject({ account: TO, delta: "1000000" });
  });

  it("maps a reverting response → success:false + reason", async () => {
    const fetchImpl = mockFetch({ transaction: { status: false, gas_used: 21000, error_message: "execution reverted: cap exceeded" } });
    const sim = new TenderlySimulator({ account: "a", project: "p", accessKey: "k", chainId: 84532, defaultFrom: FROM, fetchImpl });
    const r = await sim.simulate({ to: TO, data: DATA });
    expect(r.success).toBe(false);
    expect(r.revertReason).toMatch(/cap exceeded/);
  });

  it("throws on a non-200 HTTP response", async () => {
    const sim = new TenderlySimulator({ account: "a", project: "p", accessKey: "k", chainId: 84532, defaultFrom: FROM, fetchImpl: mockFetch({}, false, 401) });
    await expect(sim.simulate({ to: TO, data: DATA })).rejects.toThrow(/HTTP 401/);
  });

  it("requires a from address", async () => {
    const sim = new TenderlySimulator({ account: "a", project: "p", accessKey: "k", chainId: 84532, fetchImpl: mockFetch({}) });
    await expect(sim.simulate({ to: TO, data: DATA })).rejects.toThrow(/from is required/);
  });

  it("sends the access key header and correct network id", async () => {
    const fetchImpl = mockFetch({ transaction: { status: true, gas_used: 1 } });
    const sim = new TenderlySimulator({ account: "acct", project: "proj", accessKey: "secret", chainId: 84532, defaultFrom: FROM, fetchImpl });
    await sim.simulate({ to: TO, data: DATA, value: 5n });
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain("/account/acct/project/proj/simulate");
    expect(call[1].headers["X-Access-Key"]).toBe("secret");
    const sent = JSON.parse(call[1].body);
    expect(sent.network_id).toBe("84532");
    expect(sent.value).toBe("0x5");
  });
});

describe("AnvilForkSimulator (mocked call client)", () => {
  it("maps a successful eth_call → success + estimated gas", async () => {
    const client: CallClient = {
      call: vi.fn(async () => ({ data: "0x" as Hex })),
      estimateGas: vi.fn(async () => 42000n),
    };
    const sim = new AnvilForkSimulator({ rpcUrl: "http://x", defaultFrom: FROM, client });
    const r = await sim.simulate({ to: TO, data: DATA });
    expect(r.success).toBe(true);
    expect(r.gasUsed).toBe(42000n);
    expect(r.backend).toBe("anvil-fork");
  });

  it("maps a reverting eth_call → success:false + extracted reason", async () => {
    const client: CallClient = {
      call: vi.fn(async () => {
        throw { shortMessage: "execution reverted: RESERVED_MATTER" };
      }),
      estimateGas: vi.fn(async () => 0n),
    };
    const sim = new AnvilForkSimulator({ rpcUrl: "http://x", defaultFrom: FROM, client });
    const r = await sim.simulate({ to: TO, data: DATA });
    expect(r.success).toBe(false);
    expect(r.revertReason).toMatch(/RESERVED_MATTER/);
    expect((client.estimateGas as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("still succeeds when gas estimation fails", async () => {
    const client: CallClient = {
      call: vi.fn(async () => ({ data: "0x" as Hex })),
      estimateGas: vi.fn(async () => {
        throw new Error("estimate failed");
      }),
    };
    const sim = new AnvilForkSimulator({ rpcUrl: "http://x", defaultFrom: FROM, client });
    const r = await sim.simulate({ to: TO, data: DATA });
    expect(r.success).toBe(true);
    expect(r.gasUsed).toBe(0n);
  });
});

describe("makeSimulator", () => {
  it("returns Tenderly when fully configured", () => {
    const sim = makeSimulator({ TENDERLY_ACCOUNT: "a", TENDERLY_PROJECT: "p", TENDERLY_ACCESS_KEY: "k", fetchImpl: mockFetch({}) });
    expect(sim.backend).toBe("tenderly");
  });

  it("falls back to anvil-fork when Tenderly is not configured", () => {
    const sim = makeSimulator({ ANVIL_FORK_RPC_URL: "http://x", client: { call: async () => ({}), estimateGas: async () => 0n } });
    expect(sim.backend).toBe("anvil-fork");
  });

  it("falls back to anvil-fork when Tenderly is only partially configured", () => {
    const sim = makeSimulator({ TENDERLY_ACCOUNT: "a", client: { call: async () => ({}), estimateGas: async () => 0n } });
    expect(sim.backend).toBe("anvil-fork");
  });
});
