"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useCryptoVizStore, themes } from "@/lib/store";
import type { NetworkNode, NetworkLink, NodeCluster } from "@/types";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { motion, AnimatePresence } from "framer-motion";
import { clusterNodes, bundleEdges, type BundledEdge } from "@/lib/clustering";
import {
  getSubgraphNodes,
  calculateDistances,
  drawArrowhead,
  drawBezierArrowhead,
  drawCurvedArrowLine,
  drawArcArrowLine,
  drawArrowGlow,
  type ArrowStyleType,
  PHYSICS_CONFIG,
  SOFT_COLLISION_CONFIG,
  type NodePhysicsState,
  initializePhysicsState,
  buildPhysicsLinks,
  lockAllNodes,
  resolveOverlaps,
  forceResolveOverlaps,
  hasAnyOverlap,
  // Animation utilities
  animationEasing,
  type FlowerAnimationState,
  getAnimatedPosition,
  isFlowerAnimationComplete,
  getFlowerFinalPositions,
  // Layout algorithms
  generateLayoutPositions,
  createFlowerAnimationState,
  // Layout transition utilities
  type LayoutTransitionState,
  createLayoutTransitionState,
  getTransitionPosition,
  isLayoutTransitionComplete,
  getTransitionFinalPositions,
} from "@/lib/graphUtils";
import {
  createSpatialIndex,
  getLODLevel,
  shouldRenderLabels,
  shouldRenderGlow,
  shouldRenderArrows,
  getNodeDetailLevel,
  type SpatialIndex,
} from "@/lib/spatialIndex";
import { RotateCcw, Eye, EyeOff, Wallet, Shield, Activity, ExternalLink, ArrowUpRight } from "lucide-react";
import {
  shortenAddress,
  formatETH,
  getRiskLevel,
  getNodeTypeLabel,
} from "@/lib/mockData";
import { getExplorerUrl } from "@/lib/etherscanApi";
import { getImageSync, getCachedImage } from "@/lib/coingeckoApi";

// Thresholds for distinguishing click from drag
const DRAG_THRESHOLD_DISTANCE = 5;
const DRAG_THRESHOLD_TIME = 200;

// Interaction state machine
type InteractionState = 'IDLE' | 'INITIALIZING' | 'ANIMATING' | 'PENDING_DRAG' | 'DRAGGING' | 'RELEASING' | 'LASSO_SELECTING' | 'TRANSITIONING';

// Interface for drag state
interface DragState {
  nodeId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  subgraphNodes: Set<string>;
  distances: Map<string, number>;
  initialPositions: Map<string, { x: number; y: number }>;
  physicsState: Map<string, NodePhysicsState>;
  pointerDownTime: number;
  pointerDownX: number;
  pointerDownY: number;
  pointerId: number | null;
  // Group drag support
  isGroupDrag: boolean;
  groupNodeIds: string[];
  groupInitialOffsets: Map<string, { dx: number; dy: number }>;
}

// Interface for lasso selection state
interface LassoState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  addToSelection: boolean; // Shift key held
}

// Interface for release animation state
interface ReleaseAnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  nodePositions: Map<string, { startX: number; startY: number; targetX: number; targetY: number; vx: number; vy: number }>;
  easingType: 'none' | 'easeOut' | 'spring' | 'elastic';
}

// Easing functions
const easingFunctions = {
  none: (t: number) => t >= 1 ? 1 : t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3), // Cubic ease-out
  spring: (t: number) => {
    // Spring animation with overshoot
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  elastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
};

const createEmptyLassoState = (): LassoState => ({
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  addToSelection: false,
});

const createEmptyReleaseState = (): ReleaseAnimationState => ({
  active: false,
  startTime: 0,
  duration: 400,
  nodePositions: new Map(),
  easingType: 'spring',
});

const createEmptyDragState = (): DragState => ({
  nodeId: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  subgraphNodes: new Set(),
  distances: new Map(),
  initialPositions: new Map(),
  physicsState: new Map(),
  pointerDownTime: 0,
  pointerDownX: 0,
  pointerDownY: 0,
  pointerId: null,
  isGroupDrag: false,
  groupNodeIds: [],
  groupInitialOffsets: new Map(),
});

export function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const simulationRef = useRef<ReturnType<typeof forceSimulation<NetworkNode>> | null>(null);

  // Authoritative position source
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // State machine ref
  const interactionStateRef = useRef<InteractionState>('IDLE');

  // Drag state ref
  const dragStateRef = useRef<DragState>(createEmptyDragState());

  // Lasso selection state ref
  const lassoStateRef = useRef<LassoState>(createEmptyLassoState());

  // Simulation complete flag
  const simulationCompleteRef = useRef(false);

  // Physics frozen flag - ONLY true during active drag
  const physicsEnabledRef = useRef(false);

  // Release animation state
  const releaseAnimationRef = useRef<ReleaseAnimationState>(createEmptyReleaseState());

  // NEW: Flower animation state
  const flowerAnimationRef = useRef<FlowerAnimationState | null>(null);
  // NEW: Layout transition animation state
  const layoutTransitionRef = useRef<LayoutTransitionState | null>(null);
  // Track previous layout algorithm to detect changes
  const previousLayoutRef = useRef<string | null>(null);

  // NEW: Debug overlay toggle
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  const { nodes, links, theme, view, selectNode, toggleNodeSelection, addNodeToSelection, clearSelection, selectMultipleNodes, hoverNode, setView, setNodes } = useCryptoVizStore();

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A - Select all nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectMultipleNodes(nodes.map(n => n.id));
      }
      // Escape - Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, clearSelection, selectMultipleNodes]);
  const [showTouchHint, setShowTouchHint] = useState(true);
  const [clusters, setClusters] = useState<NodeCluster[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [clusteredNodeMap, setClusteredNodeMap] = useState<Map<string, string>>(new Map());
  const [bundledEdges, setBundledEdges] = useState<BundledEdge[]>([]);

  const themeConfig = themes[theme];

  // Sync positions ref with nodes when not dragging
  useEffect(() => {
    if (interactionStateRef.current === 'DRAGGING') return;
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        positionsRef.current.set(node.id, { x: node.x, y: node.y });
      }
    }
  }, [nodes]);

  useEffect(() => {
    const timer = setTimeout(() => setShowTouchHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (view.enableClustering && nodes.length >= view.clusterThreshold) {
      const result = clusterNodes(nodes, links, view.clusterThreshold);
      setClusters(result.clusters);
      setClusteredNodeMap(result.clusteredNodes);
    } else {
      setClusters([]);
      setClusteredNodeMap(new Map());
    }
  }, [nodes, links, view.enableClustering, view.clusterThreshold]);

  useEffect(() => {
    if (view.enableEdgeBundling) {
      const bundled = bundleEdges(nodes, links, view.bundlingStrength);
      setBundledEdges(bundled);
    } else {
      setBundledEdges([]);
    }
  }, [nodes, links, view.enableEdgeBundling, view.bundlingStrength]);

  const getNodeRadius = useCallback((node: NetworkNode) => {
    const baseSize = 8;
    const balanceScale = Math.min(Math.log10(node.balance + 1) * 3, 20);
    return baseSize + balanceScale;
  }, []);

  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Track if nodes have been loaded for one-time simulation
  const hasNodes = nodes.length > 0;

  /**
   * Compute bounding box of all nodes and center the graph in the viewport.
   */
  const centerGraphInViewport = useCallback((nodePositions: Map<string, { x: number; y: number }>, canvasRect: DOMRect) => {
    if (nodePositions.size === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const pos of nodePositions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    const padding = 80;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    const viewportCenterX = canvasRect.width / 2;
    const viewportCenterY = canvasRect.height / 2;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const zoomX = canvasRect.width / graphWidth;
    const zoomY = canvasRect.height / graphHeight;
    const fitZoom = Math.min(zoomX, zoomY, 1);
    const clampedZoom = Math.max(0.3, Math.min(fitZoom, 1));

    const newPanX = viewportCenterX - (graphCenterX * clampedZoom);
    const newPanY = viewportCenterY - (graphCenterY * clampedZoom);

    setView({ panX: newPanX, panY: newPanY, zoom: clampedZoom });
  }, [setView]);

  /**
   * Create animation state using the selected layout algorithm
   */
  const createLayoutAnimationState = useCallback((
    nodesForLayout: NetworkNode[],
    centerX: number,
    centerY: number,
    duration: number
  ): FlowerAnimationState => {
    const algorithm = view.animationConfig.layoutAlgorithm || 'flower';
    const targetPositions = generateLayoutPositions(
      algorithm,
      nodesForLayout,
      links,
      centerX,
      centerY,
      getNodeRadius,
      30 // padding
    );

    return {
      active: true,
      startTime: Date.now(),
      duration,
      targetPositions,
      centerX,
      centerY,
    };
  }, [view.animationConfig.layoutAlgorithm, links, getNodeRadius]);

  /**
   * Reset layout - triggers flower animation from scratch
   */
  const resetLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    // Clear existing state
    simulationCompleteRef.current = false;
    positionsRef.current.clear();
    flowerAnimationRef.current = null;

    // Clear positions from nodes
    const clearedNodes = nodes.map(node => ({
      ...node,
      x: undefined,
      y: undefined,
      fx: undefined,
      fy: undefined,
    }));

    setNodes(clearedNodes);

    // Wait for state update, then trigger animation
    setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Create animation state with selected layout algorithm
      flowerAnimationRef.current = createLayoutAnimationState(
        clearedNodes,
        centerX,
        centerY,
        1800 // duration
      );

      interactionStateRef.current = 'ANIMATING';
    }, 50);
  }, [nodes, setNodes, createLayoutAnimationState]);

  // ONE-TIME FLOWER ANIMATION INITIALIZATION
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentional one-time effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || simulationCompleteRef.current || !hasNodes) return;

    // Check if nodes already have positions (loaded from state)
    const hasPositions = nodes.some(n => n.x !== undefined && n.y !== undefined);
    if (hasPositions) {
      const lockedNodes = lockAllNodes(nodes);
      for (const node of lockedNodes) {
        if (node.x !== undefined && node.y !== undefined) {
          positionsRef.current.set(node.id, { x: node.x, y: node.y });
        }
      }
      setNodes(lockedNodes);
      simulationCompleteRef.current = true;
      interactionStateRef.current = 'IDLE';

      const rect = canvas.getBoundingClientRect();
      centerGraphInViewport(positionsRef.current, rect);
      return;
    }

    // Start layout animation
    interactionStateRef.current = 'ANIMATING';

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Create animation state with selected layout algorithm
    flowerAnimationRef.current = createLayoutAnimationState(
      nodes,
      centerX,
      centerY,
      1800 // duration - slower for more visible bloom effect
    );

    // Animation completion handler
    const checkAnimationComplete = () => {
      if (!flowerAnimationRef.current || !isFlowerAnimationComplete(flowerAnimationRef.current)) {
        setTimeout(checkAnimationComplete, 50);
        return;
      }

      // Animation complete - apply final positions
      const finalPositions = getFlowerFinalPositions(flowerAnimationRef.current);

      // Run overlap resolution on final positions
      let resolvedNodes = nodes.map(node => {
        const pos = finalPositions.get(node.id);
        if (pos) {
          return { ...node, x: pos.x, y: pos.y };
        }
        return node;
      });

      // Run multiple overlap resolution passes using soft collision config
      const RESOLUTION_PADDING = SOFT_COLLISION_CONFIG.epsilonGap;
      resolvedNodes = forceResolveOverlaps(resolvedNodes, getNodeRadius, RESOLUTION_PADDING, 400);

      // Verify and run additional passes if needed
      let overlapCheck = hasAnyOverlap(resolvedNodes, getNodeRadius, RESOLUTION_PADDING);
      if (overlapCheck.hasOverlap) {
        console.log(`[FlowerAnim] ${overlapCheck.overlapCount} overlaps found, resolving...`);
        resolvedNodes = resolveOverlaps(resolvedNodes, getNodeRadius, RESOLUTION_PADDING, 400);
      }

      // Final check
      overlapCheck = hasAnyOverlap(resolvedNodes, getNodeRadius, RESOLUTION_PADDING);
      if (overlapCheck.hasOverlap) {
        console.warn(`[FlowerAnim] ${overlapCheck.overlapCount} overlaps remain after resolution`);
      } else {
        console.log('[FlowerAnim] Zero overlaps - animation complete');
      }

      // Lock nodes and update state
      const lockedNodes = lockAllNodes(resolvedNodes);
      for (const node of lockedNodes) {
        if (node.x !== undefined && node.y !== undefined) {
          positionsRef.current.set(node.id, { x: node.x, y: node.y });
        }
      }

      setNodes(lockedNodes);
      simulationCompleteRef.current = true;
      flowerAnimationRef.current = null;
      interactionStateRef.current = 'IDLE';

      // Center the graph
      const canvasRect = canvas.getBoundingClientRect();
      centerGraphInViewport(positionsRef.current, canvasRect);
    };

    // Start checking for animation completion
    setTimeout(checkAnimationComplete, 100);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNodes]);

  // Main canvas effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const getNodePosition = (nodeId: string): { x: number; y: number; scale?: number; opacity?: number } | null => {
      // During flower animation, use animated positions
      if (interactionStateRef.current === 'ANIMATING' && flowerAnimationRef.current) {
        const animPos = getAnimatedPosition(
          nodeId,
          flowerAnimationRef.current,
          animationEasing.easeOutCubic
        );
        if (animPos) return animPos;
      }

      // During dragging, use physics state
      if (interactionStateRef.current === 'DRAGGING') {
        const physicsState = dragStateRef.current.physicsState.get(nodeId);
        if (physicsState) return { x: physicsState.x, y: physicsState.y };
      }

      // During release animation, interpolate positions
      if (interactionStateRef.current === 'RELEASING' && releaseAnimationRef.current.active) {
        const animState = releaseAnimationRef.current;
        const nodeAnim = animState.nodePositions.get(nodeId);
        if (nodeAnim) {
          const elapsed = Date.now() - animState.startTime;
          const progress = Math.min(elapsed / animState.duration, 1);
          const easingFn = easingFunctions[animState.easingType] || easingFunctions.easeOut;
          const easedProgress = easingFn(progress);

          if (animState.easingType === 'spring') {
            const momentumDecay = Math.pow(0.95, elapsed / 16);
            const momentumX = nodeAnim.vx * momentumDecay * 0.1;
            const momentumY = nodeAnim.vy * momentumDecay * 0.1;
            return {
              x: nodeAnim.startX + (nodeAnim.targetX - nodeAnim.startX) * easedProgress + momentumX,
              y: nodeAnim.startY + (nodeAnim.targetY - nodeAnim.startY) * easedProgress + momentumY,
            };
          }

          return {
            x: nodeAnim.startX + (nodeAnim.targetX - nodeAnim.startX) * easedProgress,
            y: nodeAnim.startY + (nodeAnim.targetY - nodeAnim.startY) * easedProgress,
          };
        }
      }
      return positionsRef.current.get(nodeId) || null;
    };

    const runPhysicsStep = () => {
      // FIX #7: Check physics frozen flag - bail immediately if not enabled
      if (!physicsEnabledRef.current) return;

      const dragState = dragStateRef.current;
      if (interactionStateRef.current !== 'DRAGGING' || !dragState.nodeId) return;

      // Group drag support
      if (dragState.isGroupDrag && dragState.groupNodeIds.length > 0) {
        const deltaX = dragState.currentX - dragState.startX;
        const deltaY = dragState.currentY - dragState.startY;

        for (const nodeId of dragState.groupNodeIds) {
          const initialOffset = dragState.groupInitialOffsets.get(nodeId);
          const initialPos = dragState.initialPositions.get(nodeId);
          const physicsState = dragState.physicsState.get(nodeId);
          if (initialOffset && initialPos && physicsState) {
            physicsState.x = initialPos.x + deltaX + initialOffset.dx;
            physicsState.y = initialPos.y + deltaY + initialOffset.dy;
            physicsState.vx = 0;
            physicsState.vy = 0;
          }
        }
      } else {
        const deltaX = dragState.currentX - dragState.startX;
        const deltaY = dragState.currentY - dragState.startY;

        const draggedState = dragState.physicsState.get(dragState.nodeId!);
        const draggedInitial = dragState.initialPositions.get(dragState.nodeId!);

        if (draggedState && draggedInitial) {
          draggedState.x = draggedInitial.x + deltaX;
          draggedState.y = draggedInitial.y + deltaY;
          draggedState.vx = 0;
          draggedState.vy = 0;
        }
      }

      const forces = new Map<string, { fx: number; fy: number }>();
      for (const [nodeId] of dragState.physicsState) {
        forces.set(nodeId, { fx: 0, fy: 0 });
      }

      const physicsLinks = buildPhysicsLinks(links, dragState.physicsState);

      for (const link of physicsLinks) {
        const sourceState = dragState.physicsState.get(link.sourceId);
        const targetState = dragState.physicsState.get(link.targetId);

        if (!sourceState || !targetState) continue;
        if (sourceState.isAnchored && targetState.isAnchored) continue;

        const dx = targetState.x - sourceState.x;
        const dy = targetState.y - sourceState.y;
        const currentLength = Math.sqrt(dx * dx + dy * dy);

        if (currentLength < 0.001) continue;

        const displacement = currentLength - link.restLength;
        const forceMagnitude = displacement * PHYSICS_CONFIG.linkStiffness * link.strength;

        const dirX = dx / currentLength;
        const dirY = dy / currentLength;

        if (!sourceState.isAnchored) {
          forces.get(link.sourceId)!.fx += dirX * forceMagnitude;
          forces.get(link.sourceId)!.fy += dirY * forceMagnitude;
        }
        if (!targetState.isAnchored) {
          forces.get(link.targetId)!.fx -= dirX * forceMagnitude;
          forces.get(link.targetId)!.fy -= dirY * forceMagnitude;
        }
      }

      for (const [nodeId, state] of dragState.physicsState) {
        if (state.isAnchored) continue;
        // FIX #8: Skip frozen nodes
        if (state.isFrozen) continue;

        const force = forces.get(nodeId)!;
        state.vx = (state.vx + force.fx / state.mass) * PHYSICS_CONFIG.damping;
        state.vy = (state.vy + force.fy / state.mass) * PHYSICS_CONFIG.damping;

        // FIX #8: Improved velocity clamping
        const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        if (speed > PHYSICS_CONFIG.maxVelocity) {
          const scale = PHYSICS_CONFIG.maxVelocity / speed;
          state.vx *= scale;
          state.vy *= scale;
        }

        // FIX #8: More aggressive velocity threshold
        const threshold = PHYSICS_CONFIG.velocityThreshold;
        if (Math.abs(state.vx) < threshold) state.vx = 0;
        if (Math.abs(state.vy) < threshold) state.vy = 0;

        // Only update position if moving
        if (state.vx !== 0 || state.vy !== 0) {
          state.x += state.vx;
          state.y += state.vy;
        }
      }

      // SOFT COLLISION SYSTEM v5: Near-contact spacing during drag
      // Uses soft repulsion with gradual force curve for natural, organic feel
      const DRAG_COLLISION_PADDING = SOFT_COLLISION_CONFIG.epsilonGap;
      const DRAG_SOFT_ZONE = DRAG_COLLISION_PADDING * SOFT_COLLISION_CONFIG.softZoneMultiplier;
      const DRAG_COLLISION_ITERATIONS = SOFT_COLLISION_CONFIG.softIterations;

      // Pre-compute radii for all nodes in the subgraph
      const nodeRadii = new Map<string, number>();
      for (const node of nodes) {
        if (dragState.subgraphNodes.has(node.id)) {
          nodeRadii.set(node.id, getNodeRadius(node));
        }
      }

      // Accumulate forces first, then apply (more stable)
      const collisionForces = new Map<string, { fx: number; fy: number }>();
      for (const [id] of dragState.physicsState) {
        collisionForces.set(id, { fx: 0, fy: 0 });
      }

      for (let iter = 0; iter < DRAG_COLLISION_ITERATIONS; iter++) {
        // Reset forces each iteration
        for (const [id] of collisionForces) {
          collisionForces.set(id, { fx: 0, fy: 0 });
        }

        const stateEntries = Array.from(dragState.physicsState.entries());

        for (let i = 0; i < stateEntries.length; i++) {
          for (let j = i + 1; j < stateEntries.length; j++) {
            const [idA, stateA] = stateEntries[i];
            const [idB, stateB] = stateEntries[j];

            // Skip if both are anchored
            if (stateA.isAnchored && stateB.isAnchored) continue;

            const dx = stateB.x - stateA.x;
            const dy = stateB.y - stateA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const radiusA = nodeRadii.get(idA) || 10;
            const radiusB = nodeRadii.get(idB) || 10;
            const minDistance = radiusA + radiusB + DRAG_COLLISION_PADDING;
            const softDistance = minDistance + DRAG_SOFT_ZONE;

            if (distance < softDistance) {
              // Calculate penetration depth (0 at soft edge, 1 at min, >1 when overlapping)
              const penetrationDepth = (softDistance - distance) / (softDistance - minDistance + 0.001);

              // Soft quadratic force curve
              const normalizedForce = Math.min(penetrationDepth, 3);
              const forceMagnitude = SOFT_COLLISION_CONFIG.baseRepulsionStrength *
                Math.pow(normalizedForce, SOFT_COLLISION_CONFIG.forceCurveExponent);

              const cappedForce = Math.min(forceMagnitude, SOFT_COLLISION_CONFIG.maxRepulsionStrength);

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

              // Asymmetric push - smaller bubbles move more
              const totalRadius = radiusA + radiusB;
              const pushRatioA = stateA.isAnchored ? 0 : (radiusB / totalRadius);
              const pushRatioB = stateB.isAnchored ? 0 : (radiusA / totalRadius);
              const totalPushRatio = pushRatioA + pushRatioB;

              if (totalPushRatio > 0) {
                const normalizedPushA = pushRatioA / totalPushRatio;
                const normalizedPushB = pushRatioB / totalPushRatio;

                const forceA = collisionForces.get(idA)!;
                const forceB = collisionForces.get(idB)!;
                forceA.fx -= dirX * cappedForce * normalizedPushA;
                forceA.fy -= dirY * cappedForce * normalizedPushA;
                forceB.fx += dirX * cappedForce * normalizedPushB;
                forceB.fy += dirY * cappedForce * normalizedPushB;
              }
            }
          }
        }

        // Apply accumulated forces with damping
        for (const [id, state] of dragState.physicsState) {
          if (state.isAnchored) continue;

          const force = collisionForces.get(id);
          if (!force) continue;

          // Apply force directly to position with damping
          const damping = SOFT_COLLISION_CONFIG.collisionDamping;
          const pushX = force.fx * (1 - damping);
          const pushY = force.fy * (1 - damping);

          // Clamp movement to prevent explosive behavior
          const pushMag = Math.sqrt(pushX * pushX + pushY * pushY);
          const maxPush = SOFT_COLLISION_CONFIG.maxCollisionVelocity;
          if (pushMag > maxPush) {
            const scale = maxPush / pushMag;
            state.x += pushX * scale;
            state.y += pushY * scale;
          } else {
            state.x += pushX;
            state.y += pushY;
          }
        }
      }

      // Final snap pass for guaranteed zero overlap
      for (let pass = 0; pass < SOFT_COLLISION_CONFIG.finalSnapIterations; pass++) {
        let hasOverlap = false;
        const stateEntries = Array.from(dragState.physicsState.entries());

        for (let i = 0; i < stateEntries.length; i++) {
          for (let j = i + 1; j < stateEntries.length; j++) {
            const [idA, stateA] = stateEntries[i];
            const [idB, stateB] = stateEntries[j];

            if (stateA.isAnchored && stateB.isAnchored) continue;

            const dx = stateB.x - stateA.x;
            const dy = stateB.y - stateA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const radiusA = nodeRadii.get(idA) || 10;
            const radiusB = nodeRadii.get(idB) || 10;
            const minDistance = radiusA + radiusB + DRAG_COLLISION_PADDING;

            if (distance < minDistance) {
              hasOverlap = true;
              const overlap = minDistance - distance + 0.5;

              let dirX = 1, dirY = 0;
              if (distance > 0.001) {
                dirX = dx / distance;
                dirY = dy / distance;
              }

              const totalRadius = radiusA + radiusB;
              const pushRatioA = stateA.isAnchored ? 0 : (radiusB / totalRadius);
              const pushRatioB = stateB.isAnchored ? 0 : (radiusA / totalRadius);
              const totalPushRatio = pushRatioA + pushRatioB;

              if (totalPushRatio > 0) {
                const normalizedPushA = pushRatioA / totalPushRatio;
                const normalizedPushB = pushRatioB / totalPushRatio;

                if (!stateA.isAnchored) {
                  stateA.x -= dirX * overlap * normalizedPushA;
                  stateA.y -= dirY * overlap * normalizedPushA;
                }
                if (!stateB.isAnchored) {
                  stateB.x += dirX * overlap * normalizedPushB;
                  stateB.y += dirY * overlap * normalizedPushB;
                }
              }
            }
          }
        }
        if (!hasOverlap) break;
      }
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (view.showGrid) {
        ctx.strokeStyle = themeConfig.gridColor;
        ctx.lineWidth = 1;
        const gridSize = 50 * view.zoom;
        for (let x = view.panX % gridSize; x < rect.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rect.height);
          ctx.stroke();
        }
        for (let y = view.panY % gridSize; y < rect.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(rect.width, y);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(view.panX, view.panY);
      ctx.scale(view.zoom, view.zoom);

      const dragState = dragStateRef.current;
      const isDragging = interactionStateRef.current === 'DRAGGING';
      const isAnimating = interactionStateRef.current === 'ANIMATING';

      // Draw links (only after animation starts showing them)
      const linkOpacity = isAnimating ? Math.min((Date.now() - (flowerAnimationRef.current?.startTime || 0)) / 500, 1) : 1;

      if (linkOpacity > 0) {
        ctx.globalAlpha = linkOpacity;
        for (const link of links) {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;

          const sourcePos = getNodePosition(sourceId);
          const targetPos = getNodePosition(targetId);

          if (!sourcePos || !targetPos) continue;
          // Skip links during animation if nodes aren't visible yet
          if (isAnimating && ((sourcePos.opacity ?? 1) < 0.1 || (targetPos.opacity ?? 1) < 0.1)) continue;

          const isActiveLink = isDragging &&
            dragState.subgraphNodes.has(sourceId) &&
            dragState.subgraphNodes.has(targetId);

          // Get source and target node radii
          const sourceNode = nodes.find(n => n.id === sourceId);
          const targetNode = nodes.find(n => n.id === targetId);
          const sourceRadius = sourceNode ? getNodeRadius(sourceNode) : 10;
          const targetRadius = targetNode ? getNodeRadius(targetNode) : 10;

          // Calculate direction from source to target
          const dx = targetPos.x - sourcePos.x;
          const dy = targetPos.y - sourcePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Skip if nodes are too close or overlapping
          if (distance < sourceRadius + targetRadius + 5) continue;

          const dirX = dx / distance;
          const dirY = dy / distance;

          // Calculate arrow positions - from source bubble edge to target bubble edge
          // Not too short (should connect) and not too long (elegant look)
          const edgeGap = 3; // Small gap from bubble edge for cleaner look
          const edgeStartX = sourcePos.x + dirX * (sourceRadius + edgeGap);
          const edgeStartY = sourcePos.y + dirY * (sourceRadius + edgeGap);

          // Arrow ends at target bubble edge (with small gap)
          const edgeEndX = targetPos.x - dirX * (targetRadius + edgeGap);
          const edgeEndY = targetPos.y - dirY * (targetRadius + edgeGap);

          // Calculate actual arrow length for dynamic effects
          const arrowLength = Math.sqrt(
            (edgeEndX - edgeStartX) ** 2 + (edgeEndY - edgeStartY) ** 2
          );

          // Get arrow config from animation settings
          // ULTRA-THIN arrows like Bubblemaps.io with rubber-band stretch effect
          const arrowConfig = view.animationConfig.arrowConfig ?? {
            headSize: 2.5,      // Small elegant arrowheads
            headAngle: 10,      // Narrow angle for sleek look
            lineWidth: 0.4,     // Ultra-thin base width
            showFlowAnimation: true,  // Enable subtle flow animation
            flowSpeed: 0.4,
            flowOpacity: 0.15,  // Subtle flow
            style: 'triangle' as const,
            curveStyle: 'straight' as const,
            showGlow: false,
            glowIntensity: 0.2,
            tapered: false,
            valueBasedOpacity: false,
            colorMode: 'accent' as const,
          };

          // For short arrows, use consistent sizing (no stretch effect needed)
          // The arrows are always short so they look consistent
          const dynamicLineWidth = arrowConfig.lineWidth;
          const dynamicHeadSize = arrowConfig.headSize;
          const dynamicOpacity = 0.85; // Good consistent opacity

          // Calculate arrow color based on colorMode
          const sourceNodeColor = sourceNode ? themeConfig.nodeColors[sourceNode.type] : themeConfig.accentColor;
          const targetNodeColor = targetNode ? themeConfig.nodeColors[targetNode.type] : themeConfig.accentColor;

          let arrowColor: string;
          switch (arrowConfig.colorMode) {
            case 'gradient':
              // Will use gradient - set base to accent
              arrowColor = themeConfig.accentColor;
              break;
            case 'source':
              arrowColor = sourceNodeColor;
              break;
            case 'target':
              arrowColor = targetNodeColor;
              break;
            case 'accent':
            default:
              arrowColor = themeConfig.accentColor;
              break;
          }

          // Calculate opacity based on value if enabled
          let linkOpacityMod = 1;
          if (arrowConfig.valueBasedOpacity) {
            // Normalize value (0-100 maps to 0.3-1.0 opacity)
            linkOpacityMod = 0.3 + Math.min(link.value / 100, 1) * 0.7;
          }

          // Use dynamic line width with subtle value-based scaling
          // RUBBER-BAND ARROWS: Thinner when stretched, more visible when compressed
          const baseWidth = dynamicLineWidth;
          const finalLineWidth = isActiveLink
            ? Math.min(baseWidth + link.value / 150, baseWidth + 0.3)
            : Math.min(baseWidth + link.value / 200, baseWidth + 0.2);

          // Use visible arrows for all links - not just active ones
          // Previous code used themeConfig.linkColor (very faint 20-40% opacity) for non-active links
          // Now ALL arrows use the accent color with good visibility
          const baseOpacity = isActiveLink ? dynamicOpacity : dynamicOpacity * 0.9;
          const lineColor = `${arrowColor}${Math.round(baseOpacity * linkOpacityMod * 255).toString(16).padStart(2, '0')}`;

          // Draw glow effect if enabled
          if (arrowConfig.showGlow && !isAnimating) {
            drawArrowGlow(
              ctx,
              edgeStartX,
              edgeStartY,
              edgeEndX,
              edgeEndY,
              arrowColor,
              arrowConfig.glowIntensity,
              finalLineWidth
            );
          }

          // Draw the connecting line based on curve style
          let curveControlX = edgeStartX;
          let curveControlY = edgeStartY;

          if (arrowConfig.curveStyle === 'curved') {
            // Draw curved bezier line
            const curveResult = drawCurvedArrowLine(
              ctx,
              sourcePos.x,
              sourcePos.y,
              targetPos.x,
              targetPos.y,
              sourceRadius,
              targetRadius,
              0.15, // curve intensity
              finalLineWidth,
              lineColor,
              arrowConfig.tapered
            );
            curveControlX = curveResult.controlX;
            curveControlY = curveResult.controlY;
          } else if (arrowConfig.curveStyle === 'arc') {
            // Draw arc line
            drawArcArrowLine(
              ctx,
              sourcePos.x,
              sourcePos.y,
              targetPos.x,
              targetPos.y,
              sourceRadius,
              targetRadius,
              finalLineWidth,
              lineColor
            );
          } else {
            // Straight line (default)
            if (arrowConfig.tapered) {
              // Draw tapered straight line
              const segments = 15;
              for (let i = 0; i < segments; i++) {
                const t1 = i / segments;
                const t2 = (i + 1) / segments;
                const x1 = edgeStartX + (edgeEndX - edgeStartX) * t1;
                const y1 = edgeStartY + (edgeEndY - edgeStartY) * t1;
                const x2 = edgeStartX + (edgeEndX - edgeStartX) * t2;
                const y2 = edgeStartY + (edgeEndY - edgeStartY) * t2;
                const width = finalLineWidth * (1 - t1 * 0.6);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.stroke();
              }
            } else {
              ctx.beginPath();
              ctx.moveTo(edgeStartX, edgeStartY);
              ctx.lineTo(edgeEndX, edgeEndY);

              // Use gradient color if colorMode is gradient
              if (arrowConfig.colorMode === 'gradient') {
                const gradient = ctx.createLinearGradient(edgeStartX, edgeStartY, edgeEndX, edgeEndY);
                gradient.addColorStop(0, `${sourceNodeColor}aa`);
                gradient.addColorStop(1, `${targetNodeColor}aa`);
                ctx.strokeStyle = gradient;
              } else {
                ctx.strokeStyle = lineColor;
              }
              ctx.lineWidth = finalLineWidth;
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          }

          // Draw arrowhead with configurable style
          // Arrowhead opacity also responds to stretch
          const arrowHeadColor = `${arrowColor}${Math.round(dynamicOpacity * 0.9 * linkOpacityMod * 255).toString(16).padStart(2, '0')}`;

          if (arrowConfig.curveStyle === 'curved') {
            // For curved arrows, use bezier arrowhead
            drawBezierArrowhead(
              ctx,
              curveControlX,
              curveControlY,
              targetPos.x,
              targetPos.y,
              targetRadius + 1,
              dynamicHeadSize,
              arrowHeadColor
            );
          } else {
            // Draw arrowhead at the END of our short arrow stub
            // Pass 0 as targetRadius since edgeEndX/Y is already the tip position
            drawArrowhead(
              ctx,
              edgeStartX,
              edgeStartY,
              edgeEndX,
              edgeEndY,
              0, // No offset needed - edgeEnd IS the tip
              dynamicHeadSize,
              arrowHeadColor,
              arrowConfig.headAngle,
              (arrowConfig.style || 'triangle') as ArrowStyleType
            );
          }

          // Configurable flow animation - subtle pulse along the arrow
          // Flow intensity also responds to stretch (more visible when compressed)
          if (arrowConfig.showFlowAnimation) {
            const gradient = ctx.createLinearGradient(edgeStartX, edgeStartY, edgeEndX, edgeEndY);
            const time = Date.now() / 1000;
            const offset = (time * arrowConfig.flowSpeed) % 1;
            // Flow is more visible when arrow is compressed
            const flowOpacity = arrowConfig.flowOpacity;
            const opacityHex = Math.round(flowOpacity * 255).toString(16).padStart(2, '0');
            gradient.addColorStop(Math.max(0, offset - 0.04), "transparent");
            gradient.addColorStop(offset, `${arrowColor}${opacityHex}`);
            gradient.addColorStop(Math.min(1, offset + 0.04), "transparent");
            ctx.strokeStyle = gradient;
            ctx.lineWidth = dynamicLineWidth + 0.15;
            ctx.beginPath();
            ctx.moveTo(edgeStartX, edgeStartY);
            ctx.lineTo(edgeEndX, edgeEndY);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // Draw clusters
      if (view.enableClustering && clusters.length > 0) {
        for (const cluster of clusters) {
          ctx.beginPath();
          ctx.arc(cluster.x, cluster.y, cluster.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${themeConfig.accentColor}15`;
          ctx.fill();
          ctx.strokeStyle = `${themeConfig.accentColor}40`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = themeConfig.textColor;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(cluster.label, cluster.x, cluster.y - cluster.radius - 8);
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pos = getNodePosition(node.id);
        if (!pos) continue;

        // Get animation properties
        const scale = (pos as { scale?: number }).scale ?? 1;
        const opacity = (pos as { opacity?: number }).opacity ?? 1;

        // Skip invisible nodes during animation
        if (opacity <= 0 || scale <= 0) continue;

        ctx.globalAlpha = opacity;

        if (view.enableClustering && clusteredNodeMap.has(node.id)) {
          const radius = getNodeRadius(node) * 0.5 * scale;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = themeConfig.nodeColors[node.type];
          ctx.globalAlpha = 0.5 * opacity;
          ctx.fill();
          ctx.globalAlpha = opacity;
          continue;
        }

        const baseRadius = getNodeRadius(node);
        const radius = baseRadius * scale;
        const nodeColor = themeConfig.nodeColors[node.type];
        const isSelected = view.selectedNodeId === node.id;
        const isMultiSelected = view.selectedNodeIds.includes(node.id);
        const isHovered = view.hoveredNodeId === node.id;
        const isDraggedNode = dragState.nodeId === node.id || (dragState.isGroupDrag && dragState.groupNodeIds.includes(node.id));
        const isInSubgraph = isDragging && dragState.subgraphNodes.has(node.id);
        const distance = dragState.distances.get(node.id) ?? 0;
        const physicsState = dragState.physicsState.get(node.id);
        const influence = physicsState?.influence ?? 0;

        // Debug overlay: draw collision boundary (shows soft collision epsilon gap)
        if (showDebugOverlay && !isAnimating) {
          const collisionRadius = baseRadius + SOFT_COLLISION_CONFIG.epsilonGap; // 2px epsilon gap
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, collisionRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Also show the soft zone (where gentle repulsion starts)
          const softZoneRadius = baseRadius + SOFT_COLLISION_CONFIG.epsilonGap * SOFT_COLLISION_CONFIG.softZoneMultiplier;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, softZoneRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw multi-selection ring
        if (isMultiSelected && !isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = `${themeConfig.accentColor}80`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isSelected || isHovered || isDraggedNode) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 12, 0, Math.PI * 2);
          const glowGradient = ctx.createRadialGradient(pos.x, pos.y, radius, pos.x, pos.y, radius + 12);
          glowGradient.addColorStop(0, nodeColor);
          glowGradient.addColorStop(1, "transparent");
          ctx.fillStyle = glowGradient;
          ctx.fill();
        }

        if (isInSubgraph && !isDraggedNode && influence > 0) {
          const ringRadius = radius + 3 + (influence * 8);
          const alphaValue = Math.max(30, Math.round(influence * 180 * opacity));
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `${themeConfig.accentColor}${alphaValue.toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.5 + influence * 3;
          ctx.stroke();

          if (distance === 1) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(pos.x, pos.y, radius, pos.x, pos.y, radius + 8);
            glow.addColorStop(0, `${themeConfig.accentColor}40`);
            glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow;
            ctx.fill();
          }
        }

        const displayRadius = isDraggedNode ? radius * 1.15 : radius;

        // Check if node has a logo to display
        const hasLogo = node.logoUrl && (node.type === 'exchange' || node.type === 'contract' || node.type === 'defi' || node.type === 'mixer' || node.type === 'whale');
        const logoImage = hasLogo ? getImageSync(node.logoUrl!) : null;

        // Draw the bubble base
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Draw logo inside bubble if available
        if (logoImage && displayRadius > 8) {
          ctx.save();

          // Create circular clipping path for the logo
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, displayRadius * 0.75, 0, Math.PI * 2);
          ctx.clip();

          // Draw the logo image centered in the bubble
          const logoSize = displayRadius * 1.5;
          const logoX = pos.x - logoSize / 2;
          const logoY = pos.y - logoSize / 2;

          try {
            ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
          } catch (e) {
            // Image failed to draw, skip
          }

          ctx.restore();

          // Draw a subtle border around the logo area
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, displayRadius * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = `${nodeColor}60`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (hasLogo && !logoImage) {
          // Logo is loading, show a loading indicator
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, displayRadius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * opacity})`;
          ctx.fill();

          // Start loading the image in background
          if (node.logoUrl) {
            getCachedImage(node.logoUrl);
          }
        }

        // Highlight bubble (only for nodes without logo or small nodes)
        if (!logoImage || displayRadius <= 8) {
          ctx.beginPath();
          ctx.arc(pos.x - displayRadius * 0.3, pos.y - displayRadius * 0.3, displayRadius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * opacity})`;
          ctx.fill();
        }

        // Draw outer ring for nodes with logos
        if (hasLogo) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, displayRadius, 0, Math.PI * 2);
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (node.riskScore > 70) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, displayRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ff4444";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (view.showLabels && (isSelected || isHovered || isDraggedNode || node.type === 'exchange' || node.type === 'contract' || node.type === 'defi') && opacity > 0.5) {
          ctx.fillStyle = themeConfig.textColor;
          ctx.font = isDraggedNode ? "bold 11px sans-serif" : "10px sans-serif";
          ctx.textAlign = "center";
          const label = node.label || `${node.address.slice(0, 6)}...${node.address.slice(-4)}`;
          ctx.fillText(label, pos.x, pos.y + displayRadius + 14);
        }

        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Draw lasso selection rectangle (in screen space, after restore)
      if (interactionStateRef.current === 'LASSO_SELECTING' && lassoStateRef.current.active) {
        const lasso = lassoStateRef.current;
        const lRect = canvas.getBoundingClientRect();
        const x1 = lasso.startX - lRect.left;
        const y1 = lasso.startY - lRect.top;
        const x2 = lasso.currentX - lRect.left;
        const y2 = lasso.currentY - lRect.top;
        const width = x2 - x1;
        const height = y2 - y1;

        ctx.fillStyle = `${themeConfig.accentColor}15`;
        ctx.fillRect(x1, y1, width, height);

        ctx.strokeStyle = themeConfig.accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(x1, y1, width, height);
        ctx.setLineDash([]);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    const findNodeAtPosition = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - view.panX) / view.zoom;
      const y = (clientY - rect.top - view.panY) / view.zoom;

      const sortedNodes = [...nodes].sort((a, b) => getNodeRadius(b) - getNodeRadius(a));

      for (const node of sortedNodes) {
        const pos = getNodePosition(node.id);
        if (!pos) continue;
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < getNodeRadius(node) + 5) return node.id;
      }
      return null;
    };

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - view.panX) / view.zoom,
        y: (clientY - rect.top - view.panY) / view.zoom,
      };
    };

    const startNodeDrag = (nodeId: string, clientX: number, clientY: number, pointerId: number) => {
      const coords = getCanvasCoords(clientX, clientY);

      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }

      // Group drag support: if node is in selectedNodeIds, drag all selected nodes
      const isGroupDrag = view.selectedNodeIds.length > 1 && view.selectedNodeIds.includes(nodeId);
      const groupNodeIds = isGroupDrag ? view.selectedNodeIds : [];
      const groupInitialOffsets = new Map<string, { dx: number; dy: number }>();

      const initialPositions = new Map<string, { x: number; y: number }>();
      for (const [id, pos] of positionsRef.current) {
        initialPositions.set(id, { x: pos.x, y: pos.y });
      }

      let subgraphNodes: Set<string>;
      let distances: Map<string, number>;
      let physicsState: Map<string, NodePhysicsState>;

      if (isGroupDrag) {
        // For group drag, subgraph is union of all selected nodes' subgraphs
        subgraphNodes = new Set<string>();
        distances = new Map<string, number>();
        for (const gid of groupNodeIds) {
          const sg = getSubgraphNodes(gid, nodes, links);
          sg.forEach(nid => subgraphNodes.add(nid));
          const dists = calculateDistances(gid, nodes, links);
          for (const [nid, dist] of dists) {
            if (!distances.has(nid) || dist < distances.get(nid)!) {
              distances.set(nid, dist);
            }
          }
        }
        physicsState = initializePhysicsState(nodes, nodeId, subgraphNodes, distances);

        // Calculate initial offsets for each group node
        for (const gid of groupNodeIds) {
          const pos = initialPositions.get(gid);
          if (pos) {
            groupInitialOffsets.set(gid, {
              dx: pos.x - initialPositions.get(nodeId)!.x,
              dy: pos.y - initialPositions.get(nodeId)!.y,
            });
          }
        }
      } else {
        subgraphNodes = getSubgraphNodes(nodeId, nodes, links);
        distances = calculateDistances(nodeId, nodes, links);
        physicsState = initializePhysicsState(nodes, nodeId, subgraphNodes, distances);
      }

      dragStateRef.current = {
        nodeId,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        subgraphNodes,
        distances,
        initialPositions,
        physicsState,
        pointerDownTime: Date.now(),
        pointerDownX: clientX,
        pointerDownY: clientY,
        pointerId,
        isGroupDrag,
        groupNodeIds,
        groupInitialOffsets,
      };

      // FIX #7: Enable physics ONLY during active drag
      physicsEnabledRef.current = true;
      interactionStateRef.current = 'DRAGGING';

      try { canvas.setPointerCapture(pointerId); } catch (e) {}
    };

    const updateNodeDrag = (clientX: number, clientY: number) => {
      if (interactionStateRef.current !== 'DRAGGING') return;
      const coords = getCanvasCoords(clientX, clientY);
      dragStateRef.current.currentX = coords.x;
      dragStateRef.current.currentY = coords.y;
      runPhysicsStep();
    };

    const endNodeDrag = () => {
      // FIX #7: Immediately disable physics - no more updates can happen
      physicsEnabledRef.current = false;

      if (interactionStateRef.current !== 'DRAGGING') return;

      const dragState = dragStateRef.current;
      if (dragState.pointerId !== null) {
        try { canvas.releasePointerCapture(dragState.pointerId); } catch (e) {}
      }

      // Get animation config from view
      const animConfig = view.animationConfig;

      // If animation is disabled, do instant stop
      if (!animConfig.enabled || animConfig.easingType === 'none') {
        // FIX v3: Only update positions for nodes in the subgraph
        // Nodes OUTSIDE the subgraph must keep their EXACT original positions

        // First, collect subgraph positions and run LOCAL collision resolution
        const subgraphPositions = new Map<string, { x: number; y: number }>();
        const subgraphRadii = new Map<string, number>();

        for (const nodeId of dragState.subgraphNodes) {
          const physicsState = dragState.physicsState.get(nodeId);
          if (physicsState) {
            subgraphPositions.set(nodeId, { x: physicsState.x, y: physicsState.y });
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              subgraphRadii.set(nodeId, getNodeRadius(node));
            }
          }
        }

        // Run LOCAL collision resolution on subgraph only (15 iterations)
        const LOCAL_PADDING = 30;
        for (let iter = 0; iter < 15; iter++) {
          const entries = Array.from(subgraphPositions.entries());
          for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
              const [idA, posA] = entries[i];
              const [idB, posB] = entries[j];

              const dx = posB.x - posA.x;
              const dy = posB.y - posA.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              const radiusA = subgraphRadii.get(idA) || 10;
              const radiusB = subgraphRadii.get(idB) || 10;
              const minDistance = radiusA + radiusB + LOCAL_PADDING;

              if (distance < minDistance && distance > 0.001) {
                const overlap = minDistance - distance + 2;
                const dirX = dx / distance;
                const dirY = dy / distance;

                // Skip the dragged node - it's anchored
                const isAnchoredA = idA === dragState.nodeId;
                const isAnchoredB = idB === dragState.nodeId;

                if (!isAnchoredA && !isAnchoredB) {
                  posA.x -= dirX * overlap / 2;
                  posA.y -= dirY * overlap / 2;
                  posB.x += dirX * overlap / 2;
                  posB.y += dirY * overlap / 2;
                } else if (!isAnchoredA) {
                  posA.x -= dirX * overlap;
                  posA.y -= dirY * overlap;
                } else if (!isAnchoredB) {
                  posB.x += dirX * overlap;
                  posB.y += dirY * overlap;
                }
              }
            }
          }
        }

        const updatedNodes = nodes.map(node => {
          // Check if this node is in the drag subgraph
          if (dragState.subgraphNodes.has(node.id)) {
            // This node was part of the drag - use resolved position
            const resolvedPos = subgraphPositions.get(node.id);
            if (resolvedPos) {
              // Update positions ref
              positionsRef.current.set(node.id, { x: resolvedPos.x, y: resolvedPos.y });
              return { ...node, x: resolvedPos.x, y: resolvedPos.y, fx: resolvedPos.x, fy: resolvedPos.y };
            }
          }

          // FIX: Node is NOT in subgraph - restore to EXACT original position
          const originalPos = dragState.initialPositions.get(node.id);
          if (originalPos) {
            // Ensure position ref matches original
            positionsRef.current.set(node.id, { x: originalPos.x, y: originalPos.y });
            return { ...node, x: originalPos.x, y: originalPos.y, fx: originalPos.x, fy: originalPos.y };
          }

          // Fallback: use existing position
          const existingPos = positionsRef.current.get(node.id);
          if (existingPos) {
            return { ...node, x: existingPos.x, y: existingPos.y, fx: existingPos.x, fy: existingPos.y };
          }
          return { ...node, fx: node.x, fy: node.y };
        });

        setNodes(updatedNodes);
        dragStateRef.current = createEmptyDragState();
        interactionStateRef.current = 'IDLE';

        // Save to history
        let label = "";
        if (dragState.isGroupDrag && dragState.groupNodeIds.length > 1) {
          label = `${dragState.groupNodeIds.length} nodes moved`;
        } else {
          const draggedNode = nodes.find(n => n.id === dragState.nodeId);
          label = draggedNode?.label || dragState.nodeId?.slice(0, 8) || 'node';
        }
        if (typeof window !== 'undefined') {
          const win = window as unknown as { saveGraphState?: (desc: string) => void };
          if (win.saveGraphState) {
            win.saveGraphState(`Node moved: ${label}`);
          }
        }
        return;
      }

      // Start release animation with easing
      const nodePositions = new Map<string, { startX: number; startY: number; targetX: number; targetY: number; vx: number; vy: number }>();

      for (const [nodeId, physicsState] of dragState.physicsState) {
        // FIX: Only animate nodes in the subgraph - others stay at original position
        if (!dragState.subgraphNodes.has(nodeId)) continue;

        // Calculate target position with momentum
        const momentumFactor = animConfig.releaseVelocityFactor;
        const targetX = physicsState.x + physicsState.vx * momentumFactor * 10;
        const targetY = physicsState.y + physicsState.vy * momentumFactor * 10;

        nodePositions.set(nodeId, {
          startX: physicsState.x,
          startY: physicsState.y,
          targetX,
          targetY,
          vx: physicsState.vx,
          vy: physicsState.vy,
        });
      }

      releaseAnimationRef.current = {
        active: true,
        startTime: Date.now(),
        duration: animConfig.animationDuration,
        nodePositions,
        easingType: animConfig.easingType,
      };

      interactionStateRef.current = 'RELEASING';

      // Schedule finalization after animation completes
      setTimeout(() => {
        if (interactionStateRef.current !== 'RELEASING') return;

        // FIX v3: Only update positions for nodes in the subgraph
        // Nodes OUTSIDE the subgraph must keep their EXACT original positions

        // First, collect target positions and run LOCAL collision resolution
        const subgraphPositions = new Map<string, { x: number; y: number }>();
        const subgraphRadii = new Map<string, number>();

        for (const [nodeId, animState] of releaseAnimationRef.current.nodePositions) {
          subgraphPositions.set(nodeId, { x: animState.targetX, y: animState.targetY });
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            subgraphRadii.set(nodeId, getNodeRadius(node));
          }
        }

        // Run LOCAL collision resolution on subgraph only (15 iterations)
        const LOCAL_PADDING = 30;
        for (let iter = 0; iter < 15; iter++) {
          const entries = Array.from(subgraphPositions.entries());
          for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
              const [idA, posA] = entries[i];
              const [idB, posB] = entries[j];

              const dx = posB.x - posA.x;
              const dy = posB.y - posA.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              const radiusA = subgraphRadii.get(idA) || 10;
              const radiusB = subgraphRadii.get(idB) || 10;
              const minDistance = radiusA + radiusB + LOCAL_PADDING;

              if (distance < minDistance && distance > 0.001) {
                const overlap = minDistance - distance + 2;
                const dirX = dx / distance;
                const dirY = dy / distance;

                // Skip the dragged node - it's anchored
                const isAnchoredA = idA === dragState.nodeId;
                const isAnchoredB = idB === dragState.nodeId;

                if (!isAnchoredA && !isAnchoredB) {
                  posA.x -= dirX * overlap / 2;
                  posA.y -= dirY * overlap / 2;
                  posB.x += dirX * overlap / 2;
                  posB.y += dirY * overlap / 2;
                } else if (!isAnchoredA) {
                  posA.x -= dirX * overlap;
                  posA.y -= dirY * overlap;
                } else if (!isAnchoredB) {
                  posB.x += dirX * overlap;
                  posB.y += dirY * overlap;
                }
              }
            }
          }
        }

        const finalNodes = nodes.map(node => {
          // Check if this node was animated (part of subgraph)
          const resolvedPos = subgraphPositions.get(node.id);
          if (resolvedPos) {
            // Update positions ref
            positionsRef.current.set(node.id, { x: resolvedPos.x, y: resolvedPos.y });
            return { ...node, x: resolvedPos.x, y: resolvedPos.y, fx: resolvedPos.x, fy: resolvedPos.y };
          }

          // FIX: Node was NOT animated - restore to EXACT original position
          const originalPos = dragState.initialPositions.get(node.id);
          if (originalPos) {
            // Ensure position ref matches original
            positionsRef.current.set(node.id, { x: originalPos.x, y: originalPos.y });
            return { ...node, x: originalPos.x, y: originalPos.y, fx: originalPos.x, fy: originalPos.y };
          }

          // Fallback: use existing position
          const existingPos = positionsRef.current.get(node.id);
          if (existingPos) {
            return { ...node, x: existingPos.x, y: existingPos.y, fx: existingPos.x, fy: existingPos.y };
          }
          return { ...node, fx: node.x, fy: node.y };
        });

        setNodes(finalNodes);
        releaseAnimationRef.current = createEmptyReleaseState();
        dragStateRef.current = createEmptyDragState();
        interactionStateRef.current = 'IDLE';

        // Save to history for undo/redo support
        let label = "";
        if (dragState.isGroupDrag && dragState.groupNodeIds.length > 1) {
          label = `${dragState.groupNodeIds.length} nodes moved`;
        } else {
          const draggedNode = nodes.find(n => n.id === dragState.nodeId);
          label = draggedNode?.label || dragState.nodeId?.slice(0, 8) || 'node';
        }
        if (typeof window !== 'undefined') {
          const win = window as unknown as { saveGraphState?: (desc: string) => void };
          if (win.saveGraphState) {
            win.saveGraphState(`Node moved: ${label}`);
          }
        }
      }, animConfig.animationDuration + 50);
    };

    let pendingNodeId: string | null = null;
    let pendingPointerId: number | null = null;
    let isPanning = false;
    let panStartPos: { x: number; y: number } | null = null;
    let panStartView = { x: view.panX, y: view.panY };

    // Helper to find nodes inside lasso rectangle
    const findNodesInLasso = (): string[] => {
      const lasso = lassoStateRef.current;
      if (!lasso.active) return [];

      const rect = canvas.getBoundingClientRect();
      // Convert lasso coords to canvas coords
      const x1 = (Math.min(lasso.startX, lasso.currentX) - rect.left - view.panX) / view.zoom;
      const y1 = (Math.min(lasso.startY, lasso.currentY) - rect.top - view.panY) / view.zoom;
      const x2 = (Math.max(lasso.startX, lasso.currentX) - rect.left - view.panX) / view.zoom;
      const y2 = (Math.max(lasso.startY, lasso.currentY) - rect.top - view.panY) / view.zoom;

      const selectedIds: string[] = [];
      for (const node of nodes) {
        const pos = positionsRef.current.get(node.id);
        if (pos && pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2) {
          selectedIds.push(node.id);
        }
      }
      return selectedIds;
    };

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const foundNode = findNodeAtPosition(e.clientX, e.clientY);

      dragStateRef.current.pointerDownTime = Date.now();
      dragStateRef.current.pointerDownX = e.clientX;
      dragStateRef.current.pointerDownY = e.clientY;

      if (foundNode) {
        pendingNodeId = foundNode;
        pendingPointerId = e.pointerId;
        interactionStateRef.current = 'PENDING_DRAG';
      } else {
        // Alt+drag or right-click drag for lasso selection
        if (e.altKey || e.button === 2) {
          lassoStateRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            addToSelection: e.shiftKey,
          };
          interactionStateRef.current = 'LASSO_SELECTING';
          canvas.style.cursor = "crosshair";
        } else {
          isPanning = true;
          panStartPos = { x: e.clientX, y: e.clientY };
          panStartView = { x: view.panX, y: view.panY };
          canvas.style.cursor = "grabbing";
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (interactionStateRef.current === 'PENDING_DRAG' && pendingNodeId) {
        const dx = e.clientX - dragStateRef.current.pointerDownX;
        const dy = e.clientY - dragStateRef.current.pointerDownY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_DISTANCE) {
          startNodeDrag(pendingNodeId, dragStateRef.current.pointerDownX, dragStateRef.current.pointerDownY, pendingPointerId!);
          canvas.style.cursor = "grabbing";
        }
      }

      if (interactionStateRef.current === 'DRAGGING') {
        updateNodeDrag(e.clientX, e.clientY);
        return;
      }

      // Lasso selection
      if (interactionStateRef.current === 'LASSO_SELECTING') {
        lassoStateRef.current.currentX = e.clientX;
        lassoStateRef.current.currentY = e.clientY;
        return;
      }

      if (isPanning && panStartPos) {
        const dx = e.clientX - panStartPos.x;
        const dy = e.clientY - panStartPos.y;
        setView({ panX: panStartView.x + dx, panY: panStartView.y + dy });
        return;
      }

      if (interactionStateRef.current === 'IDLE') {
        const foundNode = findNodeAtPosition(e.clientX, e.clientY);
        hoverNode(foundNode);
        canvas.style.cursor = foundNode ? "pointer" : "grab";
        // Track mouse position for tooltip
        if (foundNode) {
          setMousePos({ x: e.clientX, y: e.clientY });
        } else {
          setMousePos(null);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - dragStateRef.current.pointerDownX;
      const dy = e.clientY - dragStateRef.current.pointerDownY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - dragStateRef.current.pointerDownTime;

      if (interactionStateRef.current === 'DRAGGING') {
        endNodeDrag();
      } else if (interactionStateRef.current === 'LASSO_SELECTING') {
        // Complete lasso selection
        const nodesInLasso = findNodesInLasso();
        if (nodesInLasso.length > 0) {
          if (lassoStateRef.current.addToSelection) {
            // Add to existing selection
            const newSelection = [...new Set([...view.selectedNodeIds, ...nodesInLasso])];
            selectMultipleNodes(newSelection);
          } else {
            selectMultipleNodes(nodesInLasso);
          }
        }
        lassoStateRef.current = createEmptyLassoState();
        interactionStateRef.current = 'IDLE';
      } else if (interactionStateRef.current === 'PENDING_DRAG' && pendingNodeId) {
        if (distance < DRAG_THRESHOLD_DISTANCE && elapsed < DRAG_THRESHOLD_TIME) {
          // Multi-select support: Shift+click adds to selection, Ctrl+click toggles
          if (e.shiftKey) {
            addNodeToSelection(pendingNodeId);
          } else if (e.ctrlKey || e.metaKey) {
            toggleNodeSelection(pendingNodeId);
          } else {
            selectNode(pendingNodeId);
          }
        }
        interactionStateRef.current = 'IDLE';
      } else if (!isPanning && !pendingNodeId) {
        const foundNode = findNodeAtPosition(e.clientX, e.clientY);
        if (!foundNode) clearSelection();
      }

      // FIX #8: Always ensure physics is disabled on pointer up
      physicsEnabledRef.current = false;

      pendingNodeId = null;
      pendingPointerId = null;
      isPanning = false;
      panStartPos = null;
      canvas.style.cursor = "grab";
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setView({ zoom: Math.min(Math.max(view.zoom * zoomFactor, 0.3), 3) });
    };

    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    let lastTouchDistance: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistance = getTouchDistance(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance !== null) {
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches);
        setView({ zoom: Math.min(Math.max(view.zoom * (newDistance / lastTouchDistance), 0.3), 3) });
        lastTouchDistance = newDistance;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastTouchDistance = null;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, links, theme, view, getNodeRadius, selectNode, toggleNodeSelection, addNodeToSelection, clearSelection, selectMultipleNodes, hoverNode, setView, setNodes, themeConfig, getTouchDistance, clusters, clusteredNodeMap, bundledEdges, showDebugOverlay]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ background: themeConfig.backgroundGradient }}
      />

      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        {/* Debug overlay toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDebugOverlay(!showDebugOverlay)}
          className={`p-2.5 rounded-xl glass border transition-all duration-300 ${
            showDebugOverlay
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-white/10 hover:border-white/30'
          }`}
          title="Toggle collision debug overlay"
        >
          {showDebugOverlay ? (
            <EyeOff className="w-4 h-4 text-red-400" />
          ) : (
            <Eye className="w-4 h-4 text-gray-400" />
          )}
        </motion.button>

        {/* Reset layout button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetLayout}
          className="p-2.5 rounded-xl glass border border-white/10 hover:border-[#00ff88]/50 transition-all duration-300"
          title="Reset layout with flower animation"
        >
          <RotateCcw className="w-4 h-4" style={{ color: themeConfig.accentColor }} />
        </motion.button>
      </div>

      <AnimatePresence>
        {/* Animation status indicator */}
        {interactionStateRef.current === 'ANIMATING' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-full text-xs text-gray-300 flex items-center gap-2 z-20"
          >
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            Arranging bubbles...
          </motion.div>
        )}

        {(view.enableClustering || view.enableEdgeBundling || view.selectedNodeIds.length > 1) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 flex gap-2"
          >
            {view.selectedNodeIds.length > 1 && (
              <div className="glass px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {view.selectedNodeIds.length} selected
                <button
                  onClick={() => clearSelection()}
                  className="ml-1 hover:text-white transition-colors"
                  title="Clear selection (Esc)"
                >
                  x
                </button>
              </div>
            )}
            {view.enableClustering && clusters.length > 0 && (
              <div className="glass px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {clusters.length} clusters
              </div>
            )}
            {view.enableEdgeBundling && (
              <div className="glass px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Edge bundling
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTouchHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-full text-xs text-gray-400 pointer-events-none"
          >
            <span className="flex items-center gap-2">
              <span className="lg:hidden">Drag bubble to move - Pinch to zoom</span>
              <span className="hidden lg:inline">Shift+Click multi-select - Alt+Drag lasso - Ctrl+A select all - Esc clear</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {view.hoveredNodeId && mousePos && (() => {
          const hoveredNode = nodes.find(n => n.id === view.hoveredNodeId);
          if (!hoveredNode || view.selectedNodeId === hoveredNode.id) return null;

          const riskInfo = getRiskLevel(hoveredNode.riskScore);
          const nodeColor = themeConfig.nodeColors[hoveredNode.type];

          return (
            <motion.div
              key={hoveredNode.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 pointer-events-none"
              style={{
                left: Math.min(mousePos.x + 16, window.innerWidth - 280),
                top: Math.min(mousePos.y + 16, window.innerHeight - 200),
              }}
            >
              <div className="w-64 p-3 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl"
                style={{ background: 'rgba(10, 10, 15, 0.95)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      background: `${nodeColor}20`,
                      color: nodeColor,
                      border: `1px solid ${nodeColor}40`,
                    }}
                  >
                    {getNodeTypeLabel(hoveredNode.type).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {hoveredNode.label || getNodeTypeLabel(hoveredNode.type)}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {shortenAddress(hoveredNode.address)}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                    <Wallet className="w-3.5 h-3.5 text-[#00ff88]" />
                    <div>
                      <p className="text-[10px] text-gray-500">Balance</p>
                      <p className="text-xs font-medium text-white">{formatETH(hoveredNode.balance)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                    <Shield className="w-3.5 h-3.5" style={{ color: riskInfo.color }} />
                    <div>
                      <p className="text-[10px] text-gray-500">Risk</p>
                      <p className="text-xs font-medium" style={{ color: riskInfo.color }}>
                        {riskInfo.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                    <Activity className="w-3.5 h-3.5 text-[#00ffff]" />
                    <div>
                      <p className="text-[10px] text-gray-500">Transactions</p>
                      <p className="text-xs font-medium text-white">{hoveredNode.transactionCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#ff00ff]" />
                    <div>
                      <p className="text-[10px] text-gray-500">Type</p>
                      <p className="text-xs font-medium text-white">{getNodeTypeLabel(hoveredNode.type)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-500">Click to select</span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    View on explorer
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
