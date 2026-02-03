"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sshManager = exports.SSHManager = exports.SSHConnection = void 0;
const ssh2_1 = require("ssh2");
const net = __importStar(require("net"));
const logger_1 = require("../utils/logger");
/**
 * Manages a single SSH connection with multiple shell sessions and port forwarding capabilities.
 */
class SSHConnection {
    constructor() {
        this.shells = new Map();
        this.portForwards = new Map();
        this.connected = false;
        this.client = new ssh2_1.Client();
    }
    /**
     * Establish SSH connection with the remote server.
     * Supports both private key and password authentication.
     */
    async connect(config) {
        return new Promise((resolve, reject) => {
            this.client.on('ready', () => {
                this.connected = true;
                logger_1.logger.info(`SSH connected to ${config.host}:${config.port}`);
                resolve();
            });
            this.client.on('error', (err) => {
                logger_1.logger.error('SSH connection error:', err);
                this.connected = false;
                reject(err);
            });
            this.client.on('close', () => {
                this.connected = false;
                logger_1.logger.info('SSH connection closed');
            });
            const connectionConfig = {
                host: config.host,
                port: config.port,
                username: config.username,
                readyTimeout: 30000,
                keepaliveInterval: 10000, // Send keepalive every 10 seconds
                keepaliveCountMax: 3, // Disconnect after 3 missed keepalives
            };
            if (config.privateKey) {
                connectionConfig.privateKey = config.privateKey;
            }
            else if (config.password) {
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
    async startShell(sessionId, onData, onClose, cols = 80, rows = 24) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('SSH not connected'));
                return;
            }
            if (this.shells.has(sessionId)) {
                reject(new Error(`Shell session ${sessionId} already exists`));
                return;
            }
            this.client.shell({
                term: 'xterm-256color',
                cols,
                rows,
            }, (err, stream) => {
                if (err) {
                    logger_1.logger.error(`Failed to start shell ${sessionId}:`, err);
                    reject(err);
                    return;
                }
                this.shells.set(sessionId, stream);
                stream.on('data', (data) => {
                    onData(data.toString());
                });
                stream.on('close', () => {
                    this.shells.delete(sessionId);
                    onClose();
                });
                stream.stderr.on('data', (data) => {
                    onData(data.toString());
                });
                logger_1.logger.info(`SSH shell ${sessionId} started`);
                resolve();
            });
        });
    }
    /**
     * Write data to a specific shell session.
     */
    writeToShell(sessionId, data) {
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
    resizeShell(sessionId, cols, rows) {
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
    closeShell(sessionId) {
        const shell = this.shells.get(sessionId);
        if (shell) {
            shell.close();
            this.shells.delete(sessionId);
            logger_1.logger.info(`SSH shell ${sessionId} closed`);
            return true;
        }
        return false;
    }
    /**
     * Get list of active shell session IDs.
     */
    getActiveShells() {
        return Array.from(this.shells.keys());
    }
    /**
     * Check if a shell session exists.
     */
    hasShell(sessionId) {
        return this.shells.has(sessionId);
    }
    /**
     * Legacy: Write data to the first available shell (backward compatibility).
     * @deprecated Use writeToShell with sessionId instead
     */
    write(data) {
        const firstShell = this.shells.values().next().value;
        if (firstShell) {
            firstShell.write(data);
        }
    }
    /**
     * Legacy: Resize the first available shell (backward compatibility).
     * @deprecated Use resizeShell with sessionId instead
     */
    resize(cols, rows) {
        const firstShell = this.shells.values().next().value;
        if (firstShell) {
            firstShell.setWindow(rows, cols, 0, 0);
        }
    }
    /**
     * Set up local port forwarding.
     * Creates a local TCP server that forwards connections to the remote host.
     */
    async setupPortForward(config) {
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
                this.client.forwardOut('127.0.0.1', config.localPort, config.remoteHost, config.remotePort, (err, stream) => {
                    if (err) {
                        logger_1.logger.error('Port forward error:', err);
                        socket.end();
                        return;
                    }
                    socket.pipe(stream);
                    stream.pipe(socket);
                    socket.on('error', (err) => {
                        logger_1.logger.error('Socket error:', err);
                        stream.close();
                    });
                    stream.on('error', (err) => {
                        logger_1.logger.error('Stream error:', err);
                        socket.destroy();
                    });
                });
            });
            server.on('error', (err) => {
                logger_1.logger.error('Server error:', err);
                reject(err);
            });
            server.listen(config.localPort, '127.0.0.1', () => {
                this.portForwards.set(config.localPort, server);
                logger_1.logger.info(`Port forward established: localhost:${config.localPort} -> ${config.remoteHost}:${config.remotePort}`);
                resolve();
            });
        });
    }
    /**
     * Stop a specific port forward.
     */
    stopPortForward(localPort) {
        const server = this.portForwards.get(localPort);
        if (server) {
            server.close();
            this.portForwards.delete(localPort);
            logger_1.logger.info(`Port forward stopped: localhost:${localPort}`);
        }
    }
    /**
     * Disconnect and clean up all resources.
     */
    disconnect() {
        // Close all shell sessions
        this.shells.forEach((shell, sessionId) => {
            shell.close();
            logger_1.logger.info(`Shell ${sessionId} closed`);
        });
        this.shells.clear();
        // Stop all port forwards
        this.portForwards.forEach((server, port) => {
            server.close();
            logger_1.logger.info(`Port forward stopped: localhost:${port}`);
        });
        this.portForwards.clear();
        // End SSH connection
        if (this.connected) {
            this.client.end();
            this.connected = false;
        }
        logger_1.logger.info('SSH connection disconnected');
    }
    isConnected() {
        return this.connected;
    }
}
exports.SSHConnection = SSHConnection;
/**
 * Manages multiple SSH connections, one per WebSocket client.
 */
class SSHManager {
    constructor() {
        this.connections = new Map();
    }
    /**
     * Get or create an SSH connection for a client.
     */
    getConnection(clientId) {
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
    hasConnection(clientId) {
        return this.connections.has(clientId);
    }
    /**
     * Remove and disconnect a client's SSH connection.
     */
    removeConnection(clientId) {
        const connection = this.connections.get(clientId);
        if (connection) {
            connection.disconnect();
            this.connections.delete(clientId);
        }
    }
    /**
     * Clean up all connections (for server shutdown).
     */
    cleanup() {
        this.connections.forEach((connection, clientId) => {
            connection.disconnect();
            logger_1.logger.info(`Cleaned up SSH connection for client ${clientId}`);
        });
        this.connections.clear();
    }
}
exports.SSHManager = SSHManager;
// Singleton instance
exports.sshManager = new SSHManager();
