import { WebSocketServer } from './websocket/server';
import { ClaudeWatcher } from './claude/watcher';
import { createHttpServer } from './http/server';
import { logger } from './utils/logger';

class RemoteDevServer {
  private wsServer: WebSocketServer;
  private claudeWatcher: ClaudeWatcher;

  constructor() {
    this.wsServer = new WebSocketServer();
    this.claudeWatcher = new ClaudeWatcher();

    createHttpServer();
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
