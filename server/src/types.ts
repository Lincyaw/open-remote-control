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
  timestamp?: number;
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

// SSH Types
// Client -> Server messages
export interface SSHConnectMessage extends ClientMessage {
  type: 'ssh_connect';
  data: {
    host: string;
    port: number;
    username: string;
    privateKey?: string;
    password?: string;
  };
}

export interface SSHStartShellMessage extends ClientMessage {
  type: 'ssh_start_shell';
  data?: {
    sessionId?: string;
    cols?: number;
    rows?: number;
  };
}

export interface SSHInputMessage extends ClientMessage {
  type: 'ssh_input';
  data: {
    sessionId?: string;
    input: string;
  };
}

export interface SSHResizeMessage extends ClientMessage {
  type: 'ssh_resize';
  data: {
    sessionId?: string;
    cols: number;
    rows: number;
  };
}

export interface SSHCloseShellMessage extends ClientMessage {
  type: 'ssh_close_shell';
  data: {
    sessionId: string;
  };
}

export interface SSHListShellsMessage extends ClientMessage {
  type: 'ssh_list_shells';
}

export interface SSHDisconnectMessage extends ClientMessage {
  type: 'ssh_disconnect';
}

export interface SSHPortForwardMessage extends ClientMessage {
  type: 'ssh_port_forward';
  data: {
    localPort: number;
    remoteHost: string;
    remotePort: number;
  };
}

export interface SSHStopPortForwardMessage extends ClientMessage {
  type: 'ssh_stop_port_forward';
  data: {
    localPort: number;
  };
}

// Git Types
// Client -> Server messages
export interface GitCheckRepoMessage extends ClientMessage {
  type: 'git_check_repo';
  path?: string;
}

export interface GitStatusMessage extends ClientMessage {
  type: 'git_status';
  path?: string;
}

export interface GitFileDiffMessage extends ClientMessage {
  type: 'git_file_diff';
  path?: string;
  filePath: string;
  staged?: boolean;
}

// Server -> Client messages
export interface SSHConnectResponse extends ServerMessage {
  type: 'ssh_connect_response';
  data: {
    success: boolean;
    message?: string;
  };
}

export interface SSHShellStartedMessage extends ServerMessage {
  type: 'ssh_shell_started';
  data: {
    sessionId: string;
  };
}

export interface SSHShellClosedMessage extends ServerMessage {
  type: 'ssh_shell_closed';
  data: {
    sessionId: string;
    success?: boolean;
  };
}

export interface SSHOutputMessage extends ServerMessage {
  type: 'ssh_output';
  data: {
    sessionId: string;
    output: string;
  } | string; // Support legacy format
}

export interface SSHListShellsResponse extends ServerMessage {
  type: 'ssh_list_shells_response';
  data: {
    shells: string[];
  };
}

export interface SSHStatusMessage extends ServerMessage {
  type: 'ssh_status';
  data: {
    status: 'connected' | 'disconnected' | 'error';
    message?: string;
  };
}

export interface SSHPortForwardResponse extends ServerMessage {
  type: 'ssh_port_forward_response';
  data: {
    success: boolean;
    localPort: number;
    message?: string;
  };
}

// Session Browser Types
export interface ListSubagentsMessage extends ClientMessage {
  type: 'list_subagents';
  workspace: string;
  sessionId: string;
}

export interface GetSubagentMessagesMessage extends ClientMessage {
  type: 'get_subagent_messages';
  workspace: string;
  sessionId: string;
  agentId: string;
}

export interface ListToolResultsMessage extends ClientMessage {
  type: 'list_tool_results';
  workspace: string;
  sessionId: string;
}

export interface GetToolResultContentMessage extends ClientMessage {
  type: 'get_tool_result_content';
  workspace: string;
  sessionId: string;
  toolUseId: string;
}

export interface GetSessionFolderInfoMessage extends ClientMessage {
  type: 'get_session_folder_info';
  workspace: string;
  sessionId: string;
}
