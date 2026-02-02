import { ethers } from 'ethers';
import type { NetworkNode, NetworkLink, NodeType } from '@/types';

// Chain RPC endpoints (free public endpoints)
export const chainConfigs: Record<string, { rpcUrl: string }> = {
  ethereum: { rpcUrl: 'https://eth.llamarpc.com' },
  polygon: { rpcUrl: 'https://polygon-rpc.com' },
  arbitrum: { rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  optimism: { rpcUrl: 'https://mainnet.optimism.io' },
  base: { rpcUrl: 'https://mainnet.base.org' },
};

// Known addresses (exchanges, DEXs, etc.)
const knownAddresses: Record<string, { label: string; type: NodeType }> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance Hot Wallet', type: 'exchange' },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { label: 'Binance 2', type: 'exchange' },
  '0x5041ed759dd4afc3a72b8192c143f72f4724081a': { label: 'Coinbase', type: 'exchange' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { label: 'Uniswap V2', type: 'defi' },
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { label: 'Uniswap V3', type: 'defi' },
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { label: 'Uniswap Universal', type: 'defi' },
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { label: 'SushiSwap', type: 'defi' },
};

// Get provider
export function getProvider(chainId: string): ethers.JsonRpcProvider {
  const config = chainConfigs[chainId] || chainConfigs.ethereum;
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

// Determine node type
async function determineNodeType(
  address: string,
  provider: ethers.JsonRpcProvider,
  balance: bigint
): Promise<NodeType> {
  const lower = address.toLowerCase();
  if (knownAddresses[lower]) return knownAddresses[lower].type;

  try {
    const code = await provider.getCode(address);
    if (code !== '0x') return 'contract';
  } catch { /* ignore */ }

  const ethBalance = Number(ethers.formatEther(balance));
  if (ethBalance > 1000) return 'whale';
  return 'wallet';
}

// Get address label
function getAddressLabel(address: string): string | undefined {
  return knownAddresses[address.toLowerCase()]?.label;
}

// Calculate risk score
function calculateRiskScore(txCount: number, balance: number, isContract: boolean): number {
  let score = 20;
  if (txCount > 100 && balance < 0.1) score += 30;
  if (txCount > 500) score += 20;
  if (isContract) score -= 10;
  return Math.min(Math.max(score, 0), 100);
}

// Fetch wallet info
export async function fetchWalletInfo(
  address: string,
  chainId: string
): Promise<NetworkNode | null> {
  try {
    const provider = getProvider(chainId);
    const balance = await provider.getBalance(address);
    const ethBalance = Number(ethers.formatEther(balance));
    const txCount = await provider.getTransactionCount(address);
    const nodeType = await determineNodeType(address, provider, balance);

    return {
      id: address.toLowerCase(),
      address: address.toLowerCase(),
      type: nodeType,
      label: getAddressLabel(address),
      balance: ethBalance,
      transactionCount: txCount,
      firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastActive: new Date(),
      riskScore: calculateRiskScore(txCount, ethBalance, nodeType === 'contract'),
    };
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    return null;
  }
}

// Fetch wallet network with connected addresses
export async function fetchWalletNetwork(
  address: string,
  chainId: string,
  maxNodes: number = 30
): Promise<{ nodes: NetworkNode[]; links: NetworkLink[] }> {
  const provider = getProvider(chainId);
  const nodes: Map<string, NetworkNode> = new Map();
  const links: Map<string, NetworkLink> = new Map();
  const processed = new Set<string>();
  const queue: string[] = [address.toLowerCase()];

  while (queue.length > 0 && nodes.size < maxNodes) {
    const current = queue.shift();
    if (!current || processed.has(current)) continue;
    processed.add(current);

    try {
      const balance = await provider.getBalance(current);
      const ethBalance = Number(ethers.formatEther(balance));
      const txCount = await provider.getTransactionCount(current);
      const nodeType = await determineNodeType(current, provider, balance);

      nodes.set(current, {
        id: current,
        address: current,
        type: nodeType,
        label: getAddressLabel(current),
        balance: ethBalance,
        transactionCount: txCount,
        firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastActive: new Date(),
        riskScore: calculateRiskScore(txCount, ethBalance, nodeType === 'contract'),
      });

      // Fetch latest block transactions to find connections
      if (nodes.size < maxNodes) {
        const latestBlock = await provider.getBlockNumber();
        const block = await provider.getBlock(latestBlock, true);

        if (block?.prefetchedTransactions) {
          for (const tx of block.prefetchedTransactions.slice(0, 5)) {
            if (nodes.size >= maxNodes) break;

            const from = tx.from.toLowerCase();
            const to = tx.to?.toLowerCase();

            if (from === current && to && !processed.has(to)) {
              queue.push(to);
              const linkId = `${from}-${to}`;
              if (!links.has(linkId)) {
                links.set(linkId, {
                  id: linkId,
                  source: from,
                  target: to,
                  value: Number(ethers.formatEther(tx.value)),
                  transactionCount: 1,
                  timestamp: new Date(),
                  type: 'transfer',
                });
              }
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 200)); // Rate limit
    } catch (error) {
      console.error(`Error for ${current}:`, error);
    }
  }

  return { nodes: Array.from(nodes.values()), links: Array.from(links.values()) };
}

// Get gas price
export async function getGasPrice(chainId: string): Promise<string> {
  try {
    const provider = getProvider(chainId);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0';
  } catch {
    return '0';
  }
}

// Get block number
export async function getBlockNumber(chainId: string): Promise<number> {
  try {
    const provider = getProvider(chainId);
    return await provider.getBlockNumber();
  } catch {
    return 0;
  }
}

// Validate address
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

// Format address
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get ENS name
export async function getENSName(address: string): Promise<string | null> {
  try {
    const provider = getProvider('ethereum');
    return await provider.lookupAddress(address);
  } catch {
    return null;
  }
}

// Resolve ENS
export async function resolveENS(ensName: string): Promise<string | null> {
  try {
    const provider = getProvider('ethereum');
    return await provider.resolveName(ensName);
  } catch {
    return null;
  }
}
