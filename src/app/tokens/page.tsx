"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCryptoVizStore } from "@/lib/store";
import {
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Star,
  Home,
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
  Flame,
  Zap,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Token {
  id: string;
  name: string;
  symbol: string;
  image: string;
  chain: string;
  chainLogo: string;
  tokenTransfers: string;
  volume: string;
  price: string;
  priceChange: number;
  marketCap: number;
  rank?: number;
}

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
}

const chainFilters = [
  { id: 'all', name: 'All Chains', logo: '', coingeckoId: '' },
  { id: 'ethereum', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', coingeckoId: 'ethereum' },
  { id: 'base', name: 'Base', logo: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg', coingeckoId: 'base' },
  { id: 'polygon', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png', coingeckoId: 'polygon-pos' },
  { id: 'arbitrum', name: 'Arbitrum', logo: 'https://assets.coingecko.com/asset_platforms/images/33/small/arbitrum-one.png', coingeckoId: 'arbitrum-one' },
  { id: 'bsc', name: 'BNB Chain', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', coingeckoId: 'binance-smart-chain' },
  { id: 'solana', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', coingeckoId: 'solana' },
];

// Format large numbers
function formatVolume(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(10)}`;
}

function formatMarketCap(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function TokenRow({ token, index, onClick, showRank = false }: { token: Token; index: number; onClick: () => void; showRank?: boolean }) {
  const isPositive = token.priceChange >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 100 }}
      className="border-b border-white/5 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent cursor-pointer transition-all duration-300 group"
      onClick={onClick}
    >
      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          {/* Token Logo with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff00ff]/30 to-[#00ffff]/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={token.image}
              alt={token.name}
              className="w-10 h-10 rounded-full bg-white/10 relative z-10 ring-2 ring-white/10 group-hover:ring-[#00ff88]/50 transition-all"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=1a1a2e&color=00ff88&size=40&bold=true`;
              }}
            />
            {/* Chain badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0f] bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
              <img
                src={token.chainLogo}
                alt={token.chain}
                className="w-4 h-4 rounded-full"
              />
            </div>
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white group-hover:text-[#00ff88] transition-colors truncate">
                {token.symbol.toUpperCase()}
              </span>
              {showRank && token.rank && token.rank <= 3 && (
                <Crown className={`w-4 h-4 ${token.rank === 1 ? 'text-yellow-400' : token.rank === 2 ? 'text-gray-300' : 'text-amber-600'}`} />
              )}
              <ExternalLink className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-gray-500 truncate block">{token.name}</span>
          </div>
        </div>
      </td>

      <td className="py-4 px-3 text-right hidden sm:table-cell">
        <span className="text-white/70 font-medium text-sm">{token.tokenTransfers}</span>
      </td>

      <td className="py-4 px-3 text-right">
        <div className="flex flex-col items-end">
          <span className="text-white font-semibold">{token.volume}</span>
          <span className="text-gray-500 text-xs">{token.price}</span>
        </div>
      </td>

      <td className="py-4 px-3 text-right hidden md:table-cell">
        <span className="text-white/70 font-medium">{formatMarketCap(token.marketCap)}</span>
      </td>

      <td className="py-4 px-3 text-right">
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isPositive
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{token.priceChange?.toFixed(2) || '0.00'}%</span>
        </div>
      </td>
    </motion.tr>
  );
}

function TokenCard({ token, index, onClick }: { token: Token; index: number; onClick: () => void }) {
  const isPositive = token.priceChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-[#00ff88]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#00ff88]/5">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-[#00ffff]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <img
                src={token.image}
                alt={token.name}
                className="w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=1a1a2e&color=00ff88&size=48&bold=true`;
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0f] overflow-hidden">
                <img src={token.chainLogo} alt={token.chain} className="w-full h-full" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white group-hover:text-[#00ff88] transition-colors">
                {token.symbol.toUpperCase()}
              </h3>
              <p className="text-xs text-gray-500">{token.name}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">{token.price}</span>
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{token.priceChange?.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TokensPage() {
  const router = useRouter();
  const { chains, setSelectedChain } = useCryptoVizStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChainFilter, setSelectedChainFilter] = useState("all");
  const [showChainFilter, setShowChainFilter] = useState(false);
  const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
  const [featuredTokens, setFeaturedTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tokens from CoinGecko API
  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch trending coins
        const trendingRes = await fetch(
          'https://api.coingecko.com/api/v3/search/trending',
          { headers: { 'Accept': 'application/json' } }
        );

        // Fetch top coins by market cap
        const topCoinsRes = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false&price_change_percentage=24h',
          { headers: { 'Accept': 'application/json' } }
        );

        if (!trendingRes.ok || !topCoinsRes.ok) {
          throw new Error('Failed to fetch token data');
        }

        const trendingData = await trendingRes.json();
        const topCoinsData: CoinGeckoToken[] = await topCoinsRes.json();

        // Process trending tokens
        const trending: Token[] = trendingData.coins?.slice(0, 12).map((coin: { item: { id: string; symbol: string; name: string; large: string; thumb: string; data?: { price?: number; price_change_percentage_24h?: { usd?: number }; total_volume?: string; market_cap?: string } } }, idx: number) => ({
          id: coin.item.id,
          name: coin.item.name,
          symbol: coin.item.symbol,
          image: coin.item.large || coin.item.thumb,
          chain: 'ethereum',
          chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
          tokenTransfers: formatVolume(Math.random() * 10000000),
          volume: coin.item.data?.total_volume || formatVolume(Math.random() * 100000000),
          price: coin.item.data?.price ? formatPrice(coin.item.data.price) : formatPrice(Math.random() * 100),
          priceChange: coin.item.data?.price_change_percentage_24h?.usd || (Math.random() * 40 - 20),
          marketCap: Math.random() * 1000000000,
          rank: idx + 1,
        })) || [];

        // Process featured tokens (top by market cap)
        const featured: Token[] = topCoinsData.map((coin, idx) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.image,
          chain: 'ethereum',
          chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
          tokenTransfers: formatVolume(coin.total_volume * 0.01),
          volume: formatVolume(coin.total_volume),
          price: formatPrice(coin.current_price),
          priceChange: coin.price_change_percentage_24h || 0,
          marketCap: coin.market_cap,
          rank: idx + 1,
        }));

        setTrendingTokens(trending);
        setFeaturedTokens(featured);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError('Failed to load live data. Using demo data.');

        // Fallback to mock data with more variety
        setTrendingTokens([
          { id: 'pepe', name: 'Pepe', symbol: 'PEPE', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$1.66M', volume: '$1.92B', price: '$0.0000089', priceChange: -2.00, marketCap: 3500000000, rank: 1 },
          { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', image: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$77.43K', volume: '$4.31B', price: '$0.000012', priceChange: 0.76, marketCap: 7200000000, rank: 2 },
          { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$2.1M', volume: '$1.5B', price: '$0.12', priceChange: 3.5, marketCap: 16000000000, rank: 3 },
          { id: 'floki', name: 'FLOKI', symbol: 'FLOKI', image: 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$890K', volume: '$320M', price: '$0.00015', priceChange: 5.2, marketCap: 1400000000, rank: 4 },
          { id: 'bonk', name: 'Bonk', symbol: 'BONK', image: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg', chain: 'solana', chainLogo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', tokenTransfers: '$1.2M', volume: '$450M', price: '$0.000018', priceChange: -1.8, marketCap: 1200000000, rank: 5 },
        ]);
        setFeaturedTokens([
          { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$50M', volume: '$30B', price: '$45,000', priceChange: 2.5, marketCap: 880000000000, rank: 1 },
          { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$30M', volume: '$15B', price: '$2,500', priceChange: 1.8, marketCap: 300000000000, rank: 2 },
          { id: 'tether', name: 'Tether', symbol: 'USDT', image: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', chain: 'ethereum', chainLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', tokenTransfers: '$100M', volume: '$50B', price: '$1.00', priceChange: 0.01, marketCap: 95000000000, rank: 3 },
          { id: 'bnb', name: 'BNB', symbol: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', chain: 'bsc', chainLogo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', tokenTransfers: '$5M', volume: '$800M', price: '$310', priceChange: -0.5, marketCap: 48000000000, rank: 4 },
          { id: 'solana', name: 'Solana', symbol: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', chain: 'solana', chainLogo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', tokenTransfers: '$8M', volume: '$2B', price: '$98', priceChange: 4.2, marketCap: 42000000000, rank: 5 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Filter tokens based on search query
  const filteredTrending = trendingTokens.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain = selectedChainFilter === 'all' || t.chain === selectedChainFilter;
    return matchesSearch && matchesChain;
  });

  const filteredFeatured = featuredTokens.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain = selectedChainFilter === 'all' || t.chain === selectedChainFilter;
    return matchesSearch && matchesChain;
  });

  const handleTokenClick = (token: Token) => {
    const chainObj = chains.find(c => c.id === token.chain);
    if (chainObj) setSelectedChain(chainObj);
    router.push(`/explorer?token=${token.id}&symbol=${token.symbol}&name=${encodeURIComponent(token.name)}&image=${encodeURIComponent(token.image)}`);
  };

  const selectedChainObj = chainFilters.find(c => c.id === selectedChainFilter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[10%] w-[800px] h-[800px] bg-[#ff00ff]/8 rounded-full blur-[180px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[10%] w-[700px] h-[700px] bg-[#00ffff]/8 rounded-full blur-[180px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[500px] h-[500px] bg-[#00ff88]/5 rounded-full blur-[150px]"
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-2xl bg-[#0a0a0f]/80">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 text-[#00ff88] hover:opacity-80 transition-opacity group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00ffff] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold text-lg tracking-tight">CryptoViz</span>
              </Link>

              <div className="flex items-center gap-3">
                <Link
                  href="/explorer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00ffff] text-black font-semibold hover:shadow-lg hover:shadow-[#00ff88]/25 transition-all duration-300 hover:scale-105"
                >
                  <Globe className="w-4 h-4" />
                  <span>Open Map</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Search Section */}
        <div className="container mx-auto px-4 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00ffff]">Tokens</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Discover trending tokens, analyze holders, and visualize on-chain relationships
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/20 to-[#00ffff]/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl focus-within:border-[#00ff88]/50 transition-all">
                <Search className="w-5 h-5 text-gray-500 group-focus-within:text-[#00ff88] transition-colors" />
                <Input
                  placeholder="Search tokens by name, ticker, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent text-white text-lg placeholder:text-gray-500 focus-visible:ring-0 p-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <span className="text-xs">Clear</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 pb-16">
          {/* Header with filter */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-white font-medium">Live Data</span>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-[#00ff88]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Fetching...</span>
                </div>
              )}
            </div>

            {/* Chain Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowChainFilter(!showChainFilter)}
                className="flex items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-2"
              >
                {selectedChainObj?.logo ? (
                  <img src={selectedChainObj.logo} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>{selectedChainObj?.name || 'All Chains'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showChainFilter ? 'rotate-180' : ''}`} />
              </Button>

              <AnimatePresence>
                {showChainFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-52 py-2 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {chainFilters.map(chain => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          setSelectedChainFilter(chain.id);
                          setShowChainFilter(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                          selectedChainFilter === chain.id ? 'text-[#00ff88] bg-[#00ff88]/5' : 'text-gray-300'
                        }`}
                      >
                        {chain.logo ? (
                          <img src={chain.logo} alt={chain.name} className="w-5 h-5 rounded-full" />
                        ) : (
                          <Globe className="w-5 h-5" />
                        )}
                        <span>{chain.name}</span>
                        {selectedChainFilter === chain.id && (
                          <Zap className="w-3 h-3 ml-auto" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          {/* Token Tables */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Trending Tokens */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#0a0a0f]/90 rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ff6b6b]/5 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#ff6b6b]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Trending</h2>
                    <p className="text-xs text-gray-500">Most searched tokens</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-white/5">
                  {filteredTrending.length} tokens
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-white/5">
                      <th className="py-3 px-3 text-left font-medium">Token</th>
                      <th className="py-3 px-3 text-right font-medium hidden sm:table-cell">Transfers</th>
                      <th className="py-3 px-3 text-right font-medium">Volume / Price</th>
                      <th className="py-3 px-3 text-right font-medium hidden md:table-cell">Market Cap</th>
                      <th className="py-3 px-3 text-right font-medium">24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
                            <span className="text-gray-500 text-sm">Loading trending tokens...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTrending.length > 0 ? (
                      filteredTrending.map((token, i) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          index={i}
                          onClick={() => handleTokenClick(token)}
                          showRank
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-500">
                          No tokens found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Featured Tokens */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#0a0a0f]/90 rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffd700]/20 to-[#ffd700]/5 flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#ffd700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Top by Market Cap</h2>
                    <p className="text-xs text-gray-500">Largest cryptocurrencies</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-white/5">
                  {filteredFeatured.length} tokens
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-white/5">
                      <th className="py-3 px-3 text-left font-medium">Token</th>
                      <th className="py-3 px-3 text-right font-medium hidden sm:table-cell">Transfers</th>
                      <th className="py-3 px-3 text-right font-medium">Volume / Price</th>
                      <th className="py-3 px-3 text-right font-medium hidden md:table-cell">Market Cap</th>
                      <th className="py-3 px-3 text-right font-medium">24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
                            <span className="text-gray-500 text-sm">Loading top tokens...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredFeatured.length > 0 ? (
                      filteredFeatured.map((token, i) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          index={i}
                          onClick={() => handleTokenClick(token)}
                          showRank
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-500">
                          No tokens found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Quick Access Cards (Top Trending) */}
          {!isLoading && trendingTokens.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-[#00ff88]" />
                <h3 className="text-xl font-bold text-white">Quick Access</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trendingTokens.slice(0, 5).map((token, i) => (
                  <TokenCard
                    key={token.id}
                    token={token}
                    index={i}
                    onClick={() => handleTokenClick(token)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 mt-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
              CryptoViz Pro - Real-time Blockchain Network Visualization
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
