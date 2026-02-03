// Port forward preset for server config
export interface PortForwardPreset {
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPassword?: string; // Optional SSH password for persistence
  wsPort: number;
  wsToken: string;
  portForwards?: PortForwardPreset[]; // Port forward presets
}

export interface ConnectionStatus {
  ssh: 'connected' | 'disconnected' | 'connecting';
  ws: 'connected' | 'disconnected' | 'connecting';
}

export interface ClaudeMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'file_change';
  content: string;
  timestamp: number;
  metadata?: ClaudeMessageMetadata;
}

export interface ClaudeMessageMetadata {
  toolName?: string;
  toolId?: string;
  input?: Record<string, any>;
  filePath?: string;
  oldContent?: string;
  newContent?: string;
  operation?: 'edit' | 'write';
}

// Session Browser types
export interface WorkspaceInfo {
  dirName: string;
  displayPath: string;
  sessionCount: number;
  lastModified: number;
}

export interface SessionInfo {
  sessionId: string;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
}

export interface SessionMessage {
  uuid: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

export interface SubagentInfo {
  agentId: string;
  slug: string;
  filePath: string;
  messageCount: number;
  created: string;
  modified: string;
  firstPrompt: string;
  parentSessionId: string;
}

export interface ToolResultFile {
  toolUseId: string;
  filePath: string;
  size: number;
}

export interface SessionFolderInfo {
  subagentCount: number;
  toolResultCount: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  size?: number;
  language?: string;
}

// Git types
export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
  oldPath?: string;
}
