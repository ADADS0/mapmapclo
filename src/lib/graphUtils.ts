import type { NetworkNode, NetworkLink } from "@/types";

/**
 * Physics constants for Bubblemaps-like behavior
 *
 * CRITICAL: This system uses PURE LINK-BASED SPRING FORCES where:
 * 1. Dragged node moves 1:1 with cursor (absolutely locked to pointer)
 * 2. Links act as springs that ONLY pull directly connected nodes
 * 3. Forces cascade naturally through the network via spring connections
 * 4. Strong damping prevents oscillation and floating
 * 5. No node moves unless directly pulled by a stretched link
 */
export const PHYSICS_CONFIG = {
  linkStiffness: 0.18,
  damping: 0.88,
  maxVelocity: 40,
  velocityThreshold: 0.05,
  maxInfluenceDistance: 4,
  influencePerHop: 0.5,
  nodeMass: 1.0,
  restLengthFactor: 1.0,
  directConnectionBoost: 1.3,
};

/**
 * SOFT COLLISION CONFIG - Realistic near-contact bubble spacing
 *
 * This system ensures bubbles:
 * 1. Maintain a very small minimum gap (epsilon) based on their size
 * 2. Feel close and compact, almost touching, but never overlapping
 * 3. Use soft, elastic repulsion instead of hard collision
 * 4. Prevent jitter with damping and gradual force curves
 */
export const SOFT_COLLISION_CONFIG = {
  // Minimum gap between bubble edges (very small for near-contact feel)
  epsilonGap: 2,

  // Soft zone radius - area where gentle repulsion starts (percentage of epsilon)
  softZoneMultiplier: 3.0,

  // Force curve parameters
  baseRepulsionStrength: 0.15,     // Gentle base repulsion
  maxRepulsionStrength: 2.0,       // Maximum force when overlapping
  forceCurveExponent: 2.0,         // Quadratic force curve (smooth acceleration)

  // Damping to prevent oscillation
  collisionDamping: 0.92,

  // Velocity limits for collision resolution
  maxCollisionVelocity: 8,

  // Iterations for soft resolution
  softIterations: 25,
  finalSnapIterations: 5,

  // Overlap tolerance (bubbles closer than this trigger separation)
  overlapTolerance: 0.5,
};

/**
 * Node state for physics simulation
 */
export interface NodePhysicsState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  initialX: number;
  initialY: number;
  isAnchored: boolean;
  isFrozen: boolean;
  distance: number;
  influence: number;
  mass: number;
}

/**
 * Link state for physics simulation
 */
interface PhysicsLink {
  sourceId: string;
  targetId: string;
  restLength: number;
  strength: number;
}

/**
 * Build an adjacency list from nodes and links
 */
export function buildAdjacencyList(
  nodes: NetworkNode[],
  links: NetworkLink[]
): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();

  for (const node of nodes) {
    adjacencyList.set(node.id, new Set());
  }

  for (const link of links) {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;

    adjacencyList.get(sourceId)?.add(targetId);
    adjacencyList.get(targetId)?.add(sourceId);
  }

  return adjacencyList;
}

/**
 * Find all connected components (subgraphs) in the network
 */
export function findConnectedComponents(
  nodes: NetworkNode[],
  links: NetworkLink[]
): Map<string, number> {
  const componentMap = new Map<string, number>();
  const adjacencyList = buildAdjacencyList(nodes, links);

  let componentId = 0;
  const visited = new Set<string>();

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const queue = [node.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      componentMap.set(currentId, componentId);

      const neighbors = adjacencyList.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
    componentId++;
  }

  return componentMap;
}

/**
 * Get all nodes within maxDistance hops from the given node
 */
export function getSubgraphNodes(
  nodeId: string,
  nodes: NetworkNode[],
  links: NetworkLink[],
  maxDistance: number = PHYSICS_CONFIG.maxInfluenceDistance
): Set<string> {
  const subgraphNodes = new Set<string>();
  const adjacencyList = buildAdjacencyList(nodes, links);

  const queue: { id: string; distance: number }[] = [{ id: nodeId, distance: 0 }];

  while (queue.length > 0) {
    const { id: currentId, distance } = queue.shift()!;
    if (subgraphNodes.has(currentId)) continue;
    if (distance > maxDistance) continue;

    subgraphNodes.add(currentId);

    const neighbors = adjacencyList.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (!subgraphNodes.has(neighborId) && distance + 1 <= maxDistance) {
        queue.push({ id: neighborId, distance: distance + 1 });
      }
    }
  }

  return subgraphNodes;
}

/**
 * Calculate the shortest path distance from a node to all other nodes within maxDistance
 */
export function calculateDistances(
  startNodeId: string,
  nodes: NetworkNode[],
  links: NetworkLink[],
  maxDistance: number = PHYSICS_CONFIG.maxInfluenceDistance
): Map<string, number> {
  const distances = new Map<string, number>();
  const adjacencyList = buildAdjacencyList(nodes, links);

  const queue: { id: string; distance: number }[] = [{ id: startNodeId, distance: 0 }];

  while (queue.length > 0) {
    const { id: currentId, distance } = queue.shift()!;
    if (distances.has(currentId)) continue;
    if (distance > maxDistance) continue;

    distances.set(currentId, distance);

    const neighbors = adjacencyList.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (!distances.has(neighborId) && distance + 1 <= maxDistance) {
        queue.push({ id: neighborId, distance: distance + 1 });
      }
    }
  }

  return distances;
}

/**
 * Calculate influence factor based on distance from dragged node
 * Uses exponential decay with boost for direct connections
 */
export function calculateInfluenceFactor(
  distance: number,
  config = PHYSICS_CONFIG
): number {
  if (distance === 0) return 1;
  if (distance > config.maxInfluenceDistance) return 0;

  let influence = Math.pow(config.influencePerHop, distance);

  if (distance === 1 && config.directConnectionBoost) {
    influence = Math.min(0.75, influence * config.directConnectionBoost);
  }

  return influence;
}

/**
 * Easing functions
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  const s = p / 4;
  const amplitude = 0.5;
  return amplitude * Math.pow(2, -12 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
}

/**
 * Initialize physics state for all nodes in a subgraph
 */
export function initializePhysicsState(
  nodes: NetworkNode[],
  draggedNodeId: string,
  subgraphNodes: Set<string>,
  distances: Map<string, number>
): Map<string, NodePhysicsState> {
  const physicsState = new Map<string, NodePhysicsState>();

  for (const node of nodes) {
    if (!subgraphNodes.has(node.id)) continue;
    if (node.x === undefined || node.y === undefined) continue;

    const distance = distances.get(node.id) ?? Infinity;
    const influence = calculateInfluenceFactor(distance);

    physicsState.set(node.id, {
      id: node.id,
      x: node.x,
      y: node.y,
      vx: 0,
      vy: 0,
      initialX: node.x,
      initialY: node.y,
      isAnchored: node.id === draggedNodeId,
      isFrozen: false,
      distance,
      influence,
      mass: PHYSICS_CONFIG.nodeMass,
    });
  }

  return physicsState;
}

/**
 * Build physics links from network links
 * Only includes links where BOTH nodes are in the physics state
 */
export function buildPhysicsLinks(
  links: NetworkLink[],
  physicsState: Map<string, NodePhysicsState>
): PhysicsLink[] {
  const physicsLinks: PhysicsLink[] = [];

  for (const link of links) {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;

    const sourceState = physicsState.get(sourceId);
    const targetState = physicsState.get(targetId);

    if (!sourceState || !targetState) continue;

    const dx = targetState.initialX - sourceState.initialX;
    const dy = targetState.initialY - sourceState.initialY;
    const restLength = Math.sqrt(dx * dx + dy * dy) * PHYSICS_CONFIG.restLengthFactor;

    const strength = Math.min(sourceState.influence, targetState.influence);

    if (strength > 0) {
      physicsLinks.push({
        sourceId,
        targetId,
        restLength: Math.max(restLength, 20),
        strength,
      });
    }
  }

  return physicsLinks;
}

/**
 * Calculate spring displacement for legacy compatibility
 */
export function calculateSpringDisplacement(
  dragDelta: { x: number; y: number },
  distance: number,
  time: number = 1,
  config = PHYSICS_CONFIG
): { x: number; y: number } {
  const influence = calculateInfluenceFactor(distance, config);
  const easedInfluence = easeOutExpo(time) * influence;

  return {
    x: dragDelta.x * easedInfluence,
    y: dragDelta.y * easedInfluence,
  };
}

/**
 * Calculate spring velocity for legacy compatibility
 */
export function calculateSpringVelocity(
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  currentVelocity: { x: number; y: number },
  config = PHYSICS_CONFIG
): { x: number; y: number } {
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;

  const ax = dx * config.linkStiffness;
  const ay = dy * config.linkStiffness;

  let vx = (currentVelocity.x + ax) * config.damping;
  let vy = (currentVelocity.y + ay) * config.damping;

  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > config.maxVelocity) {
    const scale = config.maxVelocity / speed;
    vx *= scale;
    vy *= scale;
  }

  if (Math.abs(vx) < config.velocityThreshold) vx = 0;
  if (Math.abs(vy) < config.velocityThreshold) vy = 0;

  return { x: vx, y: vy };
}

/**
 * Update physics simulation using PURE LINK-BASED SPRING FORCES
 *
 * CRITICAL: This is the Bubblemaps-like behavior:
 * 1. Dragged node moves 1:1 with cursor - ABSOLUTELY LOCKED
 * 2. Each link acts as a spring with a rest length
 * 3. Connected nodes are PULLED by stretched links ONLY
 * 4. Forces cascade naturally through the network
 * 5. NO center pull, NO influence-based simultaneous movement
 */
export function updatePhysicsSimulation(
  physicsState: Map<string, NodePhysicsState>,
  dragDelta: { x: number; y: number },
  draggedNodeId: string,
  initialPositions: Map<string, { x: number; y: number }>,
  config = PHYSICS_CONFIG,
  links?: NetworkLink[]
): boolean {
  let isActive = false;

  const draggedState = physicsState.get(draggedNodeId);
  const draggedInitial = initialPositions.get(draggedNodeId);

  if (draggedState && draggedInitial) {
    draggedState.x = draggedInitial.x + dragDelta.x;
    draggedState.y = draggedInitial.y + dragDelta.y;
    draggedState.vx = 0;
    draggedState.vy = 0;
  }

  const forces = new Map<string, { fx: number; fy: number }>();
  for (const [nodeId] of physicsState) {
    forces.set(nodeId, { fx: 0, fy: 0 });
  }

  if (links) {
    const physicsLinks = buildPhysicsLinks(links, physicsState);

    for (const link of physicsLinks) {
      const sourceState = physicsState.get(link.sourceId);
      const targetState = physicsState.get(link.targetId);

      if (!sourceState || !targetState) continue;

      if ((sourceState.isAnchored || sourceState.isFrozen) &&
          (targetState.isAnchored || targetState.isFrozen)) {
        continue;
      }

      const dx = targetState.x - sourceState.x;
      const dy = targetState.y - sourceState.y;
      const currentLength = Math.sqrt(dx * dx + dy * dy);

      if (currentLength < 0.001) continue;

      const displacement = currentLength - link.restLength;

      const forceMagnitude = displacement * config.linkStiffness * link.strength;

      const dirX = dx / currentLength;
      const dirY = dy / currentLength;

      const sourceForce = forces.get(link.sourceId)!;
      const targetForce = forces.get(link.targetId)!;

      if (!sourceState.isAnchored && !sourceState.isFrozen) {
        sourceForce.fx += dirX * forceMagnitude;
        sourceForce.fy += dirY * forceMagnitude;
      }

      if (!targetState.isAnchored && !targetState.isFrozen) {
        targetForce.fx -= dirX * forceMagnitude;
        targetForce.fy -= dirY * forceMagnitude;
      }
    }
  }

  let frozenCount = 0;

  for (const [nodeId, state] of physicsState) {
    if (state.isAnchored) continue;

    if (state.isFrozen) {
      frozenCount++;
      continue;
    }

    const force = forces.get(nodeId)!;

    const ax = force.fx / state.mass;
    const ay = force.fy / state.mass;

    state.vx = (state.vx + ax) * config.damping;
    state.vy = (state.vy + ay) * config.damping;

    const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (speed > config.maxVelocity) {
      const scale = config.maxVelocity / speed;
      state.vx *= scale;
      state.vy *= scale;
    }

    if (Math.abs(state.vx) < config.velocityThreshold &&
        Math.abs(state.vy) < config.velocityThreshold) {
      state.vx = 0;
      state.vy = 0;
    } else {
      isActive = true;
    }

    state.x += state.vx;
    state.y += state.vy;
  }

  return isActive;
}

/**
 * Apply physics state to nodes array
 * Also sets fx/fy to lock nodes in place
 */
export function applyPhysicsStateToNodes(
  nodes: NetworkNode[],
  physicsState: Map<string, NodePhysicsState>,
  lockNodes: boolean = false
): NetworkNode[] {
  return nodes.map(node => {
    const state = physicsState.get(node.id);
    if (!state) return node;

    return {
      ...node,
      x: state.x,
      y: state.y,
      fx: lockNodes ? state.x : node.fx,
      fy: lockNodes ? state.y : node.fy,
    };
  });
}

/**
 * Lock all nodes at their current positions using fx/fy
 */
export function lockAllNodes(nodes: NetworkNode[]): NetworkNode[] {
  return nodes.map(node => ({
    ...node,
    fx: node.x,
    fy: node.y,
  }));
}

/**
 * SOFT COLLISION RESOLVER - Near-contact spacing with gentle repulsion
 *
 * Creates a compact, physically realistic layout where bubbles:
 * - Maintain a very small gap (epsilon) proportional to their size
 * - Feel close and compact, almost touching, but never overlapping
 * - Use soft, gradual repulsion forces (not hard binary collision)
 * - Remain stable without jitter or oscillation
 */
export function resolveOverlaps(
  nodes: NetworkNode[],
  getRadius: (node: NetworkNode) => number,
  minPadding: number = SOFT_COLLISION_CONFIG.epsilonGap,
  maxIterations: number = 300
): NetworkNode[] {
  const config = SOFT_COLLISION_CONFIG;
  const positions = new Map<string, { x: number; y: number }>();
  const velocities = new Map<string, { vx: number; vy: number }>();
  const radii = new Map<string, number>();

  for (const node of nodes) {
    if (node.x !== undefined && node.y !== undefined) {
      positions.set(node.id, { x: node.x, y: node.y });
      velocities.set(node.id, { vx: 0, vy: 0 });
      radii.set(node.id, getRadius(node));
    }
  }

  const nodeList = nodes.filter(n => positions.has(n.id));
  let iteration = 0;
  let maxOverlap = Infinity;

  // Phase 1: Soft physics-based resolution
  while (iteration < maxIterations && maxOverlap > config.overlapTolerance) {
    maxOverlap = 0;
    iteration++;

    // Accumulate forces for all nodes
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const node of nodeList) {
      forces.set(node.id, { fx: 0, fy: 0 });
    }

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radiusA = radii.get(nodeA.id)!;
        const radiusB = radii.get(nodeB.id)!;

        // Minimum distance = sum of radii + epsilon gap
        const epsilon = minPadding;
        const minDistance = radiusA + radiusB + epsilon;

        // Soft zone extends beyond minimum distance for gentle pre-emptive repulsion
        const softZone = epsilon * config.softZoneMultiplier;
        const softDistance = minDistance + softZone;

        if (distance < softDistance) {
          // Calculate how deep we are into the collision zone
          // 0 = at soft zone edge, 1 = at minimum distance, >1 = overlapping
          const penetrationDepth = (softDistance - distance) / (softDistance - minDistance + 0.001);

          // Soft repulsion force curve - quadratic for smooth acceleration
          // Force is gentle at soft zone edge, strong when overlapping
          const normalizedForce = Math.min(penetrationDepth, 3);
          const forceMagnitude = config.baseRepulsionStrength *
            Math.pow(normalizedForce, config.forceCurveExponent) *
            (1 + Math.min(iteration / 100, 1.5));

          // Cap the force to prevent explosive behavior
          const cappedForce = Math.min(forceMagnitude, config.maxRepulsionStrength);

          let dirX = 0, dirY = 0;
          if (distance > 0.001) {
            dirX = dx / distance;
            dirY = dy / distance;
          } else {
            // Same position - use golden angle for deterministic spread
            const angle = (i + j * 0.618033988749895) * Math.PI * 2;
            dirX = Math.cos(angle);
            dirY = Math.sin(angle);
          }

          // Apply asymmetric push - smaller bubbles move more
          const totalRadius = radiusA + radiusB;
          const pushRatioA = radiusB / totalRadius;
          const pushRatioB = radiusA / totalRadius;

          const forceA = forces.get(nodeA.id)!;
          const forceB = forces.get(nodeB.id)!;
          forceA.fx -= dirX * cappedForce * pushRatioA;
          forceA.fy -= dirY * cappedForce * pushRatioA;
          forceB.fx += dirX * cappedForce * pushRatioB;
          forceB.fy += dirY * cappedForce * pushRatioB;

          // Track maximum overlap
          if (distance < minDistance) {
            maxOverlap = Math.max(maxOverlap, minDistance - distance);
          }
        }
      }
    }

    // Apply forces with damping
    for (const node of nodeList) {
      const pos = positions.get(node.id)!;
      const vel = velocities.get(node.id)!;
      const force = forces.get(node.id)!;

      // Apply force to velocity with damping
      vel.vx = (vel.vx + force.fx) * config.collisionDamping;
      vel.vy = (vel.vy + force.fy) * config.collisionDamping;

      // Clamp velocity
      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
      if (speed > config.maxCollisionVelocity) {
        const scale = config.maxCollisionVelocity / speed;
        vel.vx *= scale;
        vel.vy *= scale;
      }

      // Very low velocities snap to zero
      if (Math.abs(vel.vx) < 0.01) vel.vx = 0;
      if (Math.abs(vel.vy) < 0.01) vel.vy = 0;

      // Update position
      pos.x += vel.vx;
      pos.y += vel.vy;
    }
  }

  // Phase 2: Final snap pass - ensure zero actual overlaps
  for (let pass = 0; pass < config.finalSnapIterations; pass++) {
    let hasOverlap = false;
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radiusA = radii.get(nodeA.id)!;
        const radiusB = radii.get(nodeB.id)!;
        const minDistance = radiusA + radiusB + minPadding;

        if (distance < minDistance) {
          hasOverlap = true;
          // Gentle final push - just enough to separate
          const overlap = minDistance - distance + 0.5;
          const dirX = distance > 0.001 ? dx / distance : 1;
          const dirY = distance > 0.001 ? dy / distance : 0;

          const totalRadius = radiusA + radiusB;
          const pushRatioA = radiusB / totalRadius;
          const pushRatioB = radiusA / totalRadius;

          posA.x -= dirX * overlap * pushRatioA;
          posA.y -= dirY * overlap * pushRatioA;
          posB.x += dirX * overlap * pushRatioB;
          posB.y += dirY * overlap * pushRatioB;
        }
      }
    }
    if (!hasOverlap) break;
  }

  return nodes.map(node => {
    const pos = positions.get(node.id);
    if (pos) {
      return { ...node, x: pos.x, y: pos.y };
    }
    return node;
  });
}

/**
 * SOFT PHYSICS-BASED FORCE OVERLAP RESOLVER
 *
 * Enhanced version with smooth force curves for near-contact spacing.
 * Bubbles settle into compact positions with minimal gaps.
 */
export function forceResolveOverlaps(
  nodes: NetworkNode[],
  getRadius: (node: NetworkNode) => number,
  minPadding: number = SOFT_COLLISION_CONFIG.epsilonGap,
  maxIterations: number = 400
): NetworkNode[] {
  const config = SOFT_COLLISION_CONFIG;
  const positions = new Map<string, { x: number; y: number }>();
  const radii = new Map<string, number>();

  for (const node of nodes) {
    if (node.x !== undefined && node.y !== undefined) {
      positions.set(node.id, { x: node.x, y: node.y });
      radii.set(node.id, getRadius(node));
    }
  }

  const nodeList = nodes.filter(n => positions.has(n.id));
  let iteration = 0;
  let maxOverlap = Infinity;

  const velocities = new Map<string, { vx: number; vy: number }>();
  for (const node of nodeList) {
    velocities.set(node.id, { vx: 0, vy: 0 });
  }

  while (iteration < maxIterations && maxOverlap > config.overlapTolerance) {
    maxOverlap = 0;
    iteration++;

    const forces = new Map<string, { fx: number; fy: number }>();
    for (const node of nodeList) {
      forces.set(node.id, { fx: 0, fy: 0 });
    }

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radiusA = radii.get(nodeA.id)!;
        const radiusB = radii.get(nodeB.id)!;
        const epsilon = minPadding;
        const minDistance = radiusA + radiusB + epsilon;

        // Soft zone for gradual repulsion
        const softZone = epsilon * config.softZoneMultiplier;
        const softDistance = minDistance + softZone;

        if (distance < softDistance) {
          // Calculate penetration depth (0 at soft edge, 1 at min, >1 when overlapping)
          const penetrationDepth = (softDistance - distance) / (softDistance - minDistance + 0.001);

          // Smooth quadratic force curve
          const normalizedForce = Math.min(penetrationDepth, 3);
          const forceMagnitude = config.baseRepulsionStrength *
            Math.pow(normalizedForce, config.forceCurveExponent) *
            (1 + Math.min(iteration / 150, 1.2));

          const cappedForce = Math.min(forceMagnitude, config.maxRepulsionStrength);

          let dirX = 0, dirY = 0;
          if (distance > 0.001) {
            dirX = dx / distance;
            dirY = dy / distance;
          } else {
            const angle = (i + j * 0.618033988749895) * Math.PI * 2;
            dirX = Math.cos(angle);
            dirY = Math.sin(angle);
          }

          const totalRadius = radiusA + radiusB;
          const pushRatioA = radiusB / totalRadius;
          const pushRatioB = radiusA / totalRadius;

          const forceA = forces.get(nodeA.id)!;
          const forceB = forces.get(nodeB.id)!;
          forceA.fx -= dirX * cappedForce * pushRatioA;
          forceA.fy -= dirY * cappedForce * pushRatioA;
          forceB.fx += dirX * cappedForce * pushRatioB;
          forceB.fy += dirY * cappedForce * pushRatioB;

          if (distance < minDistance) {
            maxOverlap = Math.max(maxOverlap, minDistance - distance);
          }
        }
      }
    }

    for (const node of nodeList) {
      const pos = positions.get(node.id)!;
      const vel = velocities.get(node.id)!;
      const force = forces.get(node.id)!;

      const mass = radii.get(node.id)! * 0.3 + 1;

      vel.vx = (vel.vx + force.fx / mass) * config.collisionDamping;
      vel.vy = (vel.vy + force.fy / mass) * config.collisionDamping;

      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
      if (speed > config.maxCollisionVelocity) {
        const scale = config.maxCollisionVelocity / speed;
        vel.vx *= scale;
        vel.vy *= scale;
      }

      if (Math.abs(vel.vx) < 0.01) vel.vx = 0;
      if (Math.abs(vel.vy) < 0.01) vel.vy = 0;

      pos.x += vel.vx;
      pos.y += vel.vy;
    }
  }

  // Final snap pass for guaranteed zero overlap
  for (let pass = 0; pass < config.finalSnapIterations; pass++) {
    let hasOverlap = false;
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radiusA = radii.get(nodeA.id)!;
        const radiusB = radii.get(nodeB.id)!;
        const minDistance = radiusA + radiusB + minPadding;

        if (distance < minDistance) {
          hasOverlap = true;
          const overlap = minDistance - distance + 0.5;
          const dirX = distance > 0.001 ? dx / distance : 1;
          const dirY = distance > 0.001 ? dy / distance : 0;

          const totalRadius = radiusA + radiusB;
          const pushRatioA = radiusB / totalRadius;
          const pushRatioB = radiusA / totalRadius;

          posA.x -= dirX * overlap * pushRatioA;
          posA.y -= dirY * overlap * pushRatioA;
          posB.x += dirX * overlap * pushRatioB;
          posB.y += dirY * overlap * pushRatioB;
        }
      }
    }
    if (!hasOverlap) break;
  }

  return nodes.map(node => {
    const pos = positions.get(node.id);
    if (pos) {
      return { ...node, x: pos.x, y: pos.y };
    }
    return node;
  });
}

/**
 * Check if any bubbles are overlapping
 * Uses the soft collision epsilon gap for consistent checking
 */
export function hasAnyOverlap(
  nodes: NetworkNode[],
  getRadius: (node: NetworkNode) => number,
  minPadding: number = SOFT_COLLISION_CONFIG.epsilonGap
): { hasOverlap: boolean; overlapCount: number; worstOverlap: number } {
  const nodesWithPos = nodes.filter(n => n.x !== undefined && n.y !== undefined);
  let overlapCount = 0;
  let worstOverlap = 0;

  for (let i = 0; i < nodesWithPos.length; i++) {
    for (let j = i + 1; j < nodesWithPos.length; j++) {
      const nodeA = nodesWithPos[i];
      const nodeB = nodesWithPos[j];

      const dx = (nodeB.x ?? 0) - (nodeA.x ?? 0);
      const dy = (nodeB.y ?? 0) - (nodeA.y ?? 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const radiusA = getRadius(nodeA);
      const radiusB = getRadius(nodeB);
      const minDistance = radiusA + radiusB + minPadding;

      if (distance < minDistance) {
        overlapCount++;
        worstOverlap = Math.max(worstOverlap, minDistance - distance);
      }
    }
  }

  return {
    hasOverlap: overlapCount > 0,
    overlapCount,
    worstOverlap,
  };
}

/**
 * Unlock all nodes (clear fx/fy)
 */
export function unlockAllNodes(nodes: NetworkNode[]): NetworkNode[] {
  return nodes.map(node => ({
    ...node,
    fx: null,
    fy: null,
  }));
}

/**
 * Arrow style type for different arrowhead designs
 */
export type ArrowStyleType = 'triangle' | 'chevron' | 'line' | 'dot' | 'none';

/**
 * Draw an arrowhead at the end of a line
 * Supports multiple styles: triangle (filled), chevron (open), line, dot, or none
 * @param angleDivisor - The divisor for PI to calculate arrow angle (e.g., 7 = PI/7 ≈ 25.7°)
 * @param style - Arrow style: 'triangle', 'chevron', 'line', 'dot', 'none'
 */
export function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  targetRadius: number,
  arrowSize: number = 5,
  color: string = "#ffffff",
  angleDivisor: number = 7,
  style: ArrowStyleType = 'triangle'
): void {
  if (style === 'none') return;

  const angle = Math.atan2(toY - fromY, toX - fromX);

  // Position arrow tip exactly at the bubble edge
  const arrowX = toX - Math.cos(angle) * targetRadius;
  const arrowY = toY - Math.sin(angle) * targetRadius;

  // Configurable arrow angle (lower divisor = wider arrow, higher = narrower)
  const arrowAngle = Math.PI / angleDivisor;

  ctx.save();

  if (style === 'triangle') {
    // Classic filled triangle
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle - arrowAngle),
      arrowY - arrowSize * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle + arrowAngle),
      arrowY - arrowSize * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else if (style === 'chevron') {
    // Open chevron (V shape)
    ctx.beginPath();
    ctx.moveTo(
      arrowX - arrowSize * Math.cos(angle - arrowAngle),
      arrowY - arrowSize * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle + arrowAngle),
      arrowY - arrowSize * Math.sin(angle + arrowAngle)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, arrowSize / 4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else if (style === 'line') {
    // Simple line extending into the node
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * 1.5 * Math.cos(angle),
      arrowY - arrowSize * 1.5 * Math.sin(angle)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, arrowSize / 3);
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (style === 'dot') {
    // Small dot at the end
    ctx.beginPath();
    ctx.arc(arrowX, arrowY, arrowSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw a curved arrow line (bezier curve) between two points
 */
export function drawCurvedArrowLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  sourceRadius: number,
  targetRadius: number,
  curveIntensity: number = 0.2,
  lineWidth: number = 1,
  color: string = "#ffffff",
  tapered: boolean = false
): { controlX: number; controlY: number; endX: number; endY: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Calculate edge points
  const startX = fromX + Math.cos(angle) * (sourceRadius + 2);
  const startY = fromY + Math.sin(angle) * (sourceRadius + 2);
  const endX = toX - Math.cos(angle) * (targetRadius + 4);
  const endY = toY - Math.sin(angle) * (targetRadius + 4);

  // Calculate control point for bezier curve (perpendicular offset)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const perpAngle = angle + Math.PI / 2;
  const curveOffset = distance * curveIntensity;
  const controlX = midX + Math.cos(perpAngle) * curveOffset;
  const controlY = midY + Math.sin(perpAngle) * curveOffset;

  ctx.save();

  if (tapered) {
    // Draw tapered line using multiple segments
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      // Quadratic bezier formula
      const x1 = (1 - t1) * (1 - t1) * startX + 2 * (1 - t1) * t1 * controlX + t1 * t1 * endX;
      const y1 = (1 - t1) * (1 - t1) * startY + 2 * (1 - t1) * t1 * controlY + t1 * t1 * endY;
      const x2 = (1 - t2) * (1 - t2) * startX + 2 * (1 - t2) * t2 * controlX + t2 * t2 * endX;
      const y2 = (1 - t2) * (1 - t2) * startY + 2 * (1 - t2) * t2 * controlY + t2 * t2 * endY;

      // Taper: thick at start, thin at end
      const width = lineWidth * (1 - t1 * 0.6);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  } else {
    // Standard bezier curve
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();

  return { controlX, controlY, endX, endY };
}

/**
 * Draw an arc-style arrow (curved like a bow)
 */
export function drawArcArrowLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  sourceRadius: number,
  targetRadius: number,
  lineWidth: number = 1,
  color: string = "#ffffff"
): { endAngle: number; endX: number; endY: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Calculate arc center (offset from midpoint)
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const arcRadius = distance * 0.8;
  const perpAngle = angle + Math.PI / 2;
  const centerX = midX + Math.cos(perpAngle) * (arcRadius - distance / 2);
  const centerY = midY + Math.sin(perpAngle) * (arcRadius - distance / 2);

  // Calculate start and end angles
  const startAngle = Math.atan2(fromY - centerY, fromX - centerX);
  const endAngle = Math.atan2(toY - centerY, toX - centerX);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  const endX = toX - Math.cos(angle) * targetRadius;
  const endY = toY - Math.sin(angle) * targetRadius;

  return { endAngle: angle, endX, endY };
}

/**
 * Add glow effect to an arrow
 */
export function drawArrowGlow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  intensity: number = 0.5,
  lineWidth: number = 1
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * intensity;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth + 2;
  ctx.globalAlpha = intensity * 0.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw an arrowhead for a bezier curve
 */
export function drawBezierArrowhead(
  ctx: CanvasRenderingContext2D,
  controlX: number,
  controlY: number,
  toX: number,
  toY: number,
  targetRadius: number,
  arrowSize: number = 8,
  color: string = "#ffffff"
): void {
  const angle = Math.atan2(toY - controlY, toX - controlX);

  const arrowX = toX - Math.cos(angle) * targetRadius;
  const arrowY = toY - Math.sin(angle) * targetRadius;

  const arrowAngle = Math.PI / 6;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(
    arrowX - arrowSize * Math.cos(angle - arrowAngle),
    arrowY - arrowSize * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    arrowX - arrowSize * Math.cos(angle + arrowAngle),
    arrowY - arrowSize * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Get link weight between two nodes
 */
export function getLinkWeight(
  sourceId: string,
  targetId: string,
  links: NetworkLink[]
): number {
  for (const link of links) {
    const linkSourceId = typeof link.source === "string" ? link.source : link.source.id;
    const linkTargetId = typeof link.target === "string" ? link.target : link.target.id;

    if ((linkSourceId === sourceId && linkTargetId === targetId) ||
        (linkSourceId === targetId && linkTargetId === sourceId)) {
      return Math.min(link.value / 100, 1);
    }
  }
  return 0.5;
}

// ============================================================================
// FLOWER-LIKE ANIMATION UTILITIES
// ============================================================================

/**
 * Golden angle in radians - used for Vogel spiral (sunflower pattern)
 * This produces the most efficient packing arrangement
 */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

/**
 * Smooth easing functions for animation
 */
export const animationEasing = {
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.4;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  springDamped: (t: number, stiffness: number = 0.8): number => {
    if (t === 0) return 0;
    if (t >= 1) return 1;
    const decay = Math.exp(-5 * t * (1 - stiffness));
    const oscillation = Math.cos(t * Math.PI * 2 * (1 + stiffness));
    return 1 - decay * oscillation * (1 - t);
  },
};

/**
 * Generate flower-like target positions using Vogel's model (sunflower spiral)
 * This creates the most visually pleasing radial arrangement
 *
 * @param nodes - Array of nodes to position
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions
 */
export function generateFlowerPositions(
  nodes: NetworkNode[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Sort nodes by size (largest first) for better visual hierarchy
  const sortedNodes = [...nodes].map((node, originalIndex) => ({
    node,
    originalIndex,
    radius: getRadius(node),
  })).sort((a, b) => b.radius - a.radius);

  // Calculate average radius for consistent spacing
  const avgRadius = sortedNodes.reduce((sum, n) => sum + n.radius, 0) / sortedNodes.length;
  const baseSpacing = (avgRadius * 2 + padding) * 1.1;

  // Place nodes using Vogel's model (Fibonacci spiral)
  for (let i = 0; i < sortedNodes.length; i++) {
    const { node, originalIndex, radius } = sortedNodes[i];

    // First node (largest) goes at center
    if (i === 0) {
      positions.set(node.id, {
        x: centerX,
        y: centerY,
        delay: 0, // First node appears immediately
      });
      continue;
    }

    // Vogel's model: r = c * sqrt(n), θ = n * golden_angle
    // c is chosen to achieve desired spacing
    const angle = i * GOLDEN_ANGLE;
    const spiralRadius = baseSpacing * Math.sqrt(i);

    // Calculate position
    let x = centerX + Math.cos(angle) * spiralRadius;
    let y = centerY + Math.sin(angle) * spiralRadius;

    // Verify non-overlap with already placed nodes and adjust if needed
    let attempts = 0;
    const maxAttempts = 30;
    let currentSpiralRadius = spiralRadius;
    let currentAngle = angle;

    while (attempts < maxAttempts) {
      let hasOverlap = false;

      for (const [placedId, placedPos] of positions) {
        const placedNode = nodes.find(n => n.id === placedId);
        if (!placedNode) continue;

        const placedRadius = getRadius(placedNode);
        const dx = x - placedPos.x;
        const dy = y - placedPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radius + placedRadius + padding;

        if (distance < minDistance) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) break;

      // Expand outward in spiral
      attempts++;
      currentSpiralRadius += baseSpacing * 0.3;
      currentAngle += GOLDEN_ANGLE * 0.1;
      x = centerX + Math.cos(currentAngle) * currentSpiralRadius;
      y = centerY + Math.sin(currentAngle) * currentSpiralRadius;
    }

    // Calculate animation delay based on distance from center
    // Stagger effect: nodes further from center appear later
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = baseSpacing * Math.sqrt(sortedNodes.length);
    const normalizedDistance = distanceFromCenter / maxDistance;

    // Delay ranges from 0 to ~800ms based on distance
    const delay = normalizedDistance * 800;

    positions.set(node.id, { x, y, delay });
  }

  return positions;
}

// ============================================================================
// LAYOUT ALGORITHMS
// ============================================================================

/**
 * Generate circular layout - nodes arranged in concentric circles
 * Nodes are organized by type, with each type forming a ring
 *
 * @param nodes - Array of nodes to position
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateCircularPositions(
  nodes: NetworkNode[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Sort nodes by balance (largest first) for better visual hierarchy
  const sortedNodes = [...nodes].sort((a, b) => b.balance - a.balance);

  // Calculate average radius for spacing
  const avgRadius = sortedNodes.reduce((sum, n) => sum + getRadius(n), 0) / sortedNodes.length;
  const nodeSpacing = avgRadius * 2 + padding;

  // Place first (largest) node at center
  if (sortedNodes.length > 0) {
    positions.set(sortedNodes[0].id, { x: centerX, y: centerY, delay: 0 });
  }

  // Distribute remaining nodes in concentric circles
  let ringIndex = 1;
  let nodesPlaced = 1;

  while (nodesPlaced < sortedNodes.length) {
    // Calculate ring radius based on ring index
    const ringRadius = ringIndex * nodeSpacing * 1.5;

    // Calculate how many nodes can fit in this ring
    const circumference = 2 * Math.PI * ringRadius;
    const maxNodesInRing = Math.max(1, Math.floor(circumference / nodeSpacing));
    const nodesInThisRing = Math.min(maxNodesInRing, sortedNodes.length - nodesPlaced);

    // Place nodes evenly around the ring
    for (let i = 0; i < nodesInThisRing; i++) {
      const node = sortedNodes[nodesPlaced];
      // Start from top (- Math.PI/2) and go clockwise
      const angle = (i / nodesInThisRing) * 2 * Math.PI - Math.PI / 2;

      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;

      // Delay based on ring and position within ring
      const delay = ringIndex * 100 + (i / nodesInThisRing) * 200;

      positions.set(node.id, { x, y, delay });
      nodesPlaced++;
    }

    ringIndex++;
  }

  return positions;
}

/**
 * Generate radial tree layout - hierarchical arrangement radiating from center
 * Uses BFS to determine hierarchy based on connections
 *
 * @param nodes - Array of nodes to position
 * @param links - Array of links between nodes
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateRadialPositions(
  nodes: NetworkNode[],
  links: NetworkLink[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Build adjacency list
  const adjacencyList = buildAdjacencyList(nodes, links);

  // Find the node with most connections to use as root
  let rootNode = nodes[0];
  let maxConnections = 0;
  for (const node of nodes) {
    const connections = adjacencyList.get(node.id)?.size || 0;
    if (connections > maxConnections) {
      maxConnections = connections;
      rootNode = node;
    }
  }

  // BFS to determine levels
  const levels = new Map<string, number>();
  const queue: { id: string; level: number }[] = [{ id: rootNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;

    visited.add(id);
    levels.set(id, level);

    const neighbors = adjacencyList.get(id) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, level: level + 1 });
      }
    }
  }

  // Handle disconnected nodes
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, Math.max(...Array.from(levels.values())) + 1);
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, NetworkNode[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  }

  // Calculate average radius for spacing
  const avgRadius = nodes.reduce((sum, n) => sum + getRadius(n), 0) / nodes.length;
  const levelSpacing = (avgRadius * 2 + padding) * 2.5;

  // Position nodes by level
  for (const [level, levelNodes] of nodesByLevel) {
    if (level === 0) {
      // Root at center
      positions.set(levelNodes[0].id, { x: centerX, y: centerY, delay: 0 });
      continue;
    }

    const radius = level * levelSpacing;
    const angleStep = (2 * Math.PI) / levelNodes.length;
    const angleOffset = (level % 2) * (angleStep / 2); // Stagger alternate levels

    for (let i = 0; i < levelNodes.length; i++) {
      const angle = angleOffset + i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const delay = level * 150 + (i / levelNodes.length) * 100;

      positions.set(levelNodes[i].id, { x, y, delay });
    }
  }

  return positions;
}

/**
 * Generate hierarchical layout - top-to-bottom tree structure
 * Uses BFS to determine hierarchy, then arranges nodes in layers
 *
 * @param nodes - Array of nodes to position
 * @param links - Array of links between nodes
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateHierarchicalPositions(
  nodes: NetworkNode[],
  links: NetworkLink[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Build adjacency list
  const adjacencyList = buildAdjacencyList(nodes, links);

  // Find the node with most connections to use as root
  let rootNode = nodes[0];
  let maxConnections = 0;
  for (const node of nodes) {
    const connections = adjacencyList.get(node.id)?.size || 0;
    if (connections > maxConnections) {
      maxConnections = connections;
      rootNode = node;
    }
  }

  // BFS to determine levels
  const levels = new Map<string, number>();
  const queue: { id: string; level: number }[] = [{ id: rootNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;

    visited.add(id);
    levels.set(id, level);

    const neighbors = adjacencyList.get(id) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, level: level + 1 });
      }
    }
  }

  // Handle disconnected nodes
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, Math.max(...Array.from(levels.values())) + 1);
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, NetworkNode[]>();
  let maxLevel = 0;
  for (const node of nodes) {
    const level = levels.get(node.id) || 0;
    maxLevel = Math.max(maxLevel, level);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  }

  // Calculate layout dimensions
  const avgRadius = nodes.reduce((sum, n) => sum + getRadius(n), 0) / nodes.length;
  const horizontalSpacing = avgRadius * 2 + padding * 1.5;
  const verticalSpacing = (avgRadius * 2 + padding) * 2;

  // Calculate total height and width
  const totalHeight = maxLevel * verticalSpacing;
  const startY = centerY - totalHeight / 2;

  // Position nodes by level (top to bottom)
  for (const [level, levelNodes] of nodesByLevel) {
    const levelWidth = (levelNodes.length - 1) * horizontalSpacing;
    const startX = centerX - levelWidth / 2;
    const y = startY + level * verticalSpacing;

    for (let i = 0; i < levelNodes.length; i++) {
      const x = startX + i * horizontalSpacing;
      const delay = level * 150 + (i / Math.max(levelNodes.length, 1)) * 100;

      positions.set(levelNodes[i].id, { x, y, delay });
    }
  }

  return positions;
}

/**
 * Generate force-directed layout using D3-style force simulation
 * Simulates physical forces to arrange nodes
 *
 * @param nodes - Array of nodes to position
 * @param links - Array of links between nodes
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateForcePositions(
  nodes: NetworkNode[],
  links: NetworkLink[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Initialize positions randomly in a circle
  const initRadius = Math.sqrt(nodes.length) * 50;
  const nodePositions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

  for (let i = 0; i < nodes.length; i++) {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const r = initRadius * (0.5 + Math.random() * 0.5);
    nodePositions.set(nodes[i].id, {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
    });
  }

  // Build adjacency set for quick lookup
  const linkedPairs = new Set<string>();
  for (const link of links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    linkedPairs.add(`${sourceId}-${targetId}`);
    linkedPairs.add(`${targetId}-${sourceId}`);
  }

  const isLinked = (a: string, b: string) => linkedPairs.has(`${a}-${b}`);

  // Force simulation parameters
  const iterations = 300;
  const centerForce = 0.01;
  const repulsionForce = 1000;
  const linkForce = 0.3;
  const linkDistance = 100;
  const damping = 0.9;

  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations; // Cooling factor

    // Calculate forces
    for (const node of nodes) {
      const pos = nodePositions.get(node.id)!;
      let fx = 0;
      let fy = 0;

      // Center force (weak attraction to center)
      fx += (centerX - pos.x) * centerForce * alpha;
      fy += (centerY - pos.y) * centerForce * alpha;

      // Repulsion from other nodes
      for (const other of nodes) {
        if (node.id === other.id) continue;

        const otherPos = nodePositions.get(other.id)!;
        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Stronger repulsion for overlapping nodes
        const minDist = getRadius(node) + getRadius(other) + padding;
        const repulsion = repulsionForce * alpha / (dist * dist);

        if (dist < minDist) {
          // Extra push when overlapping
          const overlap = minDist - dist;
          fx += (dx / dist) * (repulsion + overlap * 2);
          fy += (dy / dist) * (repulsion + overlap * 2);
        } else {
          fx += (dx / dist) * repulsion;
          fy += (dy / dist) * repulsion;
        }
      }

      // Link forces (attraction to connected nodes)
      for (const other of nodes) {
        if (node.id === other.id) continue;
        if (!isLinked(node.id, other.id)) continue;

        const otherPos = nodePositions.get(other.id)!;
        const dx = otherPos.x - pos.x;
        const dy = otherPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Spring force towards target distance
        const displacement = dist - linkDistance;
        fx += (dx / dist) * displacement * linkForce * alpha;
        fy += (dy / dist) * displacement * linkForce * alpha;
      }

      // Update velocity
      pos.vx = (pos.vx + fx) * damping;
      pos.vy = (pos.vy + fy) * damping;
    }

    // Update positions
    for (const node of nodes) {
      const pos = nodePositions.get(node.id)!;
      pos.x += pos.vx;
      pos.y += pos.vy;
    }
  }

  // Convert to output format with delays based on distance from center
  for (const node of nodes) {
    const pos = nodePositions.get(node.id)!;
    const distFromCenter = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
    const maxDist = Math.sqrt(nodes.length) * 80;
    const delay = (distFromCenter / maxDist) * 600;

    positions.set(node.id, { x: pos.x, y: pos.y, delay });
  }

  return positions;
}

/**
 * Generate positions based on the selected layout algorithm
 *
 * @param algorithm - Layout algorithm to use
 * @param nodes - Array of nodes to position
 * @param links - Array of links between nodes
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateLayoutPositions(
  algorithm: 'flower' | 'circular' | 'radial' | 'hierarchical' | 'force' | 'bubblemaps',
  nodes: NetworkNode[],
  links: NetworkLink[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  switch (algorithm) {
    case 'circular':
      return generateCircularPositions(nodes, centerX, centerY, getRadius, padding);
    case 'radial':
      return generateRadialPositions(nodes, links, centerX, centerY, getRadius, padding);
    case 'hierarchical':
      return generateHierarchicalPositions(nodes, links, centerX, centerY, getRadius, padding);
    case 'force':
      return generateForcePositions(nodes, links, centerX, centerY, getRadius, padding);
    case 'bubblemaps':
      return generateBubblemapsPositions(nodes, links, centerX, centerY, getRadius, padding);
    case 'flower':
    default:
      return generateFlowerPositions(nodes, centerX, centerY, getRadius, padding);
  }
}

// ============================================================================
// BUBBLEMAPS-STYLE RADIAL CLUSTER LAYOUT
// ============================================================================

/**
 * Node importance data for Bubblemaps layout
 */
interface NodeImportance {
  id: string;
  node: NetworkNode;
  connections: number;
  balance: number;
  score: number; // Combined importance score
  hierarchy: number; // 0 = hub, 1 = distributor, 2+ = leaf
  clusterId: number;
  parentId: string | null;
  children: string[];
}

/**
 * Cluster data for Bubblemaps layout
 */
interface BubblemapsCluster {
  id: number;
  hubId: string;
  nodeIds: string[];
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * Calculate node importance score based on connectivity and balance
 * Higher score = more important = closer to being a hub
 */
function calculateNodeImportance(
  nodes: NetworkNode[],
  links: NetworkLink[]
): Map<string, NodeImportance> {
  const adjacencyList = buildAdjacencyList(nodes, links);
  const importanceMap = new Map<string, NodeImportance>();

  // Calculate max values for normalization
  let maxConnections = 0;
  let maxBalance = 0;
  for (const node of nodes) {
    const connections = adjacencyList.get(node.id)?.size || 0;
    maxConnections = Math.max(maxConnections, connections);
    maxBalance = Math.max(maxBalance, node.balance);
  }

  // Calculate importance score for each node
  for (const node of nodes) {
    const connections = adjacencyList.get(node.id)?.size || 0;

    // Normalize values (0-1)
    const normalizedConnections = maxConnections > 0 ? connections / maxConnections : 0;
    const normalizedBalance = maxBalance > 0 ? node.balance / maxBalance : 0;

    // Combined score: 60% connectivity, 40% balance
    const score = normalizedConnections * 0.6 + normalizedBalance * 0.4;

    importanceMap.set(node.id, {
      id: node.id,
      node,
      connections,
      balance: node.balance,
      score,
      hierarchy: -1, // Will be assigned later
      clusterId: -1,
      parentId: null,
      children: [],
    });
  }

  return importanceMap;
}

/**
 * Identify clusters and assign hierarchy levels
 * Hub (0) → Distributor (1) → Leaf (2+)
 */
function identifyClustersAndHierarchy(
  nodes: NetworkNode[],
  links: NetworkLink[],
  importanceMap: Map<string, NodeImportance>
): BubblemapsCluster[] {
  const adjacencyList = buildAdjacencyList(nodes, links);
  const visited = new Set<string>();
  const clusters: BubblemapsCluster[] = [];
  let clusterIndex = 0;

  // Sort nodes by importance (descending) to find hubs first
  const sortedNodes = [...nodes].sort((a, b) => {
    const impA = importanceMap.get(a.id)?.score || 0;
    const impB = importanceMap.get(b.id)?.score || 0;
    return impB - impA;
  });

  // Find connected components and assign clusters
  for (const startNode of sortedNodes) {
    if (visited.has(startNode.id)) continue;

    // This node is the hub of a new cluster
    const hubImportance = importanceMap.get(startNode.id)!;
    hubImportance.hierarchy = 0;
    hubImportance.clusterId = clusterIndex;
    visited.add(startNode.id);

    const clusterNodeIds = [startNode.id];

    // BFS to find all nodes in this cluster and assign hierarchy
    const queue: { id: string; level: number; parentId: string | null }[] = [];

    // Add direct neighbors as level 1 (distributors)
    const hubNeighbors = adjacencyList.get(startNode.id) || new Set();
    for (const neighborId of hubNeighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, level: 1, parentId: startNode.id });
      }
    }

    // Sort queue by importance (higher importance = processed first as distributor)
    queue.sort((a, b) => {
      const impA = importanceMap.get(a.id)?.score || 0;
      const impB = importanceMap.get(b.id)?.score || 0;
      return impB - impA;
    });

    while (queue.length > 0) {
      const { id: currentId, level, parentId } = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      clusterNodeIds.push(currentId);

      const nodeImportance = importanceMap.get(currentId)!;
      nodeImportance.hierarchy = level;
      nodeImportance.clusterId = clusterIndex;
      nodeImportance.parentId = parentId;

      // Add as child to parent
      if (parentId) {
        importanceMap.get(parentId)!.children.push(currentId);
      }

      // Add unvisited neighbors as next level
      const neighbors = adjacencyList.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, level: level + 1, parentId: currentId });
        }
      }
    }

    clusters.push({
      id: clusterIndex,
      hubId: startNode.id,
      nodeIds: clusterNodeIds,
      centerX: 0,
      centerY: 0,
      radius: 0,
    });

    clusterIndex++;
  }

  return clusters;
}

/**
 * Generate Bubblemaps-style radial cluster layout
 *
 * This layout creates distinct cluster groups where:
 * - Each cluster has a central hub node
 * - Distributor nodes fan out from the hub
 * - Leaf nodes fan out from distributors
 * - Clusters are separated with clear spacing
 *
 * @param nodes - Array of nodes to position
 * @param links - Array of links between nodes
 * @param centerX - X coordinate of canvas center
 * @param centerY - Y coordinate of canvas center
 * @param getRadius - Function to calculate node radius
 * @param padding - Minimum padding between nodes
 * @returns Map of node IDs to target positions with animation delay
 */
export function generateBubblemapsPositions(
  nodes: NetworkNode[],
  links: NetworkLink[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30
): Map<string, { x: number; y: number; delay: number }> {
  const positions = new Map<string, { x: number; y: number; delay: number }>();

  if (nodes.length === 0) return positions;

  // Step 1: Calculate importance scores
  const importanceMap = calculateNodeImportance(nodes, links);

  // Step 2: Identify clusters and hierarchy
  const clusters = identifyClustersAndHierarchy(nodes, links, importanceMap);

  // Step 3: Calculate cluster positions (distribute around canvas center)
  const avgNodeRadius = nodes.reduce((sum, n) => sum + getRadius(n), 0) / nodes.length;
  const baseClusterSpacing = Math.max(200, avgNodeRadius * 8);

  if (clusters.length === 1) {
    // Single cluster: center it
    clusters[0].centerX = centerX;
    clusters[0].centerY = centerY;
  } else {
    // Multiple clusters: arrange in a circle around center
    const clusterCircleRadius = baseClusterSpacing * Math.sqrt(clusters.length) * 0.6;

    for (let i = 0; i < clusters.length; i++) {
      // Use golden angle for better distribution
      const angle = i * GOLDEN_ANGLE - Math.PI / 2;
      const radius = clusterCircleRadius * (0.5 + (i / clusters.length) * 0.5);

      clusters[i].centerX = centerX + Math.cos(angle) * radius;
      clusters[i].centerY = centerY + Math.sin(angle) * radius;
    }
  }

  // Step 4: Position nodes within each cluster using radial fan layout
  for (const cluster of clusters) {
    const hubNode = nodes.find(n => n.id === cluster.hubId);
    if (!hubNode) continue;

    const hubImportance = importanceMap.get(cluster.hubId)!;
    const hubRadius = getRadius(hubNode);

    // Position hub at cluster center
    positions.set(cluster.hubId, {
      x: cluster.centerX,
      y: cluster.centerY,
      delay: cluster.id * 100, // Stagger by cluster
    });

    // Group children by hierarchy level
    const nodesByLevel = new Map<number, string[]>();
    for (const nodeId of cluster.nodeIds) {
      if (nodeId === cluster.hubId) continue;

      const imp = importanceMap.get(nodeId)!;
      if (!nodesByLevel.has(imp.hierarchy)) {
        nodesByLevel.set(imp.hierarchy, []);
      }
      nodesByLevel.get(imp.hierarchy)!.push(nodeId);
    }

    // Position each level as radial rings
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    let cumulativeRadius = hubRadius + padding + avgNodeRadius;

    for (const level of levels) {
      const levelNodeIds = nodesByLevel.get(level)!;
      const levelNodeCount = levelNodeIds.length;

      if (levelNodeCount === 0) continue;

      // Calculate ring radius based on level
      const ringRadius = cumulativeRadius + level * (avgNodeRadius * 2 + padding);

      // Calculate angular spread
      // For level 1 (distributors): full circle if many, or sector if few
      // For higher levels: fan out from parent

      if (level === 1) {
        // Distributors: arrange in a circle around hub
        const angleStep = (2 * Math.PI) / Math.max(levelNodeCount, 3);
        const angleOffset = -Math.PI / 2; // Start from top

        for (let i = 0; i < levelNodeCount; i++) {
          const nodeId = levelNodeIds[i];
          const node = nodes.find(n => n.id === nodeId);
          if (!node) continue;

          const angle = angleOffset + i * angleStep;
          const x = cluster.centerX + Math.cos(angle) * ringRadius;
          const y = cluster.centerY + Math.sin(angle) * ringRadius;

          positions.set(nodeId, {
            x,
            y,
            delay: cluster.id * 100 + level * 150 + i * 30,
          });
        }
      } else {
        // Leaves: fan out from their parent node
        for (let i = 0; i < levelNodeIds.length; i++) {
          const nodeId = levelNodeIds[i];
          const node = nodes.find(n => n.id === nodeId);
          if (!node) continue;

          const imp = importanceMap.get(nodeId)!;
          const parentId = imp.parentId;
          const parentPos = parentId ? positions.get(parentId) : null;

          if (parentPos) {
            // Calculate angle from cluster center to parent
            const parentAngle = Math.atan2(
              parentPos.y - cluster.centerY,
              parentPos.x - cluster.centerX
            );

            // Find siblings (nodes with same parent)
            const siblings = levelNodeIds.filter(id => {
              const sibImp = importanceMap.get(id);
              return sibImp?.parentId === parentId;
            });
            const siblingIndex = siblings.indexOf(nodeId);
            const siblingCount = siblings.length;

            // Calculate fan angle for this node
            const fanSpread = Math.min(Math.PI / 2, (siblingCount * Math.PI) / 8);
            const fanAngle = siblingCount > 1
              ? parentAngle - fanSpread / 2 + (siblingIndex / (siblingCount - 1)) * fanSpread
              : parentAngle;

            // Calculate position
            const nodeRadius = getRadius(node);
            const distanceFromParent = nodeRadius + padding + avgNodeRadius;
            const x = parentPos.x + Math.cos(fanAngle) * distanceFromParent;
            const y = parentPos.y + Math.sin(fanAngle) * distanceFromParent;

            positions.set(nodeId, {
              x,
              y,
              delay: cluster.id * 100 + level * 150 + i * 30,
            });
          } else {
            // Fallback: position on the ring
            const angleStep = (2 * Math.PI) / Math.max(levelNodeCount, 3);
            const angle = -Math.PI / 2 + i * angleStep;
            const x = cluster.centerX + Math.cos(angle) * ringRadius;
            const y = cluster.centerY + Math.sin(angle) * ringRadius;

            positions.set(nodeId, {
              x,
              y,
              delay: cluster.id * 100 + level * 150 + i * 30,
            });
          }
        }
      }

      cumulativeRadius = ringRadius + avgNodeRadius + padding;
    }
  }

  // Step 5: Apply overlap resolution to ensure no bubbles overlap
  // First pass: resolve overlaps within clusters
  const positionArray = Array.from(positions.entries());
  const iterations = 50;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < positionArray.length; i++) {
      for (let j = i + 1; j < positionArray.length; j++) {
        const [idA, posA] = positionArray[i];
        const [idB, posB] = positionArray[j];

        const nodeA = nodes.find(n => n.id === idA);
        const nodeB = nodes.find(n => n.id === idB);
        if (!nodeA || !nodeB) continue;

        const radiusA = getRadius(nodeA);
        const radiusB = getRadius(nodeB);
        const minDistance = radiusA + radiusB + padding;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance && distance > 0.001) {
          const overlap = minDistance - distance;
          const pushAmount = (overlap / 2) + 1;
          const dirX = dx / distance;
          const dirY = dy / distance;

          // Push both nodes apart
          posA.x -= dirX * pushAmount;
          posA.y -= dirY * pushAmount;
          posB.x += dirX * pushAmount;
          posB.y += dirY * pushAmount;
        }
      }
    }
  }

  return positions;
}

/**
 * Animation state for flower-like initial layout
 */
export interface FlowerAnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  targetPositions: Map<string, { x: number; y: number; delay: number }>;
  centerX: number;
  centerY: number;
}

/**
 * Create initial animation state
 */
export function createFlowerAnimationState(
  nodes: NetworkNode[],
  centerX: number,
  centerY: number,
  getRadius: (node: NetworkNode) => number,
  padding: number = 30,
  duration: number = 1500
): FlowerAnimationState {
  const targetPositions = generateFlowerPositions(nodes, centerX, centerY, getRadius, padding);

  return {
    active: true,
    startTime: Date.now(),
    duration,
    targetPositions,
    centerX,
    centerY,
  };
}

/**
 * Get interpolated position during flower animation
 *
 * @param nodeId - ID of the node
 * @param animState - Current animation state
 * @param easingFn - Easing function to use
 * @returns Interpolated position with scale and opacity
 */
export function getAnimatedPosition(
  nodeId: string,
  animState: FlowerAnimationState,
  easingFn: (t: number) => number = animationEasing.easeOutCubic
): { x: number; y: number; scale: number; opacity: number } | null {
  const target = animState.targetPositions.get(nodeId);
  if (!target) return null;

  const elapsed = Date.now() - animState.startTime;
  const nodeElapsed = elapsed - target.delay;

  if (nodeElapsed <= 0) {
    return {
      x: animState.centerX,
      y: animState.centerY,
      scale: 0,
      opacity: 0,
    };
  }

  const nodeDuration = animState.duration - target.delay;
  const progress = Math.min(nodeElapsed / nodeDuration, 1);
  const easedProgress = easingFn(progress);

  const x = animState.centerX + (target.x - animState.centerX) * easedProgress;
  const y = animState.centerY + (target.y - animState.centerY) * easedProgress;

  const scaleProgress = Math.min(progress * 1.2, 1);
  const scale = animationEasing.easeOutBack(scaleProgress);

  const opacity = Math.min(progress * 2, 1);

  return { x, y, scale, opacity };
}

/**
 * Check if flower animation is complete
 */
export function isFlowerAnimationComplete(animState: FlowerAnimationState): boolean {
  if (!animState.active) return true;
  const elapsed = Date.now() - animState.startTime;
  return elapsed >= animState.duration + 100;
}

/**
 * Get final positions from animation state
 */
export function getFlowerFinalPositions(
  animState: FlowerAnimationState
): Map<string, { x: number; y: number }> {
  const finalPositions = new Map<string, { x: number; y: number }>();
  for (const [nodeId, target] of animState.targetPositions) {
    finalPositions.set(nodeId, { x: target.x, y: target.y });
  }
  return finalPositions;
}

/**
 * Layout Transition Animation State
 * Used for smooth transitions between different layout algorithms
 */
export interface LayoutTransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  startPositions: Map<string, { x: number; y: number }>;
  targetPositions: Map<string, { x: number; y: number; delay: number }>;
  fromLayout: string;
  toLayout: string;
}

/**
 * Create a layout transition animation state
 */
export function createLayoutTransitionState(
  startPositions: Map<string, { x: number; y: number }>,
  targetPositions: Map<string, { x: number; y: number; delay: number }>,
  fromLayout: string,
  toLayout: string,
  duration: number = 800
): LayoutTransitionState {
  return {
    active: true,
    startTime: Date.now(),
    duration,
    startPositions,
    targetPositions,
    fromLayout,
    toLayout,
  };
}

/**
 * Get interpolated position during layout transition
 */
export function getTransitionPosition(
  nodeId: string,
  transitionState: LayoutTransitionState,
  easingFn: (t: number) => number = animationEasing.easeOutCubic
): { x: number; y: number; scale: number; opacity: number } | null {
  const start = transitionState.startPositions.get(nodeId);
  const target = transitionState.targetPositions.get(nodeId);

  if (!target) return null;

  const elapsed = Date.now() - transitionState.startTime;
  // Use delay for staggered animation effect
  const nodeElapsed = elapsed - (target.delay * 0.3); // Reduce delay for smoother transition

  if (nodeElapsed <= 0) {
    // Still waiting for this node's animation to start
    if (start) {
      return { x: start.x, y: start.y, scale: 1, opacity: 1 };
    }
    return { x: target.x, y: target.y, scale: 0, opacity: 0 };
  }

  const nodeDuration = transitionState.duration;
  const progress = Math.min(nodeElapsed / nodeDuration, 1);
  const easedProgress = easingFn(progress);

  // If we have start positions, interpolate from start to target
  if (start) {
    const x = start.x + (target.x - start.x) * easedProgress;
    const y = start.y + (target.y - start.y) * easedProgress;
    return { x, y, scale: 1, opacity: 1 };
  }

  // No start position, animate from target with scale
  const scaleProgress = Math.min(progress * 1.2, 1);
  const scale = animationEasing.easeOutBack(scaleProgress);
  const opacity = Math.min(progress * 2, 1);

  return { x: target.x, y: target.y, scale, opacity };
}

/**
 * Check if layout transition is complete
 */
export function isLayoutTransitionComplete(transitionState: LayoutTransitionState): boolean {
  if (!transitionState.active) return true;
  const elapsed = Date.now() - transitionState.startTime;
  // Add extra time for any delayed nodes
  const maxDelay = Math.max(...Array.from(transitionState.targetPositions.values()).map(t => t.delay * 0.3));
  return elapsed >= transitionState.duration + maxDelay + 50;
}

/**
 * Get final positions from transition state
 */
export function getTransitionFinalPositions(
  transitionState: LayoutTransitionState
): Map<string, { x: number; y: number }> {
  const finalPositions = new Map<string, { x: number; y: number }>();
  for (const [nodeId, target] of transitionState.targetPositions) {
    finalPositions.set(nodeId, { x: target.x, y: target.y });
  }
  return finalPositions;
}
