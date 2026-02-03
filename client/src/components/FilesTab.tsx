import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { wsClient } from '../services/websocket';
import { useFilesStore, GitFileStatus } from '../store/filesStore';
import FileTree from './FileTree';
import FileViewer from './FileViewer';
import GitFileList from './GitFileList';
import GitDiffViewer from './GitDiffViewer';
import { colors, spacing, typography, radius, animation } from '../theme';

export default function FilesTab() {
  const {
    fileTree,
    selectedFile,
    currentPath,
    loading,
    error,
    viewMode,
    isGitRepo,
    gitFiles,
    gitLoading,
    diffContent,
    diffFilePath,
    diffLoading,
    setSelectedFile,
    pushPath,
    goBack,
    toggleViewMode,
    clearDiff,
  } = useFilesStore();

  // Load file tree and check git repo on first mount
  useEffect(() => {
    if (!fileTree) {
      loadFileTree();
    }
    // Check if this is a git repo
    wsClient.requestGitCheckRepo();
  }, []);

  const loadFileTree = () => {
    wsClient.requestFileTree();
  };

  const handleFileSelect = useCallback((path: string, type: 'file' | 'directory') => {
    if (type === 'file') {
      setSelectedFile(path);
    } else {
      pushPath(path);
    }
  }, [setSelectedFile, pushPath]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  // Git mode: request status when switching to git mode
  const handleToggleMode = useCallback(() => {
    const nextMode = viewMode === 'normal' ? 'git' : 'normal';
    toggleViewMode();
    if (nextMode === 'git') {
      wsClient.requestGitStatus();
    }
  }, [viewMode, toggleViewMode]);

  // Git mode: handle file press to show diff
  const handleGitFilePress = useCallback((file: GitFileStatus) => {
    wsClient.requestFileDiff(file.path, file.staged);
  }, []);

  // Git mode: refresh status
  const handleGitRefresh = useCallback(() => {
    wsClient.requestGitStatus();
  }, []);

  // Render mode toggle button
  const renderModeToggle = () => {
    if (!isGitRepo) return null;

    return (
      <TouchableOpacity
        style={styles.modeToggle}
        onPress={handleToggleMode}
        activeOpacity={animation.activeOpacity}
      >
        <Text style={styles.modeToggleText}>
          {viewMode === 'normal' ? 'Git' : 'Files'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Loading state (only for initial file tree load)
  if (loading && viewMode === 'normal') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading files...</Text>
      </View>
    );
  }

  // Error state
  if (error && viewMode === 'normal') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Git mode: viewing diff
  if (viewMode === 'git' && diffFilePath) {
    return (
      <GitDiffViewer
        filePath={diffFilePath}
        diff={diffContent}
        loading={diffLoading}
        onBack={handleBack}
      />
    );
  }

  // Normal mode: viewing file content
  if (viewMode === 'normal' && selectedFile) {
    return (
      <FileViewer
        filePath={selectedFile}
        onBack={handleBack}
      />
    );
  }

  // Git mode: show changed files list
  if (viewMode === 'git') {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Git Changes</Text>
          {renderModeToggle()}
        </View>
        <GitFileList
          files={gitFiles}
          loading={gitLoading}
          onFilePress={handleGitFilePress}
          onRefresh={handleGitRefresh}
        />
      </View>
    );
  }

  // Normal mode: show file tree
  return (
    <View style={styles.container}>
      {currentPath.length === 0 && (
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Files</Text>
          {renderModeToggle()}
        </View>
      )}
      <FileTree
        tree={fileTree}
        currentPath={currentPath}
        onFileSelect={handleFileSelect}
        onBack={handleBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.body,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.body,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  topBarTitle: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modeToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  modeToggleText: {
    color: colors.text.inverse,
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
  },
});
