"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileReader = exports.FileReader = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class FileReader {
    constructor() {
        this.languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.sh': 'bash',
            '.bash': 'bash',
            '.zsh': 'bash',
            '.fish': 'fish',
            '.ps1': 'powershell',
            '.html': 'html',
            '.htm': 'html',
            '.xml': 'xml',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.ini': 'ini',
            '.md': 'markdown',
            '.sql': 'sql',
            '.graphql': 'graphql',
            '.gql': 'graphql',
            '.vue': 'vue',
            '.svelte': 'svelte',
            '.dockerfile': 'dockerfile',
            '.Dockerfile': 'dockerfile',
        };
        this.binaryExtensions = new Set([
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
            '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
            '.exe', '.dll', '.so', '.dylib',
            '.mp3', '.mp4', '.avi', '.mov', '.wav',
            '.ttf', '.otf', '.woff', '.woff2',
            '.bin', '.dat', '.db', '.sqlite',
        ]);
    }
    /**
     * Read file content with size limit
     */
    async readFile(filePath) {
        try {
            const stats = await (0, promises_1.stat)(filePath);
            const ext = (0, path_1.extname)(filePath).toLowerCase();
            const isBinary = this.isBinaryFile(ext);
            // Check if file is too large
            if (stats.size > config_1.CONFIG.maxFileSize) {
                logger_1.logger.warn(`File too large: ${filePath} (${stats.size} bytes)`);
                return {
                    path: filePath,
                    content: '',
                    size: stats.size,
                    language: this.detectLanguage(ext),
                    isBinary,
                    truncated: true,
                };
            }
            // Don't read binary files
            if (isBinary) {
                return {
                    path: filePath,
                    content: '[Binary file]',
                    size: stats.size,
                    language: 'binary',
                    isBinary: true,
                    truncated: false,
                };
            }
            // Read file content
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            return {
                path: filePath,
                content,
                size: stats.size,
                language: this.detectLanguage(ext),
                isBinary: false,
                truncated: false,
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to read file ${filePath}:`, error);
            throw new Error(`Failed to read file: ${error}`);
        }
    }
    /**
     * Read file with line range
     */
    async readFileLines(filePath, startLine, endLine) {
        const fileContent = await this.readFile(filePath);
        if (fileContent.isBinary || fileContent.truncated) {
            return fileContent;
        }
        const lines = fileContent.content.split('\n');
        const selectedLines = lines.slice(startLine - 1, endLine);
        return {
            ...fileContent,
            content: selectedLines.join('\n'),
        };
    }
    /**
     * Detect file language from extension
     */
    detectLanguage(ext) {
        return this.languageMap[ext] || 'plaintext';
    }
    /**
     * Check if file is binary based on extension
     */
    isBinaryFile(ext) {
        return this.binaryExtensions.has(ext);
    }
    /**
     * Get file metadata without reading content
     */
    async getFileInfo(filePath) {
        try {
            const stats = await (0, promises_1.stat)(filePath);
            const ext = (0, path_1.extname)(filePath).toLowerCase();
            return {
                path: filePath,
                size: stats.size,
                language: this.detectLanguage(ext),
                isBinary: this.isBinaryFile(ext),
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get file info ${filePath}:`, error);
            throw new Error(`Failed to get file info: ${error}`);
        }
    }
}
exports.FileReader = FileReader;
exports.fileReader = new FileReader();
