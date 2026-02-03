"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileBrowser = exports.FileBrowser = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const logger_1 = require("../utils/logger");
class FileBrowser {
    constructor() {
        this.ignoredDirs = new Set([
            'node_modules',
            '.git',
            'dist',
            'build',
            '.next',
            'coverage',
            '.cache',
            '__pycache__',
            '.venv',
            'venv',
        ]);
        this.ignoredFiles = new Set([
            '.DS_Store',
            'Thumbs.db',
            '.env',
            '.env.local',
        ]);
    }
    /**
     * Generate file tree structure for a given directory
     */
    async generateTree(rootPath, maxDepth = 5) {
        return this.buildTree(rootPath, rootPath, 0, maxDepth);
    }
    async buildTree(rootPath, currentPath, depth, maxDepth) {
        const stats = await (0, promises_1.stat)(currentPath);
        const name = currentPath === rootPath ? '.' : (0, path_1.relative)(rootPath, currentPath).split('/').pop() || '.';
        if (stats.isFile()) {
            return {
                name,
                path: (0, path_1.relative)(rootPath, currentPath),
                type: 'file',
                size: stats.size,
            };
        }
        // Directory
        const node = {
            name,
            path: (0, path_1.relative)(rootPath, currentPath) || '.',
            type: 'directory',
            children: [],
        };
        // Stop at max depth
        if (depth >= maxDepth) {
            return node;
        }
        try {
            const entries = await (0, promises_1.readdir)(currentPath);
            const children = [];
            for (const entry of entries) {
                // Skip ignored directories and files
                if (this.ignoredDirs.has(entry) || this.ignoredFiles.has(entry)) {
                    continue;
                }
                const entryPath = (0, path_1.join)(currentPath, entry);
                try {
                    const childNode = await this.buildTree(rootPath, entryPath, depth + 1, maxDepth);
                    children.push(childNode);
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to process ${entryPath}:`, error);
                }
            }
            // Sort: directories first, then files, alphabetically
            node.children = children.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        }
        catch (error) {
            logger_1.logger.error(`Failed to read directory ${currentPath}:`, error);
        }
        return node;
    }
    /**
     * Get directory listing (non-recursive)
     */
    async listDirectory(dirPath) {
        try {
            const entries = await (0, promises_1.readdir)(dirPath);
            const nodes = [];
            for (const entry of entries) {
                // Skip ignored items
                if (this.ignoredDirs.has(entry) || this.ignoredFiles.has(entry)) {
                    continue;
                }
                const entryPath = (0, path_1.join)(dirPath, entry);
                try {
                    const stats = await (0, promises_1.stat)(entryPath);
                    nodes.push({
                        name: entry,
                        path: entryPath,
                        type: stats.isDirectory() ? 'directory' : 'file',
                        size: stats.isFile() ? stats.size : undefined,
                    });
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to stat ${entryPath}:`, error);
                }
            }
            // Sort: directories first, then files
            return nodes.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        }
        catch (error) {
            logger_1.logger.error(`Failed to list directory ${dirPath}:`, error);
            throw new Error(`Failed to list directory: ${error}`);
        }
    }
}
exports.FileBrowser = FileBrowser;
exports.fileBrowser = new FileBrowser();
