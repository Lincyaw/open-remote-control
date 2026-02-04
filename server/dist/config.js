"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = require("dotenv");
const os_1 = require("os");
(0, dotenv_1.config)();
/**
 * Parse CLI arguments: --port, --host, --token, --claude-home
 * These take precedence over environment variables.
 */
function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
            const key = arg.slice(2);
            args[key] = argv[i + 1];
            i++;
        }
        else if (arg.startsWith('--') && arg.includes('=')) {
            const [key, value] = arg.slice(2).split('=');
            args[key] = value;
        }
    }
    return args;
}
const args = parseArgs();
exports.CONFIG = {
    host: args['host'] || process.env.HOST || '0.0.0.0',
    port: parseInt(args['port'] || process.env.PORT || '9080'),
    authToken: args['token'] || process.env.AUTH_TOKEN || '',
    claudeHome: args['claude-home'] || process.env.CLAUDE_HOME || `${(0, os_1.homedir)()}/.claude`,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    searchTimeout: parseInt(process.env.SEARCH_TIMEOUT || '5000'),
    logLevel: args['log-level'] || process.env.LOG_LEVEL || 'info',
    // File tree limits to prevent OOM on large directories
    fileTreeMaxDepth: parseInt(process.env.FILE_TREE_MAX_DEPTH || '3'),
    fileTreeMaxNodes: parseInt(process.env.FILE_TREE_MAX_NODES || '5000'),
    fileTreeExpandMaxNodes: parseInt(process.env.FILE_TREE_EXPAND_MAX_NODES || '500'),
};
if (!exports.CONFIG.authToken) {
    console.warn('WARNING: AUTH_TOKEN not set. Generate: openssl rand -hex 32');
}
