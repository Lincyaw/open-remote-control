// Renote Design System - WCAG AA Compliant
// Based on iOS Human Interface Guidelines

export const colors = {
  primary: '#0A84FF',
  primaryLight: '#E8F2FF',

  text: {
    primary: '#1C1C1E',       // 15.4:1 contrast
    secondary: '#48484A',     // 7.5:1 contrast
    tertiary: '#636366',      // 4.6:1 contrast (AA minimum)
    disabled: '#AEAEB2',
    inverse: '#FFFFFF',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',     // iOS grouped background
    tertiary: '#E5E5EA',
    elevated: '#FFFFFF',
  },

  border: {
    primary: '#C7C7CC',
    secondary: '#E5E5EA',
    focused: '#0A84FF',
  },

  // Semantic colors
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
  info: '#0A84FF',

  // Chat bubbles
  userBubble: '#0A84FF',
  assistantBubble: '#E5E5EA',
  toolCallBubble: '#E8F2FF',

  // Code / Terminal
  codeBg: '#1C1C1E',
  codeFg: '#D1D1D6',
};

// 8px grid spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

// Typography system
export const typography = {
  size: {
    caption: 12,
    footnote: 13,
    subheadline: 15,
    body: 16,
    headline: 17,
    title3: 20,
    title2: 22,
    title1: 28,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Border radius
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

// Shadow system (3 levels)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animation constants
export const animation = {
  fast: 150,
  normal: 250,
  activeOpacity: 0.7,
};
