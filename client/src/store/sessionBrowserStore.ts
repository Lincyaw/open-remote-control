import { create } from 'zustand';
import { WorkspaceInfo, SessionInfo, SessionMessage, SubagentInfo, ToolResultFile, SessionFolderInfo } from '../types';

interface SessionBrowserState {
  // Data state
  workspaces: WorkspaceInfo[];
  sessions: SessionInfo[];
  messages: SessionMessage[];
  searchQuery: string;
  loading: boolean;

  // Pagination state
  hasMoreMessages: boolean;
  oldestMessageIndex: number;
  loadingMore: boolean;

  // Subagent state
  subagents: SubagentInfo[];
  subagentMessages: SessionMessage[];
  subagentLoading: boolean;

  // Tool results state
  toolResults: ToolResultFile[];
  toolResultContents: Record<string, string>;

  // Session folder info
  sessionFolderInfo: SessionFolderInfo | null;

  // Data setters
  setWorkspaces: (workspaces: WorkspaceInfo[]) => void;
  setSessions: (sessions: SessionInfo[]) => void;
  setMessages: (messages: SessionMessage[]) => void;
  appendMessages: (messages: SessionMessage[]) => void;
  prependMessages: (messages: SessionMessage[]) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;

  // Pagination setters
  setHasMoreMessages: (hasMore: boolean) => void;
  setOldestMessageIndex: (index: number) => void;
  setLoadingMore: (loading: boolean) => void;

  // Subagent actions
  setSubagents: (subagents: SubagentInfo[]) => void;
  setSubagentMessages: (messages: SessionMessage[]) => void;
  setSubagentLoading: (loading: boolean) => void;

  // Tool results actions
  setToolResults: (results: ToolResultFile[]) => void;
  setToolResultContent: (toolUseId: string, content: string) => void;

  // Session folder info
  setSessionFolderInfo: (info: SessionFolderInfo) => void;

  // Clear session data (called when leaving a session)
  clearSessionData: () => void;
}

export const useSessionBrowserStore = create<SessionBrowserState>((set) => ({
  // Data state
  workspaces: [],
  sessions: [],
  messages: [],
  searchQuery: '',
  loading: false,

  // Pagination state
  hasMoreMessages: true,
  oldestMessageIndex: 0,
  loadingMore: false,

  // Subagent state
  subagents: [],
  subagentMessages: [],
  subagentLoading: false,

  // Tool results state
  toolResults: [],
  toolResultContents: {},

  // Session folder info
  sessionFolderInfo: null,

  // Data setters
  setWorkspaces: (workspaces) => set({ workspaces, loading: false }),
  setSessions: (sessions) => set({ sessions, loading: false }),
  setMessages: (messages) => set({ messages, loading: false }),
  appendMessages: (newMessages) =>
    set((state) => ({ messages: [...state.messages, ...newMessages] })),
  prependMessages: (olderMessages) =>
    set((state) => ({ messages: [...olderMessages, ...state.messages], loadingMore: false })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (loading) => set({ loading }),

  // Pagination setters
  setHasMoreMessages: (hasMoreMessages) => set({ hasMoreMessages }),
  setOldestMessageIndex: (oldestMessageIndex) => set({ oldestMessageIndex }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),

  // Subagent actions
  setSubagents: (subagents) => set({ subagents }),
  setSubagentMessages: (messages) =>
    set({ subagentMessages: messages, subagentLoading: false }),
  setSubagentLoading: (loading) => set({ subagentLoading: loading }),

  // Tool results actions
  setToolResults: (results) => set({ toolResults: results }),
  setToolResultContent: (toolUseId, content) =>
    set((state) => ({
      toolResultContents: { ...state.toolResultContents, [toolUseId]: content },
    })),

  // Session folder info
  setSessionFolderInfo: (info) => set({ sessionFolderInfo: info }),

  // Clear session data
  clearSessionData: () =>
    set({
      messages: [],
      hasMoreMessages: true,
      oldestMessageIndex: 0,
      loadingMore: false,
      subagents: [],
      subagentMessages: [],
      toolResults: [],
      sessionFolderInfo: null,
    }),
}));
