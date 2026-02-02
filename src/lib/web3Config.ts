"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";

// WalletConnect Project ID - get yours free at https://cloud.walletconnect.com
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const config = getDefaultConfig({
  appName: "CryptoViz Pro",
  projectId: walletConnectProjectId,
  chains: [mainnet, polygon, arbitrum, optimism, base],
  ssr: true,
});

// Chain ID to our internal chain mapping
export const chainIdToChainInfo: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
};
