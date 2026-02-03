import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useConnectionStore } from '../store/connectionStore';
import { colors, spacing, typography, animation } from '../theme';

interface Props {
  onPress?: () => void;
}

export default function ConnectionStatusBar({ onPress }: Props) {
  const { status, currentServer } = useConnectionStore();

  const isConnected = status.ssh === 'connected' && status.ws === 'connected';

  const getStatusColor = () => {
    if (isConnected) return colors.success;
    return colors.error;
  };

  const getStatusText = () => {
    if (!currentServer) return '未连接';
    if (isConnected) {
      return `已连接 · ${currentServer.host}`;
    }
    return '未连接';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? animation.activeOpacity : 1}
    >
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.statusText} numberOfLines={1}>{getStatusText()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.size.footnote,
    color: colors.text.tertiary,
    flex: 1,
  },
});
