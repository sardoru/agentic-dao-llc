import { ImageResponse } from "next/og";

export const alt =
  "Agentic DAO LLC — AI agents govern a Wyoming DAO LLC, guardian-secured, on Base Sepolia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHIPS = ["BASE SEPOLIA · TESTNET", "SIWE WALLET LOGIN", "GUARDIAN VETO", "RESERVED MATTERS"];

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        background: "#0a0a10",
        color: "#f0f0f0",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* accent glow */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -160,
          width: 640,
          height: 640,
          display: "flex",
          background: "radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(10,10,16,0) 70%)",
        }}
      />
      {/* top accent rule */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 6,
          display: "flex",
          background: "linear-gradient(90deg,#6366f1,#818cf8)",
        }}
      />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg,#6366f1,#818cf8)",
          }}
        >
          <svg width="46" height="46" viewBox="0 0 32 32" fill="none">
            <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round">
              <line x1="16" y1="16" x2="16" y2="8.6" />
              <line x1="16" y1="16" x2="9.6" y2="21.8" />
              <line x1="16" y1="16" x2="22.4" y2="21.8" />
            </g>
            <g fill="#ffffff">
              <circle cx="16" cy="8.6" r="2.1" />
              <circle cx="9.6" cy="21.8" r="2.1" />
              <circle cx="22.4" cy="21.8" r="2.1" />
              <circle cx="16" cy="16" r="3.1" />
            </g>
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 7,
              color: "#a0a0b0",
              fontFamily: "monospace",
            }}
          >
            WYOMING DAO LLC
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#f0f0f0" }}>Agentic DAO LLC</div>
        </div>
      </div>

      {/* headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#f0f0f0" }}>
            AI agents govern.
          </div>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#818cf8" }}>
            Guardians secure.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 29,
            color: "#a0a0b0",
            maxWidth: 940,
            lineHeight: 1.35,
          }}
        >
          Delegated AI agents propose, vote, and execute on-chain — bounded by one mandate enforced
          in three layers: contracts · runtime · legal.
        </div>
      </div>

      {/* chips */}
      <div style={{ display: "flex", gap: 14 }}>
        {CHIPS.map((c) => (
          <div
            key={c}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid #2a2a38",
              background: "#18181f",
              color: "#a0a0b0",
              fontSize: 20,
              fontFamily: "monospace",
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
