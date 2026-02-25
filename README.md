# OpenRemoteControl (ORC)

Remote development monitor — watch Claude Code sessions, operate terminals, and browse files from your browser.

## Install

```bash
npm install -g orc-server
```

### Prerequisites

- Node.js 18+
- [ripgrep](https://github.com/BurntSushi/ripgrep) — code search
- [zellij](https://zellij.dev) — terminal session persistence across reconnects

```bash
# macOS
brew install ripgrep zellij

# Ubuntu/Debian
sudo apt install ripgrep
# zellij: download from https://github.com/zellij-org/zellij/releases
```

## Usage

```bash
orc-server
# Open http://localhost:9080
```

### Environment Variables

```env
PORT=9080                      # Server port
AUTH_TOKEN=                    # Auth token (empty = allow any connection)
CLAUDE_HOME=~/.claude          # Claude Code data directory
```

### systemd Service (optional)

```bash
make setup       # Install and enable on boot
make start       # Start service
make stop        # Stop service
make restart     # Restart service
make logs        # View logs
```

## Features

- Real-time Claude Code session monitoring
- Remote terminal (xterm.js + zellij)
- File browser with syntax highlighting
- Code search (ripgrep)
- Git diff viewer

## License

MIT
