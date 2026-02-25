import { useState, useRef, useCallback, useEffect } from 'react';
import { useTerminalSessionStore } from '../../store/terminalSessionStore';

interface Props {
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string, kill: boolean) => void;
  onNew: (type: 'shell' | 'claude') => void;
}

interface MenuPosition {
  left: number;
  top: number;
}

export default function MobileSessionTabs({ onSelect, onClose, onNew }: Props) {
  const { sessions, activeSessionId } = useTerminalSessionStore();
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((sessionId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ sessionId, x, y });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const dismissMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Calculate menu position to keep it within viewport
  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;

    const menuWidth = 140;
    const menuHeight = menuRef.current.offsetHeight || 80;
    const padding = 8;

    let left = contextMenu.x;
    let top = contextMenu.y - menuHeight - padding;

    // Check right boundary
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - padding;
    }

    // Check left boundary
    if (left < padding) {
      left = padding;
    }

    // Check top boundary - if menu would go above screen, show below touch point
    if (top < padding) {
      top = contextMenu.y + padding;
    }

    // Check bottom boundary
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - padding;
    }

    setMenuPosition({ left, top });
  }, [contextMenu]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto scrollbar-none border-b border-gray-800">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const statusDot = {
            active: 'bg-green-500',
            connecting: 'bg-yellow-500',
            closed: 'bg-gray-500',
            error: 'bg-red-500',
          }[session.status];

          return (
            <button
              key={session.id}
              onClick={() => { dismissMenu(); onSelect(session.id); }}
              onTouchStart={(e) => handleTouchStart(session.id, e)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              <span className="truncate max-w-[80px]">{session.name}</span>
            </button>
          );
        })}

        {/* Add buttons */}
        <button
          onClick={() => onNew('shell')}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/30 text-gray-500 text-xs border border-gray-700/30"
        >
          + Shell
        </button>
        <button
          onClick={() => onNew('claude')}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/30 text-gray-500 text-xs border border-gray-700/30"
        >
          + Claude
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={dismissMenu} />
          <div
            ref={menuRef}
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
          >
            <button
              onClick={() => { onClose(contextMenu.sessionId, false); dismissMenu(); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700/50"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(contextMenu.sessionId, true); dismissMenu(); }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700/50"
            >
              Kill
            </button>
          </div>
        </>
      )}
    </div>
  );
}
