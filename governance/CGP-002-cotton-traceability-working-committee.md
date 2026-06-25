# CGP-002 — Cotton Traceability Working Committee (Working Committee #2)

|                 |                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **Proposal ID** | CGP-002                                                                                               |
| **Title**       | Cotton Traceability Working Committee — a second agentic working group for verifiable crop origin     |
| **Status**      | Draft / concept — proposed for **2027**, contingent on the success of Part 1 (CGP-001)                |
| **Type**        | Operational working-group charter (programmable-settlement / supply-chain mandate)                    |
| **Framework**   | CougarDAO ← Working Committee DAO (the CGP-001 pattern, applied to a new mandate)                      |
| **Sponsor**     | DILIGENCE-style origin agent + human ratification (see §6)                                            |
| **Companions**  | Silverleafe cotton contracts (`sardoru/silverleafe-cotton-tokens`), FarmMapper (Farmapper LLC), Cotton OS |
| **Author**      | Working Committee (draft for member discussion)                                                       |

> **Testnet / concept only.** Nothing here moves real funds, real warehouse title, or real legal
> instruments. It reuses the Part-1 safety spine (Reserved Matters, a human Guardian, $COUG-majority
> ratification). Federally-regulated artifacts (EWRs, CCC loans) are modeled and **attested**, never
> unilaterally issued by an agent.

---

## 1. TL;DR

Part 1 (CGP-001) proved that **bounded AI agents can help govern a DAO** inside a ring-fenced sandbox.
**Part 2 points that same machine at a real job**: governing the **verifiable origin and chain-of-custody
of a physical commodity — cotton fiber — recorded as on-chain checkpoints.**

The committee issues a **Digital Birth Certificate** (an origin token) for a crop, minted from the
**FarmMapper KML boundary** of land CougarDAO actually owns (the 160-acre Haxtun, Colorado quarter-section),
then traces the fiber through its real lifecycle as verifiable checkpoints:

```
Birth Certificate (origin)  →  MODULE (harvest)  →  GIN  →  ~4 BALES + PBI  →  WAREHOUSE  →  EWR  →  tokenized EWR
   FarmMapper KML NFT          RFID/GPS/JD data    burn    12-digit PBI + HVI    net wt + holder   title    fractions / collateral
```

It **dogfoods three partner projects at once**: **FarmMapper** (James McCall — origin geometry),
**Silverleafe** (Sardor/PFICO — the on-chain primitives), and **the agentic Working Committee** (Part 1 —
the governance wrapper). Each is run by a partner who is also a **CougarDAO member**, so the committee is
quite literally the DAO using its own members' tools to manage its own land's output.

---

## 2. Why — the rationale

1. **Dogfooding our partners (the explicit goal).** CougarDAO's members *are* the supply chain:
   **James McCall** runs **FarmMapper** (PLSS-based farm mapping with native **KML / Google Earth export**);
   **Sardor Umarov** builds the **Silverleafe** cotton-traceability stack; **Angelo Alessio** runs the
   build_cities civic layer. Part 2 wires these together instead of leaving them as separate demos.
2. **A real problem worth solving — the severed-origin gap.** In the physical chain, John Deere harvesters
   capture GPS/RFID origin at harvest, but that origin is **severed at the gin**, where many growers' cotton
   is pooled before the **PBI** (Permanent Bale Identification) is even assigned. The PBI is *"a VIN, not a
   passport"* — it identifies a bale but does not prove where the fiber was grown. A **Birth Certificate
   minted *before* the gin** closes exactly that gap.
3. **Regulatory tailwinds make 2027 the right window.** The **Buying American Cotton Act** (calls for a
   "trustworthy supply-chain tracing system"), the **EU Digital Product Passport** (rollout from 2027), the
   **EU Forced Labour Regulation** (applies **14 Dec 2027**), and **UFLPA** (US-origin proof) all reward
   exactly this capability. The **USDA EWR provider switching window opens 1 June 2027**.
4. **It graduates the agentic-governance thesis** from a self-referential sandbox to a revenue-relevant,
   externally-auditable use case — the strongest possible "building in public" proof.

---

## 3. The concept in full — origin-to-EWR as on-chain checkpoints

Each stage is a **verifiable checkpoint**: an on-chain state transition whose heavy evidence (telemetry,
gin reports, classing, weight tickets, BOLs, DNA results) lives off-chain, with only a **keccak256 hash
anchored on-chain** (`appendDataHash`/`verifyDataHash`). Identity at every hop is gated by an
**ERC-3643-style ComplianceRegistry** (PRODUCER / GIN / WAREHOUSE / MERCHANT / MILL / LENDER / AUDITOR).

| # | Checkpoint | What it is | Primitive (Silverleafe) | Evidence anchored |
| - | ---------- | ---------- | ----------------------- | ----------------- |
| 0 | **Digital Birth Certificate** | Origin token: the field's **FarmMapper KML** boundary (PLSS Township/Range/Section + acreage), crop year, producer | new `OriginCertificate` (ERC-721) referencing the KML + a deed/PLSS hash | KML file hash, deed/legal-description hash, McCall (FarmMapper) attestation |
| 1 | **Module** | Harvest unit; carries RFID + GPS + John Deere machine/operator IDs; **references the Birth Certificate** | `CottonModule.sol` (ERC-721, **burned at the gin**) | harvest telemetry hash |
| 2 | **Gin → Bales** | Module burned; **~4 bales** minted, each stamped with a **12-digit PBI** (5-digit USDA gin code + 7-digit bale no.) | `CottonBaleNFT.sol` (ERC-721) | gin report hash; key on `(PBI, crop_year)` |
| 3 | **Classing** | USDA-AMS **HVI** grade (color, leaf, staple, mic, strength, uniformity) | bale metadata + DataAnchor | HVI full-report hash |
| 4 | **Warehouse → EWR** | Bale stored in a USDA-licensed warehouse; an **Electronic Warehouse Receipt** (document of title) is issued | `CottonEWR.sol` (`issueReceipt`, `transferReceipt`, `placeLien`/`releaseLien`) | weight ticket, warehouse location (e.g. Staplcotn shed/cell) |
| 5 | **Tokenized EWR** | The receipt as a transferable on-chain title; optional **fractions** for investor ownership / collateral | `CottonBaleFractions.sol` (ERC-1155, 10,000 fractions) | — |

**Forensic anchor (optional, partner pipeline):** **Haelixa** synthetic-DNA markers (ETH Zürich spin-off)
survive the spinner laydown and give a physical, lab-verifiable origin proof to pair with the digital
Birth Certificate — defense against "draw any polygon in FarmMapper" spoofing.

**The result:** a single fiber lot you can follow from a CougarDAO-owned field to a collateral-grade
warehouse receipt, every hop signed, gated to verified parties, and explainable in plain English by the
committee's Secretary.

---

## 4. Why each partner project is dogfooded

- **FarmMapper (James McCall) — the origin layer.** FarmMapper already exports a field's boundary as a
  standard **KML** (with embedded acreage/attributes) and can publish it to a **public URL**. That KML is
  the canonical geometry payload for the Birth Certificate. Because McCall is a CougarDAO member, his tool
  is the *natural* surveyor-of-record for the DAO's own land.
- **Silverleafe (Sardor / PFICO) — the primitives + the OS.** The five Silverleafe contracts (Module / Bale
  / Fractions / EWR / Compliance) **are** the checkpoint engine. **Cotton OS** supplies the GS1 Digital-Link /
  EPCIS **commodity passport** + the USDA EWR registry; **Staplcotn Plant OS** supplies real warehouse
  `location_of_bale` data (West Memphis, 19 sheds); the **Cotton EWR Provider** build is the path to issuing
  real EWRs under USDA 7 CFR Part 869.
- **Agentic Working Committee (Part 1) — the governance wrapper.** CGP-001's pattern (bounded mandates,
  Reserved Matters, Guardian, Secretary, $COUG-majority ratification) is reused verbatim; only the *mandate
  surface* changes from "treasury ops" to "origin/custody attestation."

---

## 5. The Haxtun farm — origin proof-of-concept (one assumption to confirm)

CougarDAO owns a **160-acre quarter-section near Haxtun, Colorado** (Phillips County), closed Dec 2022,
leased to a tenant farmer, with rents distributed to $COUG holders. A clean PLSS quarter-section maps
perfectly onto FarmMapper's Township/Range/Section model — ideal for the Birth Certificate PoC.

**Open question (the one thing to confirm):** NE Colorado is dryland **wheat/corn** country, not cotton.
So Part 2 should run in one of two modes — recommend **(b)**:

- **(a) Literal:** if/when a cotton crop is actually sourced through the committee, the Haxtun certificate is
  its true origin.
- **(b) Template (recommended):** **Haxtun is the worked origin example** — real DAO-owned land, a real
  FarmMapper KML, a real Birth Certificate NFT — and **cotton is the flagship traceability vertical** run
  end-to-end with a real gin/warehouse partner (e.g. **Cherokee Gin** code `07511`, **Staplcotn** West
  Memphis). The pattern is crop-agnostic; cotton is where the Silverleafe stack and the regulatory upside
  live. We should state plainly that the Haxtun certificate proves *origin mechanics*, and the cotton lot
  proves *the full chain* — rather than claim Haxtun grows cotton.

---

## 6. How the committee governs it (the Part-2 agentic design)

Same spine as CGP-001 — a ring-fenced mandate, equal-weight agents, **60% quorum**, **$COUG-majority binds**,
a human **Guardian** holding all admin + a cancel window + kill switch, and **Reserved Matters** that forbid
touching $COUG / CougarDAO production assets. The committee is a **filter**, not the final authority.

| Agent | Kind | Mandate (bounded) | Human ratification |
| ----- | ---- | ----------------- | ------------------ |
| **ORIGIN-01** | operational | Mint/attest **Birth Certificate** NFTs from a verified FarmMapper KML + deed hash; validate PLSS geometry | required to mint against a new parcel |
| **CLASS-01** | advisory (read-only) | Validate HVI/classing + origin claims; flag mismatches; produce diligence memos | n/a (advisory) |
| **CUSTODY-01** | operational | Record module→gin→bale→warehouse checkpoints within caps; anchor evidence hashes | required above a value/impact threshold |
| **EWR-01** | operational | Issue/transfer **tokenized-EWR** receipts in the sandbox; lien place/release | **always** for holder-of-record / lien / CCC actions |
| **SECRETARY-02** | scribe | Record every checkpoint, explain quorum/votes, publish public minutes (building in public) | n/a |

**Reserved Matters (additions for Part 2):** no unilateral issuance/transfer of a *legally-effective* EWR
or lien (testnet attestations only until a licensed warehouseman + USDA provider are in the loop); no
tokenization of legal title without counsel sign-off; origin minting requires a deed/PLSS hash, not just a
drawn polygon.

---

## 7. Phased roadmap (2026 → 2028)

- **Phase 0 — Concept & PoC (late 2026, gated on Part 1 success).** Ratify this charter as a concept; draw
  the Haxtun KML in FarmMapper; mint a **demo Birth Certificate** on testnet; stand up the Silverleafe
  contracts on an Orbit devnet. *Exit:* a Birth Certificate NFT exists for real DAO land.
- **Phase 1 — Charter & end-to-end testnet (H1 2027).** On-chain CGP-002 vote stands up Working Committee
  #2; deploy ORIGIN/CLASS/CUSTODY/EWR/SECRETARY agents + mandates; trace a *simulated* lot
  Birth-Cert→Module→Bale(PBI)→EWR on Base Sepolia / Orbit devnet; Secretary publishes the checkpoints.
  *Exit:* full chain demonstrated, governed, human-ratified at the gates.
- **Phase 2 — Real lot pilot (H2 2027).** One **real** cotton bale lot traced with a gin + warehouse partner
  (Cherokee Gin / Staplcotn); add a **Haelixa DNA** checkpoint; produce a **tokenized-EWR** demo + a Cotton
  OS commodity-passport PDF (GS1 Digital Link QR). *Exit:* a real-world lot with a verifiable digital twin.
- **Phase 3 — Productize (2028+).** Pursue the **USDA EWR provider** path (WA-460 / WA-460-1), CCC-loan
  integration, EU DPP passport export, and tokenized cotton lots (e.g. Hyperliquid HIP-3). *Gate noted:* EWR
  provider switching window **1 June 2027**.

---

## 8. Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| **Origin spoofing** (anyone can draw a polygon) | Require deed/PLSS hash + FarmMapper (McCall) attestation; pair with **Haelixa DNA**; ComplianceRegistry-gated PRODUCER role |
| **Regulatory** (EWRs/CCC are federally regulated) | Testnet attestations only; **human ratification** for any holder-of-record/lien; no legal-title tokenization without counsel; partner with a licensed warehouseman + USDA provider before anything binding |
| **Crop mismatch at Haxtun** | Frame Haxtun as the origin-mechanics PoC; run cotton as the vertical with a real Southern gin (see §5) |
| **Incumbent concentration** (EWR, Inc. ≈ near-monopoly) | Position as complementary attestation first; pursue provider status only via the formal WA-460 path |
| **Agent overreach** | Reserved Matters + caps + Guardian kill switch + $COUG-majority binding (inherited from CGP-001) |
| **Securities exposure** (EWR fractions) | Keep fractions to sandbox/demo; counsel review before any real offering; Wyoming DAO-LLC wrapper |

---

## 9. Success criteria

1. A **Birth Certificate NFT** exists for the real CougarDAO Haxtun parcel, minted from a FarmMapper KML.
2. **One cotton lot** traced end-to-end (origin → module → bale/PBI → warehouse → EWR) as on-chain
   checkpoints, with off-chain evidence hash-anchored and a DNA checkpoint.
3. A **tokenized-EWR** demo + a GS1 commodity-passport artifact.
4. The whole flow **governed by Working Committee #2** with human ratification at the legal gates, narrated
   publicly by the Secretary.
5. **All three partner projects dogfooded** (FarmMapper origin, Silverleafe primitives, agentic governance).

---

## 10. Relationship to CougarDAO & Part 1

Part 2 **reuses** the CGP-001 safety architecture (no new trust assumptions) and remains a **filter** under
$COUG-majority control. It only graduates from Part 1 once Part 1 has met its own success criteria. Where
CGP-001 governs *the DAO's money*, CGP-002 governs *the provenance of the DAO's land's output* — the same
agentic-governance engine, pointed at a real, auditable, regulation-relevant supply chain.

> **Reconciliation note (resolved):** the Part-1 quorum was raised to **60%** (commit `15dffdf`, "committee
> is a filter; raise quorum to 60%"), matching Part 2's assumption — no further reconciliation needed.

---

## Appendix A — real-world chain facts (grounding)

- **PBI** = 12 digits = **5-digit USDA-AMS gin code + 7-digit gin bale number**; Code-128 barcode; gin
  numbers recycle on a **5-year cycle → key on `(PBI, crop_year)`**.
- **HVI classing** by USDA-AMS → National Cotton Database (Memphis).
- **EWR** = electronic document of title under the **U.S. Warehouse Act / 7 CFR Part 869**, administered by
  **USDA-AMS WCMD (Kansas City)**, issued through a licensed **Provider's Central Filing System**; incumbent
  **EWR, Inc. (Collierville, TN)**. **Holder of record** (often a lender/CCC) takes precedence over owner.
- **CCC marketing-assistance loan**: bale collateralizes a loan; CCC becomes EWR holder; repaid at the lower
  of loan rate or Adjusted World Price.

## Appendix B — key people / entities

- **James McCall** — Founder/CEO, **FarmMapper** (Farmapper LLC); ex-ag banker; **CougarDAO member**. Origin layer.
- **Sardor Umarov** — builds the **Silverleafe** cotton stack; **CougarDAO member**. Primitives + OS.
- **Dan Patterson / PFICO** — Silverleafe parent (Patterson family office); CTO **Tushar Singh**.
- **Angelo Alessio** — build_cities; **CougarDAO member**. (Civic layer — see the build_memphis tie-in.)
- **Haelixa** — DNA-marker forensic-origin partner. **Cherokee Gin** (code 07511) / **Staplcotn** (West
  Memphis) — candidate gin/warehouse pilot partners.

_Draft for member discussion. Verify the current CougarDAO roster, the live Part-1 contract state, and the
Haxtun crop with the principals before this is put to an on-chain vote._
