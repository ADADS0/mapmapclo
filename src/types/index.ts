// Node types for the network visualization
export type NodeType = 'wallet' | 'exchange' | 'contract' | 'whale' | 'mixer' | 'defi';

export interface NetworkNode {
  id: string;
  address: string;
  type: NodeType;
  label?: string;
  balance: number;
  transactionCount: number;
  firstSeen: Date;
  lastActive: Date;
  riskScore: number; // 0-100
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  // Logo/icon for special node types (exchanges, contracts, etc.)
  logoUrl?: string;
  // Protocol/platform identifier for logo lookup
  protocol?: string;
}

export interface NetworkLink {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
  transactionCount: number;
  timestamp: Date;
  type: 'transfer' | 'swap' | 'stake' | 'mint' | 'burn';
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  gasUsed: number;
  gasPrice: number;
  timestamp: Date;
  blockNumber: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface ChainInfo {
  id: string;
  name: string;
  symbol: string;
  color: string;
  icon: string;
  logoUrl?: string;  // Full URL to chain logo image
  rpcUrl?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface FilterState {
  nodeTypes: NodeType[];
  minBalance: number;
  maxBalance: number;
  minRiskScore: number;
  maxRiskScore: number;
  minTransactions: number;
  searchQuery: string;
  timeRange: TimeRange | null;
}

export interface NetworkStats {
  totalNodes: number;
  totalLinks: number;
  totalVolume: number;
  avgTransactionSize: number;
  activeWallets: number;
  riskySources: number;
}

export type ThemeName = 'neon' | 'matrix' | 'ocean' | 'sunset' | 'midnight';
export type ColorMode = 'dark' | 'light';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  background: string;
  nodeColors: Record<NodeType, string>;
  linkColor: string;
  accentColor: string;
  textColor: string;
  gridColor: string;
}

// Animation easing types
export type EasingType = 'none' | 'easeOut' | 'spring' | 'elastic';

// Layout algorithm types
export type LayoutAlgorithm = 'flower' | 'circular' | 'radial' | 'hierarchical' | 'force' | 'bubblemaps';

// Arrow style types
export type ArrowStyle = 'triangle' | 'chevron' | 'line' | 'dot' | 'none';
export type ArrowCurveStyle = 'straight' | 'curved' | 'arc';

// Arrow configuration
export interface ArrowConfig {
  headSize: number; // Arrow head size in pixels (3-12)
  headAngle: number; // Arrow head angle divisor (5-10, used as PI/x)
  lineWidth: number; // Line thickness (0.5-3)
  showFlowAnimation: boolean; // Show flowing animation on links
  flowSpeed: number; // Flow animation speed (0.1-1)
  flowOpacity: number; // Flow animation opacity (0.1-1)
  // New styling options
  style: ArrowStyle; // Arrow head style
  curveStyle: ArrowCurveStyle; // Line curve style
  showGlow: boolean; // Enable glow effect on arrows
  glowIntensity: number; // Glow intensity (0.1-1)
  tapered: boolean; // Taper line from thick to thin
  valueBasedOpacity: boolean; // Opacity based on transaction value
  colorMode: 'accent' | 'gradient' | 'source' | 'target'; // How to color arrows
}

// Animation configuration
export interface AnimationConfig {
  enabled: boolean;
  easingType: EasingType;
  releaseVelocityFactor: number; // How much initial velocity to preserve (0-1)
  springStiffness: number; // Spring tension (0.1-1)
  springDamping: number; // Spring friction (0.5-0.98)
  animationDuration: number; // Duration for easeOut in ms
  bloomSpeed: number; // Speed multiplier for bloom animation (0.5-3)
  layoutAlgorithm: LayoutAlgorithm; // Which layout algorithm to use
  // Arrow settings
  arrowConfig: ArrowConfig;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-select support
  hoveredNodeId: string | null;
  showLabels: boolean;
  showGrid: boolean;
  animationSpeed: number;
  enableClustering: boolean;
  clusterThreshold: number;
  enableEdgeBundling: boolean;
  bundlingStrength: number;
  // Animation settings
  animationConfig: AnimationConfig;
}

export interface NodeCluster {
  id: string;
  nodes: NetworkNode[];
  x: number;
  y: number;
  radius: number;
  label: string;
}

// Watchlist entry for saved addresses
export interface WatchlistEntry {
  address: string;
  label: string;
  tags: string[];
  notes?: string;
  addedAt: Date;
  alertsEnabled: boolean;
}

// Address label/tag
export interface AddressLabel {
  address: string;
  label: string;
  color?: string;
}

// Address tag
export interface AddressTag {
  id: string;
  name: string;
  color: string;
}

// Saved workspace
export interface SavedWorkspace {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  watchlist: WatchlistEntry[];
  labels: AddressLabel[];
  tags: AddressTag[];
  filters: FilterState;
  theme: ThemeName;
  selectedChain: string;
}
