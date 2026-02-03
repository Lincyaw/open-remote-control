import { useConnectionStore } from '../store/connectionStore';
import { wsClient } from './websocket';

/**
 * SSH service that communicates through WebSocket proxy.
 * The server handles actual SSH connections; the client
 * sends/receives terminal data via WebSocket messages.
 * Supports multiple shell sessions via sessionId.
 */
export class SSHService {
  private shellCallbacks: Map<string, (data: string) => void> = new Map();
  private connected = false;
  private unsubscribeShellData: (() => void) | null = null;
  private unsubscribeShellClosed: (() => void) | null = null;

  async connect(
    host: string,
    port: number,
    username: string,
    options: { privateKey?: string; password?: string },
    timeoutMs: number = 30000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      useConnectionStore.getState().setSSHStatus('connecting');

      const timeout = setTimeout(() => {
        unsubscribe();
        useConnectionStore.getState().setSSHStatus('disconnected');
        reject(new Error('SSH connection timeout'));
      }, timeoutMs);

      const unsubscribe = wsClient.onSSHConnect((success, message) => {
        clearTimeout(timeout);
        unsubscribe();

        if (success) {
          this.connected = true;
          this.setupShellDataListener();
          resolve();
        } else {
          useConnectionStore.getState().setSSHStatus('disconnected');
          reject(new Error(message || 'SSH connection failed'));
        }
      });

      wsClient.send({
        type: 'ssh_connect',
        data: { host, port, username, ...options },
      });
    });
  }

  private setupShellDataListener(): void {
    // Clean up previous subscriptions
    if (this.unsubscribeShellData) {
      this.unsubscribeShellData();
    }
    if (this.unsubscribeShellClosed) {
      this.unsubscribeShellClosed();
    }

    // Subscribe to shell data events with sessionId routing
    this.unsubscribeShellData = wsClient.onShellData((sessionId: string, data: string) => {
      const callback = this.shellCallbacks.get(sessionId);
      if (callback) {
        callback(data);
      }
    });

    // Subscribe to shell closed events
    this.unsubscribeShellClosed = wsClient.onShellClosed((sessionId: string) => {
      this.shellCallbacks.delete(sessionId);
    });
  }

  async startShell(
    sessionId: string,
    onData: (data: string) => void,
    cols?: number,
    rows?: number
  ): Promise<void> {
    this.shellCallbacks.set(sessionId, onData);

    wsClient.send({
      type: 'ssh_start_shell',
      data: { sessionId, cols, rows },
    });
  }

  writeToShell(sessionId: string, data: string): boolean {
    const ws = (wsClient as any).ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, cannot write to shell');
      return false;
    }
    wsClient.send({ type: 'ssh_input', data: { sessionId, input: data } });
    return true;
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    wsClient.send({ type: 'ssh_resize', data: { sessionId, cols, rows } });
  }

  closeShell(sessionId: string): void {
    this.shellCallbacks.delete(sessionId);
    wsClient.send({ type: 'ssh_close_shell', data: { sessionId } });
  }

  listShells(): void {
    wsClient.send({ type: 'ssh_list_shells' });
  }

  async setupPortForward(
    localPort: number,
    remoteHost: string,
    remotePort: number
  ): Promise<void> {
    wsClient.send({
      type: 'ssh_port_forward',
      data: { localPort, remoteHost, remotePort },
    });
  }

  async stopPortForward(localPort: number): Promise<void> {
    wsClient.send({
      type: 'ssh_stop_port_forward',
      data: { localPort },
    });
  }

  disconnect(): void {
    if (this.connected) {
      wsClient.send({ type: 'ssh_disconnect' });
      this.connected = false;
      this.shellCallbacks.clear();
      if (this.unsubscribeShellData) {
        this.unsubscribeShellData();
        this.unsubscribeShellData = null;
      }
      if (this.unsubscribeShellClosed) {
        this.unsubscribeShellClosed();
        this.unsubscribeShellClosed = null;
      }
      useConnectionStore.getState().setSSHStatus('disconnected');
    }
  }

  /**
   * Check if a shell session is registered
   */
  hasShellCallback(sessionId: string): boolean {
    return this.shellCallbacks.has(sessionId);
  }

  /**
   * Get registered shell session IDs
   */
  getRegisteredSessions(): string[] {
    return Array.from(this.shellCallbacks.keys());
  }
}

export const sshService = new SSHService();
