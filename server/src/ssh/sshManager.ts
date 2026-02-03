import { Client, ClientChannel } from 'ssh2';
import * as net from 'net';
import { logger } from '../utils/logger';

export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
}

export interface PortForwardConfig {
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

/**
 * Manages a single SSH connection with multiple shell sessions and port forwarding capabilities.
 */
export class SSHConnection {
  private client: Client;
  private shells: Map<string, ClientChannel> = new Map();
  private portForwards: Map<number, net.Server> = new Map();
  private connected = false;

  constructor() {
    this.client = new Client();
  }

  /**
   * Establish SSH connection with the remote server.
   * Supports both private key and password authentication.
   */
  async connect(config: SSHConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.connected = true;
        logger.info(`SSH connected to ${config.host}:${config.port}`);
        resolve();
      });

      this.client.on('error', (err) => {
        logger.error('SSH connection error:', err);
        this.connected = false;
        reject(err);
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.info('SSH connection closed');
      });

      const connectionConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 30000,
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
        keepaliveCountMax: 3,     // Disconnect after 3 missed keepalives
      };

      if (config.privateKey) {
        connectionConfig.privateKey = config.privateKey;
      } else if (config.password) {
        connectionConfig.password = config.password;
      }

      this.client.connect(connectionConfig);
    });
  }

  /**
   * Start an interactive PTY shell session with a specific session ID.
   * @param sessionId Unique identifier for this shell session
   * @param onData Callback for shell output data
   * @param onClose Callback when shell closes
   * @param cols Terminal columns (default 80)
   * @param rows Terminal rows (default 24)
   */
  async startShell(
    sessionId: string,
    onData: (data: string) => void,
    onClose: () => void,
    cols = 80,
    rows = 24
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('SSH not connected'));
        return;
      }

      if (this.shells.has(sessionId)) {
        reject(new Error(`Shell session ${sessionId} already exists`));
        return;
      }

      this.client.shell(
        {
          term: 'xterm-256color',
          cols,
          rows,
        },
        (err, stream) => {
          if (err) {
            logger.error(`Failed to start shell ${sessionId}:`, err);
            reject(err);
            return;
          }

          this.shells.set(sessionId, stream);

          stream.on('data', (data: Buffer) => {
            onData(data.toString());
          });

          stream.on('close', () => {
            this.shells.delete(sessionId);
            onClose();
          });

          stream.stderr.on('data', (data: Buffer) => {
            onData(data.toString());
          });

          logger.info(`SSH shell ${sessionId} started`);
          resolve();
        }
      );
    });
  }

  /**
   * Write data to a specific shell session.
   */
  writeToShell(sessionId: string, data: string): boolean {
    const shell = this.shells.get(sessionId);
    if (shell) {
      shell.write(data);
      return true;
    }
    return false;
  }

  /**
   * Resize a specific shell's terminal window.
   */
  resizeShell(sessionId: string, cols: number, rows: number): boolean {
    const shell = this.shells.get(sessionId);
    if (shell) {
      shell.setWindow(rows, cols, 0, 0);
      return true;
    }
    return false;
  }

  /**
   * Close a specific shell session.
   */
  closeShell(sessionId: string): boolean {
    const shell = this.shells.get(sessionId);
    if (shell) {
      shell.close();
      this.shells.delete(sessionId);
      logger.info(`SSH shell ${sessionId} closed`);
      return true;
    }
    return false;
  }

  /**
   * Get list of active shell session IDs.
   */
  getActiveShells(): string[] {
    return Array.from(this.shells.keys());
  }

  /**
   * Check if a shell session exists.
   */
  hasShell(sessionId: string): boolean {
    return this.shells.has(sessionId);
  }

  /**
   * Legacy: Write data to the first available shell (backward compatibility).
   * @deprecated Use writeToShell with sessionId instead
   */
  write(data: string): void {
    const firstShell = this.shells.values().next().value;
    if (firstShell) {
      firstShell.write(data);
    }
  }

  /**
   * Legacy: Resize the first available shell (backward compatibility).
   * @deprecated Use resizeShell with sessionId instead
   */
  resize(cols: number, rows: number): void {
    const firstShell = this.shells.values().next().value;
    if (firstShell) {
      firstShell.setWindow(rows, cols, 0, 0);
    }
  }

  /**
   * Set up local port forwarding.
   * Creates a local TCP server that forwards connections to the remote host.
   */
  async setupPortForward(config: PortForwardConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('SSH not connected'));
        return;
      }

      // Check if port is already forwarded
      if (this.portForwards.has(config.localPort)) {
        reject(new Error(`Port ${config.localPort} is already forwarded`));
        return;
      }

      const server = net.createServer((socket) => {
        this.client.forwardOut(
          '127.0.0.1',
          config.localPort,
          config.remoteHost,
          config.remotePort,
          (err, stream) => {
            if (err) {
              logger.error('Port forward error:', err);
              socket.end();
              return;
            }

            socket.pipe(stream);
            stream.pipe(socket);

            socket.on('error', (err: Error) => {
              logger.error('Socket error:', err);
              stream.close();
            });

            stream.on('error', (err: Error) => {
              logger.error('Stream error:', err);
              socket.destroy();
            });
          }
        );
      });

      server.on('error', (err) => {
        logger.error('Server error:', err);
        reject(err);
      });

      server.listen(config.localPort, '127.0.0.1', () => {
        this.portForwards.set(config.localPort, server);
        logger.info(
          `Port forward established: localhost:${config.localPort} -> ${config.remoteHost}:${config.remotePort}`
        );
        resolve();
      });
    });
  }

  /**
   * Stop a specific port forward.
   */
  stopPortForward(localPort: number): void {
    const server = this.portForwards.get(localPort);
    if (server) {
      server.close();
      this.portForwards.delete(localPort);
      logger.info(`Port forward stopped: localhost:${localPort}`);
    }
  }

  /**
   * Disconnect and clean up all resources.
   */
  disconnect(): void {
    // Close all shell sessions
    this.shells.forEach((shell, sessionId) => {
      shell.close();
      logger.info(`Shell ${sessionId} closed`);
    });
    this.shells.clear();

    // Stop all port forwards
    this.portForwards.forEach((server, port) => {
      server.close();
      logger.info(`Port forward stopped: localhost:${port}`);
    });
    this.portForwards.clear();

    // End SSH connection
    if (this.connected) {
      this.client.end();
      this.connected = false;
    }

    logger.info('SSH connection disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Manages multiple SSH connections, one per WebSocket client.
 */
export class SSHManager {
  private connections: Map<string, SSHConnection> = new Map();

  /**
   * Get or create an SSH connection for a client.
   */
  getConnection(clientId: string): SSHConnection {
    let connection = this.connections.get(clientId);
    if (!connection) {
      connection = new SSHConnection();
      this.connections.set(clientId, connection);
    }
    return connection;
  }

  /**
   * Check if a client has an active connection.
   */
  hasConnection(clientId: string): boolean {
    return this.connections.has(clientId);
  }

  /**
   * Remove and disconnect a client's SSH connection.
   */
  removeConnection(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(clientId);
    }
  }

  /**
   * Clean up all connections (for server shutdown).
   */
  cleanup(): void {
    this.connections.forEach((connection, clientId) => {
      connection.disconnect();
      logger.info(`Cleaned up SSH connection for client ${clientId}`);
    });
    this.connections.clear();
  }
}

// Singleton instance
export const sshManager = new SSHManager();
