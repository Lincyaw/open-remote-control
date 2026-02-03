import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { sshService } from '../../services/ssh';
import { useTerminalStore } from '../../store/terminalStore';
import { useTerminalSessionStore } from '../../store/terminalSessionStore';
import CommandHistorySidebar from '../CommandHistorySidebar';
import { colors, spacing, typography, radius, animation } from '../../theme';

interface TerminalViewProps {
  sessionId: string;
  onBack: () => void;
}

const TERMINAL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: ${colors.codeBg}; overflow: hidden; }
    #terminal { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script>
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '${colors.codeBg}',
        foreground: '${colors.codeFg}',
        cursor: '${colors.codeFg}',
        cursorAccent: '${colors.codeBg}',
        selection: 'rgba(255, 255, 255, 0.3)',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    window.addEventListener('resize', () => fitAddon.fit());

    term.onData((data) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'input',
        data: data
      }));
    });

    window.writeToTerminal = (data) => {
      term.write(data);
    };

    window.clearTerminal = () => {
      term.clear();
    };

    window.resizeTerminal = () => {
      fitAddon.fit();
    };
  </script>
</body>
</html>
`;

export default function TerminalView({ sessionId, onBack }: TerminalViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { addCommand } = useTerminalStore();
  const { updateSessionStatus, getSession } = useTerminalSessionStore();
  const inputBufferRef = useRef<string>('');

  const session = getSession(sessionId);

  const initShell = useCallback(async () => {
    const handleShellData = (data: string) => {
      if (webViewRef.current) {
        const escaped = JSON.stringify(data);
        webViewRef.current.injectJavaScript(
          `window.writeToTerminal(${escaped}); true;`
        );
      }
    };

    try {
      setIsLoading(true);
      setError(null);
      await sshService.startShell(sessionId, handleShellData);
      updateSessionStatus(sessionId, 'active');
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to shell');
      updateSessionStatus(sessionId, 'error');
      setIsLoading(false);
    }
  }, [sessionId, updateSessionStatus]);

  useEffect(() => {
    initShell();

    return () => {
      // Don't close shell on unmount - session persists
    };
  }, [initShell]);

  const handleRetry = useCallback(() => {
    initShell();
  }, [initShell]);

  const handleCommandSelect = useCallback((command: string) => {
    if (webViewRef.current) {
      const escaped = JSON.stringify(command + '\n');
      webViewRef.current.injectJavaScript(
        `window.writeToTerminal(${escaped}); true;`
      );
    }
    sshService.writeToShell(sessionId, command + '\n');
    setShowHistory(false);
  }, [sessionId]);

  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'input') {
        const data = message.data;
        if (data.includes('\r') || data.includes('\n')) {
          const command = inputBufferRef.current.trim();
          if (command) {
            addCommand(command);
          }
          inputBufferRef.current = '';
        } else if (data === '\x7f' || data === '\b') {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          inputBufferRef.current += data;
        }
        sshService.writeToShell(sessionId, message.data);
      }
    } catch (err) {
      // Error handled silently
    }
  }, [addCommand, sessionId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.backButtonText}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{session?.name || 'Terminal'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>连接终端中...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.backButtonText}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{session?.name || 'Terminal'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>连接失败: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={styles.backButtonText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{session?.name || 'Terminal'}</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(true)}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: TERMINAL_HTML }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />

      <CommandHistorySidebar
        visible={showHistory}
        onSelectCommand={handleCommandSelect}
        onClose={() => setShowHistory(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.codeBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: typography.weight.regular,
  },
  headerTitle: {
    flex: 1,
    color: colors.codeFg,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  historyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#333',
    borderRadius: radius.sm,
  },
  historyButtonText: {
    color: colors.codeFg,
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.medium,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.codeFg,
    fontSize: typography.size.body,
    marginTop: spacing.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.size.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
