"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useCryptoVizStore } from "@/lib/store";
import { Search, Filter, RotateCcw, Sparkles, Layers, GitBranch, Combine } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { NodeType } from "@/types";
import { getNodeTypeLabel } from "@/lib/mockData";

const nodeTypes: NodeType[] = ['wallet', 'exchange', 'contract', 'whale', 'mixer', 'defi'];

const nodeTypeColors: Record<NodeType, string> = {
  wallet: '#00ff88',
  exchange: '#ff00ff',
  contract: '#00ffff',
  whale: '#ffff00',
  mixer: '#ff4444',
  defi: '#8844ff',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export function FiltersSidebar() {
  const { filters, setFilters, resetFilters, stats, view, setView } = useCryptoVizStore();

  const toggleNodeType = (type: NodeType) => {
    const current = filters.nodeTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ nodeTypes: updated });
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-72 glass border-r border-white/5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Filter className="w-4 h-4 text-[#00ff88]" />
            </motion.div>
            Filters
          </h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-gray-400 hover:text-white text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          className="relative"
          whileFocus={{ scale: 1.02 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search address..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#00ff88]/50 transition-colors"
          />
        </motion.div>
      </div>

      {/* Scrollable content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto scrollbar-custom p-4 space-y-6"
      >
        {/* Node Types */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Node Types
          </h3>
          <div className="flex flex-wrap gap-2">
            {nodeTypes.map((type, index) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge
                  variant={filters.nodeTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    background: filters.nodeTypes.includes(type) ? `${nodeTypeColors[type]}20` : 'transparent',
                    borderColor: nodeTypeColors[type],
                    color: filters.nodeTypes.includes(type) ? nodeTypeColors[type] : '#666',
                    boxShadow: filters.nodeTypes.includes(type) ? `0 0 10px ${nodeTypeColors[type]}30` : 'none',
                  }}
                  onClick={() => toggleNodeType(type)}
                >
                  {getNodeTypeLabel(type)}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Balance Range */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Min Balance (ETH)</h3>
          <Slider
            value={[filters.minBalance]}
            onValueChange={([val]) => setFilters({ minBalance: val })}
            max={1000}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0</span>
            <motion.span
              key={filters.minBalance}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[#00ff88] font-medium px-2 py-0.5 rounded-full bg-[#00ff88]/10"
            >
              {filters.minBalance} ETH
            </motion.span>
            <span>1000+</span>
          </div>
        </motion.div>

        {/* Risk Score */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Score Range</h3>
          <div className="flex gap-4 items-center">
            <Slider
              value={[filters.minRiskScore, filters.maxRiskScore]}
              onValueChange={([min, max]) => setFilters({ minRiskScore: min, maxRiskScore: max })}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <motion.span
              key={filters.minRiskScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-green-400 font-medium px-2 py-0.5 rounded-full bg-green-400/10"
            >
              {filters.minRiskScore}
            </motion.span>
            <div className="flex-1 mx-2 h-px bg-gradient-to-r from-green-400/50 via-yellow-400/50 to-red-400/50 self-center" />
            <motion.span
              key={filters.maxRiskScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-red-400 font-medium px-2 py-0.5 rounded-full bg-red-400/10"
            >
              {filters.maxRiskScore}
            </motion.span>
          </div>
        </motion.div>

        {/* Min Transactions */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Min Transactions</h3>
          <Slider
            value={[filters.minTransactions]}
            onValueChange={([val]) => setFilters({ minTransactions: val })}
            max={100}
            step={5}
            className="w-full"
          />
          <motion.div
            key={filters.minTransactions}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs text-[#00ff88] mt-2 font-medium"
          >
            {filters.minTransactions}+ transactions
          </motion.div>
        </motion.div>

        {/* Visualization Settings */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Layers className="w-3 h-3" />
            Visualization
          </h3>

          {/* Node Clustering */}
          <div className="space-y-4">
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#00ffff]/30 transition-all"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2">
                <Combine className="w-4 h-4 text-[#00ffff]" />
                <div>
                  <p className="text-sm text-white">Node Clustering</p>
                  <p className="text-[10px] text-gray-500">Group nearby nodes</p>
                </div>
              </div>
              <Switch
                checked={view.enableClustering}
                onCheckedChange={(checked) => setView({ enableClustering: checked })}
              />
            </motion.div>

            {view.enableClustering && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="pl-4"
              >
                <p className="text-xs text-gray-400 mb-2">Cluster Threshold</p>
                <Slider
                  value={[view.clusterThreshold]}
                  onValueChange={([val]) => setView({ clusterThreshold: val })}
                  min={20}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Fewer clusters</span>
                  <motion.span
                    key={view.clusterThreshold}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-[#00ffff]"
                  >
                    {view.clusterThreshold}
                  </motion.span>
                  <span>More clusters</span>
                </div>
              </motion.div>
            )}

            {/* Edge Bundling */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#ff00ff]/30 transition-all"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#ff00ff]" />
                <div>
                  <p className="text-sm text-white">Edge Bundling</p>
                  <p className="text-[10px] text-gray-500">Clean link paths</p>
                </div>
              </div>
              <Switch
                checked={view.enableEdgeBundling}
                onCheckedChange={(checked) => setView({ enableEdgeBundling: checked })}
              />
            </motion.div>

            {view.enableEdgeBundling && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="pl-4"
              >
                <p className="text-xs text-gray-400 mb-2">Bundling Strength</p>
                <Slider
                  value={[view.bundlingStrength * 100]}
                  onValueChange={([val]) => setView({ bundlingStrength: val / 100 })}
                  min={20}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Loose</span>
                  <motion.span
                    key={view.bundlingStrength}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-[#ff00ff]"
                  >
                    {Math.round(view.bundlingStrength * 100)}%
                  </motion.span>
                  <span>Tight</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Footer */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 border-t border-white/5 bg-white/[0.02]"
      >
        <div className="grid grid-cols-2 gap-3 text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass rounded-lg p-2"
          >
            <motion.div
              key={stats.totalNodes}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold text-[#00ff88]"
            >
              {stats.totalNodes}
            </motion.div>
            <div className="text-xs text-gray-500">Nodes</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass rounded-lg p-2"
          >
            <motion.div
              key={stats.totalLinks}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold text-[#ff00ff]"
            >
              {stats.totalLinks}
            </motion.div>
            <div className="text-xs text-gray-500">Links</div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
