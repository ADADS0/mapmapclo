"use client";

import { useEffect } from "react";
import { useCryptoVizStore, themes } from "@/lib/store";
import { toast } from "sonner";
import type { ThemeName } from "@/types";

export function KeyboardShortcuts() {
  const {
    view,
    setView,
    theme,
    setTheme,
    focusMode,
    toggleFocusMode,
    selectNode,
    resetFilters,
  } = useCryptoVizStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Zoom controls
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setView({ zoom: Math.min(view.zoom * 1.2, 3) });
        toast.success("Zoomed in", { duration: 1000 });
      }

      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setView({ zoom: Math.max(view.zoom / 1.2, 0.3) });
        toast.success("Zoomed out", { duration: 1000 });
      }

      // Reset view (R)
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setView({ zoom: 1, panX: 0, panY: 0 });
        toast.success("View reset", { duration: 1000 });
      }

      // Toggle grid (G)
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setView({ showGrid: !view.showGrid });
        toast.success(view.showGrid ? "Grid hidden" : "Grid shown", { duration: 1000 });
      }

      // Toggle labels (L)
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setView({ showLabels: !view.showLabels });
        toast.success(view.showLabels ? "Labels hidden" : "Labels shown", { duration: 1000 });
      }

      // Toggle focus mode (F)
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (view.selectedNodeId) {
          toggleFocusMode();
          toast.success(focusMode ? "Focus mode disabled" : "Focus mode enabled", { duration: 1000 });
        } else {
          toast.error("Select a node first to use focus mode", { duration: 2000 });
        }
      }

      // Escape - deselect node or exit focus mode
      if (e.key === "Escape") {
        e.preventDefault();
        if (focusMode) {
          toggleFocusMode();
          toast.success("Focus mode disabled", { duration: 1000 });
        } else if (view.selectedNodeId) {
          selectNode(null);
          toast.success("Node deselected", { duration: 1000 });
        }
      }

      // Cycle themes (T)
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        const themeNames = Object.keys(themes) as ThemeName[];
        const currentIndex = themeNames.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        setTheme(themeNames[nextIndex]);
        toast.success(`Theme: ${themes[themeNames[nextIndex]].label}`, { duration: 1000 });
      }

      // Reset filters (Shift + R)
      if (e.shiftKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        resetFilters();
        toast.success("Filters reset", { duration: 1000 });
      }

      // Open search (/ or Cmd+K)
      if (e.key === "/" || (e.metaKey && e.key === "k") || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        // Dispatch custom event to open search
        window.dispatchEvent(new CustomEvent("openSearch"));
      }

      // Show keyboard shortcuts help (?)
      if (e.key === "?") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("showShortcutsHelp"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, setView, theme, setTheme, focusMode, toggleFocusMode, selectNode, resetFilters]);

  return null;
}

// Keyboard shortcuts help data
export const keyboardShortcuts = [
  { key: "+/-", description: "Zoom in/out" },
  { key: "R", description: "Reset view" },
  { key: "G", description: "Toggle grid" },
  { key: "L", description: "Toggle labels" },
  { key: "F", description: "Toggle focus mode" },
  { key: "T", description: "Cycle themes" },
  { key: "Esc", description: "Deselect / Exit focus" },
  { key: "/", description: "Open search" },
  { key: "?", description: "Show shortcuts" },
  { key: "Shift+R", description: "Reset filters" },
];
