import { useState, useCallback, useMemo } from 'react';
import type { SessionMessage } from '../../types';

interface Props {
  toolUse: SessionMessage;
  toolResult?: SessionMessage;
  onBack: () => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no-op */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded bg-gray-700/50"
    >
      {copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
}

// ── Diff helpers ─────────────────────────────────────────────────────────────

interface DiffInfo {
  filePath: string;
  oldContent: string;
  newContent: string;
}

function extractDiffInfo(toolName: string, toolInput: Record<string, any>): DiffInfo | null {
  switch (toolName) {
    // Claude Code built-in tools
    case 'Edit':
      if (toolInput.file_path) {
        return {
          filePath: toolInput.file_path,
          oldContent: toolInput.old_string ?? '',
          newContent: toolInput.new_string ?? '',
        };
      }
      return null;

    case 'Write':
      if (toolInput.file_path) {
        return { filePath: toolInput.file_path, oldContent: '', newContent: toolInput.content ?? '' };
      }
      return null;

    // Claude API / MCP tool variants
    case 'str_replace_editor':
    case 'str_replace_based_edit_tool': {
      const cmd = toolInput.command;
      if (cmd === 'str_replace' && toolInput.path) {
        return { filePath: toolInput.path, oldContent: toolInput.old_str ?? '', newContent: toolInput.new_str ?? '' };
      }
      if ((cmd === 'create' || cmd === 'write') && toolInput.path) {
        return { filePath: toolInput.path, oldContent: '', newContent: toolInput.file_text ?? toolInput.content ?? '' };
      }
      return null;
    }

    case 'write_file':
    case 'create_file':
      if (toolInput.path) {
        return { filePath: toolInput.path, oldContent: '', newContent: toolInput.content ?? toolInput.file_text ?? '' };
      }
      return null;

    case 'edit_file':
      if (toolInput.path) {
        return {
          filePath: toolInput.path,
          oldContent: toolInput.old_str ?? toolInput.original_text ?? '',
          newContent: toolInput.new_str ?? toolInput.new_text ?? '',
        };
      }
      return null;

    default:
      return null;
  }
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent === '' ? [] : oldContent.split('\n');
  const newLines = newContent === '' ? [] : newContent.split('\n');

  const m = oldLines.length;
  const n = newLines.length;
  const dp = new Array<number>((m + 1) * (n + 1)).fill(0);
  const at = (i: number, j: number) => dp[i * (n + 1) + j] ?? 0;
  const set = (i: number, j: number, v: number) => { dp[i * (n + 1) + j] = v; };

  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      set(i, j, oldLines[i - 1] === newLines[j - 1]
        ? at(i - 1, j - 1) + 1
        : Math.max(at(i - 1, j), at(i, j - 1)));

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', content: oldLines[i - 1] ?? '', oldNo: i, newNo: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || at(i, j - 1) >= at(i - 1, j))) {
      result.unshift({ type: 'added', content: newLines[j - 1] ?? '', oldNo: null, newNo: j });
      j--;
    } else {
      result.unshift({ type: 'removed', content: oldLines[i - 1] ?? '', oldNo: i, newNo: null });
      i--;
    }
  }
  return result;
}

function InlineDiff({ diff, filePath }: { diff: DiffLine[]; filePath: string }) {
  const additions = diff.filter(l => l.type === 'added').length;
  const deletions = diff.filter(l => l.type === 'removed').length;

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-gray-700">
      {/* file header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-300 font-mono truncate flex-1">{filePath}</span>
        <span className="text-[10px] text-green-400 shrink-0">+{additions}</span>
        <span className="text-[10px] text-red-400 shrink-0">-{deletions}</span>
      </div>
      {/* lines */}
      <div className="overflow-auto bg-gray-900 font-mono text-xs max-h-[60vh]">
        {diff.map((line, idx) => {
          let bg = '';
          let text = 'text-gray-300';
          let prefix = ' ';
          if (line.type === 'added') { bg = 'bg-green-900/30'; text = 'text-green-300'; prefix = '+'; }
          else if (line.type === 'removed') { bg = 'bg-red-900/30'; text = 'text-red-300'; prefix = '-'; }
          return (
            <div key={idx} className={`flex leading-5 ${bg}`}>
              <span className="select-none text-gray-600 text-right w-8 shrink-0 px-1">{line.oldNo ?? ''}</span>
              <span className="select-none text-gray-600 text-right w-8 shrink-0 px-1 border-r border-gray-700/50 mr-2">{line.newNo ?? ''}</span>
              <span className={`whitespace-pre flex-1 ${text}`}>{prefix}{line.content || '\u00A0'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ToolDetailView({ toolUse, toolResult, onBack }: Props) {
  const diffInfo = useMemo(
    () => extractDiffInfo(toolUse.toolName ?? '', toolUse.toolInput ?? {}),
    [toolUse.toolName, toolUse.toolInput]
  );

  const diff = useMemo(
    () => diffInfo ? computeDiff(diffInfo.oldContent, diffInfo.newContent) : null,
    [diffInfo]
  );

  const tabs = diffInfo
    ? (['diff', 'input', 'result'] as const)
    : (['input', 'result'] as const);

  const [activeTab, setActiveTab] = useState<'diff' | 'input' | 'result'>(tabs[0]);

  const inputText = toolUse.toolInput
    ? JSON.stringify(toolUse.toolInput, null, 2)
    : 'No input data';

  const isError = toolResult?.content?.toLowerCase().includes('error') ||
                  toolResult?.content?.toLowerCase().includes('failed') ||
                  toolResult?.content?.startsWith('Error:');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <button onClick={onBack} className="text-sm text-blue-400 hover:text-blue-300 mb-1">
          &larr; Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">
            {toolUse.toolName || 'Unknown Tool'}
          </span>
          {toolResult && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}>
              {isError ? 'Error' : 'Success'}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {new Date(toolUse.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'diff' && diff && diffInfo && (
          <InlineDiff diff={diff} filePath={diffInfo.filePath} />
        )}

        {activeTab === 'input' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Input</h3>
              <CopyButton text={inputText} />
            </div>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-80">
              {inputText}
            </pre>
          </div>
        )}

        {activeTab === 'result' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Result</h3>
              {toolResult && <CopyButton text={toolResult.content} />}
            </div>
            {toolResult ? (
              <pre className={`bg-gray-800 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96 border-l-2 ${
                isError ? 'border-l-red-500' : 'border-l-green-500'
              }`}>
                {toolResult.content}
              </pre>
            ) : (
              <p className="text-xs text-gray-500 italic">No result available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
