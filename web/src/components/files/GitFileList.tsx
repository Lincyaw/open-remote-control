import { useFilesStore } from '../../store/filesStore';
import { wsClient } from '../../services/websocket';
import type { GitFileStatus } from '../../types';

interface Props {
  onFileSelect: (file: GitFileStatus) => void;
  workspacePath?: string | null;
}

export default function GitFileList({ onFileSelect, workspacePath }: Props) {
  const { gitFiles, gitLoading } = useFilesStore();

  const handleRefresh = () => {
    wsClient.requestGitStatus(workspacePath || undefined);
  };

  if (gitLoading) {
    return <div className="p-4 text-center text-gray-500 text-sm">Loading git status...</div>;
  }

  if (gitFiles.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <p>No changes detected</p>
        <button onClick={handleRefresh} className="text-blue-400 hover:text-blue-300 mt-2 text-xs">
          Refresh
        </button>
      </div>
    );
  }

  const statusIcon: Record<string, string> = {
    modified: 'M',
    added: 'A',
    deleted: 'D',
    untracked: '?',
    renamed: 'R',
  };

  const statusColor: Record<string, string> = {
    modified: 'text-yellow-400',
    added: 'text-green-400',
    deleted: 'text-red-400',
    untracked: 'text-gray-400',
    renamed: 'text-blue-400',
  };

  const staged = gitFiles.filter(f => f.staged);
  const unstaged = gitFiles.filter(f => !f.staged);

  const FileRow = ({ file, prefix }: { file: GitFileStatus; prefix: string }) => (
    <div
      key={`${prefix}-${file.path}`}
      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 border-b border-gray-800/40"
    >
      {/* Clickable file info area */}
      <button
        onClick={() => onFileSelect(file)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70"
      >
        <span className={`text-xs font-mono w-4 shrink-0 ${statusColor[file.status]}`}>
          {statusIcon[file.status]}
        </span>
        <span className="text-xs text-gray-300 font-mono truncate flex-1">{file.path}</span>
        {file.additions !== undefined && file.deletions !== undefined && (
          <span className="text-[10px] font-mono shrink-0 flex gap-1">
            {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
            {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
          </span>
        )}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {!file.staged ? (
          <>
            <button
              onClick={() => wsClient.requestGitStage(file.path, workspacePath || undefined)}
              className="px-2 py-1 text-[10px] font-medium rounded bg-green-900/60 text-green-300 active:bg-green-900 border border-green-800/60"
              title="Stage changes"
            >
              Stage
            </button>
            <button
              onClick={() => wsClient.requestGitDiscard(file.path, file.status, workspacePath || undefined)}
              className="px-2 py-1 text-[10px] font-medium rounded bg-red-900/60 text-red-300 active:bg-red-900 border border-red-800/60"
              title="Discard changes"
            >
              Discard
            </button>
          </>
        ) : (
          <button
            onClick={() => wsClient.requestGitUnstage(file.path, workspacePath || undefined)}
            className="px-2 py-1 text-[10px] font-medium rounded bg-yellow-900/60 text-yellow-300 active:bg-yellow-900 border border-yellow-800/60"
            title="Unstage changes"
          >
            Unstage
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pb-16">
      {staged.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-900/20 border-b border-gray-800">
            Staged ({staged.length})
          </div>
          {staged.map((file) => (
            <FileRow key={`staged-${file.path}`} file={file} prefix="staged" />
          ))}
        </>
      )}

      {unstaged.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-yellow-400 bg-yellow-900/20 border-b border-gray-800">
            Unstaged ({unstaged.length})
          </div>
          {unstaged.map((file) => (
            <FileRow key={`unstaged-${file.path}`} file={file} prefix="unstaged" />
          ))}
        </>
      )}
    </div>
  );
}
