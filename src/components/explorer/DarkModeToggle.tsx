"use client";

import { motion } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export function DarkModeToggle() {
  const { colorMode, toggleColorMode } = useCryptoVizStore();

  const handleToggle = () => {
    toggleColorMode();
    toast.success(`Switched to ${colorMode === 'dark' ? 'light' : 'dark'} mode`, {
      duration: 1500,
    });
  };

  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="text-gray-400 hover:text-white hover:bg-white/10 relative overflow-hidden"
        title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
      >
        <motion.div
          initial={false}
          animate={{
            rotate: colorMode === 'dark' ? 0 : 180,
            scale: colorMode === 'dark' ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Moon className="w-4 h-4" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            rotate: colorMode === 'light' ? 0 : -180,
            scale: colorMode === 'light' ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Sun className="w-4 h-4 text-yellow-400" />
        </motion.div>
      </Button>
    </motion.div>
  );
}
