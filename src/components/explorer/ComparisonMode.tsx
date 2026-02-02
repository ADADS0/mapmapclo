"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  GitCompare,
  ArrowRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock
} from "lucide-react";
import type { NetworkNode } from "@/types";
import { getNodeTypeLabel, formatBalance } from "@/lib/mockData";

interface ComparisonModeProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ComparisonMode({ isOpen: controlledIsOpen, onClose }: ComparisonModeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wallet1Address, setWallet1Address] = useState("");
  const [wallet2Address, setWallet2Address] = useState("");
  const [wallet1, setWallet1] = useState<NetworkNode | null>(null);
  const [wallet2, setWallet2] = useState<NetworkNode | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const { nodes, links } = useCryptoVizStore();

  // Handle external open state if controlled
  const effectiveIsOpen = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
    setWallet1(null);
    setWallet2(null);
    setWallet1Address("");
    setWallet2Address("");
    setIsComparing(false);
  }, [onClose]);

  // Listen for keyboard shortcut and custom event to open comparison mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && effectiveIsOpen) {
        handleClose();
      }
    };

    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("openComparisonMode", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("openComparisonMode", handleOpenEvent);
    };
  }, [effectiveIsOpen, handleClose]);

  const findWallet = useCallback((address: string): NetworkNode | null => {
    if (!address) return null;
    const lowerAddress = address.toLowerCase();
    return nodes.find(node =>
      node.address.toLowerCase().includes(lowerAddress) ||
      (node.label && node.label.toLowerCase().includes(lowerAddress))
    ) || null;
  }, [nodes]);

  const handleCompare = useCallback(() => {
    const w1 = findWallet(wallet1Address);
    const w2 = findWallet(wallet2Address);

    setWallet1(w1);
    setWallet2(w2);
    setIsComparing(true);
  }, [wallet1Address, wallet2Address, findWallet]);

  const getConnectionCount = useCallback((nodeId: string): number => {
    return links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === nodeId || targetId === nodeId;
    }).length;
  }, [links]);

  const getTotalVolume = useCallback((nodeId: string): number => {
    return links.reduce((sum, link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (sourceId === nodeId || targetId === nodeId) {
        return sum + link.value;
      }
      return sum;
    }, 0);
  }, [links]);

  const getIncoming = useCallback((nodeId: string): number => {
    return links.filter(link => {
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return targetId === nodeId;
    }).length;
  }, [links]);

  const getOutgoing = useCallback((nodeId: string): number => {
    return links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      return sourceId === nodeId;
    }).length;
  }, [links]);

  const renderComparison = (val1: number, val2: number, format?: (n: number) => string) => {
    const diff = val1 - val2;
    const formatFn = format || ((n: number) => n.toFixed(2));

    return (
      <div className="flex items-center gap-2">
        {diff > 0 ? (
          <span className="text-emerald-400 flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            +{formatFn(diff)}
          </span>
        ) : diff < 0 ? (
          <span className="text-red-400 flex items-center gap-1 text-xs">
            <TrendingDown className="w-3 h-3" />
            {formatFn(diff)}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">Equal</span>
        )}
      </div>
    );
  };

  const WalletCard = ({ wallet, label, connections, volume, incoming, outgoing }: {
    wallet: NetworkNode | null;
    label: string;
    connections: number;
    volume: number;
    incoming: number;
    outgoing: number;
  }) => {
    if (!wallet) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass rounded-xl p-6 border border-white/10"
        >
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-gray-400 text-sm">Wallet not found</p>
            <p className="text-gray-500 text-xs mt-1">{label} address not in network</p>
          </div>
        </motion.div>
      );
    }

    const nodeTypeColors: Record<string, string> = {
      wallet: '#00ff88',
      exchange: '#ff00ff',
      contract: '#00ffff',
      whale: '#ffff00',
      mixer: '#ff4444',
      defi: '#8844ff',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: `${nodeTypeColors[wallet.type]}20`,
                border: `2px solid ${nodeTypeColors[wallet.type]}`
              }}
            >
              <Wallet className="w-6 h-6" style={{ color: nodeTypeColors[wallet.type] }} />
            </div>
            <div>
              <p className="text-white font-medium">{wallet.label || 'Unknown'}</p>
              <p className="text-gray-400 text-xs font-mono">
                {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
              </p>
            </div>
          </div>
          <Badge
            className="text-xs"
            style={{
              background: `${nodeTypeColors[wallet.type]}20`,
              color: nodeTypeColors[wallet.type],
              border: `1px solid ${nodeTypeColors[wallet.type]}40`
            }}
          >
            {getNodeTypeLabel(wallet.type)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Balance */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Wallet className="w-3 h-3" />
              Balance
            </div>
            <p className="text-white text-lg font-semibold">{formatBalance(wallet.balance)} ETH</p>
          </div>

          {/* Risk Score */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              {wallet.riskScore > 70 ? (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              ) : (
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              )}
              Risk Score
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold" style={{
                color: wallet.riskScore > 70 ? '#ff4444' : wallet.riskScore > 40 ? '#ffaa00' : '#00ff88'
              }}>
                {wallet.riskScore}
              </p>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${wallet.riskScore}%`,
                    background: wallet.riskScore > 70
                      ? 'linear-gradient(90deg, #ff4444, #ff0000)'
                      : wallet.riskScore > 40
                        ? 'linear-gradient(90deg, #ffaa00, #ff8800)'
                        : 'linear-gradient(90deg, #00ff88, #00cc66)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Connections */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Activity className="w-3 h-3" />
              Connections
            </div>
            <p className="text-white text-lg font-semibold">{connections}</p>
          </div>

          {/* Volume */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Zap className="w-3 h-3" />
              Volume
            </div>
            <p className="text-white text-lg font-semibold">{formatBalance(volume)} ETH</p>
          </div>

          {/* Transactions */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Clock className="w-3 h-3" />
              Transactions
            </div>
            <p className="text-white text-lg font-semibold">{wallet.transactionCount}</p>
          </div>

          {/* Flow */}
          <div className="p-4 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              Flow
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <ArrowDownRight className="w-3 h-3" />
                {incoming}
              </span>
              <span className="flex items-center gap-1 text-orange-400 text-sm">
                <ArrowUpRight className="w-3 h-3" />
                {outgoing}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Trigger Button (when not controlled) */}
      {controlledIsOpen === undefined && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-40 glass rounded-full p-3 text-gray-400 hover:text-white border border-white/10 hover:border-[#00ff88]/30 transition-all lg:bottom-6"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Compare Wallets (Ctrl+Shift+C)"
        >
          <GitCompare className="w-5 h-5" />
        </motion.button>
      )}

      {/* Modal Overlay */}
      <AnimatePresence>
        {effectiveIsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-auto glass rounded-2xl border border-white/10"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 glass border-b border-white/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                    <GitCompare className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Wallet Comparison</h2>
                    <p className="text-sm text-gray-400">Compare two wallets side by side</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Input Fields */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <label className="text-sm text-gray-400 mb-2 block">Wallet 1</label>
                    <Input
                      placeholder="Enter address or label..."
                      value={wallet1Address}
                      onChange={(e) => setWallet1Address(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 shrink-0 mt-6 md:mt-0">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex-1 w-full">
                    <label className="text-sm text-gray-400 mb-2 block">Wallet 2</label>
                    <Input
                      placeholder="Enter address or label..."
                      value={wallet2Address}
                      onChange={(e) => setWallet2Address(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleCompare}
                    disabled={!wallet1Address || !wallet2Address}
                    className="bg-[#00ff88] hover:bg-[#00dd77] text-black font-medium px-8"
                  >
                    <GitCompare className="w-4 h-4 mr-2" />
                    Compare Wallets
                  </Button>
                </div>

                {/* Quick Select Suggestions */}
                {nodes.length > 0 && !isComparing && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-3">Quick select from network:</p>
                    <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                      {nodes.slice(0, 10).map((node) => (
                        <motion.button
                          key={node.id}
                          onClick={() => {
                            if (!wallet1Address) {
                              setWallet1Address(node.label || node.address.slice(0, 10));
                            } else if (!wallet2Address) {
                              setWallet2Address(node.label || node.address.slice(0, 10));
                            }
                          }}
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:border-[#00ff88]/30 hover:text-white transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {node.label || `${node.address.slice(0, 6)}...`}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comparison Results */}
                {isComparing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Wallet Cards */}
                    <div className="flex flex-col lg:flex-row gap-4">
                      <WalletCard
                        wallet={wallet1}
                        label="Wallet 1"
                        connections={wallet1 ? getConnectionCount(wallet1.id) : 0}
                        volume={wallet1 ? getTotalVolume(wallet1.id) : 0}
                        incoming={wallet1 ? getIncoming(wallet1.id) : 0}
                        outgoing={wallet1 ? getOutgoing(wallet1.id) : 0}
                      />
                      <WalletCard
                        wallet={wallet2}
                        label="Wallet 2"
                        connections={wallet2 ? getConnectionCount(wallet2.id) : 0}
                        volume={wallet2 ? getTotalVolume(wallet2.id) : 0}
                        incoming={wallet2 ? getIncoming(wallet2.id) : 0}
                        outgoing={wallet2 ? getOutgoing(wallet2.id) : 0}
                      />
                    </div>

                    {/* Comparison Summary */}
                    {wallet1 && wallet2 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass rounded-xl p-6 border border-white/10"
                      >
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[#00ff88]" />
                          Comparison Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Balance Difference</p>
                            {renderComparison(wallet1.balance, wallet2.balance, (n) => formatBalance(Math.abs(n)))}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Risk Score Difference</p>
                            {renderComparison(wallet1.riskScore, wallet2.riskScore, (n) => Math.abs(n).toString())}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Transaction Difference</p>
                            {renderComparison(wallet1.transactionCount, wallet2.transactionCount, (n) => Math.abs(n).toString())}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Connections Difference</p>
                            {renderComparison(getConnectionCount(wallet1.id), getConnectionCount(wallet2.id), (n) => Math.abs(n).toString())}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Volume Difference</p>
                            {renderComparison(getTotalVolume(wallet1.id), getTotalVolume(wallet2.id), (n) => formatBalance(Math.abs(n)))}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 text-center">
                            <p className="text-gray-400 text-xs mb-2">Same Type</p>
                            {wallet1.type === wallet2.type ? (
                              <span className="text-emerald-400 flex items-center justify-center gap-1 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Yes ({getNodeTypeLabel(wallet1.type)})
                              </span>
                            ) : (
                              <span className="text-orange-400 flex items-center justify-center gap-1 text-xs">
                                <X className="w-3 h-3" />
                                No
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Reset Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsComparing(false);
                          setWallet1(null);
                          setWallet2(null);
                          setWallet1Address("");
                          setWallet2Address("");
                        }}
                        className="border-white/20 text-gray-300 hover:text-white hover:border-white/40"
                      >
                        Compare Different Wallets
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
