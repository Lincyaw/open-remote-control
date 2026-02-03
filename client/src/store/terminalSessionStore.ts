import { create } from 'zustand';

export interface TerminalSession {
  id: string;
  name: string;
  createdAt: number;
  lastActiveAt: number;
  status: 'active' | 'connecting' | 'closed' | 'error';
}

interface TerminalSessionState {
  sessions: TerminalSession[];
  activeSessionId: string | null;

  createSession: () => TerminalSession;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  updateSessionStatus: (id: string, status: TerminalSession['status']) => void;
  updateSessionActivity: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  getSession: (id: string) => TerminalSession | undefined;
  clearAllSessions: () => void;
}

let sessionCounter = 0;

const generateSessionId = (): string => {
  sessionCounter++;
  return `shell_${Date.now()}_${sessionCounter}`;
};

const generateSessionName = (index: number): string => {
  return `Shell ${index}`;
};

export const useTerminalSessionStore = create<TerminalSessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: () => {
    const id = generateSessionId();
    const now = Date.now();
    const existingSessions = get().sessions;
    const name = generateSessionName(existingSessions.length + 1);

    const newSession: TerminalSession = {
      id,
      name,
      createdAt: now,
      lastActiveAt: now,
      status: 'connecting',
    };

    set((state) => ({
      sessions: [...state.sessions, newSession],
      activeSessionId: id,
    }));

    return newSession;
  },

  removeSession: (id: string) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      const newActiveId = state.activeSessionId === id
        ? null
        : state.activeSessionId;

      return {
        sessions: newSessions,
        activeSessionId: newActiveId,
      };
    });
  },

  setActiveSession: (id: string | null) => {
    if (id !== null) {
      // Update lastActiveAt when switching to a session
      set((state) => ({
        activeSessionId: id,
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, lastActiveAt: Date.now() } : s
        ),
      }));
    } else {
      set({ activeSessionId: id });
    }
  },

  updateSessionStatus: (id: string, status: TerminalSession['status']) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    }));
  },

  updateSessionActivity: (id: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, lastActiveAt: Date.now() } : s
      ),
    }));
  },

  renameSession: (id: string, name: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, name } : s
      ),
    }));
  },

  getSession: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },

  clearAllSessions: () => {
    set({
      sessions: [],
      activeSessionId: null,
    });
  },
}));
