import { useState } from 'react';
import { wsClient } from '../../services/websocket';

interface Props {
  workspacePath?: string | null;
}

type CommitMode = 'commit' | 'amend' | 'push' | 'sync';

export default function GitCommitPanel({ workspacePath }: Props) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCommit = async (mode: CommitMode) => {
    if (mode !== 'amend' && !message.trim()) return;
    setLoading(true);
    wsClient.requestGitCommit(message, mode, workspacePath || undefined);
    // Reset after a short delay to let the response arrive
    setTimeout(() => {
      setLoading(false);
      if (mode !== 'amend') setMessage('');
    }, 1500);
  };

  const canCommit = message.trim().length > 0;

  return (
    <div className="border-t border-gray-800 bg-gray-900/60 p-3 flex flex-col gap-2">
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Commit message (required except for amend --no-edit)"
        rows={3}
        className="w-full bg-gray-800 text-gray-200 text-xs font-mono rounded-md px-3 py-2 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600"
        disabled={loading}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => handleCommit('commit')}
          disabled={loading || !canCommit}
          className="py-2 text-xs font-medium rounded-md bg-blue-700 text-white active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit
        </button>
        <button
          onClick={() => handleCommit('amend')}
          disabled={loading}
          className="py-2 text-xs font-medium rounded-md bg-gray-700 text-gray-200 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit (amend)
        </button>
        <button
          onClick={() => handleCommit('push')}
          disabled={loading || !canCommit}
          className="py-2 text-xs font-medium rounded-md bg-green-800 text-green-100 active:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit &amp; Push
        </button>
        <button
          onClick={() => handleCommit('sync')}
          disabled={loading || !canCommit}
          className="py-2 text-xs font-medium rounded-md bg-purple-800 text-purple-100 active:bg-purple-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit &amp; Sync
        </button>
      </div>
    </div>
  );
}
