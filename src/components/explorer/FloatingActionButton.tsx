"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Tag,
  Palette,
  Maximize,
  Navigation,
} from "lucide-react";
import type { ThemeName } from "@/types";

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { view, setView, theme, setTheme } = useCryptoVizStore();

  const handleZoomIn = () => {
    setView({ zoom: Math.min(view.zoom * 1.3, 3) });
  };

  const handleZoomOut = () => {
    setView({ zoom: Math.max(view.zoom / 1.3, 0.3) });
  };

  const handleReset = () => {
    setView({ zoom: 1, panX: 0, panY: 0 });
  };

  const handleCenterView = () => {
    setView({ panX: 0, panY: 0 });
  };

  const cycleTheme = () => {
    const themeNames = Object.keys(themes) as ThemeName[];
    const currentIndex = themeNames.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    setTheme(themeNames[nextIndex]);
  };

  const actions = [
    { icon: ZoomIn, label: "Zoom In", onClick: handleZoomIn, color: "#00ff88" },
    { icon: ZoomOut, label: "Zoom Out", onClick: handleZoomOut, color: "#ff00ff" },
    { icon: RotateCcw, label: "Reset View", onClick: handleReset, color: "#00ffff" },
    { icon: Navigation, label: "Center", onClick: handleCenterView, color: "#ffff00" },
    {
      icon: Grid,
      label: view.showGrid ? "Hide Grid" : "Show Grid",
      onClick: () => setView({ showGrid: !view.showGrid }),
      color: view.showGrid ? "#00ff88" : "#666",
      active: view.showGrid
    },
    {
      icon: Tag,
      label: view.showLabels ? "Hide Labels" : "Show Labels",
      onClick: () => setView({ showLabels: !view.showLabels }),
      color: view.showLabels ? "#00ff88" : "#666",
      active: view.showLabels
    },
    { icon: Palette, label: "Theme", onClick: cycleTheme, color: themes[theme].accentColor },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-50 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="glass px-2 py-1 rounded-lg text-xs text-white whitespace-nowrap"
                >
                  {action.label}
                </motion.span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    action.onClick();
                  }}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center transition-colors"
                  style={{
                    borderColor: action.color,
                    boxShadow: `0 0 10px ${action.color}30`
                  }}
                >
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen
            ? "bg-red-500 rotate-45"
            : "bg-[#00ff88] glow-green"
        }`}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-black" />
        )}
      </motion.button>
    </div>
  );
}
