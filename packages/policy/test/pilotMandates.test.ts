import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getAddress } from "viem";
import {
  validateMandate,
  RESERVED_SELECTORS,
  RESERVED_TARGET_SET,
  type Mandate,
} from "../src/index";

// packages/policy/test → repo root → mandates/pilot
const here = dirname(fileURLToPath(import.meta.url));
const pilotDir = resolve(here, "../../../mandates/pilot");

const files = readdirSync(pilotDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const mandates = files.map((f) => ({
  file: f,
  m: JSON.parse(readFileSync(resolve(pilotDir, f), "utf8")) as Mandate,
}));

describe("pilot mandates (mandates/pilot/*.json) — the Working Committee roster", () => {
  it("ships all four named agents", () => {
    expect(mandates.map(({ m }) => m.agentId).sort()).toEqual([
      "DILIGENCE-01",
      "GOV-01",
      "OPS-01",
      "TREAS-01",
    ]);
  });

  for (const { file, m } of mandates) {
    describe(file, () => {
      it("passes validateMandate", () => {
        const v = validateMandate(m);
        expect(v.errors).toEqual([]);
        expect(v.valid).toBe(true);
      });

      it("uses checksummed addresses everywhere", () => {
        const addrs = [m.principal, m.agentAccount, m.guardian, ...m.scope.allowedTargets];
        if (m.scope.spendingCap) addrs.push(m.scope.spendingCap.token);
        for (const a of addrs) expect(getAddress(a)).toBe(a);
      });

      it("forbids every reserved selector (defense-in-depth)", () => {
        const fb = new Set((m.scope.forbiddenSelectors ?? []).map((s) => s.toLowerCase()));
        for (const sel of RESERVED_SELECTORS) expect(fb.has(sel.toLowerCase())).toBe(true);
      });

      it("never allow-lists a ring-fenced (CougarDAO) target", () => {
        for (const t of m.scope.allowedTargets) {
          expect(RESERVED_TARGET_SET.has(t.toLowerCase())).toBe(false);
        }
      });
    });
  }

  it("DILIGENCE-01 is read/propose-only: no vote, no spending cap", () => {
    const d = mandates.find(({ m }) => m.agentId === "DILIGENCE-01")!.m;
    expect(d.scope.canVote).toBe(false);
    expect(d.scope.spendingCap ?? null).toBeNull();
    expect(d.scope.allowedTargets).toEqual([]);
  });

  it("OPS-01 and TREAS-01 carry a USDC spending cap (bounded operational authority)", () => {
    for (const id of ["OPS-01", "TREAS-01"]) {
      const a = mandates.find(({ m }) => m.agentId === id)!.m;
      expect(a.scope.spendingCap).toBeTruthy();
      expect(BigInt(a.scope.spendingCap!.perTx)).toBeGreaterThan(0n);
      expect(BigInt(a.scope.spendingCap!.perEpoch)).toBeGreaterThanOrEqual(
        BigInt(a.scope.spendingCap!.perTx),
      );
    }
  });
});
