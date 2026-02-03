# Mobile Remote Development Client Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile client for remote server development with Claude Code integration, terminal access, and code browsing capabilities.

**Architecture:** Dual-connection hybrid - SSH for terminal operations, WebSocket for Claude Code monitoring and file operations. Server-side Node.js service watches Claude Code files and broadcasts events to mobile clients.

**Tech Stack:** 
- Server: Node.js 18+, TypeScript, ws, chokidar, express
- Client: React Native 0.73+, TypeScript, react-native-ssh-sftp, xterm.js, Zustand

---

## Implementation Strategy

This plan is divided into 3 phases:

**Phase 1: Server Foundation** (Tasks 1-8)
- Project setup, WebSocket server, Claude Code watcher, file service
- Goal: Working server that can monitor Claude Code and serve files

**Phase 2: Mobile Client Foundation** (Tasks 9-15)
- React Native setup, connection management, Terminal tab, Claude tab
- Goal: Working mobile app that can connect and display Terminal + Claude

**Phase 3: Advanced Features** (Tasks 16-20)
- Files tab, search, diff view, offline support, polish
- Goal: Complete feature set with mobile-optimized UX

---

## Phase 1: Server Foundation

### Task 1: Project Setup and Configuration

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `server/src/config.ts`

**Step 1: Initialize Node.js project**

```bash
mkdir -p server
cd server
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install ws express chokidar dotenv
npm install -D typescript @types/node @types/ws @types/express ts-node nodemon
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create .env.example**

```env
PORT=8080
AUTH_TOKEN=generate-with-openssl-rand-hex-32
CLAUDE_HOME=/home/user/.claude
MAX_FILE_SIZE=10485760
SEARCH_TIMEOUT=5000
LOG_LEVEL=info
```

**Step 5: Create config.ts**

```typescript
import { config } from 'dotenv';
import { homedir } from 'os';

config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '8080'),
  authToken: process.env.AUTH_TOKEN || '',
  claudeHome: process.env.CLAUDE_HOME || `${homedir()}/.claude`,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  searchTimeout: parseInt(process.env.SEARCH_TIMEOUT || '5000'),
  logLevel: process.env.LOG_LEVEL || 'info',
};

if (!CONFIG.authToken) {
  console.warn('WARNING: AUTH_TOKEN not set. Generate: openssl rand -hex 32');
}
```

**Step 6: Update package.json scripts**

Add to package.json:
```json
"scripts": {
  "dev": "nodemon --exec ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

**Step 7: Commit**

```bash
git add server/
git commit -m "feat(server): initialize project with TypeScript config"
```

---

### Task 2: Logger Utility

**Files:**
- Create: `server/src/utils/logger.ts`

**Step 1: Create logger.ts**

```typescript
import { CONFIG } from '../config';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = LEVEL_MAP[CONFIG.logLevel] || LogLevel.INFO;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level >= this.level) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      console.log(`[${timestamp}] [${levelName}]`, message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

export const logger = new Logger();
```

**Step 2: Commit**

```bash
git add server/src/utils/logger.ts
git commit -m "feat(server): add logger utility"
```

---

### Task 3: Type Definitions

**Files:**
- Create: `server/src/types.ts`

**Step 1: Create types.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add server/src/types.ts
git commit -m "feat(server): add type definitions"
```

---

### Task 4: WebSocket Authentication

**Files:**
- Create: `server/src/websocket/auth.ts`

**Step 1: Create auth.ts**

```typescript
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

export class AuthManager {
  validateToken(token: string): boolean {
    if (!CONFIG.authToken) {
      logger.warn('No AUTH_TOKEN configured, accepting all connections');
      return true;
    }
    return token === CONFIG.authToken;
  }

  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Step 2: Commit**

```bash
git add server/src/websocket/auth.ts
git commit -m "feat(server): add WebSocket authentication"
```

---

### Task 5: WebSocket Server

**Files:**
- Create: `server/src/websocket/server.ts`

**Step 1: Create server.ts**

```typescript
import WebSocket from 'ws';
import { createServer } from 'http';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';
import { AuthManager } from './auth';
import { ClientMessage, ServerMessage } from '../types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private authManager: AuthManager;
  private clients = new Map<string, WebSocket>();

  constructor() {
    const server = createServer();
    this.wss = new WebSocket.Server({ server });
    this.authManager = new AuthManager();

    this.setupWebSocket();

    server.listen(CONFIG.port, () => {
      logger.info(`WebSocket server running on port ${CONFIG.port}`);
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New client connection attempt');

      ws.on('message', async (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        const clientId = this.getClientId(ws);
        if (clientId) {
          this.clients.delete(clientId);
          logger.info(`Client ${clientId} disconnected`);
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.token);
        break;
      default:
        const clientId = this.getClientId(ws);
        if (!clientId) {
          this.sendError(ws, 'Not authenticated');
          return;
        }
        logger.warn(`Unknown message type: ${message.type}`);
        this.sendError(ws, 'Unknown message type');
    }
  }

  private async handleAuth(ws: WebSocket, token: string) {
    if (this.authManager.validateToken(token)) {
      const clientId = this.authManager.generateClientId();
      this.clients.set(clientId, ws);
      (ws as any).clientId = clientId;

      this.send(ws, {
        type: 'auth_success',
        data: { clientId }
      });

      logger.info(`Client ${clientId} authenticated`);
    } else {
      this.sendError(ws, 'Invalid token');
      ws.close();
    }
  }

  private getClientId(ws: WebSocket): string | null {
    return (ws as any).clientId || null;
  }

  public broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    let count = 0;
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        count++;
      }
    });
    if (count > 0) {
      logger.debug(`Broadcast to ${count} clients: ${message.type}`);
    }
  }

  public send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public sendError(ws: WebSocket, error: string) {
    this.send(ws, { type: 'error', error });
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}
```

**Step 2: Commit**

```bash
git add server/src/websocket/server.ts
git commit -m "feat(server): add WebSocket server with client management"
```

---

### Task 6: Claude Code Watcher - History Monitor

**Files:**
- Create: `server/src/claude/watcher.ts`

**Step 1: Create watcher.ts with history monitoring**

```typescript
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';
import { HistoryEntry } from '../types';

export class ClaudeWatcher extends EventEmitter {
  private historyWatcher: chokidar.FSWatcher | null = null;
  private sessionWatcher: chokidar.FSWatcher | null = null;
  private historyPath: string;
  private lastHistorySize = 0;
  private lastSessionSize = 0;
  private activeSessionId: string | null = null;
  private activeProjectPath: string | null = null;

  constructor() {
    super();
    this.historyPath = join(CONFIG.claudeHome, 'history.jsonl');
  }

  async start() {
    logger.info('Starting Claude Code watcher');
    await this.watchHistory();
    
    this.on('user_input', (data) => {
      if (data.sessionId !== this.activeSessionId) {
        this.activeSessionId = data.sessionId;
        this.activeProjectPath = this.projectPathToDir(data.project);
        this.watchSession();
      }
    });
  }

  stop() {
    logger.info('Stopping Claude Code watcher');
    if (this.historyWatcher) {
      this.historyWatcher.close();
    }
    if (this.sessionWatcher) {
      this.sessionWatcher.close();
    }
  }

  private async watchHistory() {
    this.historyWatcher = chokidar.watch(this.historyPath, {
      persistent: true,
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    this.historyWatcher.on('change', async () => {
      await this.processHistoryChanges();
    });

    this.historyWatcher.on('error', (error) => {
      logger.error('History watcher error:', error);
    });

    logger.info(`Watching history: ${this.historyPath}`);
  }

  private async processHistoryChanges() {
    try {
      const content = await readFile(this.historyPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      if (lines.length > this.lastHistorySize) {
        const newLines = lines.slice(this.lastHistorySize);

        for (const line of newLines) {
          try {
            const entry: HistoryEntry = JSON.parse(line);
            this.emit('user_input', {
              message: entry.display,
              timestamp: entry.timestamp,
              sessionId: entry.sessionId,
              project: entry.project
            });
            logger.debug(`User input: ${entry.display.substring(0, 50)}...`);
          } catch (error) {
            logger.error('Error parsing history line:', error);
          }
        }

        this.lastHistorySize = lines.length;
      }
    } catch (error) {
      logger.error('Error processing history changes:', error);
    }
  }

  private projectPathToDir(path: string): string {
    return path.replace(/\//g, '-').replace(/^-/, '');
  }

  private watchSession() {
    // Placeholder - will implement in next task
  }
}
```

**Step 2: Commit**

```bash
git add server/src/claude/watcher.ts
git commit -m "feat(server): add Claude Code history watcher"
```

---

### Task 7: Claude Code Watcher - Session Monitor

**Files:**
- Modify: `server/src/claude/watcher.ts`

**Step 1: Add session watching methods to watcher.ts**

Replace the placeholder `watchSession()` method and add new methods:

```typescript
private watchSession() {
  if (!this.activeSessionId || !this.activeProjectPath) return;

  if (this.sessionWatcher) {
    this.sessionWatcher.close();
  }

  const sessionPath = join(
    CONFIG.claudeHome,
    'projects',
    this.activeProjectPath,
    `${this.activeSessionId}.jsonl`
  );

  this.lastSessionSize = 0;

  this.sessionWatcher = chokidar.watch(sessionPath, {
    persistent: true,
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  this.sessionWatcher.on('change', async () => {
    await this.processSessionChanges(sessionPath);
  });

  this.sessionWatcher.on('error', (error) => {
    logger.error('Session watcher error:', error);
  });

  logger.info(`Watching session: ${sessionPath}`);
}

private async processSessionChanges(sessionPath: string) {
  try {
    const content = await readFile(sessionPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    if (lines.length > this.lastSessionSize) {
      const newLines = lines.slice(this.lastSessionSize);

      for (const line of newLines) {
        try {
          const entry = JSON.parse(line);
          await this.processSessionEntry(entry);
        } catch (error) {
          logger.error('Error parsing session line:', error);
        }
      }

      this.lastSessionSize = lines.length;
    }
  } catch (error) {
    logger.error('Error processing session changes:', error);
  }
}

private async processSessionEntry(entry: any) {
  switch (entry.type) {
    case 'assistant':
      this.handleAssistantMessage(entry);
      break;
    case 'system':
      this.handleSystemMessage(entry);
      break;
    case 'progress':
      this.emit('progress', {
        message: entry.data?.message,
        timestamp: entry.timestamp
      });
      break;
  }
}

private handleAssistantMessage(entry: any) {
  const content = entry.message?.content || [];

  for (const block of content) {
    if (block.type === 'text') {
      this.emit('assistant_message', {
        content: block.text,
        timestamp: entry.timestamp,
        messageId: entry.message.id
      });
      logger.debug(`Assistant: ${block.text.substring(0, 50)}...`);
    } else if (block.type === 'tool_use') {
      this.emit('tool_call', {
        toolName: block.name,
        toolId: block.id,
        input: block.input,
        timestamp: entry.timestamp
      });
      logger.debug(`Tool: ${block.name}`);

      if (['Edit', 'Write'].includes(block.name)) {
        this.handleFileOperation(block, entry.timestamp);
      }
    }
  }
}

private handleSystemMessage(entry: any) {
  if (entry.data?.type === 'tool_result') {
    this.emit('tool_result', {
      toolId: entry.data.tool_use_id,
      content: entry.data.content,
      timestamp: entry.timestamp
    });
  }
}

private async handleFileOperation(toolUse: any, timestamp: string) {
  const { name, input } = toolUse;
  const filePath = input.file_path;

  if (!filePath) return;

  try {
    const oldContent = await readFile(filePath, 'utf-8').catch(() => '');
    let newContent = '';

    if (name === 'Edit') {
      newContent = oldContent.replace(input.old_string, input.new_string);
    } else if (name === 'Write') {
      newContent = input.content;
    }

    const diff = this.computeSimpleDiff(oldContent, newContent);

    this.emit('file_change', {
      filePath,
      operation: name.toLowerCase(),
      diff,
      timestamp
    });
  } catch (error) {
    logger.error('Error handling file operation:', error);
  }
}

private computeSimpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  return `+${newLines.length - oldLines.length} lines`;
}
```

**Step 2: Commit**

```bash
git add server/src/claude/watcher.ts
git commit -m "feat(server): add Claude Code session watcher with tool tracking"
```

---

### Task 8: Main Server Entry Point

**Files:**
- Create: `server/src/index.ts`

**Step 1: Create index.ts**

```typescript
import { WebSocketServer } from './websocket/server';
import { ClaudeWatcher } from './claude/watcher';
import { logger } from './utils/logger';

class RemoteDevServer {
  private wsServer: WebSocketServer;
  private claudeWatcher: ClaudeWatcher;

  constructor() {
    this.wsServer = new WebSocketServer();
    this.claudeWatcher = new ClaudeWatcher();

    this.setupClaudeWatcher();
  }

  private setupClaudeWatcher() {
    this.claudeWatcher.on('user_input', (data) => {
      this.wsServer.broadcast({
        type: 'claude_user_input',
        data
      });
    });

    this.claudeWatcher.on('assistant_message', (data) => {
      this.wsServer.broadcast({
        type: 'claude_assistant_message',
        data
      });
    });

    this.claudeWatcher.on('tool_call', (data) => {
      this.wsServer.broadcast({
        type: 'claude_tool_call',
        data
      });
    });

    this.claudeWatcher.on('tool_result', (data) => {
      this.wsServer.broadcast({
        type: 'claude_tool_result',
        data
      });
    });

    this.claudeWatcher.on('file_change', (data) => {
      this.wsServer.broadcast({
        type: 'claude_file_change',
        data
      });
    });

    this.claudeWatcher.on('progress', (data) => {
      this.wsServer.broadcast({
        type: 'claude_progress',
        data
      });
    });
  }

  async start() {
    logger.info('Starting Remote Dev Server');
    await this.claudeWatcher.start();
    logger.info('Server ready');
  }

  stop() {
    logger.info('Stopping Remote Dev Server');
    this.claudeWatcher.stop();
  }
}

const server = new RemoteDevServer();

server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down');
  server.stop();
  process.exit(0);
});
```

**Step 2: Test the server**

```bash
# Create .env file
cp .env.example .env
# Edit .env and set AUTH_TOKEN=$(openssl rand -hex 32)

# Run server
npm run dev
```

Expected output:
```
[timestamp] [INFO] Starting Remote Dev Server
[timestamp] [INFO] WebSocket server running on port 8080
[timestamp] [INFO] Starting Claude Code watcher
[timestamp] [INFO] Watching history: /home/user/.claude/history.jsonl
[timestamp] [INFO] Server ready
```

**Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): add main entry point with Claude watcher integration"
```

---

## Phase 2: Mobile Client Foundation

### Task 9: React Native Project Setup

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/app.json`

**Step 1: Initialize React Native project**

```bash
npx react-native@latest init RemoteDevClient --template react-native-template-typescript
cd RemoteDevClient
```

**Step 2: Install dependencies**

```bash
npm install zustand @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-webview
npm install @react-native-community/netinfo
npm install react-native-fs
```

**Step 3: Install SSH library**

```bash
npm install react-native-ssh-sftp
```

**Step 4: Update tsconfig.json**

```json
{
  "extends": "@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

**Step 5: Commit**

```bash
git add client/
git commit -m "feat(client): initialize React Native project with dependencies"
```

---

### Task 10: State Management Setup

**Files:**
- Create: `client/src/store/connectionStore.ts`
- Create: `client/src/store/claudeStore.ts`
- Create: `client/src/types.ts`

**Step 1: Create types.ts**

```typescript
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  wsPort: number;
  wsToken: string;
}

export interface ConnectionStatus {
  ssh: 'connected' | 'disconnected' | 'connecting';
  ws: 'connected' | 'disconnected' | 'connecting';
}

export interface ClaudeMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result';
  content: string;
  timestamp: number;
  metadata?: any;
}
```

**Step 2: Create connectionStore.ts**

```typescript
import { create } from 'zustand';
import { ServerConfig, ConnectionStatus } from '../types';

interface ConnectionState {
  currentServer: ServerConfig | null;
  status: ConnectionStatus;
  setServer: (server: ServerConfig) => void;
  setSSHStatus: (status: ConnectionStatus['ssh']) => void;
  setWSStatus: (status: ConnectionStatus['ws']) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  currentServer: null,
  status: {
    ssh: 'disconnected',
    ws: 'disconnected',
  },
  setServer: (server) => set({ currentServer: server }),
  setSSHStatus: (status) =>
    set((state) => ({
      status: { ...state.status, ssh: status },
    })),
  setWSStatus: (status) =>
    set((state) => ({
      status: { ...state.status, ws: status },
    })),
  disconnect: () =>
    set({
      status: { ssh: 'disconnected', ws: 'disconnected' },
    }),
}));
```

**Step 3: Create claudeStore.ts**

```typescript
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
```

**Step 4: Commit**

```bash
git add client/src/store/ client/src/types.ts
git commit -m "feat(client): add state management with Zustand"
```

---

### Task 11: WebSocket Client Service

**Files:**
- Create: `client/src/services/websocket.ts`

**Step 1: Create websocket.ts**

```typescript
import { useClaudeStore } from '../store/claudeStore';
import { useConnectionStore } from '../store/connectionStore';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = [1000, 2000, 5000, 10000, 30000];

  connect(host: string, port: number, token: string) {
    const url = `ws://${host}:${port}`;
    
    useConnectionStore.getState().setWSStatus('connecting');

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Send auth message
      this.send({ type: 'auth', token });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      useConnectionStore.getState().setWSStatus('disconnected');
      this.attemptReconnect(host, port, token);
    };
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'auth_success':
        console.log('Authenticated:', message.data.clientId);
        useConnectionStore.getState().setWSStatus('connected');
        break;

      case 'claude_user_input':
        useClaudeStore.getState().addMessage({
          id: `user_${Date.now()}`,
          type: 'user',
          content: message.data.message,
          timestamp: message.data.timestamp,
        });
        break;

      case 'claude_assistant_message':
        useClaudeStore.getState().addMessage({
          id: message.data.messageId,
          type: 'assistant',
          content: message.data.content,
          timestamp: new Date(message.data.timestamp).getTime(),
        });
        break;

      case 'claude_tool_call':
        useClaudeStore.getState().addMessage({
          id: message.data.toolId,
          type: 'tool_call',
          content: `Tool: ${message.data.toolName}`,
          timestamp: new Date(message.data.timestamp).getTime(),
          metadata: message.data,
        });
        break;

      case 'error':
        console.error('Server error:', message.error);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private attemptReconnect(host: string, port: number, token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay[this.reconnectAttempts];
    console.log(`Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(host, port, token);
    }, delay);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
```

**Step 2: Commit**

```bash
git add client/src/services/websocket.ts
git commit -m "feat(client): add WebSocket client service"
```

---

### Task 12: SSH Client Service

**Files:**
- Create: `client/src/services/ssh.ts`

**Step 1: Create ssh.ts**

```typescript
import SSHClient from 'react-native-ssh-sftp';
import { useConnectionStore } from '../store/connectionStore';

export class SSHService {
  private client: any = null;

  async connect(
    host: string,
    port: number,
    username: string,
    privateKey: string
  ): Promise<void> {
    try {
      useConnectionStore.getState().setSSHStatus('connecting');

      this.client = await SSHClient.connectWithKey(
        host,
        port,
        username,
        privateKey,
        '' // passphrase if key is encrypted
      );

      useConnectionStore.getState().setSSHStatus('connected');
      console.log('SSH connected');
    } catch (error) {
      useConnectionStore.getState().setSSHStatus('disconnected');
      console.error('SSH connection failed:', error);
      throw error;
    }
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.client) {
      throw new Error('SSH not connected');
    }

    try {
      const result = await SSHClient.execute(this.client, command);
      return result;
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    }
  }

  async startShell(): Promise<void> {
    if (!this.client) {
      throw new Error('SSH not connected');
    }

    try {
      await SSHClient.startShell(this.client, 'vanilla');
    } catch (error) {
      console.error('Failed to start shell:', error);
      throw error;
    }
  }

  async writeToShell(command: string): Promise<void> {
    if (!this.client) {
      throw new Error('SSH not connected');
    }

    try {
      await SSHClient.writeToShell(this.client, command);
    } catch (error) {
      console.error('Failed to write to shell:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.client) {
      SSHClient.disconnect(this.client);
      this.client = null;
      useConnectionStore.getState().setSSHStatus('disconnected');
      console.log('SSH disconnected');
    }
  }
}

export const sshService = new SSHService();
```

**Step 2: Commit**

```bash
git add client/src/services/ssh.ts
git commit -m "feat(client): add SSH client service"
```

---

### Task 13: Navigation Setup

**Files:**
- Create: `client/src/navigation/AppNavigator.tsx`
- Create: `client/src/screens/ConnectionScreen.tsx`
- Create: `client/src/screens/MainScreen.tsx`

**Step 1: Create AppNavigator.tsx**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ConnectionScreen from '../screens/ConnectionScreen';
import MainScreen from '../screens/MainScreen';
import { useConnectionStore } from '../store/connectionStore';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { status } = useConnectionStore();
  const isConnected = status.ssh === 'connected' && status.ws === 'connected';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isConnected ? (
          <Stack.Screen name="Connection" component={ConnectionScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Step 2: Create ConnectionScreen.tsx (placeholder)**

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from 'react-native';
import { useConnectionStore } from '../store/connectionStore';
import { sshService } from '../services/ssh';
import { wsClient } from '../services/websocket';

export default function ConnectionScreen() {
  const [host, setHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [username, setUsername] = useState('');
  const [wsPort, setWsPort] = useState('8080');
  const [token, setToken] = useState('');
  const { setServer } = useConnectionStore();

  const handleConnect = async () => {
    if (!host || !username || !token) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      // For now, we'll skip SSH key management
      // In production, load from secure storage
      const dummyKey = ''; // TODO: Implement key management

      // Connect SSH
      await sshService.connect(
        host,
        parseInt(sshPort),
        username,
        dummyKey
      );

      // Connect WebSocket
      wsClient.connect(host, parseInt(wsPort), token);

      // Save server config
      setServer({
        id: Date.now().toString(),
        name: host,
        host,
        sshPort: parseInt(sshPort),
        sshUsername: username,
        wsPort: parseInt(wsPort),
        wsToken: token,
      });
    } catch (error) {
      Alert.alert('Connection Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remote Dev Client</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Host (e.g., example.com)"
        value={host}
        onChangeText={setHost}
      />
      
      <TextInput
        style={styles.input}
        placeholder="SSH Port (default: 22)"
        value={sshPort}
        onChangeText={setSshPort}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      
      <TextInput
        style={styles.input}
        placeholder="WebSocket Port (default: 8080)"
        value={wsPort}
        onChangeText={setWsPort}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Auth Token"
        value={token}
        onChangeText={setToken}
        secureTextEntry
      />
      
      <Button title="Connect" onPress={handleConnect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
});
```

**Step 3: Create MainScreen.tsx (placeholder)**

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TerminalTab from '../components/TerminalTab';
import ClaudeTab from '../components/ClaudeTab';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'claude'>('terminal');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>● Connected</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'terminal' ? <TerminalTab /> : <ClaudeTab />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terminal' && styles.activeTab]}
          onPress={() => setActiveTab('terminal')}
        >
          <Text>Terminal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'claude' && styles.activeTab]}
          onPress={() => setActiveTab('claude')}
        >
          <Text>Claude</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#e8e8e8',
  },
});
```

**Step 4: Commit**

```bash
git add client/src/navigation/ client/src/screens/
git commit -m "feat(client): add navigation and screen structure"
```

---

### Task 14: Terminal Tab Component

**Files:**
- Create: `client/src/components/TerminalTab.tsx`

**Step 1: Create TerminalTab.tsx**

```typescript
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { sshService } from '../services/ssh';

export default function TerminalTab() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Start SSH shell when component mounts
    sshService.startShell().catch(console.error);
  }, []);

  const handleMessage = (event: any) => {
    const data = event.nativeEvent.data;
    
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'input') {
        // Send input to SSH
        sshService.writeToShell(message.data).catch(console.error);
      }
    } catch (error) {
      console.error('Error handling terminal message:', error);
    }
  };

  const terminalHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
        }
        #terminal {
          width: 100vw;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div id="terminal"></div>
      <script>
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#000000',
            foreground: '#ffffff',
          }
        });
        
        term.open(document.getElementById('terminal'));
        term.write('$ ');
        
        term.onData((data) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'input',
            data: data
          }));
        });
        
        // Listen for output from React Native
        window.addEventListener('message', (event) => {
          if (event.data.type === 'output') {
            term.write(event.data.data);
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: terminalHTML }}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
```

**Step 2: Commit**

```bash
git add client/src/components/TerminalTab.tsx
git commit -m "feat(client): add Terminal tab with xterm.js"
```

---

### Task 15: Claude Tab Component

**Files:**
- Create: `client/src/components/ClaudeTab.tsx`
- Create: `client/src/components/MessageBubble.tsx`

**Step 1: Create MessageBubble.tsx**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClaudeMessage } from '../types';

interface Props {
  message: ClaudeMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.type === 'user';
  const isTool = message.type === 'tool_call';

  return (
    <View style={[
      styles.container,
      isUser && styles.userContainer,
      isTool && styles.toolContainer,
    ]}>
      <View style={[
        styles.bubble,
        isUser && styles.userBubble,
        isTool && styles.toolBubble,
      ]}>
        <Text style={styles.content}>{message.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    marginHorizontal: 10,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  toolContainer: {
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  toolBubble: {
    backgroundColor: '#FFF3CD',
  },
  content: {
    fontSize: 15,
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
  },
});
```

**Step 2: Create ClaudeTab.tsx**

```typescript
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useClaudeStore } from '../store/claudeStore';
import MessageBubble from './MessageBubble';

export default function ClaudeTab() {
  const { messages } = useClaudeStore();

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 10,
  },
});
```

**Step 3: Update App.tsx**

```typescript
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
```

**Step 4: Test the app**

```bash
# iOS
npm run ios

# Android
npm run android
```

**Step 5: Commit**

```bash
git add client/src/components/ client/App.tsx
git commit -m "feat(client): add Claude tab with message display"
```

---

## Phase 3: Advanced Features (Summary)

### Task 16: File Service (Server)

**Goal:** Add file browsing and reading capabilities to server

**Files to create:**
- `server/src/files/browser.ts` - File tree generation
- `server/src/files/reader.ts` - File content reading with size limits

**Key features:**
- Generate file tree structure
- Read file contents with MAX_FILE_SIZE limit
- Detect file language/syntax
- Handle binary files gracefully

---

### Task 17: Search Service (Server)

**Goal:** Add code search using ripgrep

**Files to create:**
- `server/src/files/search.ts` - Ripgrep wrapper

**Key features:**
- Execute ripgrep with query and options
- Parse ripgrep output
- Return structured results (file, line, content)
- Timeout protection

---

### Task 18: Files Tab (Client)

**Goal:** Add file browsing and viewing

**Files to create:**
- `client/src/components/FilesTab.tsx` - Main files view
- `client/src/components/FileTree.tsx` - Directory tree
- `client/src/components/FileViewer.tsx` - Code viewer with syntax highlighting

**Key features:**
- Layered navigation (tree → file content)
- Syntax highlighting
- Search in file
- Pinch to zoom

---

### Task 19: Diff Viewer (Client)

**Goal:** Display Claude Code file changes

**Files to create:**
- `client/src/components/DiffViewer.tsx` - Side-by-side or vertical diff

**Key features:**
- Parse diff format
- Highlight additions/deletions
- Accept/reject changes (future)

---

### Task 20: Polish and Optimization

**Goal:** Production-ready polish

**Tasks:**
- Add loading states and error boundaries
- Implement offline cache with AsyncStorage
- Add connection status indicator
- Optimize WebSocket reconnection
- Add gesture handlers (swipe, long-press)
- Performance optimization (FlatList, memo)
- Add E2E tests with Detox

---

## Testing Strategy

### Server Tests

```bash
# Unit tests for each module
npm test

# Integration test: Start server and connect with wscat
wscat -c ws://localhost:8080
> {"type":"auth","token":"your-token"}
```

### Client Tests

```bash
# Run on simulator/emulator
npm run ios
npm run android

# Test scenarios:
# 1. Connection flow
# 2. Terminal input/output
# 3. Claude message display
# 4. Reconnection on network loss
```

---

## Deployment

### Server Deployment

```bash
# Build
cd server
npm run build

# Create systemd service
sudo nano /etc/systemd/system/remote-dev-server.service

# Start service
sudo systemctl enable remote-dev-server
sudo systemctl start remote-dev-server
```

### Client Deployment

```bash
# iOS
cd client/ios
pod install
# Open Xcode and build for device

# Android
cd client/android
./gradlew assembleRelease
```

---

## Success Criteria

- [ ] Server starts and watches Claude Code files
- [ ] Client connects via SSH and WebSocket
- [ ] Terminal displays and accepts input
- [ ] Claude messages appear in real-time
- [ ] File browsing works
- [ ] Search returns results
- [ ] Diff viewer shows changes
- [ ] Reconnection works after network loss
- [ ] App runs smoothly on iOS and Android

---

## Next Steps After Implementation

1. **Security hardening:** SSH key encryption, certificate pinning
2. **Performance optimization:** Lazy loading, pagination
3. **Advanced features:** Code editing, git operations, multiple terminals
4. **UI polish:** Animations, haptic feedback, custom themes
5. **Testing:** Unit tests, integration tests, E2E tests

---

Plan complete and saved to `docs/plans/2026-02-02-mobile-remote-dev-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
