// Common reusable styles based on design tokens
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows, animation } from './theme';

// Screen container presets
export const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  containerSecondary: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
});

// Card styles
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  } as ViewStyle,
  cardPressed: {
    backgroundColor: colors.background.tertiary,
  },
  section: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.lg,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  } as ViewStyle,
  sectionContent: {
    padding: spacing.md,
  },
});

// Tab bar styles
export const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  } as ViewStyle,
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    backgroundColor: colors.background.tertiary,
  },
  tabText: {
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  } as TextStyle,
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  // Inner tab bar (within a screen)
  innerContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  innerTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  innerTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
});

// List item styles
export const listStyles = StyleSheet.create({
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
    backgroundColor: colors.background.primary,
  },
  itemPressed: {
    backgroundColor: colors.background.tertiary,
  },
  itemTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  } as TextStyle,
  itemSubtitle: {
    fontSize: typography.size.footnote,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  } as TextStyle,
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  } as ViewStyle,
  itemMetaText: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
  } as TextStyle,
  listContent: {
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginTop: spacing.xxl,
    fontSize: typography.size.subheadline,
  } as TextStyle,
});

// Input styles
export const inputStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.size.body,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  } as TextStyle,
  inputFocused: {
    borderColor: colors.border.focused,
  },
  search: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.tertiary,
    fontSize: typography.size.body,
    color: colors.text.primary,
  } as TextStyle,
  label: {
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  } as TextStyle,
});

// Button styles
export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  } as ViewStyle,
  primaryText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  } as TextStyle,
  secondary: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  } as ViewStyle,
  secondaryText: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  } as TextStyle,
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  // Pill button (like the Git/Files toggle)
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  pillText: {
    color: colors.text.inverse,
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
  } as TextStyle,
});

// Top bar / Header styles
export const headerStyles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  } as ViewStyle,
  topBarTitle: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  } as TextStyle,
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.primary,
  } as TextStyle,
});

// FAB (Floating Action Button) styles
export const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  } as ViewStyle,
  fabText: {
    color: colors.text.inverse,
    fontSize: typography.size.title3,
    fontWeight: typography.weight.semibold,
  } as TextStyle,
});

// Chat bubble styles
export const bubbleStyles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userBubble,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
    ...shadows.sm,
  } as ViewStyle,
  userLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: 'rgba(255,255,255,0.85)',
  } as TextStyle,
  userText: {
    color: colors.text.inverse,
    fontSize: typography.size.subheadline,
    marginTop: spacing.xs,
  } as TextStyle,
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.assistantBubble,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
  } as ViewStyle,
  assistantLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  } as TextStyle,
  toolCallBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.toolCallBubble,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  } as ViewStyle,
});

// Status indicator styles
export const statusStyles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  } as ViewStyle,
  bannerConnected: {
    backgroundColor: '#e8f5e9',
  },
  bannerDisconnected: {
    backgroundColor: '#ffebee',
  },
});

// Loading state styles
export const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  text: {
    marginTop: spacing.base,
    fontSize: typography.size.body,
    color: colors.text.secondary,
  } as TextStyle,
});

// Error state styles
export const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  text: {
    fontSize: typography.size.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  } as TextStyle,
});

// Export active opacity for consistent touch feedback
export const activeOpacity = animation.activeOpacity;
