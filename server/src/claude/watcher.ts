import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';
import { HistoryEntry } from '../types';

export class ClaudeWatcher extends EventEmitter {
  private historyWatcher: FSWatcher | null = null;
  private sessionWatcher: FSWatcher | null = null;
  private historyPath: string;
  private lastHistorySize = 0;
  private lastSessionSize = 0;
  private activeSessionId: string | null = null;
  private activeProjectPath: string | null = null;

  // Queue mechanism for handling rapid updates
  private messageQueue: any[] = [];
  private isProcessing = false;

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

    this.historyWatcher.on('error', (error: unknown) => {
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
    } catch (error) {
      logger.error('Error processing history changes:', error);
    }
  }

  private projectPathToDir(path: string): string {
    return path.replace(/\//g, '-').replace(/^-/, '');
  }

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

    this.sessionWatcher.on('error', (error: unknown) => {
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
    } catch (error) {
      logger.error('Error processing session changes:', error);
    }
  }

  private async processQueue() {
    while (this.messageQueue.length > 0) {
      const batch = this.messageQueue.splice(0, 10);

      for (const item of batch) {
        try {
          if (item.type === 'history') {
            const entry: HistoryEntry = JSON.parse(item.line);
            this.emit('user_input', {
              message: entry.display,
              timestamp: entry.timestamp,
              sessionId: entry.sessionId,
              project: entry.project
            });
            logger.debug(`User input: ${entry.display.substring(0, 50)}...`);
          } else if (item.type === 'session') {
            const entry = JSON.parse(item.line);
            await this.processSessionEntry(entry);
          }
        } catch (error) {
          logger.error('Error processing queue item:', error);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
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

      this.emit('file_change', {
        filePath,
        operation: name.toLowerCase(),
        oldContent,
        newContent,
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
}
