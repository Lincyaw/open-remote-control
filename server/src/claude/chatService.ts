import { spawn, execSync, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger';

export interface SendMessageOptions {
  workspaceDirName: string;
  sessionId?: string;      // 用于 --resume 恢复会话
  newSessionId?: string;   // 用于新建会话，通过 --session-id 指定
  message: string;
  cwd?: string;            // 工作目录
  allowedTools?: string[]; // 允许的工具列表
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
  sessionId?: string;      // 返回实际使用的 sessionId
}

function resolveClaudePath(): string | null {
  // 1. 尝试 which/where 从当前 PATH 解析
  try {
    const resolved = execSync('which claude 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (resolved && existsSync(resolved)) {
      // 验证文件是否可执行
      try {
        execSync(`test -x "${resolved}"`, { encoding: 'utf-8' });
        return resolved;
      } catch {
        logger.warn(`[ChatService] Found claude at ${resolved} but it's not executable`);
      }
    }
  } catch {
    // which 失败，继续检查常见位置
  }

  // 2. 检查常见安装位置
  const home = homedir();
  const candidates = [
    join(home, '.local', 'bin', 'claude'),
    join(home, '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/usr/bin/claude',
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      // 验证文件是否可执行
      try {
        execSync(`test -x "${p}"`, { encoding: 'utf-8' });
        return p;
      } catch {
        logger.warn(`[ChatService] Found claude at ${p} but it's not executable`);
      }
    }
  }

  return null;
}

class ClaudeChatService {
  // 存储正在运行的进程，按 sessionId 索引
  private runningProcesses = new Map<string, ChildProcess>();
  private claudePath: string | null = null;

  constructor() {
    this.claudePath = resolveClaudePath();
    if (this.claudePath) {
      logger.info(`[ChatService] Claude CLI found at: ${this.claudePath}`);
    } else {
      logger.warn('[ChatService] Claude CLI not found. Reply functionality will be unavailable.');
      logger.warn('[ChatService] Install Claude CLI: npm install -g @anthropic-ai/claude-code');
    }
  }

  getClaudePath(): string | null {
    return this.claudePath;
  }

  /**
   * 发送消息给 Claude CLI
   * 使用 -p (print) 模式，消息通过 stdin 传入，响应通过 jsonl 文件监听获取
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { workspaceDirName, sessionId, newSessionId, message, cwd, allowedTools } = options;

    // 确定实际使用的 sessionId
    const effectiveSessionId = sessionId || newSessionId;

    // 检查该会话是否已有进程在运行
    if (effectiveSessionId && this.runningProcesses.has(effectiveSessionId)) {
      return {
        success: false,
        error: 'A message is already being processed for this session',
        sessionId: effectiveSessionId,
      };
    }

    const args = ['-p'];

    // 恢复现有会话
    if (sessionId) {
      args.push('--resume', sessionId);
    }
    // 新建会话并指定 ID
    else if (newSessionId) {
      args.push('--session-id', newSessionId);
    }

    // 添加允许的工具参数
    if (allowedTools && allowedTools.length > 0) {
      args.push('--allowedTools', allowedTools.join(','));
    }

    logger.info(`[ChatService] Sending message to Claude CLI`);
    logger.info(`[ChatService] Args: ${args.join(' ')}`);
    logger.info(`[ChatService] CWD: ${cwd || 'default'}`);
    logger.info(`[ChatService] Message length: ${message.length}`);
    if (allowedTools && allowedTools.length > 0) {
      logger.info(`[ChatService] Allowed tools: ${allowedTools.join(', ')}`);
    }

    if (!this.claudePath) {
      return {
        success: false,
        error: 'Claude CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code',
        sessionId: effectiveSessionId,
      };
    }

    return new Promise((resolve) => {
      const proc = spawn(this.claudePath!, args, {
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'dumb',
        },
      });

      // 记录进程
      if (effectiveSessionId) {
        this.runningProcesses.set(effectiveSessionId, proc);
      }

      // 写入消息到 stdin
      proc.stdin.write(message);
      proc.stdin.end();

      // 收集输出（主要用于错误检测）
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        // 可以选择性地记录 stdout，但主要响应通过 jsonl 监听获取
        logger.debug(`[ChatService] stdout: ${data.toString().substring(0, 200)}...`);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.warn(`[ChatService] stderr: ${data.toString()}`);
      });

      proc.on('close', (code) => {
        // 移除进程记录
        if (effectiveSessionId) {
          this.runningProcesses.delete(effectiveSessionId);
        }

        if (code === 0) {
          logger.info(`[ChatService] Claude CLI completed successfully`);
          resolve({
            success: true,
            sessionId: effectiveSessionId,
          });
        } else {
          logger.error(`[ChatService] Claude CLI exited with code ${code}`);
          const errorMsg = stderr || `Claude CLI exited with code ${code}`;
          resolve({
            success: false,
            error: errorMsg,
            sessionId: effectiveSessionId,
          });
        }
      });

      proc.on('error', (err) => {
        // 移除进程记录
        if (effectiveSessionId) {
          this.runningProcesses.delete(effectiveSessionId);
        }

        logger.error(`[ChatService] Failed to spawn Claude CLI:`, err);

        // 提供更友好的错误信息
        let errorMessage = err.message;
        if (err.message.includes('ENOENT')) {
          errorMessage = `Claude CLI not found at ${this.claudePath}. Please install it with: npm install -g @anthropic-ai/claude-code`;
        }

        resolve({
          success: false,
          error: errorMessage,
          sessionId: effectiveSessionId,
        });
      });
    });
  }

  /**
   * 检查指定会话是否有正在进行的消息处理
   */
  isProcessing(sessionId: string): boolean {
    return this.runningProcesses.has(sessionId);
  }

  /**
   * 取消正在进行的消息处理
   */
  cancelMessage(sessionId: string): boolean {
    const proc = this.runningProcesses.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(sessionId);
      logger.info(`[ChatService] Cancelled message processing for session ${sessionId}`);
      return true;
    }
    return false;
  }
}

export const claudeChatService = new ClaudeChatService();
