import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, typography, radius, animation } from '../theme';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

interface Props {
  tree: FileNode | null;
  currentPath: string[];
  onFileSelect: (path: string, type: 'file' | 'directory') => void;
  onBack: () => void;
}

function FileTree({ tree, currentPath, onFileSelect, onBack }: Props) {
  // Memoize current node calculation
  const { currentNode, items } = useMemo(() => {
    if (!tree) {
      return { currentNode: null, items: [] };
    }

    // Navigate to current path in tree
    let node = tree;
    for (const pathSegment of currentPath) {
      const child = node.children?.find(c => c.path === pathSegment);
      if (child && child.type === 'directory') {
        node = child;
      } else {
        break;
      }
    }

    return { currentNode: node, items: node.children || [] };
  }, [tree, currentPath]);

  const renderItem = useCallback(
    ({ item }: { item: FileNode }) => {
      const isDirectory = item.type === 'directory';
      const icon = isDirectory ? '📁' : '📄';

      return (
        <TouchableOpacity
          style={styles.item}
          onPress={() => onFileSelect(item.path, item.type)}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.itemContent}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.size !== undefined && (
              <Text style={styles.itemSize}>{formatSize(item.size)}</Text>
            )}
          </View>
          {isDirectory && <Text style={styles.chevron}>›</Text>}
        </TouchableOpacity>
      );
    },
    [onFileSelect]
  );

  const keyExtractor = useCallback((item: FileNode) => item.path, []);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: 60,
      offset: 60 * index,
      index,
    }),
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
      {/* File list */}
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
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
    paddingVertical: spacing.xs,
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
  itemSize: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
  },
  chevron: {
    fontSize: 24,
    color: colors.border.primary,
    marginLeft: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xxl + spacing.base,
  },
});
