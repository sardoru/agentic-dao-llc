"use client";

import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

// WalletConnect (mobile / QR) is enabled only when a project id is configured.
// Get one free at https://cloud.reown.com and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
const wcProjectId = process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"];

const connectors = [
  injected(),
  coinbaseWallet({ appName: "Agentic DAO" }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : []),
];

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: { [baseSepolia.id]: http(process.env["NEXT_PUBLIC_RPC_URL"]) },
  ssr: true,
});
