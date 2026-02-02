"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X, Wallet, ArrowRight } from "lucide-react";
import { shortenAddress, getNodeTypeLabel, getNodeTypeIcon } from "@/lib/mockData";

export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { nodes, selectNode, theme } = useCryptoVizStore();
  const themeConfig = themes[theme];

  // Filter nodes based on search query
  const searchResults = query.trim()
    ? nodes.filter(
        (node) =>
          node.address.toLowerCase().includes(query.toLowerCase()) ||
          (node.label && node.label.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10)
    : [];

  // Listen for open search event
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsOpen(true);
    };

    window.addEventListener("openSearch", handleOpenSearch);
    return () => window.removeEventListener("openSearch", handleOpenSearch);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setIsOpen(false);
      setQuery("");
    },
    [selectNode]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => {
              setIsOpen(false);
              setQuery("");
            }}
          />

          {/* Search Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg z-50"
          >
            <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  autoFocus
                  placeholder="Search wallet address or label..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 focus-visible:ring-0 text-lg"
                />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Results */}
              <ScrollArea className="max-h-[300px]">
                {query.trim() === "" ? (
                  <div className="p-6 text-center text-gray-500">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Start typing to search addresses</p>
                    <p className="text-xs mt-1 text-gray-600">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">/</kbd> or{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Cmd+K</kbd> to open
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">No results found for "{query}"</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {searchResults.map((node, index) => (
                      <motion.button
                        key={node.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSelectNode(node.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{
                            background: `${themeConfig.nodeColors[node.type]}20`,
                            color: themeConfig.nodeColors[node.type],
                          }}
                        >
                          {getNodeTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {node.label || shortenAddress(node.address)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                background: `${themeConfig.nodeColors[node.type]}20`,
                                color: themeConfig.nodeColors[node.type],
                                borderColor: themeConfig.nodeColors[node.type],
                              }}
                            >
                              {getNodeTypeLabel(node.type)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {node.transactionCount} txns
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#00ff88] group-hover:translate-x-1 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                <span>{nodes.length} total addresses</span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">Esc</kbd> to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
