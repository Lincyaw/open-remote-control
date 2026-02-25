"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHandler = void 0;
const logger_1 = require("../utils/logger");
const gitService_1 = require("./gitService");
/**
 * Handles Git-related WebSocket messages.
 * Routes git_* messages to GitService methods.
 */
class GitHandler {
    constructor(sendFn) {
        this.sendFn = sendFn;
    }
    canHandle(messageType) {
        return messageType.startsWith('git_');
    }
    async handle(ws, clientId, message) {
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
            case 'git_commit':
                await this.handleCommit(ws, message);
                break;
            case 'git_stage':
                await this.handleStage(ws, message);
                break;
            case 'git_unstage':
                await this.handleUnstage(ws, message);
                break;
            case 'git_discard':
                await this.handleDiscard(ws, message);
                break;
            default:
                logger_1.logger.warn(`Unknown git message type: ${message.type}`);
        }
    }
    async handleCheckRepo(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const isGitRepo = await gitService_1.gitService.isGitRepo(workingDir);
            this.sendFn(ws, {
                type: 'git_check_repo_response',
                data: { isGitRepo },
            });
        }
        catch (error) {
            logger_1.logger.error('Git check repo error:', error);
            this.sendFn(ws, {
                type: 'git_check_repo_response',
                data: { isGitRepo: false },
                error: error.message,
            });
        }
    }
    async handleStatus(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const files = await gitService_1.gitService.getStatus(workingDir);
            this.sendFn(ws, {
                type: 'git_status_response',
                data: { files },
            });
        }
        catch (error) {
            logger_1.logger.error('Git status error:', error);
            this.sendFn(ws, {
                type: 'error',
                error: `Failed to get git status: ${error.message}`,
            });
        }
    }
    async handleCommit(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const { commitMessage, mode } = message;
            const result = await gitService_1.gitService.commit(workingDir, commitMessage || '', mode || 'commit');
            const files = await gitService_1.gitService.getStatus(workingDir);
            this.sendFn(ws, {
                type: 'git_commit_response',
                data: { success: true, output: result, files },
            });
        }
        catch (error) {
            logger_1.logger.error('Git commit error:', error);
            const output = error.stderr?.trim() || error.message;
            this.sendFn(ws, {
                type: 'git_commit_response',
                data: { success: false, output },
            });
        }
    }
    async handleStage(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const { filePath } = message;
            if (!filePath) {
                this.sendFn(ws, { type: 'error', error: 'File path is required for git stage' });
                return;
            }
            await gitService_1.gitService.stageFile(workingDir, filePath);
            const files = await gitService_1.gitService.getStatus(workingDir);
            this.sendFn(ws, { type: 'git_status_response', data: { files } });
        }
        catch (error) {
            logger_1.logger.error('Git stage error:', error);
            this.sendFn(ws, { type: 'error', error: `Failed to stage file: ${error.message}` });
        }
    }
    async handleUnstage(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const { filePath } = message;
            if (!filePath) {
                this.sendFn(ws, { type: 'error', error: 'File path is required for git unstage' });
                return;
            }
            await gitService_1.gitService.unstageFile(workingDir, filePath);
            const files = await gitService_1.gitService.getStatus(workingDir);
            this.sendFn(ws, { type: 'git_status_response', data: { files } });
        }
        catch (error) {
            logger_1.logger.error('Git unstage error:', error);
            this.sendFn(ws, { type: 'error', error: `Failed to unstage file: ${error.message}` });
        }
    }
    async handleDiscard(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const { filePath, fileStatus } = message;
            if (!filePath) {
                this.sendFn(ws, { type: 'error', error: 'File path is required for git discard' });
                return;
            }
            await gitService_1.gitService.discardFile(workingDir, filePath, fileStatus || 'modified');
            const files = await gitService_1.gitService.getStatus(workingDir);
            this.sendFn(ws, { type: 'git_status_response', data: { files } });
        }
        catch (error) {
            logger_1.logger.error('Git discard error:', error);
            this.sendFn(ws, { type: 'error', error: `Failed to discard changes: ${error.message}` });
        }
    }
    async handleFileDiff(ws, message) {
        try {
            const workingDir = message.path || process.cwd();
            const { filePath, staged } = message;
            logger_1.logger.info(`Git diff request: filePath=${filePath}, staged=${staged}, workingDir=${workingDir}`);
            if (!filePath) {
                this.sendFn(ws, {
                    type: 'error',
                    error: 'File path is required for git diff',
                });
                return;
            }
            const diff = await gitService_1.gitService.getFileDiff(workingDir, filePath, staged);
            logger_1.logger.info(`Git diff result: ${diff.length} bytes`);
            this.sendFn(ws, {
                type: 'git_file_diff_response',
                data: { filePath, diff },
            });
        }
        catch (error) {
            logger_1.logger.error('Git diff error:', error);
            this.sendFn(ws, {
                type: 'error',
                error: `Failed to get diff: ${error.message}`,
            });
        }
    }
}
exports.GitHandler = GitHandler;
