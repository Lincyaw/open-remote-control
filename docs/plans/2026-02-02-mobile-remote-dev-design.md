# Mobile Remote Development Client Design

## Overview

A mobile client for remote server development, similar to VSCode Remote but optimized for mobile devices. Enables remote control of Claude Code, smooth code browsing, diff viewing, and port forwarding.

## Requirements

### Core Features
- Remote Terminal access (SSH)
- Claude Code integration and monitoring
- Code browsing with syntax highlighting
- View Claude Code modifications (diff)
- Code search
- Port forwarding support

### Target Platform
- Cross-platform: iOS + Android
- Framework: React Native

## System Architecture

### Architecture Pattern: Dual Connection Hybrid

**Components:**
- **Mobile Client (React Native)**: SSH client + WebSocket client + UI
- **Server (Node.js)**: WebSocket service + Claude Code watcher + File service
- **Connections**:
  - SSH: Direct connection for terminal operations
  - WebSocket: Real-time Claude Code sync and file operations

**Rationale:**
- SSH provides native terminal experience with low latency
- WebSocket handles Claude Code integration and code browsing
- Clear separation of concerns
- Moderate complexity, fast iteration

### Connection Flow

```
Mobile Client
    ├─ SSH Connection ──────────→ Server SSH Daemon (port 22)
    │                             - Terminal operations
    │                             - Port forwarding (ssh -L)
    │
    └─ WebSocket Connection ────→ WebSocket Service (port 8080)
                                  - Claude Code status
                                  - File browsing
                                  - Code search
                                  - Real-time notifications
```

### Authentication
- SSH: Key-based authentication (private key stored in device secure storage)
- WebSocket: Token authentication (obtained via SSH on first connection)

## Technology Stack

### Client (React Native)

**Core Framework:**
- React Native 0.73+ with TypeScript
- React Navigation (page navigation)
- Zustand (state management - lightweight)

**Key Libraries:**
- `react-native-ssh-sftp`: SSH connection and SFTP
- `xterm.js` + `react-native-webview`: Terminal emulator
- `react-native-code-editor` or Monaco Editor: Code viewer
- `@react-native-community/netinfo`: Network status
- `react-native-fs`: Local file cache

### Server (Node.js)

**Core Framework:**
- Node.js 18+ with TypeScript
- `ws`: WebSocket service (lightweight)
- `express`: HTTP service (health check, token)

**Key Libraries:**
- `chokidar`: File system watching (Claude Code sessions)
- `simple-git`: Git operations (diff, history)
- `node-pty`: Execute Claude Code CLI (if needed)
- `fast-glob`: File search
- `diff`: Compute file differences

## Data Flow and Communication Protocol

### SSH Connection Data Flow

**Terminal Operations:**
1. Client establishes SSH connection to server
2. User input → SSH → Server execution
3. Server output → SSH → Client
4. xterm.js renders output

**Port Forward:**
1. Client establishes SSH local port forward: `ssh -L local_port:localhost:remote_port`
2. Client generates access link (e.g., `http://localhost:local_port`)
3. User opens link in system browser

### WebSocket Communication Protocol

**Connection Establishment:**
```typescript
// Client sends
{
  type: 'auth',
  token: 'xxx'
}

// Server responds
{
  type: 'auth_success',
  sessionId: 'xxx'
}
```

**Claude Code Status Push:**
```typescript
{
  type: 'claude_message',
  data: {
    role: 'assistant' | 'user',
    content: string,
    toolCalls?: [...],
    timestamp: number
  }
}
```

**Code Browsing Request:**
```typescript
// Client requests file
{
  type: 'file_read',
  path: '/path/to/file.ts'
}

// Server responds
{
  type: 'file_content',
  path: '/path/to/file.ts',
  content: string,
  language: 'typescript'
}
```

**Code Search Request:**
```typescript
// Client requests search
{
  type: 'search',
  query: 'function name',
  options: { caseSensitive: false }
}

// Server responds
{
  type: 'search_results',
  results: [
    { file: 'path', line: 10, content: '...' }
  ]
}
```

## Claude Code Integration

### Data Sources

**Primary Files:**
1. `~/.claude/history.jsonl` - User input history (simplified, display + metadata)
2. `~/.claude/projects/<project-name>/<sessionId>.jsonl` - Complete session records (all messages and tool calls)
3. `~/.claude/file-history/<uuid>/` - File change history
4. `~/.claude/tasks/<uuid>/` - Task lists

### Session File Format

```typescript
type MessageType = 'user' | 'assistant' | 'system' | 'progress' | 'file-history-snapshot';

interface AssistantMessage {
  type: 'assistant';
  uuid: string;
  sessionId: string;
  timestamp: string;
  cwd: string;
  message: {
    role: 'assistant';
    id: string;
    content: Array<TextBlock | ToolUseBlock>;
    usage: {...};
  };
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string; // 'Read', 'Edit', 'Write', 'Bash', etc.
  input: {...};
}
```

### Watching Strategy

**Watch history.jsonl for new user inputs:**
- Tail-follow mode, read new lines
- Extract sessionId and project path
- Broadcast user input to clients
- Start watching corresponding session file

**Watch session file for Claude Code activity:**
- Monitor `~/.claude/projects/<project>/<sessionId>.jsonl`
- Parse assistant messages (text + tool calls)
- Parse system messages (tool results)
- Extract file operations (Edit/Write) and compute diffs
- Broadcast all events to connected clients

### Message Types Pushed to Clients

```typescript
type ServerMessage =
  | { type: 'claude_user_input'; data: { message: string; timestamp: number; sessionId: string } }
  | { type: 'claude_assistant_message'; data: { content: string; timestamp: string; messageId: string } }
  | { type: 'claude_tool_call'; data: { toolName: string; toolId: string; input: any; timestamp: string } }
  | { type: 'claude_tool_result'; data: { toolId: string; content: any; timestamp: string } }
  | { type: 'claude_file_change'; data: { filePath: string; operation: string; diff: string; timestamp: number } }
  | { type: 'claude_progress'; data: { message: string; percentage?: number } };
```

## Mobile UI Design

### Core Interaction Principles

1. **Gesture-first** - Swipe, long-press, double-tap
2. **Minimize taps** - Common operations in one step
3. **Context-aware** - Show relevant actions based on state
4. **Progressive disclosure** - Hide secondary info by default
5. **Fast switching** - Seamless transition between Terminal and Claude

### Page Structure

```
App
├── ConnectionScreen (first use / disconnected)
└── MainScreen (connected)
    ├── TerminalTab
    ├── ClaudeTab
    └── FilesTab
```

### MainScreen Layout

**Floating Tab Switcher** (not fixed bottom tabs)
```
┌─────────────────────────────┐
│ ● server-name        [≡]    │ ← Top status bar
├─────────────────────────────┤
│                             │
│  [Main Content Area]        │
│                             │
│                             │
└─────────────────────────────┘
     ↑ Swipe up from bottom to show switcher

Gestures:
- Swipe up from bottom → Show tab switcher
- Swipe left/right → Quick tab switch
- Pinch → Zoom in/out
```

**Tab Switcher (Bottom Drawer)**
```
┌─────────────────────────────┐
│ ─────                       │ ← Drag handle
│                             │
│ 🖥️  Terminal    [Recent: ls]│
│ 🤖 Claude       [● Running] │
│ 📁 Files        [login.ts]  │
│ 🔗 Ports        [3000→]     │
│                             │
│ [Recent Files]              │
│ • src/auth/login.ts         │
│ • package.json              │
└─────────────────────────────┘
```

### TerminalTab

**Smart Keyboard Toolbar:**
```
┌─────────────────────────────┐
│ $ npm run dev               │
│ Server running on :3000     │
│ ▌                           │
├─────────────────────────────┤
│ [Tab] [Ctrl] [Esc] [↑] [↓] │ ← Shortcut keys
│ [cd] [ls] [git] [npm] [vim] │ ← Common commands
├─────────────────────────────┤
│ [Keyboard Input Area]       │
└─────────────────────────────┘

Gestures:
- Long-press command → Show variants (git → git status, git log)
- Double-tap screen → Show/hide keyboard toolbar
- Three-finger swipe down → Clear screen
- Swipe right → Show command history sidebar
```

**Command History Sidebar** (slide from right)
```
     ┌──────────────────┐
     │ Command History  │
     │ ─────────────────│
     │ npm run dev      │
     │ git status       │
     │ ls -la           │
     │ cd src/          │
     │                  │
     │ [Clear History]  │
     └──────────────────┘
```

**Port Forward Panel** (pull down from top)
```
┌─────────────────────────────┐
│ Active Port Forwards        │
│ ─────────────────────────   │
│ 3000 → localhost:3000       │
│ [Open in Browser] [Stop]    │
│                             │
│ 8080 → localhost:8080       │
│ [Open in Browser] [Stop]    │
│                             │
│ [+ Add Port Forward]        │
└─────────────────────────────┘
```

### ClaudeTab

**Compact Message Cards:**
```
┌─────────────────────────────┐
│ 👤 You · 2m ago             │
│ 修复登录 bug                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🤖 Claude · 1m ago          │
│ 让我先检查登录相关代码...     │
│                             │
│ 🔧 Read login.ts            │
│    [Tap to view]            │
│                             │
│ 🔧 Edit login.ts            │
│    + 3 lines, - 1 line      │
│    [View Diff] 👁️           │
│                             │
│ 已修复验证逻辑问题            │
└─────────────────────────────┘

Gestures:
- Tap tool card → Expand details
- Long-press message → Copy
- Swipe left on message → Quick actions (copy/share)
- Pull down → Refresh conversation
```

**Quick Input Panel:**
```
┌─────────────────────────────┐
│ Send to Claude              │
├─────────────────────────────┤
│ [Quick Actions]             │
│ 💬 继续  🐛 修复  📝 重构    │
│ 🧪 测试  📖 解释  ✨ 优化    │
├─────────────────────────────┤
│ [Type message...]           │
│                             │
│ [📎] [🎤] [Send]            │
└─────────────────────────────┘

Features:
- Tap quick action → Auto-fill common commands
- 📎 Attach → Paste code snippet or screenshot
- 🎤 Voice → Speech-to-text input
- Long-press Send → Send options
```

### FilesTab

**Layered Navigation** (not side-by-side split)
```
Layer 1: File Tree
┌─────────────────────────────┐
│ ← Back    src/              │
├─────────────────────────────┤
│ 📁 auth                  →  │
│ 📁 components            →  │
│ 📁 utils                 →  │
│ 📄 index.ts              →  │
│ 📄 App.tsx               →  │
└─────────────────────────────┘

Layer 2: File Content
┌─────────────────────────────┐
│ ← src/    login.ts      [⋮] │
├─────────────────────────────┤
│ 1  import { User } from ... │
│ 2  export function login(   │
│ 3    email: string,         │
│ 4    password: string       │
│ 5  ) {                      │
│                             │
│ [Search in file] 🔍         │
└─────────────────────────────┘

Gestures:
- Double-tap line number → Jump to definition
- Long-press code → Select and copy
- Pinch → Zoom font
- Swipe right → Back to file tree
```

**Diff View (Vertical Comparison):**
```
┌─────────────────────────────┐
│ login.ts · Claude's changes │
│ [Original] [Modified]       │
├─────────────────────────────┤
│ Modified (Current)          │
│ ─────────────────────────   │
│ 10  if (user) {             │ ← Green bg
│ 11    return user;          │
│ 12  }                       │
│                             │
│ Original                    │
│ ─────────────────────────   │
│ 10  if (!user) return;      │ ← Red bg
│                             │
│ [Accept] [Reject] [Edit]    │
└─────────────────────────────┘

Gestures:
- Scroll → Browse all changes
- Swipe left on change → Quick reject
- Swipe right on change → Quick accept
```

## Error Handling and Offline Support

### Connection Status Management

**Status Indicator:**
```
Top status bar:
● Green - Connected (SSH + WS both ok)
◐ Yellow - Partial (SSH only or WS only)
○ Red - Disconnected
⟳ Gray - Reconnecting

Tap indicator → Show details:
┌─────────────────────────────┐
│ Connection Status           │
│ ─────────────────────────   │
│ SSH: ● Connected            │
│ Latency: 45ms               │
│                             │
│ WebSocket: ● Connected      │
│ Latency: 38ms               │
│                             │
│ Last sync: 2s ago           │
│                             │
│ [Reconnect] [Disconnect]    │
└─────────────────────────────┘
```

### Auto-Reconnect Strategy

**Exponential Backoff:**
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 5s delay
- Attempt 4: 10s delay
- Attempt 5: 30s delay
- After 5 attempts: Show manual reconnect dialog

### Offline Cache

**Cache Strategy:**
- Claude messages: Last 100 messages
- Recent files: Up to 20 files with content
- File tree: Lightweight structure
- Terminal history: Command history

**Offline Behavior:**
- Can view cached conversations and files
- Cannot edit (requires real-time sync)
- Cannot execute commands
- Show offline banner with retry option

### Error Classification

```typescript
enum ErrorType {
  NETWORK_ERROR = 'network',      // Auto-reconnect
  AUTH_ERROR = 'auth',            // Prompt re-authentication
  PERMISSION_ERROR = 'permission', // Show permission error
  SERVER_ERROR = 'server',        // Show error dialog with retry
  PARSE_ERROR = 'parse',          // Silent log
}
```

## Security Design

### SSH Key Management

**Secure Storage:**
- iOS: Keychain
- Android: Keystore
- Keys encrypted at rest
- Access only when device unlocked

**Key Generation:**
- Support importing existing keys
- Support generating new keys on device
- Support password-protected keys

### WebSocket Authentication

**Token-based:**
- Server generates secure token (32-byte random)
- Client obtains token via SSH on first connection
- Token stored in secure storage
- Token sent with every WebSocket connection
- Token rotation support

### Data Transmission

**Encryption:**
- SSH: Built-in encryption
- WebSocket: WSS (WebSocket Secure) over TLS
- No sensitive data in plaintext

## Server Implementation

### Project Structure

```
remote-dev-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Entry point
│   ├── config.ts                # Configuration
│   ├── websocket/
│   │   ├── server.ts            # WebSocket server
│   │   ├── handlers.ts          # Message handlers
│   │   └── auth.ts              # Token auth
│   ├── claude/
│   │   ├── watcher.ts           # Claude Code file watcher
│   │   ├── parser.ts            # Session file parser
│   │   └── session-manager.ts  # Session management
│   ├── files/
│   │   ├── browser.ts           # File browsing
│   │   ├── search.ts            # Code search (ripgrep)
│   │   └── diff.ts              # Diff computation
│   └── utils/
│       ├── logger.ts
│       └── helpers.ts
└── .env.example
```

### Core Services

**WebSocket Server:**
- Handle client connections
- Message routing
- Broadcast Claude Code events
- File operation requests
- Search requests

**Claude Code Watcher:**
- Watch `~/.claude/history.jsonl` for user inputs
- Watch session files for assistant messages and tool calls
- Parse and extract relevant data
- Compute diffs for file operations
- Emit events to WebSocket server

**File Service:**
- File tree generation
- File content reading
- Code search (using ripgrep)
- Syntax detection

## Deployment

### Server Installation

```bash
# Install script
npm install
npm run build

# Generate auth token
openssl rand -hex 32 > .env

# Start service (systemd on Linux)
sudo systemctl enable remote-dev-server
sudo systemctl start remote-dev-server
```

### Client Setup

**First-time Setup:**
1. Enter server details (host, ports, username)
2. Import or generate SSH key
3. Test connection
4. Obtain WebSocket token
5. Save configuration

**Multi-server Support:**
- Save multiple server configurations
- Quick switch between servers
- Per-server settings

## Future Enhancements

### Phase 2 Features
- Code editing (not just viewing)
- Git operations (commit, push, pull)
- Multiple terminal sessions
- Split view support (tablet)
- Collaborative features (share session)

### Phase 3 Features
- LSP integration (code intelligence)
- Debugging support
- Performance profiling
- Custom themes and fonts
- Plugin system

## Success Criteria

### Performance
- Terminal latency < 100ms
- File browsing response < 500ms
- Search results < 2s
- Claude Code sync delay < 1s

### Usability
- One-tap access to common operations
- Smooth scrolling and gestures
- Readable code on mobile screens
- Intuitive navigation

### Reliability
- Auto-reconnect on network issues
- No data loss on disconnection
- Graceful error handling
- Offline mode for viewing

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSH connection instability | High | Auto-reconnect with exponential backoff |
| Large file performance | Medium | Implement pagination and lazy loading |
| Battery drain | Medium | Optimize WebSocket polling, use efficient rendering |
| Security vulnerabilities | High | Secure key storage, encrypted transmission, regular audits |
| Claude Code format changes | Medium | Version detection, graceful degradation |

## Conclusion

This design provides a solid foundation for a mobile remote development client focused on Claude Code integration. The dual-connection architecture balances performance and functionality, while the mobile-optimized UI ensures a smooth user experience on small screens.

The implementation can be done in phases, starting with core features (Terminal + Claude monitoring) and gradually adding advanced features (editing, git operations, etc.).
