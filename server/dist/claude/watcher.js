"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeWatcher = void 0;
const events_1 = require("events");
const chokidar_1 = __importDefault(require("chokidar"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class ClaudeWatcher extends events_1.EventEmitter {
    constructor() {
        super();
        this.historyWatcher = null;
        this.sessionWatcher = null;
        this.lastHistorySize = 0;
        this.lastSessionSize = 0;
        this.activeSessionId = null;
        this.activeProjectPath = null;
        // Queue mechanism for handling rapid updates
        this.messageQueue = [];
        this.isProcessing = false;
        this.historyPath = (0, path_1.join)(config_1.CONFIG.claudeHome, 'history.jsonl');
    }
    async start() {
        logger_1.logger.info('Starting Claude Code watcher');
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
        logger_1.logger.info('Stopping Claude Code watcher');
        if (this.historyWatcher) {
            this.historyWatcher.close();
        }
        if (this.sessionWatcher) {
            this.sessionWatcher.close();
        }
    }
    async watchHistory() {
        this.historyWatcher = chokidar_1.default.watch(this.historyPath, {
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
            logger_1.logger.error('History watcher error:', error);
        });
        logger_1.logger.info(`Watching history: ${this.historyPath}`);
    }
    async processHistoryChanges() {
        try {
            const content = await (0, promises_1.readFile)(this.historyPath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length > this.lastHistorySize) {
                const newLines = lines.slice(this.lastHistorySize);
                // Add to queue instead of processing immediately
                this.messageQueue.push(...newLines.map(line => ({ type: 'history', line })));
                // Start processing if not already processing
                if (!this.isProcessing) {
                    this.isProcessing = true;
                    await this.processQueue();
                    this.isProcessing = false;
                }
                this.lastHistorySize = lines.length;
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing history changes:', error);
        }
    }
    projectPathToDir(path) {
        return path.replace(/\//g, '-').replace(/^-/, '');
    }
    watchSession() {
        if (!this.activeSessionId || !this.activeProjectPath)
            return;
        if (this.sessionWatcher) {
            this.sessionWatcher.close();
        }
        const sessionPath = (0, path_1.join)(config_1.CONFIG.claudeHome, 'projects', this.activeProjectPath, `${this.activeSessionId}.jsonl`);
        this.lastSessionSize = 0;
        this.sessionWatcher = chokidar_1.default.watch(sessionPath, {
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
            logger_1.logger.error('Session watcher error:', error);
        });
        logger_1.logger.info(`Watching session: ${sessionPath}`);
    }
    async processSessionChanges(sessionPath) {
        try {
            const content = await (0, promises_1.readFile)(sessionPath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length > this.lastSessionSize) {
                const newLines = lines.slice(this.lastSessionSize);
                // Add to queue
                this.messageQueue.push(...newLines.map(line => ({ type: 'session', line })));
                // Start processing if not already processing
                if (!this.isProcessing) {
                    this.isProcessing = true;
                    await this.processQueue();
                    this.isProcessing = false;
                }
                this.lastSessionSize = lines.length;
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing session changes:', error);
        }
    }
    async processQueue() {
        while (this.messageQueue.length > 0) {
            const batch = this.messageQueue.splice(0, 10);
            for (const item of batch) {
                try {
                    if (item.type === 'history') {
                        const entry = JSON.parse(item.line);
                        this.emit('user_input', {
                            message: entry.display,
                            timestamp: entry.timestamp,
                            sessionId: entry.sessionId,
                            project: entry.project
                        });
                        logger_1.logger.debug(`User input: ${entry.display.substring(0, 50)}...`);
                    }
                    else if (item.type === 'session') {
                        const entry = JSON.parse(item.line);
                        await this.processSessionEntry(entry);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error processing queue item:', error);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    async processSessionEntry(entry) {
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
    handleAssistantMessage(entry) {
        const content = entry.message?.content || [];
        for (const block of content) {
            if (block.type === 'text') {
                this.emit('assistant_message', {
                    content: block.text,
                    timestamp: entry.timestamp,
                    messageId: entry.message.id
                });
                logger_1.logger.debug(`Assistant: ${block.text.substring(0, 50)}...`);
            }
            else if (block.type === 'tool_use') {
                this.emit('tool_call', {
                    toolName: block.name,
                    toolId: block.id,
                    input: block.input,
                    timestamp: entry.timestamp
                });
                logger_1.logger.debug(`Tool: ${block.name}`);
                if (['Edit', 'Write'].includes(block.name)) {
                    this.handleFileOperation(block, entry.timestamp);
                }
            }
        }
    }
    handleSystemMessage(entry) {
        if (entry.data?.type === 'tool_result') {
            this.emit('tool_result', {
                toolId: entry.data.tool_use_id,
                content: entry.data.content,
                timestamp: entry.timestamp
            });
        }
    }
    async handleFileOperation(toolUse, timestamp) {
        const { name, input } = toolUse;
        const filePath = input.file_path;
        if (!filePath)
            return;
        try {
            const oldContent = await (0, promises_1.readFile)(filePath, 'utf-8').catch(() => '');
            let newContent = '';
            if (name === 'Edit') {
                newContent = oldContent.replace(input.old_string, input.new_string);
            }
            else if (name === 'Write') {
                newContent = input.content;
            }
            this.emit('file_change', {
                filePath,
                operation: name.toLowerCase(),
                oldContent,
                newContent,
                timestamp
            });
        }
        catch (error) {
            logger_1.logger.error('Error handling file operation:', error);
        }
    }
    computeSimpleDiff(oldContent, newContent) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        return `+${newLines.length - oldLines.length} lines`;
    }
}
exports.ClaudeWatcher = ClaudeWatcher;
