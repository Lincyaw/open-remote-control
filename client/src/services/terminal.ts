import { wsClient } from './websocket';

export type TerminalType = 'shell' | 'claude';

export interface StartTerminalOptions {
  type?: TerminalType;
  cwd?: string;
  cols?: number;
  rows?: number;
  claudeArgs?: string[];
}

class TerminalService {
  private outputCallbacks = new Map<string, (data: string) => void>();
  private unsubscribeOutput: (() => void) | null = null;

  constructor() {
    this.setupOutputListener();
  }

  private setupOutputListener() {
    // Subscribe to terminal output events
    this.unsubscribeOutput = wsClient.onTerminalOutput((sessionId, data) => {
      const callback = this.outputCallbacks.get(sessionId);
      if (callback) {
        callback(data);
      }
    });
  }

  /**
   * Start a new terminal session
   */
  startTerminal(
    sessionId: string,
    onData: (data: string) => void,
    options: StartTerminalOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      // Register output callback
      this.outputCallbacks.set(sessionId, onData);

      // Subscribe to start response
      const unsubscribe = wsClient.onTerminalStarted((success, respSessionId, terminalType, message) => {
        if (respSessionId === sessionId && !settled) {
          settled = true;
          unsubscribe();
          if (success) {
            resolve();
          } else {
            this.outputCallbacks.delete(sessionId);
            reject(new Error(message || 'Failed to start terminal'));
          }
        }
      });

      // Send start request
      wsClient.send({
        type: 'terminal_start',
        data: {
          sessionId,
          type: options.type || 'shell',
          cwd: options.cwd,
          cols: options.cols,
          rows: options.rows,
          claudeArgs: options.claudeArgs,
        },
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!settled) {
          settled = true;
          unsubscribe();
          this.outputCallbacks.delete(sessionId);
          reject(new Error('Terminal start timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Write input to a terminal
   */
  writeToTerminal(sessionId: string, input: string): boolean {
    if (!this.outputCallbacks.has(sessionId)) {
      console.warn(`Terminal ${sessionId} not found`);
      return false;
    }

    wsClient.send({
      type: 'terminal_input',
      data: { sessionId, input },
    });

    return true;
  }

  /**
   * Resize a terminal
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    wsClient.send({
      type: 'terminal_resize',
      data: { sessionId, cols, rows },
    });
  }

  /**
   * Close a terminal (kills the zellij session too)
   */
  closeTerminal(sessionId: string): void {
    this.outputCallbacks.delete(sessionId);

    wsClient.send({
      type: 'terminal_close',
      data: { sessionId, kill: true },
    });
  }

  /**
   * List all active terminals
   */
  listTerminals(): void {
    wsClient.send({
      type: 'terminal_list',
    });
  }

  /**
   * Check if a terminal session exists
   */
  hasSession(sessionId: string): boolean {
    return this.outputCallbacks.has(sessionId);
  }

  /**
   * Cleanup all callbacks
   */
  cleanup(): void {
    this.outputCallbacks.clear();
    if (this.unsubscribeOutput) {
      this.unsubscribeOutput();
      this.unsubscribeOutput = null;
    }
  }
}

export const terminalService = new TerminalService();
