# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenRemoteControl is a mobile remote development client for SSH/WebSocket-based server integration, designed for Claude Code monitoring and remote terminal access. It consists of a Node.js WebSocket server and a React Native mobile app.

## Build & Development Commands

### Server (in `server/`)
```bash
npm run dev          # Development with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JavaScript
npm test             # Run Jest tests
npm run test:watch   # Watch mode
```

### Client (in `client/`)
```bash
npm start            # Start Metro bundler
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm test             # Run Jest unit tests

# Android build
cd android && ./gradlew assembleDebug
# APK output: android/app/build/outputs/apk/debug/app-debug.apk

# E2E tests (Detox)
npm run e2e:build:ios && npm run e2e:test:ios
```

### Development Setup
```bash
# Terminal 1: Server with hot reload
cd server && npm run dev

# Terminal 2: Metro bundler
cd client && npm start

# Terminal 3: Run app
cd client && npm run ios  # or npm run android
```

### Android Device Setup (macOS)

**1. Environment variables** (add to `~/.zshrc` or `~/.bash_profile`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17  # Requires Java 17
```

**2. Install Java 17** (required, Gradle doesn't support Java 25+):
```bash
brew install openjdk@17
```

**3. Port forwarding for USB debugging**:
```bash
adb reverse tcp:8081 tcp:8081   # Metro bundler
adb reverse tcp:9080 tcp:9080   # WebSocket server
```

**4. Build and run**:
```bash
cd client && npm run android
```

## Architecture

```
┌─ React Native Client ─────────────────────┐
│  Tabs: Terminal | Sessions | Files | Config│
│  State: Zustand stores                     │
│  Services: websocket.ts, ssh.ts            │
└────────────────────────────────────────────┘
          │ WebSocket (9080)  │ SSH (22)
          ▼                   ▼
┌─ Node.js Server ──────────────────────────┐
│  WebSocket: server.ts (message routing)    │
│  SSH: sshManager.ts (connection pooling)   │
│  Claude: watcher.ts (history.jsonl monitor)│
│  Git: gitService.ts (git commands)         │
│  Files: browser.ts, reader.ts, search.ts   │
└────────────────────────────────────────────┘
```

### Key Directories

**Server (`server/src/`):**
- `websocket/server.ts` - WebSocket message router, handles all client messages
- `claude/watcher.ts` - Monitors `~/.claude/` for Claude Code activity via chokidar
- `claude/sessionBrowser.ts` - Lists workspaces and sessions from Claude data
- `ssh/sshManager.ts` - SSH connection pooling and shell multiplexing
- `git/gitService.ts` - Executes git commands (status, diff)
- `files/` - File tree, reading, ripgrep search

**Client (`client/src/`):**
- `services/websocket.ts` - WebSocket client with auto-reconnect and message handlers
- `services/ssh.ts` - SSH service proxy (connects via WebSocket to server)
- `store/` - Zustand stores: `connectionStore`, `claudeStore`, `filesStore`, `sessionBrowserStore`, `terminalSessionStore`
- `components/` - UI: `TerminalTab`, `ClaudeTab`, `FilesTab`, `ConfigTab`, etc.

## Communication Protocol

All communication uses JSON messages over WebSocket (port 9080). Message types defined in `server/src/types.ts`.

**Pattern:** Client sends `{ type: 'action_name', data: {...} }`, server responds with `{ type: 'action_name_response', data: {...} }`.

Key message flows:
- `auth` → `auth_success` - Token-based authentication
- `ssh_connect` → `ssh_connect_response` → `ssh_start_shell` → `ssh_output` (streaming)
- `file_tree` → `file_tree_response`, `file_read` → `file_read_response`
- `git_status` → `git_status_response`, `git_file_diff` → `git_file_diff_response`
- `list_workspaces` → `list_workspaces_response`, `list_sessions` → `list_sessions_response`

Claude watcher broadcasts events: `claude_user_input`, `claude_assistant_message`, `claude_tool_call`.

## Configuration

Server env vars (`server/.env`):
- `PORT=9080` - WebSocket port
- `AUTH_TOKEN` - Auth token (empty = allow any connection)
- `CLAUDE_HOME` - Claude Code data directory (default: `~/.claude`)

## Tech Stack

- **Server:** Node.js 18+, TypeScript, Express, ws, ssh2, chokidar
- **Client:** React Native 0.83, React 19, Zustand, TypeScript
- **Testing:** Jest (both), Detox (client E2E)
