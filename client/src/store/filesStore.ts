import { create } from 'zustand';

// File node in the tree
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  hasChildren?: boolean;      // 是否有子节点（用于懒加载）
  accessDenied?: boolean;     // 权限被拒绝标记
}

// Git file status
export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
  oldPath?: string; // For renamed files
}

type ViewMode = 'normal' | 'git';

interface FilesState {
  // Basic state
  fileTree: FileNode | null;
  rootPath: string | null;       // Root path of the file tree
  selectedFile: string | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;

  // Lazy loading state
  expandedDirs: Set<string>;     // 已展开的目录
  loadingDirs: Set<string>;      // 正在加载的目录
  truncated: boolean;            // 树是否被截断
  accessErrors: string[];        // 权限错误列表

  // Git state
  viewMode: ViewMode;
  isGitRepo: boolean;
  gitFiles: GitFileStatus[];
  gitLoading: boolean;
  diffContent: string | null;
  diffFilePath: string | null;
  diffLoading: boolean;

  // Actions - Basic
  setFileTree: (tree: FileNode | null, rootPath?: string, truncated?: boolean, accessErrors?: string[]) => void;
  setSelectedFile: (path: string | null) => void;
  setCurrentPath: (path: string[]) => void;
  pushPath: (path: string) => void;
  popPath: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Lazy loading
  setExpandedDir: (path: string, expanded: boolean) => void;
  setLoadingDir: (path: string, loading: boolean) => void;
  setDirectoryChildren: (path: string, children: FileNode[], hasChildren?: boolean) => void;
  setTruncated: (truncated: boolean) => void;
  addAccessErrors: (errors: string[]) => void;
  clearSubtree: (path: string) => void;

  // Actions - Git
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setIsGitRepo: (isGit: boolean) => void;
  setGitFiles: (files: GitFileStatus[]) => void;
  setGitLoading: (loading: boolean) => void;
  setDiffContent: (content: string | null, filePath: string | null) => void;
  setDiffLoading: (loading: boolean) => void;
  clearDiff: () => void;

  // Combined actions
  canGoBack: () => boolean;
  goBack: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  // Initial state - Basic
  fileTree: null,
  rootPath: null,
  selectedFile: null,
  currentPath: [],
  loading: true,
  error: null,

  // Initial state - Lazy loading
  expandedDirs: new Set<string>(),
  loadingDirs: new Set<string>(),
  truncated: false,
  accessErrors: [],

  // Initial state - Git
  viewMode: 'normal',
  isGitRepo: false,
  gitFiles: [],
  gitLoading: false,
  diffContent: null,
  diffFilePath: null,
  diffLoading: false,

  // Actions - Basic
  setFileTree: (tree, rootPath, truncated = false, accessErrors = []) => set({
    fileTree: tree,
    rootPath: rootPath ?? null,
    truncated,
    accessErrors,
    loading: false,
    error: null,
    expandedDirs: new Set<string>(), // Reset expanded dirs on new tree
    loadingDirs: new Set<string>(),
  }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setCurrentPath: (path) => set({ currentPath: path }),
  pushPath: (path) => set((state) => ({ currentPath: [...state.currentPath, path] })),
  popPath: () => set((state) => ({ currentPath: state.currentPath.slice(0, -1) })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  // Actions - Lazy loading
  setExpandedDir: (path, expanded) => set((state) => {
    const newSet = new Set(state.expandedDirs);
    if (expanded) {
      newSet.add(path);
    } else {
      newSet.delete(path);
    }
    return { expandedDirs: newSet };
  }),
  setLoadingDir: (path, loading) => set((state) => {
    const newSet = new Set(state.loadingDirs);
    if (loading) {
      newSet.add(path);
    } else {
      newSet.delete(path);
    }
    return { loadingDirs: newSet };
  }),
  setDirectoryChildren: (path, children, hasChildren) => set((state) => {
    if (!state.fileTree) return state;

    // Helper function to recursively update the tree
    const updateNode = (node: FileNode): FileNode => {
      if (node.path === path) {
        return {
          ...node,
          children,
          hasChildren: hasChildren ?? (children.length > 0),
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNode),
        };
      }
      return node;
    };

    return { fileTree: updateNode(state.fileTree) };
  }),
  setTruncated: (truncated) => set({ truncated }),
  addAccessErrors: (errors) => set((state) => ({
    accessErrors: [...new Set([...state.accessErrors, ...errors])],
  })),
  clearSubtree: (path) => set((state) => {
    if (!state.fileTree) return state;

    // Helper function to clear children of a specific node
    const clearNode = (node: FileNode): FileNode => {
      if (node.path === path) {
        return {
          ...node,
          children: undefined,
          hasChildren: true, // Mark that it had children
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(clearNode),
        };
      }
      return node;
    };

    // Remove from expanded dirs
    const newExpandedDirs = new Set(state.expandedDirs);
    newExpandedDirs.delete(path);

    return {
      fileTree: clearNode(state.fileTree),
      expandedDirs: newExpandedDirs,
    };
  }),

  // Actions - Git
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () => set((state) => ({
    viewMode: state.viewMode === 'normal' ? 'git' : 'normal',
    // Clear diff when switching modes
    diffContent: null,
    diffFilePath: null,
  })),
  setIsGitRepo: (isGit) => set({ isGitRepo: isGit }),
  setGitFiles: (files) => set({ gitFiles: files, gitLoading: false }),
  setGitLoading: (loading) => set({ gitLoading: loading }),
  setDiffContent: (content, filePath) => set({
    diffContent: content,
    diffFilePath: filePath,
    diffLoading: false,
  }),
  setDiffLoading: (loading) => set({ diffLoading: loading }),
  clearDiff: () => set({ diffContent: null, diffFilePath: null }),

  // Combined actions
  canGoBack: () => {
    const state = get();
    // In Git mode viewing diff
    if (state.viewMode === 'git' && state.diffFilePath) {
      return true;
    }
    // In normal mode viewing file
    if (state.selectedFile) {
      return true;
    }
    // In normal mode in subdirectory
    if (state.currentPath.length > 0) {
      return true;
    }
    return false;
  },
  goBack: () => {
    const state = get();

    // In Git mode viewing diff, go back to file list
    if (state.viewMode === 'git' && state.diffFilePath) {
      set({ diffContent: null, diffFilePath: null });
      return;
    }

    // In normal mode viewing file, go back to tree
    if (state.selectedFile) {
      set({ selectedFile: null });
      return;
    }

    // In normal mode in subdirectory, go up one level
    if (state.currentPath.length > 0) {
      set({ currentPath: state.currentPath.slice(0, -1) });
      return;
    }
  },
}));
