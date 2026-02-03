import { create } from 'zustand';
import { ClaudeMessage } from '../types';

interface ClaudeState {
  messages: ClaudeMessage[];
  addMessage: (message: ClaudeMessage) => void;
  clearMessages: () => void;
}

export const useClaudeStore = create<ClaudeState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
}));
