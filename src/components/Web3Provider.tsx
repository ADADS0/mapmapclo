"use client";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/web3Config";
import { useCryptoVizStore } from "@/lib/store";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const { colorMode, theme } = useCryptoVizStore();

  // Get accent color based on current theme
  const getAccentColor = () => {
    switch (theme) {
      case "neon":
        return "#00ff88";
      case "matrix":
        return "#00ff00";
      case "ocean":
        return "#4fc3f7";
      case "sunset":
        return "#ff9800";
      case "midnight":
        return "#9c88ff";
      default:
        return "#00ff88";
    }
  };

  const customTheme = colorMode === "dark"
    ? darkTheme({
        accentColor: getAccentColor(),
        accentColorForeground: "#000000",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small",
      })
    : lightTheme({
        accentColor: getAccentColor(),
        accentColorForeground: "#000000",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small",
      });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          modalSize="compact"
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
