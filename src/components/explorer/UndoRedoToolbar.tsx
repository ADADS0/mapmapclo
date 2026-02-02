"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Undo2,
  Redo2,
  History,
  Trash2,
  ChevronDown,
  Clock,
  Edit3,
  Move,
  Eye,
  Plus,
  Minus,
} from "lucide-react";
import { useCryptoVizStore } from "@/lib/store";
import {
  type HistoryState,
  type GraphState,
  createInitialHistoryState,
  pushToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  getHistoryInfo,
} from "@/lib/historyManager";
import { toast } from "sonner";

// Action type icons
const actionIcons: Record<string, typeof Edit3> = {
  "Node selected": Eye,
  "Node moved": Move,
  "Node added": Plus,
  "Node removed": Minus,
  "Filter applied": Edit3,
  "View changed": Eye,
  "Initial state": Clock,
};

export function UndoRedoToolbar() {
  const { nodes, links, view, setNodes, setLinks, selectNode } = useCryptoVizStore();
  const [history, setHistory] = useState<HistoryState>(createInitialHistoryState());
  const [showHistory, setShowHistory] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create current graph state
  const createGraphState = useCallback(
    (description: string): GraphState => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
      selectedNodeId: view.selectedNodeId,
      timestamp: new Date(),
      description,
    }),
    [nodes, links, view.selectedNodeId]
  );

  // Initialize history with initial state
  useEffect(() => {
    if (!isInitialized && nodes.length > 0) {
      const initialState = createGraphState("Initial state");
      setHistory((prev) => pushToHistory(prev, initialState));
      setIsInitialized(true);
    }
  }, [nodes.length, isInitialized, createGraphState]);

  // Save state on significant changes
  const saveState = useCallback(
    (description: string) => {
      const state = createGraphState(description);
      setHistory((prev) => pushToHistory(prev, state));
    },
    [createGraphState]
  );

  // Track node selection changes
  useEffect(() => {
    if (isInitialized && view.selectedNodeId !== history.present?.selectedNodeId) {
      // Don't save every selection, but save when it matters
    }
  }, [view.selectedNodeId, isInitialized, history.present?.selectedNodeId]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const result = undo(history);
    if (result.state) {
      setHistory(result.history);
      setNodes(result.state.nodes);
      setLinks(result.state.links);
      if (result.state.selectedNodeId !== view.selectedNodeId) {
        selectNode(result.state.selectedNodeId);
      }
      toast.info(`Undo: ${result.state.description}`);
    }
  }, [history, setNodes, setLinks, selectNode, view.selectedNodeId]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const result = redo(history);
    if (result.state) {
      setHistory(result.history);
      setNodes(result.state.nodes);
      setLinks(result.state.links);
      if (result.state.selectedNodeId !== view.selectedNodeId) {
        selectNode(result.state.selectedNodeId);
      }
      toast.info(`Redo: ${result.state.description}`);
    }
  }, [history, setNodes, setLinks, selectNode, view.selectedNodeId]);

  // Handle clear history
  const handleClearHistory = useCallback(() => {
    setHistory((prev) => clearHistory(prev));
    toast.success("History cleared");
  }, []);

  // Jump to specific state in history
  const jumpToState = useCallback(
    (index: number, isPast: boolean) => {
      let targetState: GraphState | null = null;
      let newHistory = history;

      if (isPast) {
        // Jump to past state
        while (newHistory.past.length > index) {
          const result = undo(newHistory);
          if (result.state) {
            newHistory = result.history;
            targetState = result.state;
          } else {
            break;
          }
        }
      } else {
        // Jump to future state
        for (let i = 0; i <= index; i++) {
          const result = redo(newHistory);
          if (result.state) {
            newHistory = result.history;
            targetState = result.state;
          } else {
            break;
          }
        }
      }

      if (targetState) {
        setHistory(newHistory);
        setNodes(targetState.nodes);
        setLinks(targetState.links);
        if (targetState.selectedNodeId !== view.selectedNodeId) {
          selectNode(targetState.selectedNodeId);
        }
        toast.info(`Jumped to: ${targetState.description}`);
        setShowHistory(false);
      }
    },
    [history, setNodes, setLinks, selectNode, view.selectedNodeId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Expose saveState function globally for other components
  useEffect(() => {
    (window as unknown as { saveGraphState?: (desc: string) => void }).saveGraphState = saveState;
    return () => {
      delete (window as unknown as { saveGraphState?: (desc: string) => void }).saveGraphState;
    };
  }, [saveState]);

  const historyInfo = getHistoryInfo(history);
  const canUndoNow = canUndo(history);
  const canRedoNow = canRedo(history);

  return (
    <div className="flex items-center gap-1">
      {/* Undo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={!canUndoNow}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#1a1a2e] border-white/10">
          <p>Undo (Ctrl+Z)</p>
          {canUndoNow && historyInfo.pastDescriptions.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {historyInfo.pastDescriptions[historyInfo.pastDescriptions.length - 1]}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Redo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={!canRedoNow}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#1a1a2e] border-white/10">
          <p>Redo (Ctrl+Y)</p>
          {canRedoNow && historyInfo.futureDescriptions.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {historyInfo.futureDescriptions[0]}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* History Dropdown */}
      <Popover open={showHistory} onOpenChange={setShowHistory}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
          >
            <History className="w-4 h-4" />
            <span className="text-xs">
              {historyInfo.pastCount + historyInfo.futureCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-white/10">
                  {historyInfo.pastCount}/{historyInfo.pastCount + historyInfo.futureCount}
                </Badge>
              )}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 p-0 bg-[#0a0a0f] border-white/10"
        >
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#00ff88]" />
                History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="h-6 px-2 text-xs text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="p-2 space-y-1">
              {/* Future states (redo) */}
              <AnimatePresence>
                {historyInfo.futureDescriptions.map((desc, idx) => {
                  const Icon = actionIcons[desc] || Edit3;
                  return (
                    <motion.button
                      key={`future-${idx}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onClick={() => jumpToState(idx, false)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{desc}</p>
                        <p className="text-xs text-gray-500">Future +{idx + 1}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-0">
                        Redo
                      </Badge>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {/* Current state */}
              {history.present && (
                <div className="w-full flex items-center gap-3 p-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30">
                  <div className="w-8 h-8 rounded-lg bg-[#00ff88]/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#00ff88]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {history.present.description}
                    </p>
                    <p className="text-xs text-[#00ff88]">Current</p>
                  </div>
                  <Badge className="bg-[#00ff88]/20 text-[#00ff88] border-0">
                    Now
                  </Badge>
                </div>
              )}

              {/* Past states (undo) */}
              <AnimatePresence>
                {[...historyInfo.pastDescriptions].reverse().map((desc, idx) => {
                  const realIndex = historyInfo.pastDescriptions.length - 1 - idx;
                  const Icon = actionIcons[desc] || Edit3;
                  return (
                    <motion.button
                      key={`past-${realIndex}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => jumpToState(realIndex, true)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group opacity-70 hover:opacity-100"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{desc}</p>
                        <p className="text-xs text-gray-500">-{idx + 1} steps</p>
                      </div>
                      <Badge className="bg-gray-500/20 text-gray-400 border-0">
                        Undo
                      </Badge>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {/* Empty state */}
              {historyInfo.pastCount === 0 && historyInfo.futureCount === 0 && !history.present && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <History className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No history yet</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Keyboard hints */}
          <div className="p-2 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>
                <kbd className="px-1 bg-white/10 rounded">Ctrl+Z</kbd> Undo
              </span>
              <span>
                <kbd className="px-1 bg-white/10 rounded">Ctrl+Y</kbd> Redo
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
