/**
 * Spatial Index for fast node hit detection
 * Uses a simple grid-based spatial hashing for O(1) average lookup
 */

import type { NetworkNode } from "@/types";

interface SpatialCell {
  nodes: NetworkNode[];
}

export interface SpatialIndex {
  cells: Map<string, SpatialCell>;
  cellSize: number;
  getNodesInRadius: (x: number, y: number, radius: number) => NetworkNode[];
  findNodeAtPoint: (x: number, y: number, getRadius: (node: NetworkNode) => number) => NetworkNode | null;
  rebuild: (nodes: NetworkNode[]) => void;
}

function getCellKey(x: number, y: number, cellSize: number): string {
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  return `${cellX},${cellY}`;
}

function getCellsInRadius(x: number, y: number, radius: number, cellSize: number): string[] {
  const keys: string[] = [];
  const minCellX = Math.floor((x - radius) / cellSize);
  const maxCellX = Math.floor((x + radius) / cellSize);
  const minCellY = Math.floor((y - radius) / cellSize);
  const maxCellY = Math.floor((y + radius) / cellSize);

  for (let cx = minCellX; cx <= maxCellX; cx++) {
    for (let cy = minCellY; cy <= maxCellY; cy++) {
      keys.push(`${cx},${cy}`);
    }
  }
  return keys;
}

export function createSpatialIndex(cellSize: number = 100): SpatialIndex {
  const cells = new Map<string, SpatialCell>();

  const rebuild = (nodes: NetworkNode[]) => {
    cells.clear();
    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue;

      const key = getCellKey(node.x, node.y, cellSize);
      let cell = cells.get(key);
      if (!cell) {
        cell = { nodes: [] };
        cells.set(key, cell);
      }
      cell.nodes.push(node);
    }
  };

  const getNodesInRadius = (x: number, y: number, radius: number): NetworkNode[] => {
    const result: NetworkNode[] = [];
    const cellKeys = getCellsInRadius(x, y, radius, cellSize);

    for (const key of cellKeys) {
      const cell = cells.get(key);
      if (!cell) continue;

      for (const node of cell.nodes) {
        if (node.x === undefined || node.y === undefined) continue;
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy <= radius * radius) {
          result.push(node);
        }
      }
    }

    return result;
  };

  const findNodeAtPoint = (
    x: number,
    y: number,
    getRadius: (node: NetworkNode) => number
  ): NetworkNode | null => {
    // Check cells around the point with a max search radius
    const maxSearchRadius = 50; // Maximum node radius we expect
    const cellKeys = getCellsInRadius(x, y, maxSearchRadius, cellSize);

    let closestNode: NetworkNode | null = null;
    let closestDistance = Infinity;

    for (const key of cellKeys) {
      const cell = cells.get(key);
      if (!cell) continue;

      for (const node of cell.nodes) {
        if (node.x === undefined || node.y === undefined) continue;
        const dx = node.x - x;
        const dy = node.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = getRadius(node);

        if (distance <= nodeRadius + 5 && distance < closestDistance) {
          closestNode = node;
          closestDistance = distance;
        }
      }
    }

    return closestNode;
  };

  return {
    cells,
    cellSize,
    getNodesInRadius,
    findNodeAtPoint,
    rebuild,
  };
}

/**
 * Viewport culling utility
 * Returns only nodes visible within the current viewport
 */
export function getVisibleNodes(
  nodes: NetworkNode[],
  viewport: { x: number; y: number; width: number; height: number },
  zoom: number,
  padding: number = 50
): NetworkNode[] {
  const invZoom = 1 / zoom;
  const viewMinX = (viewport.x - padding) * invZoom;
  const viewMaxX = (viewport.x + viewport.width + padding) * invZoom;
  const viewMinY = (viewport.y - padding) * invZoom;
  const viewMaxY = (viewport.y + viewport.height + padding) * invZoom;

  return nodes.filter(node => {
    if (node.x === undefined || node.y === undefined) return false;
    return node.x >= viewMinX && node.x <= viewMaxX &&
           node.y >= viewMinY && node.y <= viewMaxY;
  });
}

/**
 * Level of Detail (LOD) utility
 * Returns appropriate detail level based on zoom and node count
 */
export type LODLevel = 'full' | 'medium' | 'low' | 'minimal';

export function getLODLevel(nodeCount: number, zoom: number): LODLevel {
  const effectiveCount = nodeCount / zoom;

  if (effectiveCount < 100) return 'full';
  if (effectiveCount < 300) return 'medium';
  if (effectiveCount < 1000) return 'low';
  return 'minimal';
}

export function shouldRenderLabels(lod: LODLevel): boolean {
  return lod === 'full' || lod === 'medium';
}

export function shouldRenderGlow(lod: LODLevel): boolean {
  return lod === 'full';
}

export function shouldRenderArrows(lod: LODLevel): boolean {
  return lod !== 'minimal';
}

export function getNodeDetailLevel(lod: LODLevel): 'full' | 'simple' | 'dot' {
  switch (lod) {
    case 'full': return 'full';
    case 'medium': return 'full';
    case 'low': return 'simple';
    case 'minimal': return 'dot';
  }
}
