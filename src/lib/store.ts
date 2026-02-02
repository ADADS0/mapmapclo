import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  NetworkNode,
  NetworkLink,
  FilterState,
  ViewState,
  ThemeName,
  ChainInfo,
  NetworkStats,
  NodeType,
  ColorMode,
  WatchlistEntry,
  AddressLabel,
  AddressTag,
  SavedWorkspace,
  AnimationConfig
} from '@/types';

interface CryptoVizState {
  // Network data
  nodes: NetworkNode[];
  links: NetworkLink[];
  stats: NetworkStats;

  // Chain selection
  selectedChain: ChainInfo;
  chains: ChainInfo[];

  // Filters
  filters: FilterState;

  // View state
  view: ViewState;

  // Theme
  theme: ThemeName;
  colorMode: ColorMode;

  // Time travel
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;

  // Loading states
  isLoading: boolean;
  loadingProgress: { stage: string; count: number } | null;

  // Search results
  searchResults: NetworkNode[];

  // Focus mode - show only selected node and its connections
  focusMode: boolean;

  // Currently explored wallet address (for highlighting)
  exploredWalletAddress: string | null;
  explorationDepth: number;

  // Watchlist
  watchlist: WatchlistEntry[];

  // Labels and Tags
  addressLabels: AddressLabel[];
  addressTags: AddressTag[];

  // Saved workspaces
  savedWorkspaces: SavedWorkspace[];

  // Connected wallet
  connectedWallet: string | null;

  // Actions
  setNodes: (nodes: NetworkNode[]) => void;
  setLinks: (links: NetworkLink[]) => void;
  setSelectedChain: (chain: ChainInfo) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setView: (view: Partial<ViewState>) => void;
  setTheme: (theme: ThemeName) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  setCurrentTime: (time: Date) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  selectNode: (nodeId: string | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  addNodeToSelection: (nodeId: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  hoverNode: (nodeId: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  resetFilters: () => void;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
  searchNodes: (query: string) => void;
  getFilteredNodes: () => NetworkNode[];
  getFilteredLinks: () => NetworkLink[];

  // Watchlist actions
  addToWatchlist: (entry: Omit<WatchlistEntry, 'addedAt'>) => void;
  removeFromWatchlist: (address: string) => void;
  updateWatchlistEntry: (address: string, updates: Partial<WatchlistEntry>) => void;
  isInWatchlist: (address: string) => boolean;

  // Labels actions
  setAddressLabel: (address: string, label: string, color?: string) => void;
  removeAddressLabel: (address: string) => void;
  getAddressLabel: (address: string) => AddressLabel | undefined;

  // Tags actions
  createTag: (name: string, color: string) => void;
  deleteTag: (id: string) => void;
  addTagToAddress: (address: string, tagId: string) => void;
  removeTagFromAddress: (address: string, tagId: string) => void;

  // Workspace actions
  saveWorkspace: (name: string) => void;
  loadWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  exportWorkspace: () => string;
  importWorkspace: (data: string) => boolean;

  // Wallet connect actions
  setConnectedWallet: (address: string | null) => void;

  // Blockchain exploration actions
  setExploredWalletAddress: (address: string | null) => void;
  setExplorationDepth: (depth: number) => void;
  setLoadingProgress: (progress: { stage: string; count: number } | null) => void;
}

const defaultChains: ChainInfo[] = [
  // Bitcoin-based chains (BlockCypher API)
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    color: '#F7931A',
    icon: '₿',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
  },
  {
    id: 'litecoin',
    name: 'Litecoin',
    symbol: 'LTC',
    color: '#A6A9AA',
    icon: 'Ł',
    logoUrl: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    color: '#C2A633',
    icon: 'Ð',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png'
  },
  {
    id: 'dash',
    name: 'Dash',
    symbol: 'DASH',
    color: '#008CE7',
    icon: 'Ⓓ',
    logoUrl: 'https://assets.coingecko.com/coins/images/19/small/dash-logo.png'
  },
  // Ethereum-based chains (Etherscan API)
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    icon: '⟠',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    color: '#8247E5',
    icon: '⬡',
    logoUrl: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    color: '#28A0F0',
    icon: '◈',
    logoUrl: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg'
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    color: '#FF0420',
    icon: '⊙',
    logoUrl: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png'
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    color: '#0052FF',
    icon: '◉',
    logoUrl: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg'
  },
  {
    id: 'bsc',
    name: 'BNB Chain',
    symbol: 'BNB',
    color: '#F3BA2F',
    icon: '◆',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    color: '#E84142',
    icon: '▲',
    logoUrl: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png'
  },
];

const defaultFilters: FilterState = {
  nodeTypes: ['wallet', 'exchange', 'contract', 'whale', 'mixer', 'defi'],
  minBalance: 0,
  maxBalance: Number.POSITIVE_INFINITY,
  minRiskScore: 0,
  maxRiskScore: 100,
  minTransactions: 0,
  searchQuery: '',
  timeRange: null,
};

const defaultView: ViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedNodeId: null,
  selectedNodeIds: [], // Multi-select support
  hoveredNodeId: null,
  showLabels: true,
  showGrid: true,
  animationSpeed: 1,
  enableClustering: false,
  clusterThreshold: 50,
  enableEdgeBundling: false,
  bundlingStrength: 0.6,
  // Animation settings
  animationConfig: {
    enabled: true,
    easingType: 'spring',
    releaseVelocityFactor: 0.3,
    springStiffness: 0.15,
    springDamping: 0.85,
    animationDuration: 400,
    bloomSpeed: 1,
    layoutAlgorithm: 'bubblemaps',
    // Arrow settings - ultra-thin arrows like Bubblemaps.io
    arrowConfig: {
      headSize: 2.5, // Small elegant arrowheads
      headAngle: 10, // Narrow angle for sleek look
      lineWidth: 0.4, // Ultra-thin base width
      showFlowAnimation: true,
      flowSpeed: 0.4,
      flowOpacity: 0.15, // Subtle flow
      style: 'triangle' as const,
      curveStyle: 'straight' as const,
      showGlow: false,
      glowIntensity: 0.2,
      tapered: false,
      valueBasedOpacity: false,
      colorMode: 'accent' as const,
    },
  },
};

const defaultStats: NetworkStats = {
  totalNodes: 0,
  totalLinks: 0,
  totalVolume: 0,
  avgTransactionSize: 0,
  activeWallets: 0,
  riskySources: 0,
};

const defaultTags: AddressTag[] = [
  { id: 'tag-1', name: 'Suspicious', color: '#ff4444' },
  { id: 'tag-2', name: 'Verified', color: '#00ff88' },
  { id: 'tag-3', name: 'Exchange', color: '#ff00ff' },
  { id: 'tag-4', name: 'DeFi', color: '#00ffff' },
  { id: 'tag-5', name: 'Whale', color: '#ffff00' },
];

export const useCryptoVizStore = create<CryptoVizState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      links: [],
      stats: defaultStats,
      selectedChain: defaultChains[0],
      chains: defaultChains,
      filters: defaultFilters,
      view: defaultView,
      theme: 'neon',
      colorMode: 'dark',
      currentTime: new Date(),
      isPlaying: false,
      playbackSpeed: 1,
      isLoading: false,
      loadingProgress: null,
      searchResults: [],
      focusMode: false,
      exploredWalletAddress: null,
      explorationDepth: 1,
      watchlist: [],
      addressLabels: [],
      addressTags: defaultTags,
      savedWorkspaces: [],
      connectedWallet: null,

      // Actions
      setNodes: (nodes) => set({
        nodes,
        stats: {
          totalNodes: nodes.length,
          totalLinks: 0,
          totalVolume: nodes.reduce((sum, n) => sum + n.balance, 0),
          avgTransactionSize: 0,
          activeWallets: nodes.filter(n => n.type === 'wallet').length,
          riskySources: nodes.filter(n => n.riskScore > 70).length,
        }
      }),

      setLinks: (links) => set((state) => ({
        links,
        stats: {
          ...state.stats,
          totalLinks: links.length,
          avgTransactionSize: links.length > 0
            ? links.reduce((sum, l) => sum + l.value, 0) / links.length
            : 0,
        }
      })),

      setSelectedChain: (chain) => set({ selectedChain: chain }),

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),

      setView: (view) => set((state) => ({
        view: { ...state.view, ...view }
      })),

      setTheme: (theme) => set({ theme }),

      setColorMode: (mode) => set({ colorMode: mode }),

      toggleColorMode: () => set((state) => ({
        colorMode: state.colorMode === 'dark' ? 'light' : 'dark'
      })),

      setCurrentTime: (time) => set({ currentTime: time }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

      selectNode: (nodeId) => set((state) => ({
        view: {
          ...state.view,
          selectedNodeId: nodeId,
          selectedNodeIds: nodeId ? [nodeId] : []
        }
      })),

      toggleNodeSelection: (nodeId) => set((state) => {
        const currentIds = state.view.selectedNodeIds;
        const isSelected = currentIds.includes(nodeId);
        const newIds = isSelected
          ? currentIds.filter(id => id !== nodeId)
          : [...currentIds, nodeId];
        return {
          view: {
            ...state.view,
            selectedNodeId: newIds.length > 0 ? newIds[newIds.length - 1] : null,
            selectedNodeIds: newIds
          }
        };
      }),

      addNodeToSelection: (nodeId) => set((state) => {
        if (state.view.selectedNodeIds.includes(nodeId)) return state;
        return {
          view: {
            ...state.view,
            selectedNodeId: nodeId,
            selectedNodeIds: [...state.view.selectedNodeIds, nodeId]
          }
        };
      }),

      clearSelection: () => set((state) => ({
        view: {
          ...state.view,
          selectedNodeId: null,
          selectedNodeIds: []
        }
      })),

      selectMultipleNodes: (nodeIds) => set((state) => ({
        view: {
          ...state.view,
          selectedNodeId: nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null,
          selectedNodeIds: nodeIds
        }
      })),

      hoverNode: (nodeId) => set((state) => ({
        view: { ...state.view, hoveredNodeId: nodeId }
      })),

      setIsLoading: (loading) => set({ isLoading: loading }),

      resetFilters: () => set({ filters: defaultFilters }),

      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

      setFocusMode: (enabled) => set({ focusMode: enabled }),

      searchNodes: (query) => {
        const state = get();
        if (!query.trim()) {
          set({ searchResults: [] });
          return;
        }
        const lowerQuery = query.toLowerCase();
        const results = state.nodes.filter(node =>
          node.address.toLowerCase().includes(lowerQuery) ||
          (node.label && node.label.toLowerCase().includes(lowerQuery))
        );
        set({ searchResults: results });
      },

      getFilteredNodes: () => {
        const state = get();
        const { nodes, filters, focusMode, view, links } = state;

        let filteredNodes = nodes.filter(node => {
          // Node type filter
          if (!filters.nodeTypes.includes(node.type)) return false;

          // Balance filter
          if (node.balance < filters.minBalance) return false;

          // Risk score filter
          if (node.riskScore < filters.minRiskScore || node.riskScore > filters.maxRiskScore) return false;

          // Transaction count filter
          if (node.transactionCount < filters.minTransactions) return false;

          // Search query filter
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesAddress = node.address.toLowerCase().includes(query);
            const matchesLabel = node.label?.toLowerCase().includes(query);
            if (!matchesAddress && !matchesLabel) return false;
          }

          return true;
        });

        // Focus mode - only show selected node and its connections
        if (focusMode && view.selectedNodeId) {
          const connectedNodeIds = new Set<string>();
          connectedNodeIds.add(view.selectedNodeId);

          for (const link of links) {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;

            if (sourceId === view.selectedNodeId) {
              connectedNodeIds.add(targetId);
            }
            if (targetId === view.selectedNodeId) {
              connectedNodeIds.add(sourceId);
            }
          }

          filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
        }

        return filteredNodes;
      },

      getFilteredLinks: () => {
        const state = get();
        const { links, focusMode, view } = state;
        const filteredNodes = state.getFilteredNodes();
        const nodeIds = new Set(filteredNodes.map(n => n.id));

        let filteredLinks = links.filter(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        // Focus mode - only show links connected to selected node
        if (focusMode && view.selectedNodeId) {
          filteredLinks = filteredLinks.filter(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return sourceId === view.selectedNodeId || targetId === view.selectedNodeId;
          });
        }

        return filteredLinks;
      },

      // Watchlist actions
      addToWatchlist: (entry) => set((state) => ({
        watchlist: [
          ...state.watchlist,
          { ...entry, addedAt: new Date() }
        ]
      })),

      removeFromWatchlist: (address) => set((state) => ({
        watchlist: state.watchlist.filter(e => e.address !== address)
      })),

      updateWatchlistEntry: (address, updates) => set((state) => ({
        watchlist: state.watchlist.map(e =>
          e.address === address ? { ...e, ...updates } : e
        )
      })),

      isInWatchlist: (address) => {
        const state = get();
        return state.watchlist.some(e => e.address === address);
      },

      // Labels actions
      setAddressLabel: (address, label, color) => set((state) => {
        const existing = state.addressLabels.find(l => l.address === address);
        if (existing) {
          return {
            addressLabels: state.addressLabels.map(l =>
              l.address === address ? { ...l, label, color } : l
            )
          };
        }
        return {
          addressLabels: [...state.addressLabels, { address, label, color }]
        };
      }),

      removeAddressLabel: (address) => set((state) => ({
        addressLabels: state.addressLabels.filter(l => l.address !== address)
      })),

      getAddressLabel: (address) => {
        const state = get();
        return state.addressLabels.find(l => l.address === address);
      },

      // Tags actions
      createTag: (name, color) => set((state) => ({
        addressTags: [
          ...state.addressTags,
          { id: `tag-${Date.now()}`, name, color }
        ]
      })),

      deleteTag: (id) => set((state) => ({
        addressTags: state.addressTags.filter(t => t.id !== id),
        watchlist: state.watchlist.map(e => ({
          ...e,
          tags: e.tags.filter(t => t !== id)
        }))
      })),

      addTagToAddress: (address, tagId) => set((state) => ({
        watchlist: state.watchlist.map(e =>
          e.address === address && !e.tags.includes(tagId)
            ? { ...e, tags: [...e.tags, tagId] }
            : e
        )
      })),

      removeTagFromAddress: (address, tagId) => set((state) => ({
        watchlist: state.watchlist.map(e =>
          e.address === address
            ? { ...e, tags: e.tags.filter(t => t !== tagId) }
            : e
        )
      })),

      // Workspace actions
      saveWorkspace: (name) => set((state) => {
        const workspace: SavedWorkspace = {
          id: `workspace-${Date.now()}`,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
          watchlist: state.watchlist,
          labels: state.addressLabels,
          tags: state.addressTags,
          filters: state.filters,
          theme: state.theme,
          selectedChain: state.selectedChain.id,
        };
        return {
          savedWorkspaces: [...state.savedWorkspaces, workspace]
        };
      }),

      loadWorkspace: (id) => {
        const state = get();
        const workspace = state.savedWorkspaces.find(w => w.id === id);
        if (workspace) {
          const chain = state.chains.find(c => c.id === workspace.selectedChain) || state.chains[0];
          set({
            watchlist: workspace.watchlist,
            addressLabels: workspace.labels,
            addressTags: workspace.tags,
            filters: workspace.filters,
            theme: workspace.theme,
            selectedChain: chain,
          });
        }
      },

      deleteWorkspace: (id) => set((state) => ({
        savedWorkspaces: state.savedWorkspaces.filter(w => w.id !== id)
      })),

      exportWorkspace: () => {
        const state = get();
        const data = {
          watchlist: state.watchlist,
          labels: state.addressLabels,
          tags: state.addressTags,
          filters: state.filters,
          theme: state.theme,
          selectedChain: state.selectedChain.id,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(data, null, 2);
      },

      importWorkspace: (data) => {
        try {
          const parsed = JSON.parse(data);
          const state = get();
          const chain = state.chains.find(c => c.id === parsed.selectedChain) || state.chains[0];
          set({
            watchlist: parsed.watchlist || [],
            addressLabels: parsed.labels || [],
            addressTags: parsed.tags || defaultTags,
            filters: parsed.filters || defaultFilters,
            theme: parsed.theme || 'neon',
            selectedChain: chain,
          });
          return true;
        } catch {
          return false;
        }
      },

      // Wallet connect actions
      setConnectedWallet: (address) => set({ connectedWallet: address }),

      // Blockchain exploration actions
      setExploredWalletAddress: (address) => set({ exploredWalletAddress: address }),
      setExplorationDepth: (depth) => set({ explorationDepth: depth }),
      setLoadingProgress: (progress) => set({ loadingProgress: progress }),
    }),
    {
      name: 'cryptoviz-storage',
      partialize: (state) => ({
        watchlist: state.watchlist,
        addressLabels: state.addressLabels,
        addressTags: state.addressTags,
        savedWorkspaces: state.savedWorkspaces,
        theme: state.theme,
        colorMode: state.colorMode,
      }),
    }
  )
);

// Theme configurations
export const themes: Record<ThemeName, {
  name: ThemeName;
  label: string;
  background: string;
  backgroundGradient: string;
  nodeColors: Record<NodeType, string>;
  linkColor: string;
  accentColor: string;
  textColor: string;
  gridColor: string;
}> = {
  neon: {
    name: 'neon',
    label: 'Neon Cyber',
    background: '#0a0a0f',
    backgroundGradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0f1a2a 100%)',
    nodeColors: {
      wallet: '#00ff88',
      exchange: '#ff00ff',
      contract: '#00ffff',
      whale: '#ffff00',
      mixer: '#ff4444',
      defi: '#8844ff',
    },
    linkColor: 'rgba(200, 200, 220, 0.4)',
    accentColor: '#00ff88',
    textColor: '#ffffff',
    gridColor: 'rgba(0, 255, 136, 0.05)',
  },
  matrix: {
    name: 'matrix',
    label: 'Matrix',
    background: '#000000',
    backgroundGradient: 'linear-gradient(180deg, #000000 0%, #001a00 100%)',
    nodeColors: {
      wallet: '#00ff00',
      exchange: '#00cc00',
      contract: '#00aa00',
      whale: '#88ff88',
      mixer: '#ff0000',
      defi: '#44ff44',
    },
    linkColor: 'rgba(0, 255, 0, 0.2)',
    accentColor: '#00ff00',
    textColor: '#00ff00',
    gridColor: 'rgba(0, 255, 0, 0.03)',
  },
  ocean: {
    name: 'ocean',
    label: 'Deep Ocean',
    background: '#0a1628',
    backgroundGradient: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #061420 100%)',
    nodeColors: {
      wallet: '#4fc3f7',
      exchange: '#29b6f6',
      contract: '#03a9f4',
      whale: '#00bcd4',
      mixer: '#ff7043',
      defi: '#26c6da',
    },
    linkColor: 'rgba(79, 195, 247, 0.25)',
    accentColor: '#4fc3f7',
    textColor: '#e3f2fd',
    gridColor: 'rgba(79, 195, 247, 0.04)',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    background: '#1a0a0a',
    backgroundGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #1a1a0a 100%)',
    nodeColors: {
      wallet: '#ff9800',
      exchange: '#ff5722',
      contract: '#ffc107',
      whale: '#ffeb3b',
      mixer: '#f44336',
      defi: '#ff7043',
    },
    linkColor: 'rgba(255, 152, 0, 0.25)',
    accentColor: '#ff9800',
    textColor: '#fff3e0',
    gridColor: 'rgba(255, 152, 0, 0.04)',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    background: '#0d0d1a',
    backgroundGradient: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
    nodeColors: {
      wallet: '#9c88ff',
      exchange: '#a29bfe',
      contract: '#6c5ce7',
      whale: '#fd79a8',
      mixer: '#e84393',
      defi: '#74b9ff',
    },
    linkColor: 'rgba(156, 136, 255, 0.25)',
    accentColor: '#9c88ff',
    textColor: '#dfe6e9',
    gridColor: 'rgba(156, 136, 255, 0.04)',
  },
};
