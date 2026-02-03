import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { gitService } from './gitService';
import { ClientMessage, ServerMessage } from '../types';

type SendFn = (ws: WebSocket, message: ServerMessage) => void;

/**
 * Handles Git-related WebSocket messages.
 * Routes git_* messages to GitService methods.
 */
export class GitHandler {
  private sendFn: SendFn;

  constructor(sendFn: SendFn) {
    this.sendFn = sendFn;
  }

  canHandle(messageType: string): boolean {
    return messageType.startsWith('git_');
  }

  async handle(ws: WebSocket, clientId: string, message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'git_status':
        await this.handleStatus(ws, message);
        break;
      case 'git_file_diff':
        await this.handleFileDiff(ws, message);
        break;
      case 'git_check_repo':
        await this.handleCheckRepo(ws, message);
        break;
      default:
        logger.warn(`Unknown git message type: ${message.type}`);
    }
  }

  private async handleCheckRepo(ws: WebSocket, message: ClientMessage): Promise<void> {
    try {
      const workingDir = message.path || process.cwd();
      const isGitRepo = await gitService.isGitRepo(workingDir);

      this.sendFn(ws, {
        type: 'git_check_repo_response',
        data: { isGitRepo },
      });
    } catch (error: any) {
      logger.error('Git check repo error:', error);
      this.sendFn(ws, {
        type: 'git_check_repo_response',
        data: { isGitRepo: false },
        error: error.message,
      });
    }
  }

  private async handleStatus(ws: WebSocket, message: ClientMessage): Promise<void> {
    try {
      const workingDir = message.path || process.cwd();
      const files = await gitService.getStatus(workingDir);

      this.sendFn(ws, {
        type: 'git_status_response',
        data: { files },
      });
    } catch (error: any) {
      logger.error('Git status error:', error);
      this.sendFn(ws, {
        type: 'error',
        error: `Failed to get git status: ${error.message}`,
      });
    }
  }

  private async handleFileDiff(ws: WebSocket, message: ClientMessage): Promise<void> {
    try {
      const workingDir = message.path || process.cwd();
      const { filePath, staged } = message;

      logger.info(`Git diff request: filePath=${filePath}, staged=${staged}, workingDir=${workingDir}`);

      if (!filePath) {
        this.sendFn(ws, {
          type: 'error',
          error: 'File path is required for git diff',
        });
        return;
      }

      const diff = await gitService.getFileDiff(workingDir, filePath, staged);
      logger.info(`Git diff result: ${diff.length} bytes`);

      this.sendFn(ws, {
        type: 'git_file_diff_response',
        data: { filePath, diff },
      });
    } catch (error: any) {
      logger.error('Git diff error:', error);
      this.sendFn(ws, {
        type: 'error',
        error: `Failed to get diff: ${error.message}`,
      });
    }
  }
}
