"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Repeat,
  Flame,
  Coins,
  X,
} from "lucide-react";
import { shortenAddress, formatBalance } from "@/lib/mockData";
import type { NetworkLink } from "@/types";

interface TimelineTransaction {
  id: string;
  type: "in" | "out";
  linkType: NetworkLink["type"];
  value: number;
  counterpartyAddress: string;
  counterpartyLabel?: string;
  timestamp: Date;
  transactionCount: number;
}

const linkTypeConfig: Record<NetworkLink["type"], { icon: React.ElementType; label: string; color: string }> = {
  transfer: { icon: ArrowUpRight, label: "Transfer", color: "#00ff88" },
  swap: { icon: Repeat, label: "Swap", color: "#00ffff" },
  stake: { icon: Coins, label: "Stake", color: "#ffff00" },
  mint: { icon: TrendingUp, label: "Mint", color: "#ff00ff" },
  burn: { icon: Flame, label: "Burn", color: "#ff4444" },
};

export function TransactionTimeline() {
  const [isOpen, setIsOpen] = useState(false);
  const { nodes, links, view, theme } = useCryptoVizStore();
  const themeConfig = themes[theme];

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === view.selectedNodeId);
  }, [nodes, view.selectedNodeId]);

  // Build transaction history for selected node
  const transactions = useMemo(() => {
    if (!selectedNode) return [];

    const txList: TimelineTransaction[] = [];

    for (const link of links) {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;

      if (sourceId === selectedNode.id) {
        const targetNode = nodes.find(n => n.id === targetId);
        txList.push({
          id: `${link.id}-out`,
          type: "out",
          linkType: link.type,
          value: link.value,
          counterpartyAddress: targetNode?.address || targetId,
          counterpartyLabel: targetNode?.label,
          timestamp: link.timestamp,
          transactionCount: link.transactionCount,
        });
      }

      if (targetId === selectedNode.id) {
        const sourceNode = nodes.find(n => n.id === sourceId);
        txList.push({
          id: `${link.id}-in`,
          type: "in",
          linkType: link.type,
          value: link.value,
          counterpartyAddress: sourceNode?.address || sourceId,
          counterpartyLabel: sourceNode?.label,
          timestamp: link.timestamp,
          transactionCount: link.transactionCount,
        });
      }
    }

    // Sort by timestamp descending
    return txList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [selectedNode, links, nodes]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TimelineTransaction[]> = {};

    for (const tx of transactions) {
      const dateKey = tx.timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }

    return groups;
  }, [transactions]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;

    for (const tx of transactions) {
      if (tx.type === "in") {
        totalIn += tx.value;
        inCount += tx.transactionCount;
      } else {
        totalOut += tx.value;
        outCount += tx.transactionCount;
      }
    }

    return { totalIn, totalOut, inCount, outCount, netFlow: totalIn - totalOut };
  }, [transactions]);

  // Listen for open event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("openTransactionTimeline", handleOpen);
    return () => window.removeEventListener("openTransactionTimeline", handleOpen);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedNode}
            className="border-white/10 text-white hover:bg-white/10 hover:border-[#00ffff]/50 transition-all disabled:opacity-50"
          >
            <History className="w-4 h-4 mr-2" />
            <span className="hidden xl:inline">Timeline</span>
          </Button>
        </motion.div>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[400px] max-w-[90vw] p-0 bg-[#0a0a0f] border-l border-white/10"
      >
        <SheetHeader className="p-4 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2 text-white">
            <History className="w-5 h-5" style={{ color: themeConfig.accentColor }} />
            Transaction Timeline
          </SheetTitle>
          {selectedNode && (
            <p className="text-sm text-gray-400">
              {selectedNode.label || shortenAddress(selectedNode.address)}
            </p>
          )}
        </SheetHeader>

        {!selectedNode ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
            <History className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-center">Select a node to view its transaction timeline</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="p-4 border-b border-white/10">
              <div className="grid grid-cols-3 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-lg p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-[#00ff88]">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span className="text-lg font-bold">{stats.inCount}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase mt-1">Received</p>
                  <p className="text-xs text-gray-400">{formatBalance(stats.totalIn)}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="glass rounded-lg p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-[#ff00ff]">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-lg font-bold">{stats.outCount}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase mt-1">Sent</p>
                  <p className="text-xs text-gray-400">{formatBalance(stats.totalOut)}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass rounded-lg p-3 text-center"
                >
                  <div className={`flex items-center justify-center gap-1 ${stats.netFlow >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                    {stats.netFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-lg font-bold">{stats.netFlow >= 0 ? '+' : ''}{formatBalance(stats.netFlow)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase mt-1">Net Flow</p>
                </motion.div>
              </div>
            </div>

            {/* Timeline */}
            <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
              <div className="p-4">
                {Object.entries(groupedTransactions).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No transactions found
                  </div>
                ) : (
                  Object.entries(groupedTransactions).map(([date, txs], groupIndex) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="mb-6"
                    >
                      {/* Date Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-400 font-medium">{date}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>

                      {/* Transactions */}
                      <div className="space-y-2 pl-2 border-l-2 border-white/10 ml-1.5">
                        {txs.map((tx, txIndex) => {
                          const config = linkTypeConfig[tx.linkType];
                          const Icon = config.icon;

                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: groupIndex * 0.05 + txIndex * 0.02 }}
                              className="relative pl-4"
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute left-[-5px] top-3 w-2 h-2 rounded-full"
                                style={{ background: tx.type === "in" ? "#00ff88" : "#ff00ff" }}
                              />

                              <div className="glass rounded-lg p-3 hover:bg-white/5 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                                      style={{ background: `${config.color}20` }}
                                    >
                                      {tx.type === "in" ? (
                                        <ArrowDownLeft className="w-4 h-4" style={{ color: "#00ff88" }} />
                                      ) : (
                                        <ArrowUpRight className="w-4 h-4" style={{ color: "#ff00ff" }} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-white font-medium">
                                          {tx.type === "in" ? "Received" : "Sent"}
                                        </span>
                                        <Badge
                                          className="text-[8px] px-1.5"
                                          style={{
                                            background: `${config.color}20`,
                                            color: config.color,
                                            border: 'none'
                                          }}
                                        >
                                          {config.label}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {tx.type === "in" ? "From" : "To"}: {tx.counterpartyLabel || shortenAddress(tx.counterpartyAddress)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className="text-sm font-mono font-medium"
                                      style={{ color: tx.type === "in" ? "#00ff88" : "#ff00ff" }}
                                    >
                                      {tx.type === "in" ? "+" : "-"}{formatBalance(tx.value)}
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                      {tx.transactionCount} txn{tx.transactionCount > 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                                  <span>
                                    {tx.timestamp.toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Icon className="w-3 h-3" style={{ color: config.color }} />
                                    <span style={{ color: config.color }}>{config.label}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
