import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, animation } from '../../theme';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: number;
  showChevron?: boolean;
  onPress: () => void;
  isLast?: boolean;
}

export default function MenuItem({
  icon,
  label,
  value,
  badge,
  showChevron = true,
  onPress,
  isLast = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={animation.activeOpacity}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={[styles.content, !isLast && styles.separator]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.right}>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          {badge != null && badge > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          ) : null}
          {showChevron ? <Text style={styles.chevron}>{'›'}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.background.primary,
    paddingLeft: spacing.base,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingRight: spacing.base,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
  },
  label: {
    fontSize: typography.size.body,
    color: colors.text.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: spacing.sm,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  chevron: {
    fontSize: 22,
    color: colors.text.disabled,
    fontWeight: typography.weight.regular,
  },
});
