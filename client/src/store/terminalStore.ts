import { create } from 'zustand';

interface TerminalState {
  commandHistory: string[];
  addCommand: (command: string) => void;
  clearHistory: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  commandHistory: [],
  addCommand: (command) =>
    set((state) => ({
      commandHistory: [command, ...state.commandHistory].slice(0, 100),
    })),
  clearHistory: () => set({ commandHistory: [] }),
}));
