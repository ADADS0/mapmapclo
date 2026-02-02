"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Copy,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  X,
  ArrowRightLeft,
  Flame,
  Coins,
  Layers,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { shortenAddress } from "@/lib/mockData";
import { fetchTransactions, formatWeiToEth, getExplorerUrl, getTxExplorerUrl, type EtherscanTransaction } from "@/lib/etherscanApi";

// Transaction type configuration
const txTypeConfig = {
  transfer: { icon: ArrowRightLeft, color: "#00ff88", label: "Transfer" },
  swap: { icon: Coins, color: "#00ffff", label: "Swap" },
  stake: { icon: Layers, color: "#ff00ff", label: "Stake" },
  mint: { icon: Coins, color: "#ffff00", label: "Mint" },
  burn: { icon: Flame, color: "#ff4444", label: "Burn" },
};

// Mock transaction data generator
function generateMockTransactions(address: string, count: number) {
  const types = ["transfer", "swap", "stake", "mint", "burn"] as const;
  const statuses = ["confirmed", "pending", "failed"] as const;
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const isOutgoing = Math.random() > 0.5;
    const type = types[Math.floor(Math.random() * types.length)];
    const status = Math.random() > 0.1 ? "confirmed" : statuses[Math.floor(Math.random() * statuses.length)];
    const value = Math.random() * 100;
    const gasUsed = Math.floor(21000 + Math.random() * 100000);
    const gasPrice = Math.floor(10 + Math.random() * 100);

    transactions.push({
      id: `tx-${i}`,
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      from: isOutgoing ? address : `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      to: isOutgoing ? `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}` : address,
      value,
      gasUsed,
      gasPrice,
      gasFee: (gasUsed * gasPrice) / 1e9,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      blockNumber: Math.floor(18000000 + Math.random() * 1000000),
      status,
      type,
      isOutgoing,
    });
  }

  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

type SortField = "timestamp" | "value" | "gasUsed" | "blockNumber";
type SortDirection = "asc" | "desc";

// Convert Etherscan transaction to our format
function convertEtherscanTx(tx: EtherscanTransaction, walletAddress: string) {
  const isOutgoing = tx.from.toLowerCase() === walletAddress.toLowerCase();
  const value = formatWeiToEth(tx.value);
  const gasUsed = Number.parseInt(tx.gasUsed);
  const gasPrice = Number.parseInt(tx.gasPrice) / 1e9; // Convert to Gwei

  // Determine type based on input data
  let type: "transfer" | "swap" | "stake" | "mint" | "burn" = "transfer";
  if (tx.input !== "0x") {
    if (tx.functionName?.toLowerCase().includes("swap")) type = "swap";
    else if (tx.functionName?.toLowerCase().includes("stake")) type = "stake";
    else if (tx.functionName?.toLowerCase().includes("mint")) type = "mint";
    else if (tx.functionName?.toLowerCase().includes("burn")) type = "burn";
    else type = "swap"; // Contract interaction
  }

  // Determine status
  let status: "confirmed" | "pending" | "failed" = "confirmed";
  if (tx.isError === "1" || tx.txreceipt_status === "0") status = "failed";

  return {
    id: tx.hash,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value,
    gasUsed,
    gasPrice,
    gasFee: (gasUsed * gasPrice) / 1e9,
    timestamp: new Date(Number(tx.timeStamp) * 1000),
    blockNumber: Number.parseInt(tx.blockNumber),
    status,
    type,
    isOutgoing,
  };
}

export function TransactionHistoryTable() {
  const { view, nodes, selectedChain } = useCryptoVizStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [useLiveData, setUseLiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveTransactions, setLiveTransactions] = useState<ReturnType<typeof generateMockTransactions>>([]);
  const itemsPerPage = 10;

  // Get selected node address
  const selectedNode = nodes.find((n) => n.id === view.selectedNodeId);
  const address = selectedNode?.address || "0x0000000000000000000000000000000000000000";

  // Generate mock transactions
  const mockTransactions = useMemo(() => {
    return generateMockTransactions(address, 100);
  }, [address]);

  // Fetch live transactions
  const fetchLiveTransactions = useCallback(async () => {
    if (!useLiveData || !address || address === "0x0000000000000000000000000000000000000000") return;

    setIsLoading(true);
    try {
      const txs = await fetchTransactions(address, selectedChain.id, 1, 100);
      const converted = txs.map(tx => convertEtherscanTx(tx, address));
      setLiveTransactions(converted);
      if (converted.length > 0) {
        toast.success(`Loaded ${converted.length} transactions`);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch live transactions");
    } finally {
      setIsLoading(false);
    }
  }, [useLiveData, address, selectedChain.id]);

  // Fetch live data when toggle changes or address changes
  useEffect(() => {
    if (useLiveData && isOpen) {
      fetchLiveTransactions();
    }
  }, [useLiveData, isOpen, fetchLiveTransactions]);

  // Use live or mock transactions
  const allTransactions = useLiveData && liveTransactions.length > 0 ? liveTransactions : mockTransactions;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !tx.hash.toLowerCase().includes(query) &&
          !tx.from.toLowerCase().includes(query) &&
          !tx.to.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;

      // Direction filter
      if (directionFilter === "in" && tx.isOutgoing) return false;
      if (directionFilter === "out" && !tx.isOutgoing) return false;

      return true;
    });
  }, [allTransactions, searchQuery, typeFilter, statusFilter, directionFilter]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "timestamp":
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case "value":
          comparison = a.value - b.value;
          break;
        case "gasUsed":
          comparison = a.gasUsed - b.gasUsed;
          break;
        case "blockNumber":
          comparison = a.blockNumber - b.blockNumber;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDirectionFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all" || directionFilter !== "all";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          disabled={!selectedNode}
        >
          <History className="w-4 h-4 mr-2" />
          Transactions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-[#0a0a0f] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <History className="w-5 h-5 text-[#00ff88]" />
            Transaction History
            {selectedNode && (
              <Badge variant="outline" className="ml-2 text-gray-400 border-white/10">
                {shortenAddress(selectedNode.address)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Live Data Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Fetch Live Blockchain Data</span>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#00ff88]" />}
          </div>
          <div className="flex items-center gap-3">
            {useLiveData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLiveTransactions}
                disabled={isLoading}
                className="text-xs text-gray-400 hover:text-white"
              >
                Refresh
              </Button>
            )}
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
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 py-4 border-b border-white/10">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by hash or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="swap">Swap</SelectItem>
              <SelectItem value="stake">Stake</SelectItem>
              <SelectItem value="mint">Mint</SelectItem>
              <SelectItem value="burn">Burn</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Direction Filter */}
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in">Incoming</SelectItem>
              <SelectItem value="out">Outgoing</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-400 py-2">
          <span>
            Showing {paginatedTransactions.length} of {sortedTransactions.length} transactions
          </span>
          {hasActiveFilters && (
            <span className="text-[#00ff88]">
              <Filter className="w-4 h-4 inline mr-1" />
              Filters active
            </span>
          )}
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 bg-[#0a0a0f] z-10">
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">
                    Direction
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">
                    Hash
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">
                    From / To
                  </th>
                  <th
                    className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort("value")}
                  >
                    Value
                    <SortIcon field="value" />
                  </th>
                  <th
                    className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort("gasUsed")}
                  >
                    Gas Fee
                    <SortIcon field="gasUsed" />
                  </th>
                  <th
                    className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort("blockNumber")}
                  >
                    Block
                    <SortIcon field="blockNumber" />
                  </th>
                  <th
                    className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort("timestamp")}
                  >
                    Time
                    <SortIcon field="timestamp" />
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {paginatedTransactions.map((tx, index) => {
                    const TypeIcon = txTypeConfig[tx.type].icon;
                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        {/* Direction */}
                        <td className="py-3 px-2">
                          {tx.isOutgoing ? (
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <ArrowUpRight className="w-3 h-3 text-red-400" />
                              </div>
                              <span className="text-xs text-red-400">OUT</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <ArrowDownLeft className="w-3 h-3 text-green-400" />
                              </div>
                              <span className="text-xs text-green-400">IN</span>
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${txTypeConfig[tx.type].color}20` }}
                            >
                              <TypeIcon
                                className="w-3 h-3"
                                style={{ color: txTypeConfig[tx.type].color }}
                              />
                            </div>
                            <span className="text-xs text-white capitalize">
                              {tx.type}
                            </span>
                          </div>
                        </td>

                        {/* Hash */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-mono">
                              {shortenAddress(tx.hash)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(tx.hash, "Transaction hash")}
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <a
                              href={getTxExplorerUrl(tx.hash, selectedChain.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-[#00ff88] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* From / To */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {tx.isOutgoing ? (
                              <>
                                <span className="text-xs text-gray-400">To:</span>
                                <span className="text-sm text-white font-mono">
                                  {shortenAddress(tx.to)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-gray-400">From:</span>
                                <span className="text-sm text-white font-mono">
                                  {shortenAddress(tx.from)}
                                </span>
                              </>
                            )}
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  tx.isOutgoing ? tx.to : tx.from,
                                  "Address"
                                )
                              }
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Value */}
                        <td className="py-3 px-2 text-right">
                          <span className="text-sm text-white font-medium">
                            {tx.value.toFixed(4)} ETH
                          </span>
                        </td>

                        {/* Gas Fee */}
                        <td className="py-3 px-2 text-right">
                          <span className="text-xs text-gray-400">
                            {tx.gasFee.toFixed(6)} ETH
                          </span>
                        </td>

                        {/* Block */}
                        <td className="py-3 px-2 text-right">
                          <a
                            href={`https://etherscan.io/block/${tx.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#00ff88] hover:underline"
                          >
                            {tx.blockNumber.toLocaleString()}
                          </a>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-2 text-right">
                          <span className="text-xs text-gray-400" title={tx.timestamp.toLocaleString()}>
                            {formatDate(tx.timestamp)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-2 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              tx.status === "confirmed"
                                ? "border-green-500/50 text-green-400 bg-green-500/10"
                                : tx.status === "pending"
                                ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                : "border-red-500/50 text-red-400 bg-red-500/10"
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {paginatedTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg">No transactions found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t border-white/10">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 ${
                        currentPage === pageNum
                          ? "bg-[#00ff88] text-black border-[#00ff88]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
