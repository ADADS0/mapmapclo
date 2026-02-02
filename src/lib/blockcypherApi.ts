import type { NetworkNode, NetworkLink, NodeType } from '@/types';

// BlockCypher API token (optional but recommended for better rate limits)
const BLOCKCYPHER_TOKEN = process.env.NEXT_PUBLIC_BLOCKCYPHER_TOKEN || '';

// BlockCypher supported chains configuration
export interface BlockCypherChainConfig {
  coin: string;
  chain: string;
  name: string;
  symbol: string;
  explorer: string;
  addressPrefix: string[];
  decimals: number;
  color: string;
  logoUrl?: string;
}

export const BLOCKCYPHER_CHAINS: Record<string, BlockCypherChainConfig> = {
  bitcoin: {
    coin: 'btc',
    chain: 'main',
    name: 'Bitcoin',
    symbol: 'BTC',
    explorer: 'https://live.blockcypher.com/btc',
    addressPrefix: ['1', '3', 'bc1'],
    decimals: 8,
    color: '#F7931A',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  },
  'bitcoin-testnet': {
    coin: 'btc',
    chain: 'test3',
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    explorer: 'https://live.blockcypher.com/btc-testnet',
    addressPrefix: ['m', 'n', '2', 'tb1'],
    decimals: 8,
    color: '#F7931A',
  },
  litecoin: {
    coin: 'ltc',
    chain: 'main',
    name: 'Litecoin',
    symbol: 'LTC',
    explorer: 'https://live.blockcypher.com/ltc',
    addressPrefix: ['L', 'M', 'ltc1'],
    decimals: 8,
    color: '#A6A9AA',
    logoUrl: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  },
  dogecoin: {
    coin: 'doge',
    chain: 'main',
    name: 'Dogecoin',
    symbol: 'DOGE',
    explorer: 'https://live.blockcypher.com/doge',
    addressPrefix: ['D', 'A', '9'],
    decimals: 8,
    color: '#C2A633',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  },
  dash: {
    coin: 'dash',
    chain: 'main',
    name: 'Dash',
    symbol: 'DASH',
    explorer: 'https://live.blockcypher.com/dash',
    addressPrefix: ['X', '7'],
    decimals: 8,
    color: '#008CE7',
    logoUrl: 'https://assets.coingecko.com/coins/images/19/small/dash-logo.png',
  },
  'blockcypher-test': {
    coin: 'bcy',
    chain: 'test',
    name: 'BlockCypher Test',
    symbol: 'BCY',
    explorer: 'https://live.blockcypher.com/bcy',
    addressPrefix: ['B', 'C', 'D'],
    decimals: 8,
    color: '#1A73E8',
  },
};

// Base API URL
const API_BASE = 'https://api.blockcypher.com/v1';

// Build API URL with optional token
function buildApiUrl(path: string, params: Record<string, string | number> = {}): string {
  const url = new URL(`${API_BASE}${path}`);

  if (BLOCKCYPHER_TOKEN) {
    url.searchParams.append('token', BLOCKCYPHER_TOKEN);
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value));
  }

  return url.toString();
}

// Get chain resource path
function getChainPath(chainId: string): string {
  const config = BLOCKCYPHER_CHAINS[chainId] || BLOCKCYPHER_CHAINS.bitcoin;
  return `/${config.coin}/${config.chain}`;
}

// BlockCypher API response types
export interface BlockCypherBlockchain {
  name: string;
  height: number;
  hash: string;
  time: string;
  latest_url: string;
  previous_hash: string;
  previous_url: string;
  peer_count: number;
  unconfirmed_count: number;
  high_fee_per_kb: number;
  medium_fee_per_kb: number;
  low_fee_per_kb: number;
  last_fork_height?: number;
  last_fork_hash?: string;
}

export interface BlockCypherBlock {
  hash: string;
  height: number;
  chain: string;
  total: number;
  fees: number;
  size: number;
  vsize?: number;
  ver: number;
  time: string;
  received_time: string;
  coinbase_addr: string;
  relayed_by: string;
  bits: number;
  nonce: number;
  n_tx: number;
  prev_block: string;
  mrkl_root: string;
  txids: string[];
  depth: number;
  prev_block_url: string;
  tx_url: string;
  next_txids?: string;
}

export interface BlockCypherTXInput {
  prev_hash: string;
  output_index: number;
  output_value: number;
  sequence: number;
  addresses: string[];
  script_type: string;
  script: string;
  age?: number;
}

export interface BlockCypherTXOutput {
  value: number;
  script: string;
  addresses: string[];
  script_type: string;
  spent_by?: string;
  data_hex?: string;
  data_string?: string;
}

export interface BlockCypherTX {
  block_hash?: string;
  block_height: number;
  block_index?: number;
  hash: string;
  addresses: string[];
  total: number;
  fees: number;
  size: number;
  vsize?: number;
  preference: string;
  relayed_by: string;
  received: string;
  ver: number;
  lock_time: number;
  double_spend: boolean;
  vin_sz: number;
  vout_sz: number;
  confirmations: number;
  inputs: BlockCypherTXInput[];
  outputs: BlockCypherTXOutput[];
  confirmed?: string;
  confidence?: number;
  receive_count?: number;
  opt_in_rbf?: boolean;
}

export interface BlockCypherTXRef {
  tx_hash: string;
  block_height: number;
  tx_input_n: number;
  tx_output_n: number;
  value: number;
  ref_balance?: number;
  spent: boolean;
  confirmations: number;
  confirmed?: string;
  double_spend: boolean;
  spent_by?: string;
  received?: string;
  script?: string;
}

export interface BlockCypherAddress {
  address: string;
  total_received: number;
  total_sent: number;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
  unconfirmed_n_tx: number;
  final_n_tx: number;
  txrefs?: BlockCypherTXRef[];
  unconfirmed_txrefs?: BlockCypherTXRef[];
  tx_url?: string;
  hasMore?: boolean;
}

export interface BlockCypherAddressFull extends BlockCypherAddress {
  txs?: BlockCypherTX[];
}

// Known Bitcoin addresses (exchanges, services, etc.)
const KNOWN_BTC_ADDRESSES: Record<string, { label: string; type: NodeType }> = {
  // Exchanges
  'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h': { label: 'Binance Cold Wallet', type: 'exchange' },
  '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s': { label: 'Binance', type: 'exchange' },
  'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97': { label: 'Bitfinex', type: 'exchange' },
  '3JZq4atUahhuA9rLhXLMhhTo133J9rF97j': { label: 'Kraken', type: 'exchange' },
  '1KQ4D42bTKN2NCxBcdVN1EyQSPHX4N8P3a': { label: 'Coinbase', type: 'exchange' },
  '3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6': { label: 'Gemini', type: 'exchange' },
  'bc1qjasf9z3h7w3jspkhtgatgpyvvzgpa2wwd2lr0eh5tx44reyn2k7sfc27a4': { label: 'Huobi', type: 'exchange' },

  // Mining pools
  '1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY': { label: 'F2Pool', type: 'contract' },
  '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX': { label: 'Mining Pool (Legacy)', type: 'contract' },

  // Notable addresses
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': { label: 'Satoshi Genesis Block', type: 'whale' },
  '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r': { label: 'Bittrex', type: 'exchange' },
};

// Get address label
export function getAddressLabel(address: string): string | undefined {
  return KNOWN_BTC_ADDRESSES[address]?.label;
}

// Get address type from known addresses
export function getKnownAddressType(address: string): NodeType | undefined {
  return KNOWN_BTC_ADDRESSES[address]?.type;
}

// Convert satoshis to coin value
export function satoshisToCoin(satoshis: number, chainId: string = 'bitcoin'): number {
  const config = BLOCKCYPHER_CHAINS[chainId] || BLOCKCYPHER_CHAINS.bitcoin;
  return satoshis / Math.pow(10, config.decimals);
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Validate Bitcoin-style address (basic validation)
export function isValidBitcoinAddress(address: string, chainId: string = 'bitcoin'): boolean {
  const config = BLOCKCYPHER_CHAINS[chainId];
  if (!config) return false;

  // Basic length check
  if (address.length < 26 || address.length > 62) return false;

  // Check prefix
  return config.addressPrefix.some(prefix => address.startsWith(prefix));
}

// Determine if chain is supported by BlockCypher
export function isBlockCypherChain(chainId: string): boolean {
  return chainId in BLOCKCYPHER_CHAINS;
}

// Calculate risk score based on transaction patterns
export function calculateRiskScore(
  address: BlockCypherAddress,
  txRatio: number = 1
): number {
  let score = 15; // Base score

  const balance = satoshisToCoin(address.final_balance);
  const totalReceived = satoshisToCoin(address.total_received);
  const totalSent = satoshisToCoin(address.total_sent);
  const txCount = address.n_tx;

  // High transaction volume with low balance = suspicious
  if (txCount > 100 && balance < 0.01) {
    score += 30;
  }

  // Very high transaction count
  if (txCount > 500) {
    score += 20;
  }

  // Asymmetric transaction ratio
  if (totalReceived > 0) {
    const ratio = totalSent / totalReceived;
    if (ratio > 0.95) {
      score += 25; // Nearly all funds sent out
    }
  }

  // Whale status reduces risk
  if (balance > 100) {
    score -= 10;
  }

  // Check for mixer patterns (high tx count, low balance, high volume)
  if (txCount > 50 && balance < 0.001 && totalReceived > 10) {
    score += 30;
  }

  return Math.min(Math.max(score, 0), 100);
}

// Determine node type based on balance and transaction patterns
function determineNodeType(address: BlockCypherAddress): NodeType {
  // Check known addresses first
  const knownType = getKnownAddressType(address.address);
  if (knownType) return knownType;

  const balance = satoshisToCoin(address.final_balance);
  const txCount = address.n_tx;

  // Whale detection
  if (balance > 100) return 'whale';

  // High transaction count with low balance might be a mixer
  if (txCount > 100 && balance < 0.01) return 'mixer';

  // Default to wallet
  return 'wallet';
}

// Fetch blockchain info
export async function fetchBlockchainInfo(
  chainId: string = 'bitcoin'
): Promise<BlockCypherBlockchain | null> {
  try {
    const url = buildApiUrl(getChainPath(chainId));
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching blockchain info:', error);
    return null;
  }
}

// Fetch block by hash or height
export async function fetchBlock(
  blockHashOrHeight: string | number,
  chainId: string = 'bitcoin'
): Promise<BlockCypherBlock | null> {
  try {
    const url = buildApiUrl(`${getChainPath(chainId)}/blocks/${blockHashOrHeight}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching block:', error);
    return null;
  }
}

// Fetch address balance (fast endpoint)
export async function fetchAddressBalance(
  address: string,
  chainId: string = 'bitcoin'
): Promise<BlockCypherAddress | null> {
  try {
    const url = buildApiUrl(`${getChainPath(chainId)}/addrs/${address}/balance`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching address balance:', error);
    return null;
  }
}

// Fetch address with transactions (default endpoint)
export async function fetchAddress(
  address: string,
  chainId: string = 'bitcoin',
  params: {
    unspentOnly?: boolean;
    includeScript?: boolean;
    before?: number;
    after?: number;
    limit?: number;
    confirmations?: number;
  } = {}
): Promise<BlockCypherAddress | null> {
  try {
    const queryParams: Record<string, string | number> = {};

    if (params.unspentOnly) queryParams.unspentOnly = 'true';
    if (params.includeScript) queryParams.includeScript = 'true';
    if (params.before) queryParams.before = params.before;
    if (params.after) queryParams.after = params.after;
    if (params.limit) queryParams.limit = params.limit;
    if (params.confirmations) queryParams.confirmations = params.confirmations;

    const url = buildApiUrl(`${getChainPath(chainId)}/addrs/${address}`, queryParams);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching address:', error);
    return null;
  }
}

// Fetch address with full transaction details
export async function fetchAddressFull(
  address: string,
  chainId: string = 'bitcoin',
  params: {
    before?: number;
    after?: number;
    limit?: number;
    txlimit?: number;
    confirmations?: number;
  } = {}
): Promise<BlockCypherAddressFull | null> {
  try {
    const queryParams: Record<string, string | number> = {};

    if (params.before) queryParams.before = params.before;
    if (params.after) queryParams.after = params.after;
    if (params.limit) queryParams.limit = params.limit;
    if (params.txlimit) queryParams.txlimit = params.txlimit;
    if (params.confirmations) queryParams.confirmations = params.confirmations;

    const url = buildApiUrl(`${getChainPath(chainId)}/addrs/${address}/full`, queryParams);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching full address:', error);
    return null;
  }
}

// Fetch transaction by hash
export async function fetchTransaction(
  txHash: string,
  chainId: string = 'bitcoin'
): Promise<BlockCypherTX | null> {
  try {
    const url = buildApiUrl(`${getChainPath(chainId)}/txs/${txHash}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

// Fetch unconfirmed transactions
export async function fetchUnconfirmedTransactions(
  chainId: string = 'bitcoin',
  limit: number = 10
): Promise<BlockCypherTX[]> {
  try {
    const url = buildApiUrl(`${getChainPath(chainId)}/txs`, { limit });
    const response = await fetch(url);

    if (!response.ok) {
      console.error('BlockCypher API error:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching unconfirmed transactions:', error);
    return [];
  }
}

// Progress callback type
export type ProgressCallback = (stage: string, count: number) => void;

// Helper to add delay for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Convert BlockCypher address to NetworkNode
function addressToNode(
  address: string,
  addressData: BlockCypherAddress | null,
  chainId: string,
  isMain: boolean = false
): NetworkNode {
  const knownLabel = getAddressLabel(address);
  const knownType = getKnownAddressType(address);

  if (addressData) {
    const nodeType = knownType || determineNodeType(addressData);
    return {
      id: address,
      address: address,
      type: nodeType,
      label: isMain ? 'Primary Wallet' : knownLabel,
      balance: satoshisToCoin(addressData.final_balance, chainId),
      transactionCount: addressData.n_tx,
      firstSeen: new Date(),
      lastActive: new Date(),
      riskScore: calculateRiskScore(addressData),
    };
  }

  return {
    id: address,
    address: address,
    type: knownType || 'wallet',
    label: isMain ? 'Primary Wallet' : knownLabel,
    balance: 0,
    transactionCount: 0,
    firstSeen: new Date(),
    lastActive: new Date(),
    riskScore: 20,
  };
}

// Fetch wallet network with connected addresses (main function for visualization)
export async function fetchWalletNetwork(
  address: string,
  chainId: string = 'bitcoin',
  maxNodes: number = 50,
  depth: number = 1,
  onProgress?: ProgressCallback
): Promise<{ nodes: NetworkNode[]; links: NetworkLink[] }> {
  const nodesMap = new Map<string, NetworkNode>();
  const linksMap = new Map<string, NetworkLink>();
  const exploredAddresses = new Set<string>();
  const addressesToExplore: { address: string; currentDepth: number }[] = [
    { address, currentDepth: 0 }
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
      onProgress?.(`Fetching address data (depth ${current.currentDepth})`, nodesMap.size);

      // Fetch address with transaction refs
      const addressData = await fetchAddress(current.address, chainId, { limit: 50 });

      // Rate limiting
      await delay(250);

      if (!addressData) continue;

      // Add current address as node
      if (!nodesMap.has(current.address)) {
        const isMain = current.address === address;
        nodesMap.set(current.address, addressToNode(current.address, addressData, chainId, isMain));
      }

      // Process transaction refs to find connected addresses
      const allTxRefs = [
        ...(addressData.txrefs || []),
        ...(addressData.unconfirmed_txrefs || [])
      ];

      for (const txRef of allTxRefs) {
        if (nodesMap.size >= maxNodes) break;

        // We need to fetch the actual transaction to get the counterparty addresses
        // But to avoid too many API calls, we'll use the tx_hash to create links
        const txHash = txRef.tx_hash;

        // Fetch full transaction for connection details (limited calls)
        if (nodesMap.size < maxNodes / 2) {
          const tx = await fetchTransaction(txHash, chainId);
          await delay(200);

          if (tx) {
            // Extract all addresses from inputs and outputs
            const inputAddresses = tx.inputs
              .flatMap(input => input.addresses || [])
              .filter(addr => addr !== current.address);

            const outputAddresses = tx.outputs
              .flatMap(output => output.addresses || [])
              .filter(addr => addr !== current.address);

            // Process connected addresses
            const connectedAddresses = [...new Set([...inputAddresses, ...outputAddresses])];

            for (const connectedAddr of connectedAddresses.slice(0, 5)) {
              if (nodesMap.size >= maxNodes) break;

              // Add node if not exists
              if (!nodesMap.has(connectedAddr)) {
                const connectedData = await fetchAddressBalance(connectedAddr, chainId);
                await delay(150);

                nodesMap.set(connectedAddr, addressToNode(connectedAddr, connectedData, chainId, false));

                // Add to exploration queue
                if (current.currentDepth < depth && !exploredAddresses.has(connectedAddr)) {
                  addressesToExplore.push({ address: connectedAddr, currentDepth: current.currentDepth + 1 });
                }
              }

              // Determine link direction and create link
              const isIncoming = outputAddresses.includes(connectedAddr);
              const linkId = isIncoming
                ? `${connectedAddr}-${current.address}`
                : `${current.address}-${connectedAddr}`;

              const existingLink = linksMap.get(linkId);
              const txValue = satoshisToCoin(txRef.value, chainId);

              if (existingLink) {
                existingLink.value += txValue;
                existingLink.transactionCount++;
              } else {
                linksMap.set(linkId, {
                  id: linkId,
                  source: isIncoming ? connectedAddr : current.address,
                  target: isIncoming ? current.address : connectedAddr,
                  value: txValue,
                  transactionCount: 1,
                  timestamp: txRef.confirmed ? new Date(txRef.confirmed) : new Date(),
                  type: 'transfer',
                });
              }
            }
          }
        }
      }

      onProgress?.('Building network', nodesMap.size);
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

// Get explorer URL for address
export function getExplorerUrl(address: string, chainId: string = 'bitcoin'): string {
  const config = BLOCKCYPHER_CHAINS[chainId] || BLOCKCYPHER_CHAINS.bitcoin;
  return `${config.explorer}/address/${address}`;
}

// Get explorer URL for transaction
export function getTxExplorerUrl(txHash: string, chainId: string = 'bitcoin'): string {
  const config = BLOCKCYPHER_CHAINS[chainId] || BLOCKCYPHER_CHAINS.bitcoin;
  return `${config.explorer}/tx/${txHash}`;
}

// Get explorer URL for block
export function getBlockExplorerUrl(blockHashOrHeight: string | number, chainId: string = 'bitcoin'): string {
  const config = BLOCKCYPHER_CHAINS[chainId] || BLOCKCYPHER_CHAINS.bitcoin;
  return `${config.explorer}/block/${blockHashOrHeight}`;
}

// Get fee estimates
export async function getFeeEstimates(chainId: string = 'bitcoin'): Promise<{
  high: number;
  medium: number;
  low: number;
} | null> {
  try {
    const blockchainInfo = await fetchBlockchainInfo(chainId);

    if (blockchainInfo) {
      return {
        high: blockchainInfo.high_fee_per_kb,
        medium: blockchainInfo.medium_fee_per_kb,
        low: blockchainInfo.low_fee_per_kb,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching fee estimates:', error);
    return null;
  }
}

// Get current block height
export async function getBlockHeight(chainId: string = 'bitcoin'): Promise<number | null> {
  try {
    const blockchainInfo = await fetchBlockchainInfo(chainId);
    return blockchainInfo?.height || null;
  } catch (error) {
    console.error('Error fetching block height:', error);
    return null;
  }
}

// Batch fetch multiple addresses (using BlockCypher's batching feature)
export async function fetchMultipleAddresses(
  addresses: string[],
  chainId: string = 'bitcoin'
): Promise<BlockCypherAddress[]> {
  // BlockCypher allows batching up to 100 addresses
  const batchSize = 100;
  const results: BlockCypherAddress[] = [];

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const batchString = batch.join(';');

    try {
      const url = buildApiUrl(`${getChainPath(chainId)}/addrs/${batchString}/balance`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error('BlockCypher API error:', response.status);
        continue;
      }

      const data = await response.json();

      // Response can be a single object or array
      if (Array.isArray(data)) {
        results.push(...data);
      } else {
        results.push(data);
      }

      // Rate limiting between batches
      if (i + batchSize < addresses.length) {
        await delay(300);
      }
    } catch (error) {
      console.error('Error in batch fetch:', error);
    }
  }

  return results;
}

// Get chain configuration
export function getChainConfig(chainId: string): BlockCypherChainConfig | null {
  return BLOCKCYPHER_CHAINS[chainId] || null;
}

// Get all supported chains
export function getSupportedChains(): BlockCypherChainConfig[] {
  return Object.values(BLOCKCYPHER_CHAINS);
}
