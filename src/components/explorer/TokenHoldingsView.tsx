"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  RefreshCw,
  ExternalLink,
  Copy,
  Image as ImageIcon,
} from "lucide-react";
import { useCryptoVizStore } from "@/lib/store";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TokenHolding {
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  price: number;
  priceChange24h: number;
  value: number;
  contractAddress: string;
  logo?: string;
}

interface NFTHolding {
  id: string;
  name: string;
  collection: string;
  image: string;
  floorPrice: number;
}

// Mock token data
const generateMockTokens = (): TokenHolding[] => [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: 12.5432,
    decimals: 18,
    price: 2345.67,
    priceChange24h: 2.45,
    value: 29421.23,
    contractAddress: "0x0000000000000000000000000000000000000000",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 15234.56,
    decimals: 6,
    price: 1.0,
    priceChange24h: 0.01,
    value: 15234.56,
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    logo: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    balance: 0.2345,
    decimals: 8,
    price: 43567.89,
    priceChange24h: -1.23,
    value: 10216.68,
    contractAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    logo: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    balance: 234.567,
    decimals: 18,
    price: 6.78,
    priceChange24h: 5.67,
    value: 1590.36,
    contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    logo: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    balance: 123.45,
    decimals: 18,
    price: 14.56,
    priceChange24h: -2.34,
    value: 1797.43,
    contractAddress: "0x514910771af9ca656af840dff83e8264ecf986ca",
    logo: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  },
  {
    symbol: "AAVE",
    name: "Aave",
    balance: 45.678,
    decimals: 18,
    price: 89.12,
    priceChange24h: 3.45,
    value: 4070.2,
    contractAddress: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    logo: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
  },
];

const generateMockNFTs = (): NFTHolding[] => [
  {
    id: "1234",
    name: "Bored Ape #1234",
    collection: "Bored Ape Yacht Club",
    image: "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB",
    floorPrice: 32.5,
  },
  {
    id: "5678",
    name: "Azuki #5678",
    collection: "Azuki",
    image: "https://i.seadn.io/gae/H8jOCJuQokNqGBpkBN5wk1oZwO7LM8bNnrHCaekV2nKjnCqw6UB5oaH8XyNeBDj6bA_n1mjejzhFQUP3O1NfjFLHr3FOaeHcTOOT",
    floorPrice: 12.3,
  },
  {
    id: "9012",
    name: "Pudgy Penguin #9012",
    collection: "Pudgy Penguins",
    image: "https://i.seadn.io/gae/yNi-XdGxsgQCPpqSio4o31ygAV6wURdIdInWRcFIl46UjUQ1eV7BEndGe8L661OoG-clRi7EgInLX4LPu9Jfw4fq0bnVYHqg7RFi",
    floorPrice: 8.7,
  },
];

const COLORS = ["#00ff88", "#ff00ff", "#00ffff", "#ffff00", "#ff4444", "#8844ff"];

export function TokenHoldingsView() {
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenHolding[]>([]);
  const [nfts, setNFTs] = useState<NFTHolding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens");
  const { view } = useCryptoVizStore();

  const loadData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setTokens(generateMockTokens());
      setNFTs(generateMockNFTs());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const totalValue = tokens.reduce((sum, t) => sum + t.value, 0);
  const totalChange = tokens.reduce((sum, t) => sum + (t.value * t.priceChange24h / 100), 0);
  const changePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

  const pieData = tokens.map((t) => ({
    name: t.symbol,
    value: t.value,
  }));

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-white/10 text-white hover:bg-white/10 hover:border-[#00ffff]/50 transition-all"
        >
          <Coins className="w-4 h-4 mr-2" />
          <span className="hidden xl:inline">Holdings</span>
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border-white/10 max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#00ffff]" />
              Token Holdings
              {view.selectedNodeId && (
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {view.selectedNodeId.slice(0, 6)}...{view.selectedNodeId.slice(-4)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View token and NFT holdings for the selected wallet
            </DialogDescription>
          </DialogHeader>

          {/* Portfolio Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Total Value
              </div>
              <p className="text-2xl font-bold text-white">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Percent className="w-4 h-4" />
                24h Change
              </div>
              <p className={`text-2xl font-bold flex items-center gap-1 ${changePercent >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                {changePercent >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Coins className="w-4 h-4" />
                Assets
              </div>
              <p className="text-2xl font-bold text-white">
                {tokens.length} <span className="text-sm text-gray-400">tokens</span>
              </p>
            </div>
          </div>

          {/* Portfolio Chart */}
          <div className="h-[150px] flex items-center justify-center">
            {tokens.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value) => value != null ? [`${Number(value).toLocaleString()}`, "Value"] : ["", "Value"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="tokens" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-black">
                <Coins className="w-4 h-4 mr-2" />
                Tokens ({tokens.length})
              </TabsTrigger>
              <TabsTrigger value="nfts" className="data-[state=active]:bg-[#ff00ff] data-[state=active]:text-black">
                <ImageIcon className="w-4 h-4 mr-2" />
                NFTs ({nfts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tokens">
              <ScrollArea className="h-[250px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#00ff88]" />
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {tokens.map((token, idx) => (
                      <motion.div
                        key={token.symbol}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                              {token.logo ? (
                                <img src={token.logo} alt={token.symbol} className="w-8 h-8" />
                              ) : (
                                <Coins className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{token.symbol}</p>
                              <p className="text-xs text-gray-400">{token.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              ${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-gray-400">{token.balance.toLocaleString()} {token.symbol}</span>
                              <span className={`text-xs ${token.priceChange24h >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                                {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(token.contractAddress)}
                            className="text-xs text-gray-400 hover:text-white h-6 px-2"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            {token.contractAddress.slice(0, 8)}...
                          </Button>
                          <a
                            href={`https://etherscan.io/token/${token.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-[#00ff88] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Etherscan
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="nfts">
              <ScrollArea className="h-[250px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#ff00ff]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 pr-4">
                    {nfts.map((nft, idx) => (
                      <motion.div
                        key={nft.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="rounded-lg bg-white/5 border border-white/10 overflow-hidden hover:border-[#ff00ff]/50 transition-colors"
                      >
                        <div className="aspect-square bg-white/10 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="p-2">
                          <p className="text-white text-sm font-medium truncate">{nft.name}</p>
                          <p className="text-xs text-gray-400 truncate">{nft.collection}</p>
                          <p className="text-xs text-[#ff00ff] mt-1">Floor: {nft.floorPrice} ETH</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => loadData()} className="text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
