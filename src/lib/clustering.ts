import type { NetworkNode, NetworkLink, NodeCluster } from '@/types';

// K-means clustering for network nodes
export function clusterNodes(
  nodes: NetworkNode[],
  links: NetworkLink[],
  threshold: number = 50
): { clusters: NodeCluster[]; clusteredNodes: Map<string, string> } {
  if (nodes.length < threshold) {
    return { clusters: [], clusteredNodes: new Map() };
  }

  // Calculate connectivity matrix
  const connectivity = new Map<string, Set<string>>();
  for (const node of nodes) {
    connectivity.set(node.id, new Set());
  }

  for (const link of links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    connectivity.get(sourceId)?.add(targetId);
    connectivity.get(targetId)?.add(sourceId);
  }

  // Group nodes by type and connectivity
  const nodeGroups = new Map<string, NetworkNode[]>();

  for (const node of nodes) {
    const connections = connectivity.get(node.id)?.size || 0;
    const groupKey = `${node.type}-${Math.floor(connections / 5)}`;

    if (!nodeGroups.has(groupKey)) {
      nodeGroups.set(groupKey, []);
    }
    nodeGroups.get(groupKey)?.push(node);
  }

  const clusters: NodeCluster[] = [];
  const clusteredNodes = new Map<string, string>();
  let clusterIndex = 0;

  // Create clusters for groups with enough nodes
  for (const [groupKey, groupNodes] of nodeGroups) {
    if (groupNodes.length >= 3) {
      // Calculate cluster center
      const validNodes = groupNodes.filter(n => n.x !== undefined && n.y !== undefined);
      if (validNodes.length === 0) continue;

      const centerX = validNodes.reduce((sum, n) => sum + (n.x || 0), 0) / validNodes.length;
      const centerY = validNodes.reduce((sum, n) => sum + (n.y || 0), 0) / validNodes.length;

      // Calculate cluster radius based on spread
      let maxDist = 0;
      for (const node of validNodes) {
        const dist = Math.sqrt(Math.pow((node.x || 0) - centerX, 2) + Math.pow((node.y || 0) - centerY, 2));
        maxDist = Math.max(maxDist, dist);
      }

      const clusterId = `cluster-${clusterIndex++}`;
      const [nodeType] = groupKey.split('-');

      clusters.push({
        id: clusterId,
        nodes: groupNodes,
        x: centerX,
        y: centerY,
        radius: Math.max(30, Math.min(maxDist * 0.5, 80)),
        label: `${nodeType} (${groupNodes.length})`,
      });

      for (const node of groupNodes) {
        clusteredNodes.set(node.id, clusterId);
      }
    }
  }

  return { clusters, clusteredNodes };
}

// Edge bundling using force-directed algorithm
export interface BundledEdge {
  source: { x: number; y: number };
  target: { x: number; y: number };
  controlPoints: Array<{ x: number; y: number }>;
  link: NetworkLink;
}

export function bundleEdges(
  nodes: NetworkNode[],
  links: NetworkLink[],
  bundlingStrength: number = 0.6
): BundledEdge[] {
  const nodeMap = new Map<string, NetworkNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const bundledEdges: BundledEdge[] = [];

  // Group edges by similar paths
  const edgeGroups = new Map<string, NetworkLink[]>();

  for (const link of links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const source = nodeMap.get(sourceId);
    const target = nodeMap.get(targetId);

    if (!source?.x || !source?.y || !target?.x || !target?.y) continue;

    // Create a spatial hash for grouping similar edges
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const groupKey = `${Math.round(midX / 50)}-${Math.round(midY / 50)}-${Math.round(angle * 2)}`;

    if (!edgeGroups.has(groupKey)) {
      edgeGroups.set(groupKey, []);
    }
    edgeGroups.get(groupKey)?.push(link);
  }

  // Process each edge group
  for (const [, groupLinks] of edgeGroups) {
    if (groupLinks.length === 1) {
      // Single edge - no bundling needed
      const link = groupLinks[0];
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);

      if (source?.x && source?.y && target?.x && target?.y) {
        bundledEdges.push({
          source: { x: source.x, y: source.y },
          target: { x: target.x, y: target.y },
          controlPoints: [],
          link,
        });
      }
    } else {
      // Multiple edges - calculate bundle path
      const centerPoints: Array<{ x: number; y: number }> = [];

      for (const link of groupLinks) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (source?.x && source?.y && target?.x && target?.y) {
          centerPoints.push({
            x: (source.x + target.x) / 2,
            y: (source.y + target.y) / 2,
          });
        }
      }

      // Calculate bundle center
      const bundleCenter = {
        x: centerPoints.reduce((sum, p) => sum + p.x, 0) / centerPoints.length,
        y: centerPoints.reduce((sum, p) => sum + p.y, 0) / centerPoints.length,
      };

      // Create bundled edges with control points
      for (const link of groupLinks) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (source?.x && source?.y && target?.x && target?.y) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          // Interpolate towards bundle center based on strength
          const controlX = midX + (bundleCenter.x - midX) * bundlingStrength;
          const controlY = midY + (bundleCenter.y - midY) * bundlingStrength;

          bundledEdges.push({
            source: { x: source.x, y: source.y },
            target: { x: target.x, y: target.y },
            controlPoints: [{ x: controlX, y: controlY }],
            link,
          });
        }
      }
    }
  }

  return bundledEdges;
}

// Hierarchical clustering using distance-based merging
export function hierarchicalCluster(
  nodes: NetworkNode[],
  maxDistance: number = 100
): NodeCluster[] {
  if (nodes.length === 0) return [];

  const validNodes = nodes.filter(n => n.x !== undefined && n.y !== undefined);
  if (validNodes.length === 0) return [];

  const clusters: NodeCluster[] = [];
  const assigned = new Set<string>();
  let clusterIndex = 0;

  for (const node of validNodes) {
    if (assigned.has(node.id)) continue;

    const clusterNodes: NetworkNode[] = [node];
    assigned.add(node.id);

    // Find nearby nodes of the same type
    for (const other of validNodes) {
      if (assigned.has(other.id) || other.type !== node.type) continue;

      const dist = Math.sqrt(
        Math.pow((other.x || 0) - (node.x || 0), 2) +
        Math.pow((other.y || 0) - (node.y || 0), 2)
      );

      if (dist <= maxDistance) {
        clusterNodes.push(other);
        assigned.add(other.id);
      }
    }

    if (clusterNodes.length >= 2) {
      const centerX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length;
      const centerY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length;

      let maxDist = 0;
      for (const cn of clusterNodes) {
        const dist = Math.sqrt(
          Math.pow((cn.x || 0) - centerX, 2) +
          Math.pow((cn.y || 0) - centerY, 2)
        );
        maxDist = Math.max(maxDist, dist);
      }

      clusters.push({
        id: `cluster-${clusterIndex++}`,
        nodes: clusterNodes,
        x: centerX,
        y: centerY,
        radius: Math.max(25, maxDist + 10),
        label: `${node.type} cluster (${clusterNodes.length})`,
      });
    }
  }

  return clusters;
}
