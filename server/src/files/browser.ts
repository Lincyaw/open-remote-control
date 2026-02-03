import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { logger } from '../utils/logger';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

export class FileBrowser {
  private ignoredDirs = new Set([
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

  private ignoredFiles = new Set([
    '.DS_Store',
    'Thumbs.db',
    '.env',
    '.env.local',
  ]);

  /**
   * Generate file tree structure for a given directory
   */
  async generateTree(rootPath: string, maxDepth = 5): Promise<FileNode> {
    return this.buildTree(rootPath, rootPath, 0, maxDepth);
  }

  private async buildTree(
    rootPath: string,
    currentPath: string,
    depth: number,
    maxDepth: number
  ): Promise<FileNode> {
    const stats = await stat(currentPath);
    const name = currentPath === rootPath ? '.' : relative(rootPath, currentPath).split('/').pop() || '.';

    if (stats.isFile()) {
      return {
        name,
        path: relative(rootPath, currentPath),
        type: 'file',
        size: stats.size,
      };
    }

    // Directory
    const node: FileNode = {
      name,
      path: relative(rootPath, currentPath) || '.',
      type: 'directory',
      children: [],
    };

    // Stop at max depth
    if (depth >= maxDepth) {
      return node;
    }

    try {
      const entries = await readdir(currentPath);
      const children: FileNode[] = [];

      for (const entry of entries) {
        // Skip ignored directories and files
        if (this.ignoredDirs.has(entry) || this.ignoredFiles.has(entry)) {
          continue;
        }

        const entryPath = join(currentPath, entry);

        try {
          const childNode = await this.buildTree(rootPath, entryPath, depth + 1, maxDepth);
          children.push(childNode);
        } catch (error) {
          logger.warn(`Failed to process ${entryPath}:`, error);
        }
      }

      // Sort: directories first, then files, alphabetically
      node.children = children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error(`Failed to read directory ${currentPath}:`, error);
    }

    return node;
  }

  /**
   * Get directory listing (non-recursive)
   */
  async listDirectory(dirPath: string): Promise<FileNode[]> {
    try {
      const entries = await readdir(dirPath);
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        // Skip ignored items
        if (this.ignoredDirs.has(entry) || this.ignoredFiles.has(entry)) {
          continue;
        }

        const entryPath = join(dirPath, entry);

        try {
          const stats = await stat(entryPath);
          nodes.push({
            name: entry,
            path: entryPath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.isFile() ? stats.size : undefined,
          });
        } catch (error) {
          logger.warn(`Failed to stat ${entryPath}:`, error);
        }
      }

      // Sort: directories first, then files
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error(`Failed to list directory ${dirPath}:`, error);
      throw new Error(`Failed to list directory: ${error}`);
    }
  }
}

export const fileBrowser = new FileBrowser();
