"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHHandler = void 0;
const logger_1 = require("../utils/logger");
const sshManager_1 = require("./sshManager");
/**
 * Handles SSH-related WebSocket messages.
 * Routes ssh_* messages to the appropriate SSHManager methods.
 */
class SSHHandler {
    constructor(sendFn) {
        this.sendFn = sendFn;
    }
    /**
     * Check if this handler should process the message.
     */
    canHandle(messageType) {
        return messageType.startsWith('ssh_');
    }
    /**
     * Process an SSH message.
     */
    async handle(ws, clientId, message) {
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
            case 'ssh_port_forward':
                await this.handlePortForward(ws, clientId, message);
                break;
            case 'ssh_stop_port_forward':
                this.handleStopPortForward(ws, clientId, message);
                break;
            default:
                logger_1.logger.warn(`Unknown SSH message type: ${message.type}`);
        }
    }
    async handleConnect(ws, clientId, message) {
        try {
            const { host, port, username, privateKey, password } = message.data;
            logger_1.logger.info(`SSH connect request: host=${host}, port=${port}, username=${username}, hasPassword=${!!password}, hasPrivateKey=${!!privateKey}`);
            const connection = sshManager_1.sshManager.getConnection(clientId);
            await connection.connect({ host, port, username, privateKey, password });
            this.sendFn(ws, {
                type: 'ssh_connect_response',
                data: { success: true },
            });
        }
        catch (error) {
            logger_1.logger.error('SSH connect error:', error);
            this.sendFn(ws, {
                type: 'ssh_connect_response',
                data: { success: false, message: error.message },
            });
        }
    }
    async handleStartShell(ws, clientId, message) {
        try {
            const connection = sshManager_1.sshManager.getConnection(clientId);
            if (!connection.isConnected()) {
                this.sendFn(ws, {
                    type: 'ssh_status',
                    data: { status: 'error', message: 'SSH not connected' },
                });
                return;
            }
            const cols = message.data?.cols || 80;
            const rows = message.data?.rows || 24;
            await connection.startShell((data) => {
                this.sendFn(ws, { type: 'ssh_output', data });
            }, () => {
                this.sendFn(ws, {
                    type: 'ssh_status',
                    data: { status: 'disconnected', message: 'Shell closed' },
                });
            }, cols, rows);
        }
        catch (error) {
            logger_1.logger.error('SSH start shell error:', error);
            this.sendFn(ws, {
                type: 'ssh_status',
                data: { status: 'error', message: error.message },
            });
        }
    }
    handleInput(clientId, message) {
        const connection = sshManager_1.sshManager.getConnection(clientId);
        if (connection.isConnected()) {
            connection.write(message.data.input);
        }
    }
    handleResize(clientId, message) {
        const connection = sshManager_1.sshManager.getConnection(clientId);
        if (connection.isConnected()) {
            connection.resize(message.data.cols, message.data.rows);
        }
    }
    handleDisconnect(ws, clientId) {
        sshManager_1.sshManager.removeConnection(clientId);
        this.sendFn(ws, {
            type: 'ssh_status',
            data: { status: 'disconnected', message: 'Disconnected' },
        });
    }
    async handlePortForward(ws, clientId, message) {
        try {
            const { localPort, remoteHost, remotePort } = message.data;
            const connection = sshManager_1.sshManager.getConnection(clientId);
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
        }
        catch (error) {
            logger_1.logger.error('SSH port forward error:', error);
            this.sendFn(ws, {
                type: 'ssh_port_forward_response',
                data: { success: false, localPort: message.data.localPort, message: error.message },
            });
        }
    }
    handleStopPortForward(ws, clientId, message) {
        const connection = sshManager_1.sshManager.getConnection(clientId);
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
    cleanup(clientId) {
        sshManager_1.sshManager.removeConnection(clientId);
    }
}
exports.SSHHandler = SSHHandler;
