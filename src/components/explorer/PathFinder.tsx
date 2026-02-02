"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Route,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Target,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { shortenAddress, getNodeTypeLabel, getNodeTypeIcon } from "@/lib/mockData";
import type { NetworkNode, NetworkLink } from "@/types";

interface PathResult {
  path: NetworkNode[];
  links: NetworkLink[];
  totalValue: number;
  totalTransactions: number;
}

export function PathFinder() {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceAddress, setSourceAddress] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [sourceNode, setSourceNode] = useState<NetworkNode | null>(null);
  const [targetNode, setTargetNode] = useState<NetworkNode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [error, setError] = useState("");
  const [activeInput, setActiveInput] = useState<"source" | "target" | null>(null);
  const [searchResults, setSearchResults] = useState<NetworkNode[]>([]);

  const { nodes, links, selectNode, theme, view } = useCryptoVizStore();
  const themeConfig = themes[theme];

  // Listen for open path finder event
  useEffect(() => {
    const handleOpenPathFinder = () => {
      setIsOpen(true);
    };

    window.addEventListener("openPathFinder", handleOpenPathFinder);
    return () => window.removeEventListener("openPathFinder", handleOpenPathFinder);
  }, []);

  // Search nodes based on input
  const handleSearch = useCallback(
    (query: string, type: "source" | "target") => {
      if (type === "source") {
        setSourceAddress(query);
      } else {
        setTargetAddress(query);
      }
      setActiveInput(type);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const results = nodes
        .filter(
          (node) =>
            node.address.toLowerCase().includes(lowerQuery) ||
            (node.label && node.label.toLowerCase().includes(lowerQuery))
        )
        .slice(0, 5);

      setSearchResults(results);
    },
    [nodes]
  );

  // Select a node from search results
  const handleSelectNode = useCallback(
    (node: NetworkNode, type: "source" | "target") => {
      if (type === "source") {
        setSourceNode(node);
        setSourceAddress(node.label || shortenAddress(node.address));
      } else {
        setTargetNode(node);
        setTargetAddress(node.label || shortenAddress(node.address));
      }
      setSearchResults([]);
      setActiveInput(null);
      setPathResult(null);
      setError("");
    },
    []
  );

  // Build adjacency list from links
  const buildGraph = useCallback(() => {
    const graph: Map<string, Set<string>> = new Map();
    const linkMap: Map<string, NetworkLink> = new Map();

    for (const link of links) {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      if (!graph.has(sourceId)) graph.set(sourceId, new Set());
      if (!graph.has(targetId)) graph.set(targetId, new Set());

      graph.get(sourceId)!.add(targetId);
      graph.get(targetId)!.add(sourceId);

      // Store link for later retrieval
      linkMap.set(`${sourceId}-${targetId}`, link);
      linkMap.set(`${targetId}-${sourceId}`, link);
    }

    return { graph, linkMap };
  }, [links]);

  // BFS to find shortest path
  const findPath = useCallback(() => {
    if (!sourceNode || !targetNode) {
      setError("Please select both source and target addresses");
      return;
    }

    if (sourceNode.id === targetNode.id) {
      setError("Source and target addresses are the same");
      return;
    }

    setIsSearching(true);
    setError("");
    setPathResult(null);

    // Simulate async operation
    setTimeout(() => {
      const { graph, linkMap } = buildGraph();

      // BFS
      const visited = new Set<string>();
      const parent = new Map<string, string>();
      const queue: string[] = [sourceNode.id];
      visited.add(sourceNode.id);

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current === targetNode.id) {
          // Found path - reconstruct it
          const pathIds: string[] = [];
          let node = targetNode.id;

          while (node) {
            pathIds.unshift(node);
            node = parent.get(node)!;
          }

          // Get path nodes
          const pathNodes = pathIds
            .map((id) => nodes.find((n) => n.id === id))
            .filter(Boolean) as NetworkNode[];

          // Get path links
          const pathLinks: NetworkLink[] = [];
          let totalValue = 0;
          let totalTransactions = 0;

          for (let i = 0; i < pathIds.length - 1; i++) {
            const linkKey = `${pathIds[i]}-${pathIds[i + 1]}`;
            const link = linkMap.get(linkKey);
            if (link) {
              pathLinks.push(link);
              totalValue += link.value;
              totalTransactions += link.transactionCount;
            }
          }

          setPathResult({
            path: pathNodes,
            links: pathLinks,
            totalValue,
            totalTransactions,
          });

          toast.success(`Found path with ${pathNodes.length} nodes`, {
            description: `${pathLinks.length} connections`,
          });

          setIsSearching(false);
          return;
        }

        const neighbors = graph.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            parent.set(neighbor, current);
            queue.push(neighbor);
          }
        }
      }

      // No path found
      setError("No path found between the selected addresses");
      setIsSearching(false);
    }, 500);
  }, [sourceNode, targetNode, buildGraph, nodes]);

  // Navigate to a node in the path
  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setIsOpen(false);
    },
    [selectNode]
  );

  // Reset the path finder
  const handleReset = useCallback(() => {
    setSourceAddress("");
    setTargetAddress("");
    setSourceNode(null);
    setTargetNode(null);
    setPathResult(null);
    setError("");
    setSearchResults([]);
  }, []);

  // Auto-set source from selected node
  useEffect(() => {
    if (view.selectedNodeId && isOpen && !sourceNode) {
      const selected = nodes.find((n) => n.id === view.selectedNodeId);
      if (selected) {
        setSourceNode(selected);
        setSourceAddress(selected.label || shortenAddress(selected.address));
      }
    }
  }, [view.selectedNodeId, isOpen, sourceNode, nodes]);

  return (
    <>
      {/* Trigger Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-white/10 text-white hover:bg-white/10 hover:border-[#00ffff]/50 transition-all"
        >
          <Route className="w-4 h-4 mr-2" />
          <span className="hidden xl:inline">Path Finder</span>
        </Button>
      </motion.div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#0a0a0f] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Route className="w-5 h-5" style={{ color: themeConfig.accentColor }} />
              Path Finder
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Find the shortest path between two wallet addresses in the network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Source Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Flag className="w-3 h-3 text-[#00ff88]" />
                Source Address
              </label>
              <div className="relative">
                <Input
                  placeholder="Search or select source..."
                  value={sourceAddress}
                  onChange={(e) => handleSearch(e.target.value, "source")}
                  onFocus={() => setActiveInput("source")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 pr-10"
                />
                {sourceNode ? (
                  <button
                    onClick={() => {
                      setSourceNode(null);
                      setSourceAddress("");
                      setPathResult(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                )}
              </div>

              {/* Source search results */}
              <AnimatePresence>
                {activeInput === "source" && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass rounded-lg border border-white/10 overflow-hidden"
                  >
                    {searchResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleSelectNode(node, "source")}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{
                            background: `${themeConfig.nodeColors[node.type]}20`,
                            color: themeConfig.nodeColors[node.type],
                          }}
                        >
                          {getNodeTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">
                            {node.label || shortenAddress(node.address)}
                          </p>
                          <p className="text-xs text-gray-500">{getNodeTypeLabel(node.type)}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronRight className="w-6 h-6 text-[#00ff88] rotate-90" />
              </motion.div>
            </div>

            {/* Target Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-3 h-3 text-[#ff00ff]" />
                Target Address
              </label>
              <div className="relative">
                <Input
                  placeholder="Search or select target..."
                  value={targetAddress}
                  onChange={(e) => handleSearch(e.target.value, "target")}
                  onFocus={() => setActiveInput("target")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 pr-10"
                />
                {targetNode ? (
                  <button
                    onClick={() => {
                      setTargetNode(null);
                      setTargetAddress("");
                      setPathResult(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                )}
              </div>

              {/* Target search results */}
              <AnimatePresence>
                {activeInput === "target" && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass rounded-lg border border-white/10 overflow-hidden"
                  >
                    {searchResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleSelectNode(node, "target")}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{
                            background: `${themeConfig.nodeColors[node.type]}20`,
                            color: themeConfig.nodeColors[node.type],
                          }}
                        >
                          {getNodeTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">
                            {node.label || shortenAddress(node.address)}
                          </p>
                          <p className="text-xs text-gray-500">{getNodeTypeLabel(node.type)}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-lg bg-red-500/10"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Find Path Button */}
            <div className="flex gap-2">
              <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={findPath}
                  disabled={isSearching || !sourceNode || !targetNode}
                  className="w-full bg-gradient-to-r from-[#00ff88] to-[#00ffff] text-black font-semibold hover:opacity-90 transition-opacity"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Route className="w-4 h-4 mr-2" />
                      Find Path
                    </>
                  )}
                </Button>
              </motion.div>
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-white/10 text-gray-300 hover:bg-white/10"
              >
                Reset
              </Button>
            </div>

            {/* Path Result */}
            <AnimatePresence>
              {pathResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-3"
                >
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#00ff88]">
                        {pathResult.path.length}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">Nodes</div>
                    </div>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#ff00ff]">
                        {pathResult.links.length}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">Hops</div>
                    </div>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#00ffff]">
                        {pathResult.totalTransactions}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">Txns</div>
                    </div>
                  </div>

                  {/* Path Visualization */}
                  <div className="glass rounded-lg p-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                      Path
                    </label>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-1">
                        {pathResult.path.map((node, index) => (
                          <motion.div
                            key={node.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <button
                              onClick={() => handleNavigateToNode(node.id)}
                              className="flex-1 flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                                style={{
                                  background: `${themeConfig.nodeColors[node.type]}20`,
                                  color: themeConfig.nodeColors[node.type],
                                }}
                              >
                                {getNodeTypeIcon(node.type)}
                              </div>
                              <span className="text-white text-sm truncate">
                                {node.label || shortenAddress(node.address)}
                              </span>
                              {index === 0 && (
                                <Badge className="text-[8px] bg-[#00ff88]/20 text-[#00ff88]">
                                  START
                                </Badge>
                              )}
                              {index === pathResult.path.length - 1 && (
                                <Badge className="text-[8px] bg-[#ff00ff]/20 text-[#ff00ff]">
                                  END
                                </Badge>
                              )}
                            </button>
                            {index < pathResult.path.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
