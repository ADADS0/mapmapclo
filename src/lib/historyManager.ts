import type { NetworkNode, NetworkLink } from "@/types";

export interface GraphState {
  nodes: NetworkNode[];
  links: NetworkLink[];
  selectedNodeId: string | null;
  timestamp: Date;
  description: string;
}

export interface HistoryState {
  past: GraphState[];
  present: GraphState | null;
  future: GraphState[];
  maxHistorySize: number;
}

export const createInitialHistoryState = (): HistoryState => ({
  past: [],
  present: null,
  future: [],
  maxHistorySize: 50,
});

export function pushToHistory(
  history: HistoryState,
  state: GraphState
): HistoryState {
  const newPast = history.present
    ? [...history.past, history.present]
    : history.past;

  // Limit history size
  const trimmedPast = newPast.slice(-history.maxHistorySize);

  return {
    ...history,
    past: trimmedPast,
    present: state,
    future: [], // Clear future when new state is pushed
  };
}

export function undo(history: HistoryState): {
  history: HistoryState;
  state: GraphState | null;
} {
  if (history.past.length === 0) {
    return { history, state: null };
  }

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);

  const newFuture = history.present
    ? [history.present, ...history.future]
    : history.future;

  return {
    history: {
      ...history,
      past: newPast,
      present: previous,
      future: newFuture.slice(0, history.maxHistorySize),
    },
    state: previous,
  };
}

export function redo(history: HistoryState): {
  history: HistoryState;
  state: GraphState | null;
} {
  if (history.future.length === 0) {
    return { history, state: null };
  }

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  const newPast = history.present
    ? [...history.past, history.present]
    : history.past;

  return {
    history: {
      ...history,
      past: newPast.slice(-history.maxHistorySize),
      present: next,
      future: newFuture,
    },
    state: next,
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

export function clearHistory(history: HistoryState): HistoryState {
  return {
    ...history,
    past: [],
    future: [],
  };
}

export function getHistoryInfo(history: HistoryState) {
  return {
    pastCount: history.past.length,
    futureCount: history.future.length,
    currentDescription: history.present?.description || null,
    pastDescriptions: history.past.map((s) => s.description),
    futureDescriptions: history.future.map((s) => s.description),
  };
}
