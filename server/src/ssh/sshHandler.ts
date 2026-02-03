import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { sshManager } from './sshManager';
import { ClientMessage, ServerMessage } from '../types';

type SendFn = (ws: WebSocket, message: ServerMessage) => void;

/**
 * Handles SSH-related WebSocket messages.
 * Routes ssh_* messages to the appropriate SSHManager methods.
 * Supports multiple shell sessions per client via sessionId.
 */
export class SSHHandler {
  private sendFn: SendFn;

  constructor(sendFn: SendFn) {
    this.sendFn = sendFn;
  }

  /**
   * Check if this handler should process the message.
   */
  canHandle(messageType: string): boolean {
    return messageType.startsWith('ssh_');
  }

  /**
   * Process an SSH message.
   */
  async handle(ws: WebSocket, clientId: string, message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'ssh_connect':
        await this.handleConnect(ws, clientId, message);
        break;
      case 'ssh_start_shell':
        await this.handleStartShell(ws, clientId, message);
        break;
      case 'ssh_input':
        this.handleInput(clientId, message);
        break;
      case 'ssh_resize':
        this.handleResize(clientId, message);
        break;
      case 'ssh_disconnect':
        this.handleDisconnect(ws, clientId);
        break;
      case 'ssh_close_shell':
        this.handleCloseShell(ws, clientId, message);
        break;
      case 'ssh_list_shells':
        this.handleListShells(ws, clientId);
        break;
      case 'ssh_port_forward':
        await this.handlePortForward(ws, clientId, message);
        break;
      case 'ssh_stop_port_forward':
        this.handleStopPortForward(ws, clientId, message);
        break;
      default:
        logger.warn(`Unknown SSH message type: ${message.type}`);
    }
  }

  private async handleConnect(ws: WebSocket, clientId: string, message: ClientMessage): Promise<void> {
    try {
      const { host, port, username, privateKey, password } = message.data;
      logger.info(`SSH connect request: host=${host}, port=${port}, username=${username}, hasPassword=${!!password}, hasPrivateKey=${!!privateKey}`);
      const connection = sshManager.getConnection(clientId);

      await connection.connect({ host, port, username, privateKey, password });

      this.sendFn(ws, {
        type: 'ssh_connect_response',
        data: { success: true },
      });
    } catch (error: any) {
      logger.error('SSH connect error:', error);
      this.sendFn(ws, {
        type: 'ssh_connect_response',
        data: { success: false, message: error.message },
      });
    }
  }

  private async handleStartShell(ws: WebSocket, clientId: string, message: ClientMessage): Promise<void> {
    try {
      const connection = sshManager.getConnection(clientId);
      if (!connection.isConnected()) {
        this.sendFn(ws, {
          type: 'ssh_status',
          data: { status: 'error', message: 'SSH not connected' },
        });
        return;
      }

      const sessionId = message.data?.sessionId || 'default';
      const cols = message.data?.cols || 80;
      const rows = message.data?.rows || 24;

      await connection.startShell(
        sessionId,
        (data: string) => {
          this.sendFn(ws, { type: 'ssh_output', data: { sessionId, output: data } });
        },
        () => {
          this.sendFn(ws, {
            type: 'ssh_shell_closed',
            data: { sessionId },
          });
        },
        cols,
        rows
      );

      this.sendFn(ws, {
        type: 'ssh_shell_started',
        data: { sessionId },
      });
    } catch (error: any) {
      logger.error('SSH start shell error:', error);
      this.sendFn(ws, {
        type: 'ssh_status',
        data: { status: 'error', message: error.message },
      });
    }
  }

  private handleInput(clientId: string, message: ClientMessage): void {
    const connection = sshManager.getConnection(clientId);
    if (connection.isConnected()) {
      const sessionId = message.data?.sessionId || 'default';
      const input = message.data?.input || message.data;

      // Try new API first, fall back to legacy
      if (!connection.writeToShell(sessionId, typeof input === 'string' ? input : input.input)) {
        // Legacy fallback
        connection.write(typeof input === 'string' ? input : input.input);
      }
    }
  }

  private handleResize(clientId: string, message: ClientMessage): void {
    const connection = sshManager.getConnection(clientId);
    if (connection.isConnected()) {
      const sessionId = message.data?.sessionId;
      const cols = message.data.cols;
      const rows = message.data.rows;

      if (sessionId) {
        connection.resizeShell(sessionId, cols, rows);
      } else {
        // Legacy fallback
        connection.resize(cols, rows);
      }
    }
  }

  private handleCloseShell(ws: WebSocket, clientId: string, message: ClientMessage): void {
    const connection = sshManager.getConnection(clientId);
    const sessionId = message.data?.sessionId;

    if (sessionId && connection.isConnected()) {
      const closed = connection.closeShell(sessionId);
      this.sendFn(ws, {
        type: 'ssh_shell_closed',
        data: { sessionId, success: closed },
      });
    }
  }

  private handleListShells(ws: WebSocket, clientId: string): void {
    const connection = sshManager.getConnection(clientId);
    const shells = connection.isConnected() ? connection.getActiveShells() : [];

    this.sendFn(ws, {
      type: 'ssh_list_shells_response',
      data: { shells },
    });
  }

  private handleDisconnect(ws: WebSocket, clientId: string): void {
    sshManager.removeConnection(clientId);
    this.sendFn(ws, {
      type: 'ssh_status',
      data: { status: 'disconnected', message: 'Disconnected' },
    });
  }

  private async handlePortForward(ws: WebSocket, clientId: string, message: ClientMessage): Promise<void> {
    try {
      const { localPort, remoteHost, remotePort } = message.data;
      const connection = sshManager.getConnection(clientId);

      if (!connection.isConnected()) {
        this.sendFn(ws, {
          type: 'ssh_port_forward_response',
          data: { success: false, localPort, message: 'SSH not connected' },
        });
        return;
      }

      await connection.setupPortForward({ localPort, remoteHost, remotePort });

      this.sendFn(ws, {
        type: 'ssh_port_forward_response',
        data: { success: true, localPort },
      });
    } catch (error: any) {
      logger.error('SSH port forward error:', error);
      this.sendFn(ws, {
        type: 'ssh_port_forward_response',
        data: { success: false, localPort: message.data.localPort, message: error.message },
      });
    }
  }

  private handleStopPortForward(ws: WebSocket, clientId: string, message: ClientMessage): void {
    const connection = sshManager.getConnection(clientId);
    if (connection.isConnected()) {
      connection.stopPortForward(message.data.localPort);
    }
    this.sendFn(ws, {
      type: 'ssh_port_forward_response',
      data: { success: true, localPort: message.data.localPort, message: 'Port forward stopped' },
    });
  }

  /**
   * Clean up SSH resources for a disconnected client.
   */
  cleanup(clientId: string): void {
    sshManager.removeConnection(clientId);
  }
}
