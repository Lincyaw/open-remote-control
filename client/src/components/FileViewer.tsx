import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { wsClient } from '../services/websocket';

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;

const getHighlightedHTML = (content: string, language: string, fontSize: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      background: #1e1e1e;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: ${fontSize}px;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      font-family: inherit;
    }
    .line-numbers {
      counter-reset: line;
    }
    .line-numbers .line::before {
      counter-increment: line;
      content: counter(line);
      display: inline-block;
      width: 40px;
      padding-right: 16px;
      color: #858585;
      text-align: right;
    }
    .line {
      display: block;
      min-height: 1.4em;
    }
  </style>
</head>
<body>
  <pre><code class="language-${language} line-numbers" id="code"></code></pre>
  <script>
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    const code = ${JSON.stringify(content)};
    const lines = code.split('\\n').map(line => '<span class="line">' + escapeHtml(line) + '</span>').join('\\n');
    document.getElementById('code').innerHTML = lines;
    hljs.highlightAll();
  </script>
</body>
</html>
`;

interface FileContent {
  path: string;
  content: string;
  size: number;
  language: string;
  isBinary: boolean;
  truncated: boolean;
}

interface Props {
  filePath: string;
  onBack: () => void;
}

export default function FileViewer({ filePath, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, MAX_FONT_SIZE));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, MIN_FONT_SIZE));

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = () => {
    setLoading(true);
    setError(null);

    // Request file content from server
    wsClient.send({
      type: 'file_read',
      path: filePath,
    });

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'file_read_response') {
          setFileContent(message.data);
          setLoading(false);
        } else if (message.type === 'error') {
          setError(message.error);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    // Note: In production, properly manage WebSocket event listeners
    const ws = (wsClient as any).ws;
    if (ws) {
      ws.addEventListener('message', handleMessage);

      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  };

  const renderContent = () => {
    if (!fileContent) return null;

    if (fileContent.isBinary) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.binaryText}>📦 Binary file</Text>
          <Text style={styles.infoText}>
            Size: {formatSize(fileContent.size)}
          </Text>
        </View>
      );
    }

    if (fileContent.truncated) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ File too large</Text>
          <Text style={styles.infoText}>
            Size: {formatSize(fileContent.size)}
          </Text>
          <Text style={styles.infoText}>
            Maximum file size exceeded
          </Text>
        </View>
      );
    }

    // Use WebView with highlight.js for syntax highlighting
    const htmlContent = getHighlightedHTML(fileContent.content, fileContent.language, fontSize);

    return (
      <WebView
        style={styles.webView}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={true}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.fileName} numberOfLines={1}>
            {filePath.split('/').pop()}
          </Text>
          {fileContent && (
            <Text style={styles.fileInfo}>
              {fileContent.language} • {formatSize(fileContent.size)}
            </Text>
          )}
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomButton, fontSize <= MIN_FONT_SIZE && styles.zoomButtonDisabled]}
            onPress={decreaseFontSize}
            disabled={fontSize <= MIN_FONT_SIZE}
          >
            <Text style={[styles.zoomButtonText, fontSize <= MIN_FONT_SIZE && styles.zoomButtonTextDisabled]}>A-</Text>
          </TouchableOpacity>
          <Text style={styles.fontSizeText}>{fontSize}px</Text>
          <TouchableOpacity
            style={[styles.zoomButton, fontSize >= MAX_FONT_SIZE && styles.zoomButtonDisabled]}
            onPress={increaseFontSize}
            disabled={fontSize >= MAX_FONT_SIZE}
          >
            <Text style={[styles.zoomButtonText, fontSize >= MAX_FONT_SIZE && styles.zoomButtonTextDisabled]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading file...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      ) : (
        renderContent()
      )}
    </View>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileInfo: {
    fontSize: 12,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 10,
  },
  binaryText: {
    fontSize: 24,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  webView: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  zoomButtonTextDisabled: {
    color: '#999',
  },
  fontSizeText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
    textAlign: 'center',
  },
});
