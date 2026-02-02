"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Maximize2, Minimize2, Move, Map, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { nodes, links, view, setView, theme, getFilteredNodes, getFilteredLinks } = useCryptoVizStore();
  const themeConfig = themes[theme];

  // Mini-map dimensions - larger for better visibility
  const miniMapWidth = isExpanded ? 240 : 120;
  const miniMapHeight = isExpanded ? 180 : 90;

  // Draw the mini-map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const filteredNodes = getFilteredNodes();
    const filteredLinks = getFilteredLinks();

    // Clear canvas
    ctx.clearRect(0, 0, miniMapWidth, miniMapHeight);

    // Draw background with improved gradient for better visibility
    const bgGradient = ctx.createLinearGradient(0, 0, miniMapWidth, miniMapHeight);
    bgGradient.addColorStop(0, "rgba(10, 10, 20, 0.98)");
    bgGradient.addColorStop(1, "rgba(5, 5, 15, 0.98)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, miniMapWidth, miniMapHeight);

    // Draw improved grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    const gridSize = 25;
    for (let x = 0; x < miniMapWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, miniMapHeight);
      ctx.stroke();
    }
    for (let y = 0; y < miniMapHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(miniMapWidth, y);
      ctx.stroke();
    }

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of filteredNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    }

    // Add padding
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const scaleX = miniMapWidth / (maxX - minX || 1);
    const scaleY = miniMapHeight / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY) * 0.85;

    const offsetX = (miniMapWidth - (maxX - minX) * scale) / 2;
    const offsetY = (miniMapHeight - (maxY - minY) * scale) / 2;

    // Transform function
    const transform = (x: number, y: number) => ({
      x: (x - minX) * scale + offsetX,
      y: (y - minY) * scale + offsetY,
    });

    // Draw links with glow effect
    ctx.lineCap = "round";
    for (const link of filteredLinks) {
      const source = typeof link.source === "string"
        ? filteredNodes.find(n => n.id === link.source)
        : link.source;
      const target = typeof link.target === "string"
        ? filteredNodes.find(n => n.id === link.target)
        : link.target;

      if (source?.x !== undefined && source?.y !== undefined &&
          target?.x !== undefined && target?.y !== undefined) {
        const p1 = transform(source.x, source.y);
        const p2 = transform(target.x, target.y);

        ctx.strokeStyle = `${themeConfig.linkColor}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Draw nodes with enhanced glow
    for (const node of filteredNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        const p = transform(node.x, node.y);
        const color = themeConfig.nodeColors[node.type];
        const isSelected = view.selectedNodeId === node.id;
        const radius = isSelected ? 6 : 4;

        // Outer glow effect
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius + 4);
        glow.addColorStop(0, `${color}60`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Draw viewport rectangle with improved visibility
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = (maxX + minX) / 2 - view.panX / view.zoom;
    const centerY = (maxY + minY) / 2 - view.panY / view.zoom;
    const vpWidth = viewportWidth / view.zoom;
    const vpHeight = viewportHeight / view.zoom;

    const vpTopLeft = transform(centerX - vpWidth / 2, centerY - vpHeight / 2);
    const vpBottomRight = transform(centerX + vpWidth / 2, centerY + vpHeight / 2);

    const vpRectWidth = vpBottomRight.x - vpTopLeft.x;
    const vpRectHeight = vpBottomRight.y - vpTopLeft.y;

    // Viewport fill
    ctx.fillStyle = `${themeConfig.accentColor}20`;
    ctx.fillRect(vpTopLeft.x, vpTopLeft.y, vpRectWidth, vpRectHeight);

    // Viewport border with glow
    ctx.shadowColor = themeConfig.accentColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = themeConfig.accentColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(vpTopLeft.x, vpTopLeft.y, vpRectWidth, vpRectHeight);
    ctx.shadowBlur = 0;

  }, [nodes, links, view, theme, miniMapWidth, miniMapHeight, themeConfig, getFilteredNodes, getFilteredLinks, isVisible]);

  // Handle mini-map click/drag to navigate
  const handleInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const filteredNodes = getFilteredNodes();

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of filteredNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    }

    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const scaleX = miniMapWidth / (maxX - minX || 1);
    const scaleY = miniMapHeight / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY) * 0.85;

    const offsetX = (miniMapWidth - (maxX - minX) * scale) / 2;
    const offsetY = (miniMapHeight - (maxY - minY) * scale) / 2;

    const worldX = (clickX - offsetX) / scale + minX;
    const worldY = (clickY - offsetY) / scale + minY;

    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    const newPanX = (centerX - worldX) * view.zoom;
    const newPanY = (centerY - worldY) * view.zoom;

    setView({ panX: newPanX, panY: newPanY });
  }, [view, setView, miniMapWidth, miniMapHeight, getFilteredNodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      handleInteraction(e);
    }
  }, [isDragging, handleInteraction]);

  if (nodes.length === 0) return null;

  // Show collapsed button when mini-map is hidden
  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={() => setIsVisible(true)}
        className="absolute bottom-36 right-4 z-30 p-2.5 rounded-xl glass border border-white/10 hover:border-[#00ff88]/50 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Map className="w-5 h-5" style={{ color: themeConfig.accentColor }} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 0.5, type: "spring", damping: 20 }}
      className="absolute bottom-36 right-4 z-30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="rounded-xl overflow-hidden"
        animate={{
          borderColor: isHovered ? themeConfig.accentColor : 'rgba(255,255,255,0.2)',
          boxShadow: isHovered
            ? `0 0 25px ${themeConfig.accentColor}30, 0 15px 50px rgba(0,0,0,0.6)`
            : '0 15px 50px rgba(0,0,0,0.6)',
        }}
        style={{
          border: '2px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ background: 'linear-gradient(180deg, rgba(20, 20, 30, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%)' }}
        >
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4" style={{ color: themeConfig.accentColor }} />
            <span className="text-xs text-gray-200 font-semibold uppercase tracking-wider">Navigator</span>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsVisible(false)}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-md hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={miniMapWidth}
            height={miniMapHeight}
            onClick={handleInteraction}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            className="cursor-crosshair"
            style={{ display: "block" }}
          />

          <AnimatePresence>
            {isHovered && !isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                  <Move className="w-4 h-4" />
                  <span>Click to navigate</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats Footer */}
        <div
          className="px-3 py-2.5 flex items-center justify-between text-[11px]"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.98) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: themeConfig.accentColor }} />
              <span className="text-gray-300 font-medium">{getFilteredNodes().length} nodes</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff00ff]" />
              <span className="text-gray-300 font-medium">{getFilteredLinks().length} links</span>
            </span>
          </div>
          <span
            className="font-mono px-2 py-1 rounded-md text-gray-200 font-semibold"
            style={{ background: `${themeConfig.accentColor}25` }}
          >
            {(view.zoom * 100).toFixed(0)}%
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
