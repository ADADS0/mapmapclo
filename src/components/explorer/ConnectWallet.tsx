"use client";

import { useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { chainIdToChainInfo } from "@/lib/web3Config";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  ExternalLink,
  Copy,
  Eye,
  Star,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { shortenAddress } from "@/lib/mockData";

export function ConnectWallet() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const {
    chains,
    setSelectedChain,
    addToWatchlist,
    isInWatchlist,
    setConnectedWallet,
  } = useCryptoVizStore();

  // Sync connected wallet to store
  useEffect(() => {
    if (isConnected && address) {
      setConnectedWallet(address);
      // Auto-switch to the connected chain if we support it
      const chainInfo = chainIdToChainInfo[chainId];
      if (chainInfo) {
        const chain = chains.find((c) => c.id === chainInfo);
        if (chain) {
          setSelectedChain(chain);
        }
      }
    } else {
      setConnectedWallet(null);
    }
  }, [isConnected, address, chainId, chains, setSelectedChain, setConnectedWallet]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const addToWatchlistHandler = () => {
    if (address && !isInWatchlist(address)) {
      addToWatchlist({
        address,
        label: `My Wallet (${connector?.name || "Connected"})`,
        tags: [],
        alertsEnabled: true,
      });
      toast.success("Wallet added to watchlist");
    } else {
      toast.info("Wallet already in watchlist");
    }
  };

  const exploreWallet = () => {
    if (address) {
      window.dispatchEvent(
        new CustomEvent("exploreAddress", { detail: { address } })
      );
      toast.success("Exploring your wallet's network");
    }
  };

  const getExplorerUrl = () => {
    const explorers: Record<number, string> = {
      1: "https://etherscan.io",
      137: "https://polygonscan.com",
      42161: "https://arbiscan.io",
      10: "https://optimistic.etherscan.io",
      8453: "https://basescan.org",
    };
    return explorers[chainId] || "https://etherscan.io";
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={openConnectModal}
                      className="bg-gradient-to-r from-[#00ff88] to-[#00cc66] text-black font-semibold hover:opacity-90 transition-opacity gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden xl:inline">Connect Wallet</span>
                      <span className="xl:hidden">Connect</span>
                    </Button>
                  </motion.div>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    className="gap-2"
                  >
                    Wrong network
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Chain button */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={openChainModal}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-white/10 gap-1 hidden lg:flex"
                    >
                      {chain.hasIcon && (
                        <div
                          className="w-4 h-4 rounded-full overflow-hidden"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                      )}
                      <span className="hidden xl:inline">{chain.name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </motion.div>

                  {/* Account button with popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          className="border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 hover:border-[#00ff88]/50 gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                          <span className="font-mono">
                            {account.displayName}
                          </span>
                          {account.displayBalance && (
                            <span className="hidden xl:inline text-gray-400 text-xs">
                              ({account.displayBalance})
                            </span>
                          )}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 glass border-white/10 p-0"
                      align="end"
                    >
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          {/* Header */}
                          <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00cc66] flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-black" />
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {account.displayName}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {connector?.name || "Connected"}
                                </p>
                              </div>
                            </div>
                            {balance && (
                              <div className="mt-3 p-2 rounded-lg bg-white/5">
                                <p className="text-xs text-gray-400">Balance</p>
                                <p className="text-lg font-bold text-white">
                                  {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)}{" "}
                                  {balance.symbol}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="p-2">
                            <button
                              onClick={copyAddress}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">
                                Copy Address
                              </span>
                            </button>
                            <button
                              onClick={exploreWallet}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">
                                Explore Network
                              </span>
                            </button>
                            <button
                              onClick={addToWatchlistHandler}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                            >
                              <Star className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">
                                Add to Watchlist
                              </span>
                            </button>
                            <a
                              href={`${getExplorerUrl()}/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">
                                View on Explorer
                              </span>
                            </a>
                          </div>

                          <Separator className="bg-white/10" />

                          {/* Disconnect */}
                          <div className="p-2">
                            <button
                              onClick={openAccountModal}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
                            >
                              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                              <span className="text-sm text-white group-hover:text-red-400">
                                Disconnect
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
