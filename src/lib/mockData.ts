import type { NetworkNode, NetworkLink, NodeType } from '@/types';
import {
  EXCHANGE_LOGOS,
  CONTRACT_LOGOS,
  DEFAULT_CONTRACT_ICON,
  DEFAULT_EXCHANGE_ICON,
  DEFAULT_DEFI_ICON,
  DEFAULT_MIXER_ICON,
  DEFAULT_WHALE_ICON
} from './coingeckoApi';

// Generate a random hex address
const generateAddress = (): string => {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
};

// Shorten address for display
export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Generate random date within last 30 days
const randomDate = (daysBack: number = 30): Date => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return pastDate;
};

// Node type distribution weights
const nodeTypeWeights: Record<NodeType, number> = {
  wallet: 0.5,
  exchange: 0.1,
  contract: 0.2,
  whale: 0.05,
  mixer: 0.05,
  defi: 0.1,
};

// Generate a random node type based on weights
const randomNodeType = (): NodeType => {
  const rand = Math.random();
  let cumulative = 0;
  for (const [type, weight] of Object.entries(nodeTypeWeights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return type as NodeType;
    }
  }
  return 'wallet';
};

// Exchange names and their logo keys
const exchangeNames = ['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'OKX', 'Bybit', 'Huobi', 'Gate.io', 'Uniswap', 'SushiSwap'];
const exchangeLogoKeys = ['binance', 'coinbase', 'kraken', 'kucoin', 'okx', 'bybit', 'huobi', 'gateio', 'uniswap', 'sushiswap'];

// Contract/Protocol names and their logo keys
const contractNames = ['Uniswap V3', 'Aave V3', 'Compound', 'MakerDAO', 'Lido', 'Curve', 'Convex', 'Yearn', '1inch', 'Balancer'];
const contractLogoKeys = ['uniswap', 'aave', 'compound', 'makerdao', 'lido', 'curve', 'convex', 'yearn', '1inch', 'balancer'];

// DeFi protocol names
const defiNames = ['PancakeSwap', 'Curve Finance', 'Balancer', 'Gnosis Safe', 'OpenSea', 'Blur', 'ENS', 'Chainlink', 'The Graph'];
const defiLogoKeys = ['pancake', 'curve', 'balancer', 'gnosis', 'opensea', 'blur', 'ens', 'chainlink', 'thegraph'];

// Generate mock nodes
export const generateMockNodes = (count: number): NetworkNode[] => {
  const nodes: NetworkNode[] = [];

  for (let i = 0; i < count; i++) {
    const type = randomNodeType();
    const balance = type === 'whale'
      ? Math.random() * 10000 + 1000
      : type === 'exchange'
        ? Math.random() * 50000 + 5000
        : Math.random() * 100;

    let label: string | undefined;
    let logoUrl: string | undefined;
    let protocol: string | undefined;

    // Assign logos based on node type
    switch (type) {
      case 'exchange': {
        const idx = Math.floor(Math.random() * exchangeNames.length);
        label = exchangeNames[idx];
        protocol = exchangeLogoKeys[idx];
        logoUrl = EXCHANGE_LOGOS[protocol] || DEFAULT_EXCHANGE_ICON;
        break;
      }
      case 'contract': {
        const idx = Math.floor(Math.random() * contractNames.length);
        label = contractNames[idx];
        protocol = contractLogoKeys[idx];
        logoUrl = CONTRACT_LOGOS[protocol] || DEFAULT_CONTRACT_ICON;
        break;
      }
      case 'defi': {
        const idx = Math.floor(Math.random() * defiNames.length);
        label = defiNames[idx];
        protocol = defiLogoKeys[idx];
        logoUrl = CONTRACT_LOGOS[protocol] || DEFAULT_DEFI_ICON;
        break;
      }
      case 'mixer': {
        label = 'Tornado Cash';
        logoUrl = DEFAULT_MIXER_ICON;
        protocol = 'mixer';
        break;
      }
      case 'whale': {
        label = `Whale ${i}`;
        logoUrl = DEFAULT_WHALE_ICON;
        protocol = 'whale';
        break;
      }
      default:
        // Regular wallets don't have logos
        break;
    }

    nodes.push({
      id: `node-${i}`,
      address: generateAddress(),
      type,
      label,
      balance,
      transactionCount: Math.floor(Math.random() * 500) + 1,
      firstSeen: randomDate(365),
      lastActive: randomDate(7),
      riskScore: type === 'mixer'
        ? Math.floor(Math.random() * 30) + 70
        : Math.floor(Math.random() * 100),
      logoUrl,
      protocol,
    });
  }

  return nodes;
};

// Generate mock links between nodes
export const generateMockLinks = (nodes: NetworkNode[], linkDensity: number = 0.02): NetworkLink[] => {
  const links: NetworkLink[] = [];
  const linkTypes: NetworkLink['type'][] = ['transfer', 'swap', 'stake', 'mint', 'burn'];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() < linkDensity) {
        links.push({
          id: `link-${i}-${j}`,
          source: nodes[i].id,
          target: nodes[j].id,
          value: Math.random() * 100,
          transactionCount: Math.floor(Math.random() * 20) + 1,
          timestamp: randomDate(30),
          type: linkTypes[Math.floor(Math.random() * linkTypes.length)],
        });
      }
    }
  }

  return links;
};

// Generate full mock network
export const generateMockNetwork = (nodeCount: number = 100): { nodes: NetworkNode[]; links: NetworkLink[] } => {
  const nodes = generateMockNodes(nodeCount);
  const links = generateMockLinks(nodes, 0.03);
  return { nodes, links };
};

// Format large numbers
export const formatNumber = (num: number): string => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

// Format ETH value
export const formatETH = (value: number): string => {
  return `${formatNumber(value)} ETH`;
};

// Format balance value
export const formatBalance = (value: number): string => {
  return `${formatNumber(Math.abs(value))} ETH`;
};

// Get risk level label
export const getRiskLevel = (score: number): { label: string; color: string } => {
  if (score >= 70) return { label: 'High Risk', color: '#ff4444' };
  if (score >= 40) return { label: 'Medium Risk', color: '#ffaa00' };
  return { label: 'Low Risk', color: '#00ff88' };
};

// Get node type label
export const getNodeTypeLabel = (type: NodeType): string => {
  const labels: Record<NodeType, string> = {
    wallet: 'Wallet',
    exchange: 'Exchange',
    contract: 'Smart Contract',
    whale: 'Whale',
    mixer: 'Mixer',
    defi: 'DeFi Protocol',
  };
  return labels[type];
};

// Get node type icon
export const getNodeTypeIcon = (type: NodeType): string => {
  const icons: Record<NodeType, string> = {
    wallet: '◈',
    exchange: '⬡',
    contract: '◇',
    whale: '◆',
    mixer: '◎',
    defi: '⬢',
  };
  return icons[type];
};
