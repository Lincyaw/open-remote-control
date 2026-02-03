import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface Props {
  oldContent: string;
  newContent: string;
  filePath: string;
  mode?: 'unified' | 'split';
  onAccept?: () => void;
  onReject?: () => void;
}

export default function DiffViewer({
  oldContent,
  newContent,
  filePath,
  mode = 'unified',
  onAccept,
  onReject,
}: Props) {
  const diffLines = useMemo(() => {
    return computeDiff(oldContent, newContent);
  }, [oldContent, newContent]);

  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    return { added, removed };
  }, [diffLines]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.filePath} numberOfLines={1}>
          {filePath}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.addedStat}>+{stats.added}</Text>
          <Text style={styles.removedStat}>-{stats.removed}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.diffContainer}
        horizontal={mode === 'split'}
        showsHorizontalScrollIndicator={mode === 'split'}
      >
        {mode === 'unified' ? (
          <UnifiedDiff lines={diffLines} />
        ) : (
          <SplitDiff lines={diffLines} />
        )}
      </ScrollView>

      {(onAccept || onReject) && (
        <View style={styles.actions}>
          {onReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          )}
          {onAccept && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function UnifiedDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <View style={styles.unifiedContainer}>
      {lines.map((line, index) => (
        <View
          key={index}
          style={[
            styles.line,
            line.type === 'added' && styles.addedLine,
            line.type === 'removed' && styles.removedLine,
            line.type === 'header' && styles.headerLine,
          ]}
        >
          <View style={styles.lineNumbers}>
            <Text style={styles.lineNumber}>
              {line.oldLineNumber ?? ' '}
            </Text>
            <Text style={styles.lineNumber}>
              {line.newLineNumber ?? ' '}
            </Text>
          </View>
          <Text style={styles.linePrefix}>
            {line.type === 'added'
              ? '+'
              : line.type === 'removed'
              ? '-'
              : line.type === 'header'
              ? '@'
              : ' '}
          </Text>
          <Text
            style={[
              styles.lineContent,
              line.type === 'added' && styles.addedText,
              line.type === 'removed' && styles.removedText,
              line.type === 'header' && styles.headerText,
            ]}
            numberOfLines={1}
          >
            {line.content}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SplitDiff({ lines }: { lines: DiffLine[] }) {
  const { leftLines, rightLines } = useMemo(() => {
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    for (const line of lines) {
      if (line.type === 'header') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'removed') {
        left.push(line);
        right.push({ type: 'unchanged', content: '' });
      } else if (line.type === 'added') {
        left.push({ type: 'unchanged', content: '' });
        right.push(line);
      } else {
        left.push(line);
        right.push(line);
      }
    }

    return { leftLines: left, rightLines: right };
  }, [lines]);

  return (
    <View style={styles.splitContainer}>
      <View style={styles.splitPane}>
        <Text style={styles.splitHeader}>Old</Text>
        {leftLines.map((line, index) => (
          <View
            key={index}
            style={[
              styles.line,
              line.type === 'removed' && styles.removedLine,
              line.type === 'header' && styles.headerLine,
            ]}
          >
            <Text style={styles.lineNumber}>{line.oldLineNumber ?? ' '}</Text>
            <Text
              style={[
                styles.lineContent,
                line.type === 'removed' && styles.removedText,
                line.type === 'header' && styles.headerText,
              ]}
              numberOfLines={1}
            >
              {line.content}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.splitDivider} />

      <View style={styles.splitPane}>
        <Text style={styles.splitHeader}>New</Text>
        {rightLines.map((line, index) => (
          <View
            key={index}
            style={[
              styles.line,
              line.type === 'added' && styles.addedLine,
              line.type === 'header' && styles.headerLine,
            ]}
          >
            <Text style={styles.lineNumber}>{line.newLineNumber ?? ' '}</Text>
            <Text
              style={[
                styles.lineContent,
                line.type === 'added' && styles.addedText,
                line.type === 'header' && styles.headerText,
              ]}
              numberOfLines={1}
            >
              {line.content}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff algorithm
  const lcs = computeLCS(oldLines, newLines);

  let oldIndex = 0;
  let newIndex = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const match of lcs) {
    // Add removed lines (in old but not in LCS)
    while (oldIndex < match.oldIndex) {
      result.push({
        type: 'removed',
        content: oldLines[oldIndex],
        oldLineNumber: oldLineNum++,
      });
      oldIndex++;
    }

    // Add added lines (in new but not in LCS)
    while (newIndex < match.newIndex) {
      result.push({
        type: 'added',
        content: newLines[newIndex],
        newLineNumber: newLineNum++,
      });
      newIndex++;
    }

    // Add unchanged line
    result.push({
      type: 'unchanged',
      content: oldLines[oldIndex],
      oldLineNumber: oldLineNum++,
      newLineNumber: newLineNum++,
    });
    oldIndex++;
    newIndex++;
  }

  // Add remaining removed lines
  while (oldIndex < oldLines.length) {
    result.push({
      type: 'removed',
      content: oldLines[oldIndex],
      oldLineNumber: oldLineNum++,
    });
    oldIndex++;
  }

  // Add remaining added lines
  while (newIndex < newLines.length) {
    result.push({
      type: 'added',
      content: newLines[newIndex],
      newLineNumber: newLineNum++,
    });
    newIndex++;
  }

  return result;
}

interface LCSMatch {
  oldIndex: number;
  newIndex: number;
}

function computeLCS(oldLines: string[], newLines: string[]): LCSMatch[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const result: LCSMatch[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  filePath: {
    flex: 1,
    color: '#cccccc',
    fontSize: 14,
    fontFamily: 'Courier',
  },
  stats: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  addedStat: {
    color: '#4ec9b0',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  removedStat: {
    color: '#f14c4c',
    fontSize: 14,
    fontWeight: 'bold',
  },
  diffContainer: {
    flex: 1,
  },
  unifiedContainer: {
    flex: 1,
  },
  splitContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  splitPane: {
    flex: 1,
    minWidth: 300,
  },
  splitDivider: {
    width: 1,
    backgroundColor: '#3c3c3c',
  },
  splitHeader: {
    color: '#888888',
    fontSize: 12,
    padding: 8,
    backgroundColor: '#252526',
    textAlign: 'center',
  },
  line: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 8,
    minHeight: 20,
  },
  lineNumbers: {
    flexDirection: 'row',
    marginRight: 8,
  },
  lineNumber: {
    color: '#858585',
    fontSize: 12,
    fontFamily: 'Courier',
    width: 40,
    textAlign: 'right',
  },
  linePrefix: {
    color: '#cccccc',
    fontSize: 13,
    fontFamily: 'Courier',
    width: 16,
  },
  lineContent: {
    flex: 1,
    color: '#cccccc',
    fontSize: 13,
    fontFamily: 'Courier',
  },
  addedLine: {
    backgroundColor: 'rgba(78, 201, 176, 0.2)',
  },
  removedLine: {
    backgroundColor: 'rgba(241, 76, 76, 0.2)',
  },
  headerLine: {
    backgroundColor: 'rgba(86, 156, 214, 0.2)',
  },
  addedText: {
    color: '#4ec9b0',
  },
  removedText: {
    color: '#f14c4c',
  },
  headerText: {
    color: '#569cd6',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#252526',
    borderTopWidth: 1,
    borderTopColor: '#3c3c3c',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    marginLeft: 12,
  },
  acceptButton: {
    backgroundColor: '#4ec9b0',
  },
  acceptButtonText: {
    color: '#1e1e1e',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#3c3c3c',
  },
  rejectButtonText: {
    color: '#cccccc',
    fontWeight: 'bold',
  },
});
