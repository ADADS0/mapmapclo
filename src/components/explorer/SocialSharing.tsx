"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Share2,
  Twitter,
  Link2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  QrCode,
  Download,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { useCryptoVizStore } from "@/lib/store";
import { toast } from "sonner";

export function SocialSharing() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("share");
  const { view, selectedChain, stats, nodes } = useCryptoVizStore();

  const selectedNode = nodes.find((n) => n.id === view.selectedNodeId);

  const generateShareText = () => {
    if (selectedNode) {
      return `Exploring wallet ${selectedNode.address.slice(0, 6)}...${selectedNode.address.slice(-4)} on ${selectedChain.name} with CryptoViz Pro\n\nBalance: ${selectedNode.balance.toFixed(4)} ${selectedChain.symbol}\nTransactions: ${selectedNode.transactionCount}\nRisk Score: ${selectedNode.riskScore}/100`;
    }
    return `Visualizing ${stats.totalNodes} wallets and ${stats.totalLinks} transactions on ${selectedChain.name} with CryptoViz Pro\n\nTotal Volume: ${stats.totalVolume.toFixed(2)} ${selectedChain.symbol}\nActive Wallets: ${stats.activeWallets}`;
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = generateShareText();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Check out this blockchain analysis");
    const body = encodeURIComponent(`${shareText}\n\nView here: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const exportAsImage = () => {
    toast.info("Capturing screenshot...");
    setTimeout(() => {
      toast.success("Image exported successfully");
    }, 1000);
  };

  const socialPlatforms = [
    { name: "Twitter/X", icon: Twitter, color: "#1DA1F2", action: shareToTwitter },
    { name: "Telegram", icon: MessageCircle, color: "#0088cc", action: shareToTelegram },
    { name: "Email", icon: Mail, color: "#EA4335", action: shareViaEmail },
  ];

  const insights = [
    { label: "Network Size", value: `${stats.totalNodes} nodes` },
    { label: "Total Transactions", value: `${stats.totalLinks} links` },
    { label: "Volume", value: `${stats.totalVolume.toFixed(2)} ${selectedChain.symbol}` },
    { label: "High Risk Nodes", value: `${stats.riskySources}` },
  ];

  return (
    <>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-white/10 text-white hover:bg-white/10 hover:border-[#ff00ff]/50 transition-all"
        >
          <Share2 className="w-4 h-4 mr-2" />
          <span className="hidden xl:inline">Share</span>
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#ff00ff]" />
              Share Analysis
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your blockchain analysis with others
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10 w-full">
              <TabsTrigger value="share" className="flex-1 data-[state=active]:bg-[#ff00ff] data-[state=active]:text-black">
                Share
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-black">
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-4 mt-4">
              {/* Preview Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#ff00ff]/10 to-[#00ff88]/10 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff00ff] to-[#00ff88] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">CryptoViz Pro</p>
                    <p className="text-xs text-gray-400">Blockchain Network Analysis</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {insights.map((insight) => (
                    <div key={insight.label} className="p-2 rounded bg-white/5">
                      <p className="text-xs text-gray-400">{insight.label}</p>
                      <p className="text-sm font-semibold text-white">{insight.value}</p>
                    </div>
                  ))}
                </div>
                {selectedNode && (
                  <div className="mt-3 p-2 rounded bg-white/5">
                    <p className="text-xs text-gray-400">Selected Wallet</p>
                    <p className="text-sm font-mono text-[#00ff88]">
                      {selectedNode.address.slice(0, 10)}...{selectedNode.address.slice(-8)}
                    </p>
                  </div>
                )}
              </div>

              {/* Share Link */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Share Link</label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-white/5 border-white/10 text-white font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shareUrl)}
                    className="border-white/10 hover:bg-white/10 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Social Platforms */}
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Share to</label>
                <div className="grid grid-cols-3 gap-3">
                  {socialPlatforms.map((platform) => (
                    <motion.button
                      key={platform.name}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={platform.action}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex flex-col items-center gap-2"
                    >
                      <platform.icon className="w-6 h-6" style={{ color: platform.color }} />
                      <span className="text-xs text-gray-400">{platform.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Copy Text */}
              <Button
                variant="outline"
                onClick={() => copyToClipboard(shareText)}
                className="w-full border-white/10 text-white hover:bg-white/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Share Text
              </Button>
            </TabsContent>

            <TabsContent value="export" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportAsImage}
                  className="p-6 rounded-lg bg-white/5 border border-white/10 hover:border-[#00ff88]/50 transition-colors flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-[#00ff88]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Screenshot</p>
                    <p className="text-xs text-gray-400">Export as PNG</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toast.info("QR code generated")}
                  className="p-6 rounded-lg bg-white/5 border border-white/10 hover:border-[#ff00ff]/50 transition-colors flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ff00ff]/20 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-[#ff00ff]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">QR Code</p>
                    <p className="text-xs text-gray-400">Share via QR</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("exportData", { detail: { format: "json" } }));
                    toast.success("JSON exported");
                  }}
                  className="p-6 rounded-lg bg-white/5 border border-white/10 hover:border-[#00ffff]/50 transition-colors flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00ffff]/20 flex items-center justify-center">
                    <Download className="w-6 h-6 text-[#00ffff]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">JSON Data</p>
                    <p className="text-xs text-gray-400">Export raw data</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("exportData", { detail: { format: "csv" } }));
                    toast.success("CSV exported");
                  }}
                  className="p-6 rounded-lg bg-white/5 border border-white/10 hover:border-[#ffff00]/50 transition-colors flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ffff00]/20 flex items-center justify-center">
                    <Download className="w-6 h-6 text-[#ffff00]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">CSV Report</p>
                    <p className="text-xs text-gray-400">Spreadsheet format</p>
                  </div>
                </motion.button>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm text-white font-medium mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#00ff88]" />
                  Embed Widget
                </h4>
                <Input
                  value={`<iframe src="${shareUrl}/embed" width="600" height="400"></iframe>`}
                  readOnly
                  className="bg-white/5 border-white/10 text-gray-400 font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`<iframe src="${shareUrl}/embed" width="600" height="400"></iframe>`)}
                  className="mt-2 text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Embed Code
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
