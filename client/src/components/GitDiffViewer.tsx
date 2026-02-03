import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, typography, radius, animation } from '../theme';

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 13;

/**
 * Generate HTML to render unified diff with syntax highlighting.
 */
const getDiffHTML = (diff: string, fontSize: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: ${colors.codeBg};
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: ${fontSize}px;
      line-height: 1.5;
      color: ${colors.codeFg};
    }
    .diff-container {
      padding: 10px;
    }
    .diff-line {
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 1px 8px;
      min-height: 1.5em;
    }
    .diff-add {
      background-color: rgba(46, 160, 67, 0.25);
      color: #3fb950;
    }
    .diff-del {
      background-color: rgba(248, 81, 73, 0.25);
      color: #f85149;
    }
    .diff-hunk {
      background-color: rgba(56, 139, 253, 0.15);
      color: #58a6ff;
      margin-top: 10px;
      margin-bottom: 5px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .diff-header {
      color: #8b949e;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #30363d;
    }
    .binary-notice {
      color: #8b949e;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }
    .empty-diff {
      color: #8b949e;
      padding: 40px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="diff-container" id="content"></div>
  <script>
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function renderDiff(diffText) {
      if (!diffText || diffText.trim() === '') {
        return '<div class="empty-diff">No changes to display</div>';
      }

      var lines = diffText.split('\\n');
      var result = [];
      var inHeader = true;
      var headerLines = [];

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Detect end of header (first hunk marker)
        if (line.startsWith('@@')) {
          inHeader = false;
          if (headerLines.length > 0) {
            result.push('<div class="diff-header">' + headerLines.map(function(h) { return escapeHtml(h); }).join('<br>') + '</div>');
            headerLines = [];
          }
        }

        if (inHeader) {
          if (line.startsWith('diff --git') || line.startsWith('index ') ||
              line.startsWith('---') || line.startsWith('+++') ||
              line.startsWith('new file') || line.startsWith('deleted file') ||
              line.startsWith('similarity') || line.startsWith('rename')) {
            headerLines.push(line);
          }
        } else {
          var className = 'diff-line';

          if (line.startsWith('@@')) {
            className = 'diff-line diff-hunk';
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            className = 'diff-line diff-add';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            className = 'diff-line diff-del';
          }

          if (line.includes('Binary file') || line === 'Binary file') {
            result.push('<div class="binary-notice">Binary file - diff not available</div>');
          } else {
            result.push('<div class="' + className + '">' + escapeHtml(line) + '</div>');
          }
        }
      }

      if (inHeader && headerLines.length > 0) {
        result.push('<div class="diff-header">' + headerLines.map(function(h) { return escapeHtml(h); }).join('<br>') + '</div>');
        result.push('<div class="empty-diff">No text changes</div>');
      }

      return result.join('');
    }

    var diffText = ${JSON.stringify(diff)};
    document.getElementById('content').innerHTML = renderDiff(diffText);
  </script>
</body>
</html>
`;

interface Props {
  filePath: string;
  diff: string | null;
  loading: boolean;
  onBack: () => void;
}

export default function GitDiffViewer({ filePath, diff, loading, onBack }: Props) {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, MAX_FONT_SIZE));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, MIN_FONT_SIZE));

  const fileName = useMemo(() => filePath.split('/').pop() || filePath, [filePath]);

  const htmlContent = useMemo(() => {
    return getDiffHTML(diff || '', fontSize);
  }, [diff, fontSize]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={styles.fileInfo} numberOfLines={1}>
            {filePath}
          </Text>
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomButton, fontSize <= MIN_FONT_SIZE && styles.zoomButtonDisabled]}
            onPress={decreaseFontSize}
            disabled={fontSize <= MIN_FONT_SIZE}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={[styles.zoomButtonText, fontSize <= MIN_FONT_SIZE && styles.zoomButtonTextDisabled]}>A-</Text>
          </TouchableOpacity>
          <Text style={styles.fontSizeText}>{fontSize}px</Text>
          <TouchableOpacity
            style={[styles.zoomButton, fontSize >= MAX_FONT_SIZE && styles.zoomButtonDisabled]}
            onPress={increaseFontSize}
            disabled={fontSize >= MAX_FONT_SIZE}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={[styles.zoomButtonText, fontSize >= MAX_FONT_SIZE && styles.zoomButtonTextDisabled]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading diff...</Text>
        </View>
      ) : (
        <WebView
          style={styles.webView}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: typography.size.headline,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  headerContent: {
    flex: 1,
  },
  fileName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  fileInfo: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.codeBg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.body,
    color: colors.text.tertiary,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.codeBg,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  zoomButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomButtonText: {
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  zoomButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  fontSizeText: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
    minWidth: 40,
    textAlign: 'center',
  },
});
