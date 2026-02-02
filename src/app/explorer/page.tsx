"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { generateMockNetwork } from "@/lib/mockData";
import { NetworkCanvas } from "@/components/explorer/NetworkCanvas";
import { FiltersSidebar } from "@/components/explorer/FiltersSidebar";
import { NodeDetailsPanel } from "@/components/explorer/NodeDetailsPanel";
import { TopNav } from "@/components/explorer/TopNav";
import { TimeTravelSlider } from "@/components/explorer/TimeTravelSlider";
import { MiniMap } from "@/components/explorer/MiniMap";
import { FloatingActionButton } from "@/components/explorer/FloatingActionButton";
import { MobileNav } from "@/components/explorer/MobileNav";
import { SearchCommand } from "@/components/explorer/SearchCommand";
import { KeyboardShortcuts } from "@/components/explorer/KeyboardShortcuts";
import { ShortcutsHelp } from "@/components/explorer/ShortcutsHelp";
import { NotificationSystem } from "@/components/explorer/NotificationSystem";
import { TransactionTimeline } from "@/components/explorer/TransactionTimeline";
import { ComparisonMode } from "@/components/explorer/ComparisonMode";
export default function ExplorerPage() {
  const { setNodes, setLinks, isLoading, setIsLoading, view } = useCryptoVizStore();

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true);
    const timer = setTimeout(() => {
      // Generate 120+ nodes to stress test the flower animation and collision algorithm
      const { nodes, links } = generateMockNetwork(120);
      setNodes(nodes);
      setLinks(links);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [setNodes, setLinks, setIsLoading]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Filters (hidden on mobile) */}
        <div className="hidden lg:block">
          <FiltersSidebar />
        </div>

        {/* Center - Network Canvas */}
        <div className="flex-1 relative">

          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pt-20"
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-16 h-16 mx-auto mb-4 border-4 border-[#00ff88] border-t-transparent rounded-full"
                />
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gray-400"
                >
                  Loading network data...
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <>
              <NetworkCanvas />
              <MiniMap />
              <TimeTravelSlider />
              <TransactionTimeline />
            </>
          )}

          {/* Floating Action Button (mobile) */}
          <FloatingActionButton />
        </div>

        {/* Right Sidebar - Node Details (hidden on mobile) */}
        <div className="hidden lg:block">
          <NodeDetailsPanel />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Comparison Mode Overlay */}
      <ComparisonMode />

      {/* Global Components */}
      <SearchCommand />
      <KeyboardShortcuts />
      <ShortcutsHelp />
      <NotificationSystem />
    </div>
  );
}
