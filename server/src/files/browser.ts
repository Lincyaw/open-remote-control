import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { logger } from '../utils/logger';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  hasChildren?: boolean;      // 是否有子节点（用于懒加载）
  accessDenied?: boolean;     // 权限被拒绝标记
}

export interface FileTreeResult {
  tree: FileNode;
  totalNodes: number;
  truncated: boolean;
  accessErrors: string[];
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
   * @param rootPath - Root directory to scan
   * @param maxDepth - Maximum depth to traverse (default: 3)
   * @param maxNodes - Maximum number of nodes to return (default: 5000)
   * @returns FileTreeResult with tree, totalNodes, truncated flag, and accessErrors
   */
  async generateTree(
    rootPath: string,
    maxDepth = 3,
    maxNodes = 5000
  ): Promise<FileTreeResult> {
    const context = {
      nodeCount: 0,
      truncated: false,
      accessErrors: [] as string[],
    };

    const tree = await this.buildTree(rootPath, rootPath, 0, maxDepth, maxNodes, context);

    return {
      tree,
      totalNodes: context.nodeCount,
      truncated: context.truncated,
      accessErrors: context.accessErrors,
    };
  }

  private async buildTree(
    rootPath: string,
    currentPath: string,
    depth: number,
    maxDepth: number,
    maxNodes: number,
    context: { nodeCount: number; truncated: boolean; accessErrors: string[] }
  ): Promise<FileNode> {
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

    const stats = await stat(currentPath);
    const name = currentPath === rootPath ? '.' : relative(rootPath, currentPath).split('/').pop() || '.';

    context.nodeCount++;

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

    // Stop at max depth but indicate there might be children
    if (depth >= maxDepth) {
      // Check if directory has children without reading all of them
      try {
        const entries = await readdir(currentPath);
        const hasVisibleChildren = entries.some(
          e => !this.ignoredDirs.has(e) && !this.ignoredFiles.has(e)
        );
        node.hasChildren = hasVisibleChildren;
      } catch {
        node.hasChildren = false;
      }
      delete node.children;
      return node;
    }

    try {
      const entries = await readdir(currentPath);
      const children: FileNode[] = [];

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

        const entryPath = join(currentPath, entry);

        try {
          const childNode = await this.buildTree(
            rootPath,
            entryPath,
            depth + 1,
            maxDepth,
            maxNodes,
            context
          );
          children.push(childNode);
        } catch (error: any) {
          // Handle permission errors specifically
          if (error?.code === 'EACCES' || error?.code === 'EPERM') {
            const relativePath = relative(rootPath, entryPath);
            context.accessErrors.push(relativePath);
            // Add node with accessDenied flag
            try {
              const entryStat = await stat(entryPath).catch(() => null);
              children.push({
                name: entry,
                path: relativePath,
                type: entryStat?.isDirectory() ? 'directory' : 'file',
                accessDenied: true,
              });
              context.nodeCount++;
            } catch {
              // If we can't even stat it, still add as directory with access denied
              children.push({
                name: entry,
                path: relativePath,
                type: 'directory',
                accessDenied: true,
              });
              context.nodeCount++;
            }
          } else {
            logger.warn(`Failed to process ${entryPath}:`, error);
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
    } catch (error: any) {
      if (error?.code === 'EACCES' || error?.code === 'EPERM') {
        const relativePath = relative(rootPath, currentPath) || '.';
        context.accessErrors.push(relativePath);
        node.accessDenied = true;
        delete node.children;
      } else {
        logger.error(`Failed to read directory ${currentPath}:`, error);
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
  async expandDirectory(
    rootPath: string,
    dirPath: string,
    maxDepth = 1,
    maxNodes = 500
  ): Promise<FileTreeResult> {
    const absolutePath = dirPath === '.' ? rootPath : join(rootPath, dirPath);
    const context = {
      nodeCount: 0,
      truncated: false,
      accessErrors: [] as string[],
    };

    const node = await this.buildTree(
      rootPath,
      absolutePath,
      0,
      maxDepth,
      maxNodes,
      context
    );

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
