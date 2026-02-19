import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, animation } from '../theme';
import { useFilesStore, FileNode } from '../store/filesStore';
import { wsClient } from '../services/websocket';

interface Props {
  tree: FileNode | null;
  currentPath: string[];
  onFileSelect: (path: string, type: 'file' | 'directory') => void;
  onBack?: () => void; // Optional: kept for API compatibility
}

function FileTree({ tree, currentPath, onFileSelect }: Props) {
  const expandedDirs = useFilesStore((s) => s.expandedDirs);
  const loadingDirs = useFilesStore((s) => s.loadingDirs);
  const rootPath = useFilesStore((s) => s.rootPath);

  // Navigate to current path in tree
  const { items } = useMemo(() => {
    if (!tree) {
      return { items: [] };
    }

    let node = tree;
    for (const pathSegment of currentPath) {
      const child = node.children?.find(c => c.path === pathSegment);
      if (child && child.type === 'directory') {
        node = child;
      } else {
        break;
      }
    }

    // Build flat list: expanded directories show their children with indentation
    const flatItems: Array<FileNode & { depth: number }> = [];

    const addItems = (nodes: FileNode[], depth: number) => {
      for (const item of nodes) {
        flatItems.push({ ...item, depth });
        if (
          item.type === 'directory' &&
          item.children &&
          expandedDirs.has(item.path)
        ) {
          addItems(item.children, depth + 1);
        }
      }
    };

    addItems(node.children || [], 0);
    return { items: flatItems };
  }, [tree, currentPath, expandedDirs]);

  const handleDirPress = useCallback(
    (item: FileNode) => {
      const store = useFilesStore.getState();
      const isExpanded = store.expandedDirs.has(item.path);

      if (isExpanded) {
        // Collapse: clear subtree to free memory
        store.clearSubtree(item.path);
      } else if (item.children && item.children.length > 0) {
        // Already have children loaded, just expand
        store.setExpandedDir(item.path, true);
      } else if (item.hasChildren !== false && !item.accessDenied) {
        // Need to lazy load children
        wsClient.requestExpandDirectory(item.path, rootPath || undefined);
      }
    },
    [rootPath]
  );

  const renderItem = useCallback(
    ({ item }: { item: FileNode & { depth: number } }) => {
      const isDirectory = item.type === 'directory';
      const isExpanded = expandedDirs.has(item.path);
      const isLoading = loadingDirs.has(item.path);

      let icon: string;
      if (item.accessDenied) {
        icon = '🔒';
      } else if (isDirectory) {
        icon = isExpanded ? '📂' : '📁';
      } else {
        icon = '📄';
      }

      const showChevron =
        isDirectory && !item.accessDenied && item.hasChildren !== false;

      return (
        <TouchableOpacity
          style={[styles.item, { paddingLeft: spacing.base + item.depth * 20 }]}
          onPress={() => {
            if (isDirectory) {
              handleDirPress(item);
            } else {
              onFileSelect(item.path, item.type);
            }
          }}
          activeOpacity={animation.activeOpacity}
          disabled={item.accessDenied}
        >
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.itemContent}>
            <Text
              style={[
                styles.itemName,
                item.accessDenied && styles.itemNameDenied,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.size !== undefined && (
              <Text style={styles.itemSize}>{formatSize(item.size)}</Text>
            )}
            {item.accessDenied && (
              <Text style={styles.accessDeniedText}>Permission denied</Text>
            )}
          </View>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={colors.text.secondary}
              style={styles.loadingIndicator}
            />
          )}
          {showChevron && !isLoading && (
            <Text style={styles.chevron}>{isExpanded ? '∨' : '›'}</Text>
          )}
        </TouchableOpacity>
      );
    },
    [onFileSelect, handleDirPress, expandedDirs, loadingDirs]
  );

  const keyExtractor = useCallback(
    (item: FileNode & { depth: number }) => `${item.path}-${item.depth}`,
    []
  );

  if (!tree) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No files found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
      />
    </View>
  );
}

export default memo(FileTree);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
  headerText: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: 60,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.size.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemNameDenied: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  itemSize: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
  },
  accessDeniedText: {
    fontSize: typography.size.caption,
    color: colors.error,
  },
  chevron: {
    fontSize: 24,
    color: colors.border.primary,
    marginLeft: spacing.md,
  },
  loadingIndicator: {
    marginLeft: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xxl + spacing.base,
  },
});
