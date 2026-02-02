"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchWalletNetwork, isValidAddress, formatAddress, getExplorerUrl } from "@/lib/etherscanApi";
import { generateMockNetwork } from "@/lib/mockData";

export function InlineWalletSearch() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    setNodes,
    setLinks,
    setIsLoading: setGlobalLoading,
    theme,
    selectedChain,
    setExploredWalletAddress,
    setLoadingProgress,
    exploredWalletAddress,
    explorationDepth,
    loadingProgress,
    nodes,
  } = useCryptoVizStore();

  const themeConfig = themes[theme];

  const handleSearch = useCallback(async (searchAddress?: string) => {
    const addr = (searchAddress || address).trim().toLowerCase();

    if (!addr) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!isValidAddress(addr)) {
      toast.error("Invalid Ethereum address format");
      return;
    }

    setIsLoading(true);
    setGlobalLoading(true);
    setLoadingProgress({ stage: 'Fetching transactions', count: 0 });

    try {
      toast.info("Fetching blockchain data...", {
        description: `Querying ${selectedChain.name}`,
      });

      const network = await fetchWalletNetwork(
        addr,
        selectedChain.id,
        50,
        explorationDepth,
        (stage, count) => {
          setLoadingProgress({ stage, count });
        }
      );

      let { nodes: networkNodes, links: networkLinks } = network;

      if (networkNodes.length === 0) {
        toast.warning("No data found, using mock data");
        const mockNetwork = generateMockNetwork(50);
        networkNodes = mockNetwork.nodes;
        networkLinks = mockNetwork.links;

        if (networkNodes.length > 0) {
          networkNodes[0].id = addr;
          networkNodes[0].address = addr;
          networkNodes[0].label = "Primary Wallet";
        }
      }

      setNodes(networkNodes);
      setLinks(networkLinks);
      setExploredWalletAddress(addr);
      setAddress("");

      toast.success(`Loaded ${networkNodes.length} nodes`, {
        description: formatAddress(addr),
      });
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load wallet data");
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
      setLoadingProgress(null);
    }
  }, [address, selectedChain, explorationDepth, setNodes, setLinks, setGlobalLoading, setExploredWalletAddress, setLoadingProgress]);

  const handleRefresh = useCallback(() => {
    if (exploredWalletAddress) {
      handleSearch(exploredWalletAddress);
    }
  }, [exploredWalletAddress, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
    >
      <div className={`
        flex items-center gap-2 p-2 rounded-xl backdrop-blur-xl
        ${isFocused ? 'bg-black/80 border-[#00ff88]/50' : 'bg-black/60 border-white/10'}
        border shadow-2xl transition-all duration-300
      `}>
        {/* Current Explored Address Badge */}
        <AnimatePresence>
          {exploredWalletAddress && !isFocused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00ff88]/20 border border-[#00ff88]/30"
            >
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-sm font-mono text-[#00ff88]">
                {formatAddress(exploredWalletAddress)}
              </span>
              <span className="text-xs text-gray-400">
                ({nodes.length} nodes)
              </span>
              <a
                href={getExplorerUrl(exploredWalletAddress, selectedChain.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={handleRefresh}
                className="text-gray-400 hover:text-[#00ff88] transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Enter wallet address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className={`
              pl-10 pr-4 w-[320px] bg-transparent border-0 text-white placeholder:text-gray-500
              font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0
              ${isFocused ? 'w-[400px]' : ''}
              transition-all duration-300
            `}
            disabled={isLoading}
          />
          {address && (
            <button
              onClick={() => setAddress("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <Button
          onClick={() => handleSearch()}
          disabled={isLoading || !address.trim()}
          size="sm"
          className="bg-gradient-to-r from-[#00ff88] to-[#00ffff] text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Loading Progress */}
      <AnimatePresence>
        {isLoading && loadingProgress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 mx-auto w-fit px-4 py-2 rounded-lg bg-black/80 border border-[#00ff88]/30 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#00ff88]" />
              <span className="text-sm text-white">{loadingProgress.stage}</span>
              <span className="text-xs text-gray-400">{loadingProgress.count} nodes</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
