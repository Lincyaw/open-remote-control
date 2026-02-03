import { config } from 'dotenv';
import { homedir } from 'os';

config();

/**
 * Parse CLI arguments: --port, --host, --token, --claude-home
 * These take precedence over environment variables.
 */
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      const key = arg.slice(2);
      args[key] = argv[i + 1];
      i++;
    } else if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs();

export const CONFIG = {
  host: args['host'] || process.env.HOST || '0.0.0.0',
  port: parseInt(args['port'] || process.env.PORT || '9080'),
  authToken: args['token'] || process.env.AUTH_TOKEN || '',
  claudeHome: args['claude-home'] || process.env.CLAUDE_HOME || `${homedir()}/.claude`,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  searchTimeout: parseInt(process.env.SEARCH_TIMEOUT || '5000'),
  logLevel: args['log-level'] || process.env.LOG_LEVEL || 'info',
};

if (!CONFIG.authToken) {
  console.warn('WARNING: AUTH_TOKEN not set. Generate: openssl rand -hex 32');
}
