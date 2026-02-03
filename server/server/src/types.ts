// Client -> Server messages
export interface ClientMessage {
  type: string;
  [key: string]: any;
}

export interface AuthMessage extends ClientMessage {
  type: 'auth';
  token: string;
}

export interface FileReadMessage extends ClientMessage {
  type: 'file_read';
  path: string;
}

export interface SearchMessage extends ClientMessage {
  type: 'search';
  query: string;
  options?: {
    caseSensitive?: boolean;
    regex?: boolean;
  };
}

export interface FileTreeMessage extends ClientMessage {
  type: 'file_tree';
  path?: string;
}

// Server -> Client messages
export interface ServerMessage {
  type: string;
  data?: any;
  error?: string;
}

// Claude Code types
export interface HistoryEntry {
  display: string;
  pastedContents: Record<string, any>;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface SessionEntry {
  type: 'user' | 'assistant' | 'system' | 'progress' | 'file-history-snapshot';
  uuid: string;
  sessionId: string;
  timestamp: string;
  [key: string]: any;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}
