"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Home, Settings, Palette, ZoomIn, ZoomOut, RotateCcw, Grid, Tag, Keyboard, History, GitCompare, Bell, Coins, BarChart3, Share2, FileText, Search, Loader2, X, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ThemeName } from "@/types";
import { MobileNav } from "./MobileNav";
import { ExportMenu } from "./ExportMenu";
import { DarkModeToggle } from "./DarkModeToggle";
import { PathFinder } from "./PathFinder";
import { NotificationSystem } from "./NotificationSystem";
import { Watchlist } from "./Watchlist";
import { WorkspaceManager, QuickSaveButton } from "./WorkspaceManager";
import { TagManager } from "./TagManager";
import { ConnectWallet } from "./ConnectWallet";
import { AlertsConfigPanel } from "./AlertsConfigPanel";
import { TokenHoldingsView } from "./TokenHoldingsView";
import { PriceAnalytics } from "./PriceAnalytics";
import { SocialSharing } from "./SocialSharing";
import { TransactionHistoryTable } from "./TransactionHistoryTable";
import { UndoRedoToolbar } from "./UndoRedoToolbar";
import { AnimationSettings } from "./AnimationSettings";
import { toast } from "sonner";
import { fetchWalletNetwork, isValidAddress, formatAddress, getExplorerUrl } from "@/lib/etherscanApi";
import { generateMockNetwork } from "@/lib/mockData";

function NavbarSearch() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    setNodes,
    setLinks,
    setIsLoading: setGlobalLoading,
    selectedChain,
    setExploredWalletAddress,
    setLoadingProgress,
    exploredWalletAddress,
    explorationDepth,
    nodes,
  } = useCryptoVizStore();

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
    <div className="flex items-center gap-2">
      {/* Current Explored Address Badge */}
      <AnimatePresence>
        {exploredWalletAddress && !isFocused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00ff88]/20 border border-[#00ff88]/30"
          >
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs font-mono text-[#00ff88]">
              {formatAddress(exploredWalletAddress)}
            </span>
            <span className="text-[10px] text-gray-400">
              ({nodes.length})
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
      <div className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-xl
        ${isFocused ? 'bg-black/80 border-[#00ff88]/50 ring-1 ring-[#00ff88]/20' : 'bg-white/5 border-white/10'}
        border transition-all duration-300
      `}>
        <Search className="w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search Tokens (Name, Ticker, Address)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className={`
            border-0 bg-transparent text-white placeholder:text-gray-500
            font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0
            ${isFocused ? 'w-[280px]' : 'w-[200px]'}
            transition-all duration-300 h-7 p-0
          `}
          disabled={isLoading}
        />
        {address && (
          <button
            onClick={() => setAddress("")}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <Button
          onClick={() => handleSearch()}
          disabled={isLoading || !address.trim()}
          size="sm"
          className="h-6 px-2 bg-gradient-to-r from-[#00ff88] to-[#00ffff] text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Search className="w-3 h-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function TopNav() {
  const { selectedChain, chains, setSelectedChain, theme, setTheme, view, setView } = useCryptoVizStore();

  return (
    <nav className="h-14 lg:h-16 glass border-b border-white/5 flex items-center justify-between px-3 lg:px-4">
      {/* Left: Logo & Chain Selector */}
      <div className="flex items-center gap-2 lg:gap-4">
        <Link href="/" className="flex items-center gap-2 text-[#00ff88] hover:opacity-80 transition-opacity">
          <Home className="w-5 h-5" />
          <span className="font-bold hidden sm:inline">CryptoViz</span>
        </Link>

        <div className="h-6 w-px bg-white/10 hidden sm:block" />

        {/* Explore Tokens Link */}
        <Link href="/tokens" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00ff88]/30 transition-all text-sm text-gray-300 hover:text-white">
          <Coins className="w-4 h-4 text-[#00ff88]" />
          <span>Explore</span>
        </Link>

        <div className="h-6 w-px bg-white/10 hidden sm:block" />

        <Select
          value={selectedChain.id}
          onValueChange={(id) => {
            const chain = chains.find(c => c.id === id);
            if (chain) setSelectedChain(chain);
          }}
        >
          <SelectTrigger className="w-[140px] lg:w-[160px] bg-white/5 border-white/10 text-white text-xs lg:text-sm">
            <span className="flex items-center gap-2">
              {selectedChain.logoUrl ? (
                <img
                  src={selectedChain.logoUrl}
                  alt={selectedChain.name}
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ color: selectedChain.color }}>{selectedChain.icon}</span>
              )}
              <span>{selectedChain.name}</span>
            </span>
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0f] border-white/10">
            {chains.map(chain => (
              <SelectItem key={chain.id} value={chain.id} className="text-white hover:bg-white/10">
                <span className="flex items-center gap-2">
                  {chain.logoUrl ? (
                    <img
                      src={chain.logoUrl}
                      alt={chain.name}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ color: chain.color }}>{chain.icon}</span>
                  )}
                  {chain.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center">
        <NavbarSearch />
      </div>

      {/* Right: View Controls & Settings - Hidden on mobile */}
      <div className="hidden lg:flex items-center gap-1">
        {/* View Controls */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView({ zoom: Math.min(view.zoom * 1.2, 3) })}
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView({ zoom: Math.max(view.zoom / 1.2, 0.3) })}
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1, rotate: -180 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView({ zoom: 1, panX: 0, panY: 0 })}
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="h-6 w-px bg-white/10 mx-1" />

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView({ showGrid: !view.showGrid })}
            className={`${view.showGrid ? 'text-[#00ff88]' : 'text-gray-400'} hover:text-white hover:bg-white/10 transition-colors duration-300 h-8 w-8`}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView({ showLabels: !view.showLabels })}
            className={`${view.showLabels ? 'text-[#00ff88]' : 'text-gray-400'} hover:text-white hover:bg-white/10 transition-colors duration-300 h-8 w-8`}
          >
            <Tag className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Undo/Redo Toolbar */}
        <UndoRedoToolbar />

        {/* Animation Settings */}
        <AnimationSettings />

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Export Menu */}
        <ExportMenu />

        {/* Path Finder */}
        <PathFinder />

        {/* Compare Wallets Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent("openComparisonMode"))}
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
            title="Compare Wallets"
          >
            <GitCompare className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Notification System */}
        <NotificationSystem />

        {/* Alerts Configuration */}
        <AlertsConfigPanel />

        {/* Watchlist */}
        <Watchlist />

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Theme Selector */}
        <Select value={theme} onValueChange={(t) => setTheme(t as ThemeName)}>
          <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white h-8 text-xs">
            <Palette className="w-3 h-3 mr-1" style={{ color: themes[theme].accentColor }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0f] border-white/10">
            {Object.values(themes).map(t => (
              <SelectItem key={t.name} value={t.name} className="text-white hover:bg-white/10">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: t.accentColor }} />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Shortcuts Help */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent("showShortcutsHelp"))}
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Dark/Light Mode Toggle */}
        <DarkModeToggle />

        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Connect Wallet */}
        <ConnectWallet />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </nav>
  );
}
