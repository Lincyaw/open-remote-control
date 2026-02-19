import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GitFileStatus } from '../store/filesStore';
import { colors, spacing, typography, radius, animation } from '../theme';

const STATUS_CONFIG: Record<GitFileStatus['status'], { icon: string; label: string; color: string }> = {
  modified: { icon: 'M', label: 'modified', color: '#e2a731' },
  added: { icon: 'A', label: 'added', color: '#3fb950' },
  deleted: { icon: 'D', label: 'deleted', color: '#f85149' },
  untracked: { icon: '?', label: 'untracked', color: '#8b949e' },
  renamed: { icon: 'R', label: 'renamed', color: '#d2a8ff' },
};

interface Props {
  files: GitFileStatus[];
  loading: boolean;
  onFilePress: (file: GitFileStatus) => void;
  onRefresh: () => void;
}

function GitFileList({ files, loading, onFilePress, onRefresh }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: GitFileStatus }) => {
      const config = STATUS_CONFIG[item.status];
      const fileName = item.path.split('/').pop() || item.path;
      const dirPath = item.path.includes('/')
        ? item.path.slice(0, item.path.lastIndexOf('/'))
        : '';

      return (
        <TouchableOpacity
          style={styles.item}
          onPress={() => onFilePress(item)}
          activeOpacity={animation.activeOpacity}
        >
          <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.statusIcon, { color: config.color }]}>{config.icon}</Text>
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
            </Text>
            {dirPath ? (
              <Text style={styles.dirPath} numberOfLines={1}>
                {dirPath}
              </Text>
            ) : null}
          </View>
          <View style={styles.statusRight}>
            <Text style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </Text>
            {item.staged && (
              <Text style={styles.stagedLabel}>staged</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [onFilePress]
  );

  const keyExtractor = useCallback((item: GitFileStatus) => item.path, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading changes...</Text>
      </View>
    );
  }

  if (files.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>✓</Text>
        <Text style={styles.emptyText}>No changes</Text>
        <Text style={styles.emptySubtext}>Working tree is clean</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {files.length} changed file{files.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={onRefresh} activeOpacity={animation.activeOpacity}>
          <Text style={styles.refreshLink}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={files}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

export default memo(GitFileList);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  summaryText: {
    fontSize: typography.size.footnote,
    color: colors.text.secondary,
  },
  refreshLink: {
    fontSize: typography.size.footnote,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: 60,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusIcon: {
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.bold,
    fontFamily: 'Menlo',
  },
  itemContent: {
    flex: 1,
  },
  fileName: {
    fontSize: typography.size.body,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xs,
  },
  dirPath: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
  },
  statusRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  statusLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  stagedLabel: {
    fontSize: 10,
    color: colors.success,
    marginTop: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.body,
    color: colors.text.secondary,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.success,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  refreshButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  refreshButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.semibold,
  },
});
