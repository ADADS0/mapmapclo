"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wallet, Search, ArrowRight, Loader2, AlertCircle, Globe, Layers, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchWalletNetwork, isValidAddress, formatAddress } from "@/lib/etherscanApi";
import { generateMockNetwork } from "@/lib/mockData";

export function WalletAddressInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [useLiveData, setUseLiveData] = useState(true);
  const [depth, setDepth] = useState(1);
  const [maxNodes, setMaxNodes] = useState(50);
  const {
    setNodes,
    setLinks,
    setIsLoading: setGlobalLoading,
    theme,
    selectedChain,
    setExploredWalletAddress,
    setExplorationDepth,
    setLoadingProgress,
    loadingProgress,
  } = useCryptoVizStore();
  const themeConfig = themes[theme];

  // Listen for open wallet input event
  useEffect(() => {
    const handleOpenWalletInput = () => {
      setIsOpen(true);
    };

    window.addEventListener("openWalletInput", handleOpenWalletInput);
    return () => window.removeEventListener("openWalletInput", handleOpenWalletInput);
  }, []);

  // Listen for explore address event (from ConnectWallet)
  useEffect(() => {
    const handleExploreAddress = (event: CustomEvent<{ address: string }>) => {
      const walletAddress = event.detail?.address;
      if (walletAddress && isValidAddress(walletAddress)) {
        setAddress(walletAddress);
        // Auto-explore the connected wallet
        setTimeout(() => {
          setIsOpen(true);
        }, 100);
      }
    };

    window.addEventListener("exploreAddress", handleExploreAddress as EventListener);
    return () => window.removeEventListener("exploreAddress", handleExploreAddress as EventListener);
  }, []);

  const validateAddress = (addr: string): boolean => {
    return isValidAddress(addr);
  };

  const handleExplore = useCallback(async () => {
    setError("");

    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    if (!validateAddress(address.trim())) {
      setError("Invalid Ethereum address format");
      return;
    }

    setIsLoading(true);
    setGlobalLoading(true);
    setLoadingProgress({ stage: 'Initializing', count: 0 });

    try {
      let nodes, links;
      const walletAddress = address.trim().toLowerCase();

      if (useLiveData) {
        // Fetch real data from Etherscan API
        toast.info("Fetching live blockchain data...", {
          description: `Querying ${selectedChain.name} network (depth: ${depth})`,
        });

        const network = await fetchWalletNetwork(
          walletAddress,
          selectedChain.id,
          maxNodes,
          depth,
          (stage, count) => {
            setLoadingProgress({ stage, count });
          }
        );
        nodes = network.nodes;
        links = network.links;

        if (nodes.length === 0) {
          // Fallback to mock data if API returns empty
          toast.warning("Limited data available", {
            description: "Using enhanced mock data for visualization",
          });
          const mockNetwork = generateMockNetwork(maxNodes);
          nodes = mockNetwork.nodes;
          links = mockNetwork.links;

          // Update the first node to be the searched address
          if (nodes.length > 0) {
            nodes[0].id = walletAddress;
            nodes[0].address = walletAddress;
            nodes[0].label = "Primary Wallet";
            nodes[0].type = "wallet";
          }
        }
      } else {
        // Use mock data
        const mockNetwork = generateMockNetwork(maxNodes);
        nodes = mockNetwork.nodes;
        links = mockNetwork.links;

        // Update the first node to be the searched address
        if (nodes.length > 0) {
          nodes[0].id = walletAddress;
          nodes[0].address = walletAddress;
          nodes[0].label = "Primary Wallet";
          nodes[0].type = "wallet";
        }
      }

      setNodes(nodes);
      setLinks(links);
      setExploredWalletAddress(walletAddress);
      setExplorationDepth(depth);

      toast.success("Wallet network loaded", {
        description: `Exploring ${formatAddress(walletAddress)} with ${nodes.length} nodes and ${links.length} connections`,
      });

      setIsOpen(false);
      setAddress("");
    } catch (err) {
      console.error("Error loading wallet data:", err);
      setError("Failed to load wallet data. Please try again.");
      toast.error("Failed to load wallet data");
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
      setLoadingProgress(null);
    }
  }, [address, setNodes, setLinks, setGlobalLoading, useLiveData, selectedChain, depth, maxNodes, setExploredWalletAddress, setExplorationDepth, setLoadingProgress]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading) {
        handleExplore();
      }
    },
    [handleExplore, isLoading]
  );

  // Example addresses for quick exploration
  const exampleAddresses = [
    { label: "Vitalik.eth", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { label: "Binance", address: "0x28C6c06298d514Db089934071355E5743bf21d60" },
    { label: "Uniswap V3", address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" },
  ];

  return (
    <>
      {/* Trigger Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-white/10 text-white hover:bg-white/10 hover:border-[#ff00ff]/50 transition-all"
        >
          <Wallet className="w-4 h-4 mr-2" />
          <span className="hidden xl:inline">Explore Wallet</span>
        </Button>
      </motion.div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#0a0a0f] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5" style={{ color: themeConfig.accentColor }} />
              Explore Wallet Address
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter a wallet address to visualize its transaction network and connections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Data Source Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Use Live Blockchain Data</span>
              </div>
              <button
                type="button"
                onClick={() => setUseLiveData(!useLiveData)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useLiveData ? 'bg-[#00ff88]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLiveData ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Input Field */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 pr-10 font-mono text-sm"
                  disabled={isLoading}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Exploration Settings */}
            {useLiveData && (
              <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3 h-3" />
                  Exploration Settings
                </p>

                {/* Depth Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Exploration Depth</span>
                    <span className="text-sm text-white font-mono">{depth} hop{depth > 1 ? 's' : ''}</span>
                  </div>
                  <Slider
                    value={[depth]}
                    onValueChange={(v) => setDepth(v[0])}
                    min={1}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    {depth === 1 && "Direct connections only (fastest)"}
                    {depth === 2 && "Include connections of connections"}
                    {depth === 3 && "Deep exploration (slower, more API calls)"}
                  </p>
                </div>

                {/* Max Nodes Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Max Nodes</span>
                    <span className="text-sm text-white font-mono">{maxNodes}</span>
                  </div>
                  <Slider
                    value={[maxNodes]}
                    onValueChange={(v) => setMaxNodes(v[0])}
                    min={20}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Quick Examples */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Quick Examples</p>
              <div className="flex flex-wrap gap-2">
                {exampleAddresses.map((example) => (
                  <motion.button
                    key={example.address}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAddress(example.address)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {example.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Loading Progress */}
            <AnimatePresence>
              {isLoading && loadingProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00ff88]" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{loadingProgress.stage}</p>
                      <p className="text-xs text-gray-400">{loadingProgress.count} nodes found</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Explore Button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={handleExplore}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#00ff88] to-[#00ffff] text-black font-semibold hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {loadingProgress?.stage || 'Loading...'}
                  </>
                ) : (
                  <>
                    Explore Network
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info */}
            <p className="text-xs text-gray-500 text-center">
              {useLiveData
                ? `Fetching live data from ${selectedChain.name} blockchain`
                : "Using mock data for demonstration"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
