"use client";

// CoinGecko API for fetching crypto logos and exchange images
// API Base URL (free tier)
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Cache for logos to avoid repeated API calls
const logoCache = new Map<string, string>();
const exchangeLogoCache = new Map<string, string>();

// Known blockchain platform logos (fallback)
export const BLOCKCHAIN_LOGOS: Record<string, string> = {
  ethereum: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  base: "https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg",
  polygon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  arbitrum: "https://assets.coingecko.com/asset_platforms/images/33/small/arbitrum-one.png",
  optimism: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  avalanche: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  bsc: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  fantom: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png",
  solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  tron: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
};

// Known exchange logos (fallback)
export const EXCHANGE_LOGOS: Record<string, string> = {
  binance: "https://assets.coingecko.com/markets/images/52/small/binance.jpg",
  coinbase: "https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png",
  kraken: "https://assets.coingecko.com/markets/images/29/small/kraken.jpg",
  kucoin: "https://assets.coingecko.com/markets/images/61/small/kucoin.png",
  okx: "https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png",
  bybit: "https://assets.coingecko.com/markets/images/698/small/bybit_spot.png",
  huobi: "https://assets.coingecko.com/markets/images/25/small/huobi.jpg",
  gateio: "https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg",
  bitfinex: "https://assets.coingecko.com/markets/images/4/small/BItfinex.png",
  gemini: "https://assets.coingecko.com/markets/images/50/small/gemini.png",
  bitstamp: "https://assets.coingecko.com/markets/images/9/small/bitstamp.jpg",
  ftx: "https://assets.coingecko.com/markets/images/421/small/ftx_logo.png",
  uniswap: "https://assets.coingecko.com/markets/images/535/small/uniswap-v3.png",
  sushiswap: "https://assets.coingecko.com/markets/images/576/small/2048x2048_Logo.png",
  pancakeswap: "https://assets.coingecko.com/markets/images/687/small/pancakeswap.jpeg",
  curve: "https://assets.coingecko.com/markets/images/538/small/Curve.png",
  balancer: "https://assets.coingecko.com/markets/images/625/small/balancer_logo.jpeg",
  aave: "https://assets.coingecko.com/markets/images/494/small/aave.jpg",
  compound: "https://assets.coingecko.com/markets/images/486/small/compound.jpg",
  "1inch": "https://assets.coingecko.com/markets/images/707/small/1inch.png",
};

// Contract/Protocol logos (for DeFi and contract nodes)
export const CONTRACT_LOGOS: Record<string, string> = {
  uniswap: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  aave: "https://assets.coingecko.com/coins/images/12645/small/aave-token-round.png",
  compound: "https://assets.coingecko.com/coins/images/10775/small/COMP.png",
  makerdao: "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png",
  lido: "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png",
  curve: "https://assets.coingecko.com/coins/images/12124/small/Curve.png",
  convex: "https://assets.coingecko.com/coins/images/15585/small/convex.png",
  yearn: "https://assets.coingecko.com/coins/images/11849/small/yearn.jpg",
  sushi: "https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png",
  pancake: "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png",
  "1inch": "https://assets.coingecko.com/coins/images/13469/small/1inch-token.png",
  balancer: "https://assets.coingecko.com/coins/images/11683/small/Balancer.png",
  gnosis: "https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png",
  opensea: "https://assets.coingecko.com/nft_contracts/images/2655/small/opensea-logo.png",
  blur: "https://assets.coingecko.com/coins/images/28453/small/blur.png",
  ens: "https://assets.coingecko.com/coins/images/19785/small/acatxTm8_400x400.jpg",
  chainlink: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  thegraph: "https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png",
};

// Default contract icon (SVG data URI for a smart contract symbol)
export const DEFAULT_CONTRACT_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" rx="8" fill="#1a1a2e" stroke="#00ff88" stroke-width="2"/>
  <path d="M20 24h24M20 32h24M20 40h16" stroke="#00ff88" stroke-width="2" stroke-linecap="round"/>
  <circle cx="48" cy="40" r="3" fill="#00ff88"/>
</svg>
`)}`;

// Default exchange icon
export const DEFAULT_EXCHANGE_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" rx="24" fill="#1a1a2e" stroke="#00ffff" stroke-width="2"/>
  <path d="M22 26l10-6 10 6v12l-10 6-10-6V26z" stroke="#00ffff" stroke-width="2" fill="none"/>
  <circle cx="32" cy="32" r="4" fill="#00ffff"/>
</svg>
`)}`;

// Default DeFi icon
export const DEFAULT_DEFI_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" rx="8" fill="#1a1a2e" stroke="#ff00ff" stroke-width="2"/>
  <path d="M32 16v32M20 28l12-12 12 12M20 36l12 12 12-12" stroke="#ff00ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`)}`;

// Default mixer icon
export const DEFAULT_MIXER_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" rx="8" fill="#1a1a2e" stroke="#ff4444" stroke-width="2"/>
  <path d="M20 20l24 24M44 20l-24 24" stroke="#ff4444" stroke-width="2" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="6" stroke="#ff4444" stroke-width="2" fill="none"/>
</svg>
`)}`;

// Default whale icon
export const DEFAULT_WHALE_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <ellipse cx="32" cy="32" rx="22" ry="16" fill="#1a1a2e" stroke="#ffd700" stroke-width="2"/>
  <circle cx="22" cy="28" r="2" fill="#ffd700"/>
  <path d="M46 32c4-4 8-2 10 0" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>
  <path d="M8 32c-2-4 0-8 4-6" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>
</svg>
`)}`;

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
}

export interface ExchangeData {
  id: string;
  name: string;
  image: string;
}

/**
 * Fetch coin logo from CoinGecko by coin ID
 */
export async function fetchCoinLogo(coinId: string): Promise<string | null> {
  if (logoCache.has(coinId)) {
    return logoCache.get(coinId)!;
  }

  try {
    const response = await fetch(`${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`CoinGecko API error for ${coinId}:`, response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.image?.small || data.image?.thumb || null;

    if (imageUrl) {
      logoCache.set(coinId, imageUrl);
    }

    return imageUrl;
  } catch (error) {
    console.warn(`Failed to fetch coin logo for ${coinId}:`, error);
    return null;
  }
}

/**
 * Fetch exchange logo from CoinGecko by exchange ID
 */
export async function fetchExchangeLogo(exchangeId: string): Promise<string | null> {
  if (exchangeLogoCache.has(exchangeId)) {
    return exchangeLogoCache.get(exchangeId)!;
  }

  try {
    const response = await fetch(`${COINGECKO_API}/exchanges/${exchangeId}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`CoinGecko API error for exchange ${exchangeId}:`, response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.image || null;

    if (imageUrl) {
      exchangeLogoCache.set(exchangeId, imageUrl);
    }

    return imageUrl;
  } catch (error) {
    console.warn(`Failed to fetch exchange logo for ${exchangeId}:`, error);
    return null;
  }
}

/**
 * Get blockchain logo by chain ID
 */
export function getBlockchainLogo(chainId: string): string {
  const normalized = chainId.toLowerCase();

  // Check known logos first
  if (BLOCKCHAIN_LOGOS[normalized]) {
    return BLOCKCHAIN_LOGOS[normalized];
  }

  // Return Ethereum as default
  return BLOCKCHAIN_LOGOS.ethereum;
}

/**
 * Get exchange logo by exchange name or ID
 */
export function getExchangeLogo(exchangeName: string): string {
  const normalized = exchangeName.toLowerCase().replace(/[\s_-]/g, '');

  // Check known exchange logos
  for (const [key, url] of Object.entries(EXCHANGE_LOGOS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }

  // Return default exchange icon
  return DEFAULT_EXCHANGE_ICON;
}

/**
 * Get contract/protocol logo by name
 */
export function getContractLogo(contractName: string): string {
  const normalized = contractName.toLowerCase().replace(/[\s_-]/g, '');

  // Check known contract logos
  for (const [key, url] of Object.entries(CONTRACT_LOGOS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }

  // Return default contract icon
  return DEFAULT_CONTRACT_ICON;
}

/**
 * Get node icon based on node type and label
 */
export function getNodeIcon(type: string, label?: string): string {
  const normalizedLabel = (label || '').toLowerCase();

  switch (type) {
    case 'exchange':
      return getExchangeLogo(normalizedLabel || 'exchange');

    case 'contract':
    case 'defi':
      return getContractLogo(normalizedLabel || 'contract');

    case 'mixer':
      return DEFAULT_MIXER_ICON;

    case 'whale':
      return DEFAULT_WHALE_ICON;

    default:
      return '';  // No icon for regular wallets
  }
}

/**
 * Preload images for faster rendering
 */
export function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Image cache for canvas rendering
const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Map<string, Promise<HTMLImageElement>>();

/**
 * Get cached image or load it
 */
export async function getCachedImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;

  // Return cached image
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Return loading promise if already loading
  if (loadingImages.has(url)) {
    try {
      return await loadingImages.get(url)!;
    } catch {
      return null;
    }
  }

  // Start loading
  const loadPromise = preloadImage(url);
  loadingImages.set(url, loadPromise);

  try {
    const img = await loadPromise;
    imageCache.set(url, img);
    loadingImages.delete(url);
    return img;
  } catch (error) {
    loadingImages.delete(url);
    console.warn(`Failed to load image: ${url}`);
    return null;
  }
}

/**
 * Get image synchronously (returns null if not yet loaded)
 */
export function getImageSync(url: string): HTMLImageElement | null {
  if (!url) return null;

  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Start loading in background if not already loading
  if (!loadingImages.has(url)) {
    getCachedImage(url);
  }

  return null;
}
