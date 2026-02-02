"use client";

import { motion } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  PieChart,
  Star,
  StarOff,
} from "lucide-react";
import {
  shortenAddress,
  formatETH,
  getRiskLevel,
  getNodeTypeLabel,
  getNodeTypeIcon,
} from "@/lib/mockData";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useMemo } from "react";

// Generate mock transaction history data
const generateTransactionHistory = () => {
  const data = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      inflow: Math.random() * 50 + 10,
      outflow: Math.random() * 40 + 5,
    });
  }
  return data;
};

export function NodeDetailsPanel() {
  const { nodes, links, view, selectNode, theme, watchlist, addToWatchlist, removeFromWatchlist } = useCryptoVizStore();
  const themeConfig = themes[theme];

  const selectedNode = nodes.find((n) => n.id === view.selectedNodeId);

  const transactionHistory = useMemo(() => generateTransactionHistory(), []);

  if (!selectedNode) return null;

  const riskInfo = getRiskLevel(selectedNode.riskScore);

  // Get connected links
  const connectedLinks = links.filter(
    (link) =>
      (typeof link.source === "string"
        ? link.source
        : (link.source as typeof selectedNode).id) === selectedNode.id ||
      (typeof link.target === "string"
        ? link.target
        : (link.target as typeof selectedNode).id) === selectedNode.id
  );

  // Get connected nodes
  const connectedNodeIds = new Set<string>();
  for (const link of connectedLinks) {
    const sourceId = typeof link.source === "string" ? link.source : (link.source as typeof selectedNode).id;
    const targetId = typeof link.target === "string" ? link.target : (link.target as typeof selectedNode).id;
    if (sourceId !== selectedNode.id) connectedNodeIds.add(sourceId);
    if (targetId !== selectedNode.id) connectedNodeIds.add(targetId);
  }

  const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n.id));

  // Calculate inflow/outflow
  const inflow = connectedLinks
    .filter((l) => {
      const targetId = typeof l.target === "string" ? l.target : (l.target as typeof selectedNode).id;
      return targetId === selectedNode.id;
    })
    .reduce((sum, l) => sum + l.value, 0);

  const outflow = connectedLinks
    .filter((l) => {
      const sourceId = typeof l.source === "string" ? l.source : (l.source as typeof selectedNode).id;
      return sourceId === selectedNode.id;
    })
    .reduce((sum, l) => sum + l.value, 0);

  // Pie chart data for transaction types
  const transactionTypeData = [
    { name: "Transfers", value: 45, color: "#00ff88" },
    { name: "Swaps", value: 30, color: "#ff00ff" },
    { name: "Stakes", value: 15, color: "#00ffff" },
    { name: "Other", value: 10, color: "#ffff00" },
  ];

  // Risk breakdown data
  const riskBreakdownData = [
    { category: "Mixer", risk: Math.random() * 30 + 10 },
    { category: "Exchange", risk: Math.random() * 20 + 5 },
    { category: "DeFi", risk: Math.random() * 40 + 15 },
    { category: "Unknown", risk: Math.random() * 25 + 10 },
  ];

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedNode.address);
    toast.success("Address copied to clipboard");
  };

  const isWatchlisted = watchlist.some(
    (e) => e.address.toLowerCase() === selectedNode.address.toLowerCase()
  );

  const toggleWatchlist = () => {
    if (isWatchlisted) {
      removeFromWatchlist(selectedNode.address);
      toast.success("Removed from watchlist");
    } else {
      addToWatchlist({
        address: selectedNode.address,
        label: selectedNode.label || shortenAddress(selectedNode.address),
        tags: [],
        alertsEnabled: false,
      });
      toast.success("Added to watchlist");
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-80 lg:w-96 glass border-l border-white/5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: `${themeConfig.nodeColors[selectedNode.type]}20`,
                color: themeConfig.nodeColors[selectedNode.type],
              }}
            >
              {getNodeTypeIcon(selectedNode.type)}
            </motion.div>
            <div>
              <h3 className="font-semibold text-white">
                {selectedNode.label || getNodeTypeLabel(selectedNode.type)}
              </h3>
              <p className="text-xs text-gray-400">
                {shortenAddress(selectedNode.address)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectNode(null)}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="w-full text-xs border-white/10 hover:bg-white/10"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWatchlist}
              className={`w-full text-xs border-white/10 hover:bg-white/10 ${
                isWatchlisted ? "text-[#00ff88] border-[#00ff88]/30" : ""
              }`}
            >
              {isWatchlisted ? (
                <>
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Saved
                </>
              ) : (
                <>
                  <StarOff className="w-3 h-3 mr-1" />
                  Watch
                </>
              )}
            </Button>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full text-xs border-white/10 hover:bg-white/10"
            >
              <a
                href={`https://etherscan.io/address/${selectedNode.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </a>
            </Button>
          </motion.div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Type & Risk */}
          <div className="flex gap-2">
            <Badge
              className="text-xs"
              style={{
                background: `${themeConfig.nodeColors[selectedNode.type]}20`,
                color: themeConfig.nodeColors[selectedNode.type],
                borderColor: themeConfig.nodeColors[selectedNode.type],
              }}
            >
              {getNodeTypeLabel(selectedNode.type)}
            </Badge>
            <Badge
              className="text-xs"
              style={{
                background: `${riskInfo.color}20`,
                color: riskInfo.color,
                borderColor: riskInfo.color,
              }}
            >
              {riskInfo.label}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Wallet className="w-4 h-4" />}
              label="Balance"
              value={formatETH(selectedNode.balance)}
              color="#00ff88"
            />
            <StatCard
              icon={<Shield className="w-4 h-4" />}
              label="Risk Score"
              value={`${selectedNode.riskScore}/100`}
              color={riskInfo.color}
            />
            <StatCard
              icon={<Activity className="w-4 h-4" />}
              label="Transactions"
              value={selectedNode.transactionCount.toString()}
              color="#00ffff"
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Active"
              value={formatTimeAgo(selectedNode.lastActive)}
              color="#ff00ff"
            />
          </div>

          <Separator className="bg-white/5" />

          {/* Flow Stats */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Transaction Flow
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass rounded-xl p-3"
              >
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span className="text-xs">Inflow</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {formatETH(inflow)}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass rounded-xl p-3"
              >
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-xs">Outflow</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {formatETH(outflow)}
                </p>
              </motion.div>
            </div>

            {/* Net Flow Indicator */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="mt-3 p-3 glass rounded-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Net Flow</span>
                <div
                  className="flex items-center gap-1"
                  style={{ color: inflow - outflow >= 0 ? "#00ff88" : "#ff4444" }}
                >
                  {inflow - outflow >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {formatETH(Math.abs(inflow - outflow))}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <Separator className="bg-white/5" />

          {/* Charts Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </h4>
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-4">
                <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-[#00ff88]/20 data-[state=active]:text-[#00ff88]">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="types" className="text-xs data-[state=active]:bg-[#00ff88]/20 data-[state=active]:text-[#00ff88]">
                  Types
                </TabsTrigger>
                <TabsTrigger value="risk" className="text-xs data-[state=active]:bg-[#00ff88]/20 data-[state=active]:text-[#00ff88]">
                  Risk
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-0">
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={transactionHistory.slice(-14)}>
                      <defs>
                        <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ff00ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10, 10, 15, 0.9)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="inflow"
                        stroke="#00ff88"
                        fill="url(#inflowGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="outflow"
                        stroke="#ff00ff"
                        fill="url(#outflowGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
                    <span className="text-gray-400">Inflow</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ff00ff]" />
                    <span className="text-gray-400">Outflow</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="types" className="mt-0">
                <div className="h-32 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={transactionTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {transactionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10, 10, 15, 0.9)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs">
                  {transactionTypeData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="risk" className="mt-0">
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskBreakdownData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tick={{ fill: "#888", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10, 10, 15, 0.9)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value) => value !== undefined ? [`${(value as number).toFixed(1)}%`, "Risk"] : ["0%", "Risk"]}
                      />
                      <Bar
                        dataKey="risk"
                        fill="#ff4444"
                        radius={[0, 4, 4, 0]}
                        background={{ fill: "rgba(255,255,255,0.05)" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator className="bg-white/5" />

          {/* Connected Nodes */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Connected ({connectedNodes.length})
            </h4>
            <div className="space-y-2">
              {connectedNodes.slice(0, 5).map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  onClick={() => selectNode(node.id)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
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
                    <p className="text-sm text-white truncate">
                      {node.label || shortenAddress(node.address)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getNodeTypeLabel(node.type)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xs font-medium"
                      style={{ color: getRiskLevel(node.riskScore).color }}
                    >
                      {node.riskScore}%
                    </p>
                  </div>
                </motion.div>
              ))}
              {connectedNodes.length > 5 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-500 text-center py-2"
                >
                  +{connectedNodes.length - 5} more connections
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>First seen</span>
          <span>{selectedNode.firstSeen.toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="glass rounded-xl p-3"
    >
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}
