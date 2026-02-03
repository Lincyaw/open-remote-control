import { readFile, stat } from 'fs/promises';
import { extname } from 'path';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  language: string;
  isBinary: boolean;
  truncated: boolean;
}

export class FileReader {
  private languageMap: Record<string, string> = {
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

  private binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.ttf', '.otf', '.woff', '.woff2',
    '.bin', '.dat', '.db', '.sqlite',
  ]);

  /**
   * Read file content with size limit
   */
  async readFile(filePath: string): Promise<FileContent> {
    try {
      const stats = await stat(filePath);
      const ext = extname(filePath).toLowerCase();
      const isBinary = this.isBinaryFile(ext);

      // Check if file is too large
      if (stats.size > CONFIG.maxFileSize) {
        logger.warn(`File too large: ${filePath} (${stats.size} bytes)`);
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
      const content = await readFile(filePath, 'utf-8');

      return {
        path: filePath,
        content,
        size: stats.size,
        language: this.detectLanguage(ext),
        isBinary: false,
        truncated: false,
      };
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Read file with line range
   */
  async readFileLines(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<FileContent> {
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
  private detectLanguage(ext: string): string {
    return this.languageMap[ext] || 'plaintext';
  }

  /**
   * Check if file is binary based on extension
   */
  private isBinaryFile(ext: string): boolean {
    return this.binaryExtensions.has(ext);
  }

  /**
   * Get file metadata without reading content
   */
  async getFileInfo(filePath: string): Promise<{
    path: string;
    size: number;
    language: string;
    isBinary: boolean;
  }> {
    try {
      const stats = await stat(filePath);
      const ext = extname(filePath).toLowerCase();

      return {
        path: filePath,
        size: stats.size,
        language: this.detectLanguage(ext),
        isBinary: this.isBinaryFile(ext),
      };
    } catch (error) {
      logger.error(`Failed to get file info ${filePath}:`, error);
      throw new Error(`Failed to get file info: ${error}`);
    }
  }
}

export const fileReader = new FileReader();
