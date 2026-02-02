"use client";

import { useEffect } from "react";
import { Web3Provider } from "@/components/Web3Provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <Web3Provider>
      <TooltipProvider delayDuration={200}>
        <div className="antialiased">{children}</div>
      </TooltipProvider>
    </Web3Provider>
  );
}
