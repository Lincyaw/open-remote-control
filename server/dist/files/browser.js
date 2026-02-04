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
     * @param rootPath - Root directory to scan
     * @param maxDepth - Maximum depth to traverse (default: 3)
     * @param maxNodes - Maximum number of nodes to return (default: 5000)
     * @returns FileTreeResult with tree, totalNodes, truncated flag, and accessErrors
     */
    async generateTree(rootPath, maxDepth = 3, maxNodes = 5000) {
        const context = {
            nodeCount: 0,
            truncated: false,
            accessErrors: [],
        };
        const tree = await this.buildTree(rootPath, rootPath, 0, maxDepth, maxNodes, context);
        return {
            tree,
            totalNodes: context.nodeCount,
            truncated: context.truncated,
            accessErrors: context.accessErrors,
        };
    }
    async buildTree(rootPath, currentPath, depth, maxDepth, maxNodes, context) {
        // Check if we've hit the node limit
        if (context.nodeCount >= maxNodes) {
            context.truncated = true;
            return {
                name: '.',
                path: '.',
                type: 'directory',
                hasChildren: true,
            };
        }
        const stats = await (0, promises_1.stat)(currentPath);
        const name = currentPath === rootPath ? '.' : (0, path_1.relative)(rootPath, currentPath).split('/').pop() || '.';
        context.nodeCount++;
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
        // Stop at max depth but indicate there might be children
        if (depth >= maxDepth) {
            // Check if directory has children without reading all of them
            try {
                const entries = await (0, promises_1.readdir)(currentPath);
                const hasVisibleChildren = entries.some(e => !this.ignoredDirs.has(e) && !this.ignoredFiles.has(e));
                node.hasChildren = hasVisibleChildren;
            }
            catch {
                node.hasChildren = false;
            }
            delete node.children;
            return node;
        }
        try {
            const entries = await (0, promises_1.readdir)(currentPath);
            const children = [];
            for (const entry of entries) {
                // Check node limit before processing each child
                if (context.nodeCount >= maxNodes) {
                    context.truncated = true;
                    break;
                }
                // Skip ignored directories and files
                if (this.ignoredDirs.has(entry) || this.ignoredFiles.has(entry)) {
                    continue;
                }
                const entryPath = (0, path_1.join)(currentPath, entry);
                try {
                    const childNode = await this.buildTree(rootPath, entryPath, depth + 1, maxDepth, maxNodes, context);
                    children.push(childNode);
                }
                catch (error) {
                    // Handle permission errors specifically
                    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
                        const relativePath = (0, path_1.relative)(rootPath, entryPath);
                        context.accessErrors.push(relativePath);
                        // Add node with accessDenied flag
                        try {
                            const entryStat = await (0, promises_1.stat)(entryPath).catch(() => null);
                            children.push({
                                name: entry,
                                path: relativePath,
                                type: entryStat?.isDirectory() ? 'directory' : 'file',
                                accessDenied: true,
                            });
                            context.nodeCount++;
                        }
                        catch {
                            // If we can't even stat it, still add as directory with access denied
                            children.push({
                                name: entry,
                                path: relativePath,
                                type: 'directory',
                                accessDenied: true,
                            });
                            context.nodeCount++;
                        }
                    }
                    else {
                        logger_1.logger.warn(`Failed to process ${entryPath}:`, error);
                    }
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
            if (error?.code === 'EACCES' || error?.code === 'EPERM') {
                const relativePath = (0, path_1.relative)(rootPath, currentPath) || '.';
                context.accessErrors.push(relativePath);
                node.accessDenied = true;
                delete node.children;
            }
            else {
                logger_1.logger.error(`Failed to read directory ${currentPath}:`, error);
            }
        }
        return node;
    }
    /**
     * Expand a single directory and return its immediate children
     * Used for lazy loading in the client
     * @param rootPath - The root path of the file tree
     * @param dirPath - The directory path to expand (relative to rootPath)
     * @param maxDepth - How many levels deep to scan (default: 1)
     * @param maxNodes - Maximum nodes to return (default: 500)
     */
    async expandDirectory(rootPath, dirPath, maxDepth = 1, maxNodes = 500) {
        const absolutePath = dirPath === '.' ? rootPath : (0, path_1.join)(rootPath, dirPath);
        const context = {
            nodeCount: 0,
            truncated: false,
            accessErrors: [],
        };
        const node = await this.buildTree(rootPath, absolutePath, 0, maxDepth, maxNodes, context);
        return {
            tree: node,
            totalNodes: context.nodeCount,
            truncated: context.truncated,
            accessErrors: context.accessErrors,
        };
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
