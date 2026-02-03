import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
  oldPath?: string;
}

/**
 * Git service for executing git commands safely.
 */
export class GitService {
  /**
   * Check if a directory is inside a git repository.
   */
  async isGitRepo(workingDir: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: workingDir,
      });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Get the root directory of the git repository.
   */
  async getRepoRoot(workingDir: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: workingDir,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Get git status for all changed files.
   * Uses `git status --porcelain` for machine-parseable output.
   */
  async getStatus(workingDir: string): Promise<GitFileStatus[]> {
    try {
      // Use repo root so paths in output are consistent
      const repoRoot = await this.getRepoRoot(workingDir);
      const cwd = repoRoot || workingDir;

      const { stdout } = await execFileAsync(
        'git',
        ['status', '--porcelain', '-uall'],
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );

      if (!stdout.trim()) {
        return [];
      }

      const files: GitFileStatus[] = [];
      const lines = stdout.split('\n').filter(line => line.length > 0);

      for (const line of lines) {
        const parsed = this.parseStatusLine(line);
        if (parsed) {
          files.push(parsed);
        }
      }

      return files;
    } catch (error) {
      logger.error('Failed to get git status:', error);
      throw error;
    }
  }

  /**
   * Parse a single line of git status --porcelain output.
   * Format: XY PATH or XY ORIG_PATH -> PATH (for renames)
   */
  private parseStatusLine(line: string): GitFileStatus | null {
    if (line.length < 3) return null;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const filePath = line.slice(3);

    // Handle renames: "R  old -> new"
    if (indexStatus === 'R' || workTreeStatus === 'R') {
      const parts = filePath.split(' -> ');
      if (parts.length === 2) {
        return {
          path: parts[1],
          status: 'renamed',
          staged: indexStatus === 'R',
          oldPath: parts[0],
        };
      }
    }

    // Determine status based on index and work tree status
    let status: GitFileStatus['status'];
    let staged = false;

    // Prioritize staged changes for display
    if (indexStatus === 'A') {
      status = 'added';
      staged = true;
    } else if (indexStatus === 'D') {
      status = 'deleted';
      staged = true;
    } else if (indexStatus === 'M') {
      status = 'modified';
      staged = true;
    } else if (workTreeStatus === 'M') {
      status = 'modified';
      staged = false;
    } else if (workTreeStatus === 'D') {
      status = 'deleted';
      staged = false;
    } else if (workTreeStatus === '?' || indexStatus === '?') {
      status = 'untracked';
      staged = false;
    } else if (workTreeStatus === 'A') {
      status = 'added';
      staged = false;
    } else {
      // Fallback
      status = 'modified';
      staged = indexStatus !== ' ' && indexStatus !== '?';
    }

    return { path: filePath, status, staged };
  }

  /**
   * Get diff for a specific file.
   * Returns unified diff format.
   *
   * Strategy:
   * - Untracked files (??) → generate synthetic diff from file content
   * - New files (A) → use git diff --cached (compare with empty)
   * - Other files → use git diff HEAD (shows all changes vs last commit)
   */
  async getFileDiff(workingDir: string, filePath: string, staged: boolean = false): Promise<string> {
    try {
      // Get the repo root to ensure correct path handling
      const repoRoot = await this.getRepoRoot(workingDir);
      const cwd = repoRoot || workingDir;
      logger.info(`getFileDiff: cwd=${cwd}, filePath=${filePath}`);

      // Get the actual status of this file
      const { stdout: statusOut } = await execFileAsync(
        'git',
        ['status', '--porcelain', '--', filePath],
        { cwd }
      );

      const statusLine = statusOut.trim().split('\n')[0] || '';
      const indexStatus = statusLine[0] || ' ';
      const workTreeStatus = statusLine[1] || ' ';

      logger.info(`getFileDiff: status line="${statusLine}", index=${indexStatus}, worktree=${workTreeStatus}`);

      // Case 1: Untracked file - generate diff from file content
      if (indexStatus === '?' || workTreeStatus === '?') {
        logger.info('getFileDiff: untracked file, generating synthetic diff');
        return this.getUntrackedFileDiff(cwd, filePath);
      }

      // Case 2: Newly added file (only in index, not in HEAD)
      if (indexStatus === 'A') {
        logger.info('getFileDiff: new file, using --cached');
        const { stdout } = await execFileAsync(
          'git',
          ['diff', '--cached', '--', filePath],
          { cwd, maxBuffer: 10 * 1024 * 1024 }
        );
        if (stdout.trim()) {
          return stdout;
        }
        // Fallback: if --cached returns empty (shouldn't happen), show file content
        return this.getUntrackedFileDiff(cwd, filePath);
      }

      // Case 3: Modified/Deleted files - use git diff HEAD to show all changes
      // This captures both staged and unstaged changes relative to last commit
      logger.info('getFileDiff: tracked file, using diff HEAD');
      const { stdout: headDiff } = await execFileAsync(
        'git',
        ['diff', 'HEAD', '--', filePath],
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );

      if (headDiff.trim()) {
        logger.info(`getFileDiff: HEAD diff length=${headDiff.length}`);
        return headDiff;
      }

      // Fallback: try regular diff (in case HEAD doesn't exist)
      logger.info('getFileDiff: HEAD diff empty, trying regular diff');
      const { stdout: regularDiff } = await execFileAsync(
        'git',
        ['diff', '--', filePath],
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );

      if (regularDiff.trim()) {
        return regularDiff;
      }

      // Last resort: try --cached
      logger.info('getFileDiff: regular diff empty, trying --cached');
      const { stdout: cachedDiff } = await execFileAsync(
        'git',
        ['diff', '--cached', '--', filePath],
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );

      return cachedDiff;
    } catch (error) {
      logger.error('Failed to get file diff:', error);
      throw error;
    }
  }

  /**
   * Generate a diff-like output for an untracked file.
   */
  private async getUntrackedFileDiff(workingDir: string, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(workingDir, filePath);

      // Check if file is binary
      const isBinary = await this.isBinaryFile(fullPath);
      if (isBinary) {
        return `diff --git a/${filePath} b/${filePath}\nnew file mode 100644\nBinary file`;
      }

      // Read file content
      const content = await readFile(fullPath, 'utf-8');

      const lines = content.split('\n');
      const diffLines = [
        `diff --git a/${filePath} b/${filePath}`,
        'new file mode 100644',
        '--- /dev/null',
        `+++ b/${filePath}`,
        `@@ -0,0 +1,${lines.length} @@`,
        ...lines.map(line => `+${line}`),
      ];

      return diffLines.join('\n');
    } catch (error) {
      logger.error('Failed to generate untracked file diff:', error);
      throw error;
    }
  }

  /**
   * Check if a file is binary by looking at the first few bytes.
   */
  private async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('file', ['--mime', filePath]);
      return stdout.includes('charset=binary');
    } catch {
      return false;
    }
  }
}

export const gitService = new GitService();
