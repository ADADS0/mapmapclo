import type { NetworkNode, NetworkLink, NodeType } from '@/types';

// Get API key from environment variable (optional but recommended for better rate limits)
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '';
const POLYGONSCAN_API_KEY = process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY || '';
const ARBISCAN_API_KEY = process.env.NEXT_PUBLIC_ARBISCAN_API_KEY || '';
const OPTIMISM_API_KEY = process.env.NEXT_PUBLIC_OPTIMISM_API_KEY || '';
const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';

// Etherscan API endpoints for different chains
const ETHERSCAN_ENDPOINTS: Record<string, { api: string; explorer: string; apiKey: string }> = {
  ethereum: {
    api: 'https://api.etherscan.io/api',
    explorer: 'https://etherscan.io',
    apiKey: ETHERSCAN_API_KEY,
  },
  polygon: {
    api: 'https://api.polygonscan.com/api',
    explorer: 'https://polygonscan.com',
    apiKey: POLYGONSCAN_API_KEY,
  },
  arbitrum: {
    api: 'https://api.arbiscan.io/api',
    explorer: 'https://arbiscan.io',
    apiKey: ARBISCAN_API_KEY,
  },
  optimism: {
    api: 'https://api-optimistic.etherscan.io/api',
    explorer: 'https://optimistic.etherscan.io',
    apiKey: OPTIMISM_API_KEY,
  },
  base: {
    api: 'https://api.basescan.org/api',
    explorer: 'https://basescan.org',
    apiKey: BASESCAN_API_KEY,
  },
};

// Known addresses for labeling
const KNOWN_ADDRESSES: Record<string, { label: string; type: NodeType }> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance Hot Wallet', type: 'exchange' },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { label: 'Binance 2', type: 'exchange' },
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': { label: 'Binance 3', type: 'exchange' },
  '0x5041ed759dd4afc3a72b8192c143f72f4724081a': { label: 'Coinbase', type: 'exchange' },
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': { label: 'Coinbase 2', type: 'exchange' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { label: 'Uniswap V2 Router', type: 'defi' },
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { label: 'Uniswap V3 Router', type: 'defi' },
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { label: 'Uniswap Universal Router', type: 'defi' },
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { label: 'SushiSwap Router', type: 'defi' },
  '0x1111111254eeb25477b68fb85ed929f73a960582': { label: '1inch Router', type: 'defi' },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { label: '0x Exchange', type: 'defi' },
  '0x881d40237659c251811cec9c364ef91dc08d300c': { label: 'Metamask Swap', type: 'defi' },
  '0x00000000219ab540356cbb839cbe05303d7705fa': { label: 'ETH2 Deposit Contract', type: 'contract' },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { label: 'WETH', type: 'contract' },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { label: 'USDT', type: 'contract' },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { label: 'USDC', type: 'contract' },
};

export interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface EtherscanBalance {
  account: string;
  balance: string;
}

export interface EtherscanTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

// API response type
interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

// Get Etherscan endpoint for chain
export function getEtherscanEndpoint(chainId: string): { api: string; explorer: string; apiKey: string } {
  return ETHERSCAN_ENDPOINTS[chainId] || ETHERSCAN_ENDPOINTS.ethereum;
}

// Build API URL with optional API key
function buildApiUrl(baseUrl: string, params: Record<string, string | number>, apiKey: string): string {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    urlParams.append(key, String(value));
  }
  if (apiKey) {
    urlParams.append('apikey', apiKey);
  }
  return `${baseUrl}?${urlParams.toString()}`;
}

// Format value from wei to ETH
export function formatWeiToEth(wei: string): number {
  return Number(wei) / 1e18;
}

// Get address label
export function getAddressLabel(address: string): string | undefined {
  return KNOWN_ADDRESSES[address.toLowerCase()]?.label;
}

// Get address type
export function getAddressType(address: string): NodeType | undefined {
  return KNOWN_ADDRESSES[address.toLowerCase()]?.type;
}

// Calculate risk score based on transaction patterns
export function calculateRiskScore(
  txCount: number,
  balance: number,
  incomingCount: number,
  outgoingCount: number
): number {
  let score = 15; // Base score

  // High transaction volume with low balance = suspicious
  if (txCount > 100 && balance < 0.1) {
    score += 30;
  }

  // Very high transaction count
  if (txCount > 500) {
    score += 20;
  }

  // Asymmetric transaction ratio (mostly outgoing = potential mixer)
  if (txCount > 10) {
    const ratio = outgoingCount / (incomingCount + 1);
    if (ratio > 5) {
      score += 25;
    }
  }

  // Large balance = more trusted
  if (balance > 100) {
    score -= 10;
  }

  return Math.min(Math.max(score, 0), 100);
}

// Fetch wallet balance
export async function fetchWalletBalance(
  address: string,
  chainId: string
): Promise<number | null> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'balance',
      address: address,
      tag: 'latest',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return null;
    }

    const data: EtherscanResponse<string> = await response.json();

    if (data.status === '1') {
      return formatWeiToEth(data.result);
    }

    // Handle rate limit or error
    if (data.message === 'NOTOK' || data.status === '0') {
      console.warn('API limit or error:', data.result);
    }

    return null;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return null;
  }
}

// Fetch transaction list
export async function fetchTransactions(
  address: string,
  chainId: string,
  page: number = 1,
  offset: number = 100
): Promise<EtherscanTransaction[]> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'txlist',
      address: address,
      startblock: 0,
      endblock: 99999999,
      page: page,
      offset: offset,
      sort: 'desc',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return [];
    }

    const data: EtherscanResponse<EtherscanTransaction[]> = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    // Handle rate limit or error
    if (data.message === 'NOTOK' || data.status === '0') {
      console.warn('API limit or error:', data.result);
    }

    return [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Fetch token transfers
export async function fetchTokenTransfers(
  address: string,
  chainId: string,
  page: number = 1,
  offset: number = 100
): Promise<EtherscanTokenTransfer[]> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'tokentx',
      address: address,
      startblock: 0,
      endblock: 99999999,
      page: page,
      offset: offset,
      sort: 'desc',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return [];
    }

    const data: EtherscanResponse<EtherscanTokenTransfer[]> = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    // Handle rate limit or error
    if (data.message === 'NOTOK' || data.status === '0') {
      console.warn('API limit or error:', data.result);
    }

    return [];
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    return [];
  }
}

// Progress callback type
export type ProgressCallback = (stage: string, count: number) => void;

// Helper to add delay for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch wallet network with connected addresses and multi-hop exploration
export async function fetchWalletNetwork(
  address: string,
  chainId: string,
  maxNodes: number = 50,
  depth: number = 1,
  onProgress?: ProgressCallback
): Promise<{ nodes: NetworkNode[]; links: NetworkLink[] }> {
  const nodesMap = new Map<string, NetworkNode>();
  const linksMap = new Map<string, NetworkLink>();
  const addressLower = address.toLowerCase();
  const exploredAddresses = new Set<string>();
  const addressesToExplore: { address: string; currentDepth: number }[] = [
    { address: addressLower, currentDepth: 0 }
  ];

  try {
    onProgress?.('Initializing', 0);

    while (addressesToExplore.length > 0 && nodesMap.size < maxNodes) {
      const current = addressesToExplore.shift()!;

      // Skip if already explored or beyond depth limit
      if (exploredAddresses.has(current.address) || current.currentDepth > depth) {
        continue;
      }

      exploredAddresses.add(current.address);
      onProgress?.(`Fetching transactions (depth ${current.currentDepth})`, nodesMap.size);

      // Fetch transactions for this address
      const transactions = await fetchTransactions(current.address, chainId, 1, 100);

      // Rate limiting - wait a bit between API calls
      if (addressesToExplore.length > 0) {
        await delay(200);
      }

      // Count incoming/outgoing for the current address
      let incoming = 0;
      let outgoing = 0;

      // Process transactions to build the network
      for (const tx of transactions) {
        const from = tx.from.toLowerCase();
        const to = tx.to?.toLowerCase() || '';

        if (!to) continue;

        // Track incoming/outgoing
        if (to === current.address) incoming++;
        if (from === current.address) outgoing++;

        // Add nodes
        if (!nodesMap.has(from) && nodesMap.size < maxNodes) {
          const isMainAddress = from === addressLower;
          nodesMap.set(from, {
            id: from,
            address: from,
            type: getAddressType(from) || 'wallet',
            label: isMainAddress ? 'Primary Wallet' : getAddressLabel(from),
            balance: 0,
            transactionCount: 0,
            firstSeen: new Date(Number(tx.timeStamp) * 1000),
            lastActive: new Date(Number(tx.timeStamp) * 1000),
            riskScore: 20,
          });

          // Add to exploration queue if within depth and not yet explored
          if (current.currentDepth < depth && !exploredAddresses.has(from)) {
            addressesToExplore.push({ address: from, currentDepth: current.currentDepth + 1 });
          }
        }

        if (!nodesMap.has(to) && nodesMap.size < maxNodes) {
          const isMainAddress = to === addressLower;
          nodesMap.set(to, {
            id: to,
            address: to,
            type: getAddressType(to) || 'wallet',
            label: isMainAddress ? 'Primary Wallet' : getAddressLabel(to),
            balance: 0,
            transactionCount: 0,
            firstSeen: new Date(Number(tx.timeStamp) * 1000),
            lastActive: new Date(Number(tx.timeStamp) * 1000),
            riskScore: 20,
          });

          // Add to exploration queue if within depth and not yet explored
          if (current.currentDepth < depth && !exploredAddresses.has(to)) {
            addressesToExplore.push({ address: to, currentDepth: current.currentDepth + 1 });
          }
        }

        // Update transaction counts
        const fromNode = nodesMap.get(from);
        if (fromNode) {
          fromNode.transactionCount++;
          const txTime = new Date(Number(tx.timeStamp) * 1000);
          if (txTime > fromNode.lastActive) fromNode.lastActive = txTime;
          if (txTime < fromNode.firstSeen) fromNode.firstSeen = txTime;
        }

        const toNode = nodesMap.get(to);
        if (toNode) {
          toNode.transactionCount++;
          const txTime = new Date(Number(tx.timeStamp) * 1000);
          if (txTime > toNode.lastActive) toNode.lastActive = txTime;
          if (txTime < toNode.firstSeen) toNode.firstSeen = txTime;
        }

        // Add/update links
        const linkId = `${from}-${to}`;
        const existingLink = linksMap.get(linkId);
        const txValue = formatWeiToEth(tx.value);

        if (existingLink) {
          existingLink.value += txValue;
          existingLink.transactionCount++;
        } else {
          linksMap.set(linkId, {
            id: linkId,
            source: from,
            target: to,
            value: txValue,
            transactionCount: 1,
            timestamp: new Date(Number(tx.timeStamp) * 1000),
            type: tx.input === '0x' ? 'transfer' : 'swap',
          });
        }
      }

      // Update risk score for current address
      const currentNode = nodesMap.get(current.address);
      if (currentNode) {
        currentNode.riskScore = calculateRiskScore(
          currentNode.transactionCount,
          currentNode.balance,
          incoming,
          outgoing
        );
      }

      onProgress?.('Building network', nodesMap.size);
    }

    // Fetch balance for main address and update risk score
    onProgress?.('Fetching balance', nodesMap.size);
    const mainBalance = await fetchWalletBalance(addressLower, chainId);
    const mainNode = nodesMap.get(addressLower);
    if (mainNode && mainBalance !== null) {
      mainNode.balance = mainBalance;

      // Determine type based on balance
      if (mainBalance > 1000) {
        mainNode.type = 'whale';
      } else if (mainBalance > 100) {
        mainNode.type = 'wallet';
      }
    }

    onProgress?.('Complete', nodesMap.size);

  } catch (error) {
    console.error('Error fetching wallet network:', error);
    onProgress?.('Error', nodesMap.size);
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links: Array.from(linksMap.values()),
  };
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get explorer URL for address
export function getExplorerUrl(address: string, chainId: string): string {
  const { explorer } = getEtherscanEndpoint(chainId);
  return `${explorer}/address/${address}`;
}

// Get explorer URL for transaction
export function getTxExplorerUrl(txHash: string, chainId: string): string {
  const { explorer } = getEtherscanEndpoint(chainId);
  return `${explorer}/tx/${txHash}`;
}

// Interface for internal transactions
export interface EtherscanInternalTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}

// Interface for NFT transfers
export interface EtherscanNFTTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

// Fetch internal transactions
export async function fetchInternalTransactions(
  address: string,
  chainId: string,
  page: number = 1,
  offset: number = 100
): Promise<EtherscanInternalTx[]> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'txlistinternal',
      address: address,
      startblock: 0,
      endblock: 99999999,
      page: page,
      offset: offset,
      sort: 'desc',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return [];
    }

    const data: EtherscanResponse<EtherscanInternalTx[]> = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    return [];
  } catch (error) {
    console.error('Error fetching internal transactions:', error);
    return [];
  }
}

// Fetch NFT transfers (ERC721)
export async function fetchNFTTransfers(
  address: string,
  chainId: string,
  page: number = 1,
  offset: number = 100
): Promise<EtherscanNFTTransfer[]> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'tokennfttx',
      address: address,
      startblock: 0,
      endblock: 99999999,
      page: page,
      offset: offset,
      sort: 'desc',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return [];
    }

    const data: EtherscanResponse<EtherscanNFTTransfer[]> = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    return [];
  } catch (error) {
    console.error('Error fetching NFT transfers:', error);
    return [];
  }
}

// Fetch ERC1155 transfers
export async function fetchERC1155Transfers(
  address: string,
  chainId: string,
  page: number = 1,
  offset: number = 100
): Promise<EtherscanNFTTransfer[]> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'account',
      action: 'token1155tx',
      address: address,
      startblock: 0,
      endblock: 99999999,
      page: page,
      offset: offset,
      sort: 'desc',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return [];
    }

    const data: EtherscanResponse<EtherscanNFTTransfer[]> = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    return [];
  } catch (error) {
    console.error('Error fetching ERC1155 transfers:', error);
    return [];
  }
}

// Get current ETH price
export async function getEthPrice(chainId: string = 'ethereum'): Promise<{ ethbtc: string; ethusd: string } | null> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'stats',
      action: 'ethprice',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data: EtherscanResponse<{ ethbtc: string; ethusd: string }> = await response.json();

    if (data.status === '1' && data.result) {
      return data.result;
    }

    return null;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return null;
  }
}

// Get gas oracle (current gas prices)
export async function getGasOracle(chainId: string = 'ethereum'): Promise<{
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
} | null> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'gastracker',
      action: 'gasoracle',
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === '1' && data.result) {
      return data.result;
    }

    return null;
  } catch (error) {
    console.error('Error fetching gas oracle:', error);
    return null;
  }
}

// Check if address is a contract
export async function isContract(address: string, chainId: string): Promise<boolean> {
  try {
    const { api, apiKey } = getEtherscanEndpoint(chainId);
    const url = buildApiUrl(api, {
      module: 'contract',
      action: 'getabi',
      address: address,
    }, apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // If ABI exists, it's a verified contract
    return data.status === '1';
  } catch (error) {
    return false;
  }
}
