import { exec } from 'child_process';
import { promisify } from 'util';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface SearchOptions {
  caseSensitive?: boolean;
  regex?: boolean;
  fileType?: string;
  maxResults?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  match: string;
}

export class SearchService {
  /**
   * Search for text in files using ripgrep
   */
  async search(
    query: string,
    searchPath: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const args = this.buildRipgrepArgs(query, options);
      const command = `rg ${args.join(' ')} "${query}" "${searchPath}"`;

      logger.debug(`Executing search: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: CONFIG.searchTimeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr && !stderr.includes('No such file or directory')) {
        logger.warn('Ripgrep stderr:', stderr);
      }

      return this.parseRipgrepOutput(stdout, options.maxResults);
    } catch (error: any) {
      // ripgrep returns exit code 1 when no matches found
      if (error.code === 1) {
        return [];
      }

      // ripgrep not installed
      if (error.code === 127 || error.message.includes('command not found')) {
        logger.error('ripgrep not installed');
        throw new Error('ripgrep is not installed. Please install it: https://github.com/BurntSushi/ripgrep');
      }

      // Timeout
      if (error.killed) {
        logger.error('Search timeout');
        throw new Error('Search timeout exceeded');
      }

      logger.error('Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Build ripgrep command arguments
   */
  private buildRipgrepArgs(query: string, options: SearchOptions): string[] {
    const args: string[] = [
      '--json', // JSON output for easier parsing
      '--line-number',
      '--column',
      '--no-heading',
      '--with-filename',
    ];

    // Case sensitivity
    if (!options.caseSensitive) {
      args.push('--ignore-case');
    }

    // Regex mode
    if (!options.regex) {
      args.push('--fixed-strings');
    }

    // File type filter
    if (options.fileType) {
      args.push(`--type=${options.fileType}`);
    }

    // Max results
    if (options.maxResults) {
      args.push(`--max-count=${options.maxResults}`);
    }

    return args;
  }

  /**
   * Parse ripgrep JSON output
   */
  private parseRipgrepOutput(output: string, maxResults?: number): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = output.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const json = JSON.parse(line);

        // Only process match entries
        if (json.type === 'match') {
          const data = json.data;
          const result: SearchResult = {
            file: data.path.text,
            line: data.line_number,
            column: data.submatches[0]?.start || 0,
            content: data.lines.text.trim(),
            match: data.submatches[0]?.match?.text || '',
          };

          results.push(result);

          // Stop if we've reached max results
          if (maxResults && results.length >= maxResults) {
            break;
          }
        }
      } catch (error) {
        logger.warn('Failed to parse ripgrep line:', line, error);
      }
    }

    return results;
  }

  /**
   * Check if ripgrep is installed
   */
  async isRipgrepInstalled(): Promise<boolean> {
    try {
      await execAsync('rg --version');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const searchService = new SearchService();
