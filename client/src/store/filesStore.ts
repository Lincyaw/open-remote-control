import { create } from 'zustand';

// File node in the tree
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
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
  selectedFile: string | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;

  // Git state
  viewMode: ViewMode;
  isGitRepo: boolean;
  gitFiles: GitFileStatus[];
  gitLoading: boolean;
  diffContent: string | null;
  diffFilePath: string | null;
  diffLoading: boolean;

  // Actions - Basic
  setFileTree: (tree: FileNode | null) => void;
  setSelectedFile: (path: string | null) => void;
  setCurrentPath: (path: string[]) => void;
  pushPath: (path: string) => void;
  popPath: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

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
  selectedFile: null,
  currentPath: [],
  loading: true,
  error: null,

  // Initial state - Git
  viewMode: 'normal',
  isGitRepo: false,
  gitFiles: [],
  gitLoading: false,
  diffContent: null,
  diffFilePath: null,
  diffLoading: false,

  // Actions - Basic
  setFileTree: (tree) => set({ fileTree: tree, loading: false, error: null }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setCurrentPath: (path) => set({ currentPath: path }),
  pushPath: (path) => set((state) => ({ currentPath: [...state.currentPath, path] })),
  popPath: () => set((state) => ({ currentPath: state.currentPath.slice(0, -1) })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

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
