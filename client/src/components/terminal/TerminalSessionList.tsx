import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { TerminalSession, useTerminalSessionStore } from '../../store/terminalSessionStore';
import { sshService } from '../../services/ssh';
import { colors, spacing, typography, radius, animation } from '../../theme';

interface TerminalSessionListProps {
  onSelectSession: (sessionId: string) => void;
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

function getStatusText(status: TerminalSession['status']): string {
  switch (status) {
    case 'active': return '运行中';
    case 'connecting': return '连接中...';
    case 'closed': return '已关闭';
    case 'error': return '错误';
  }
}

function getStatusColor(status: TerminalSession['status']): string {
  switch (status) {
    case 'active': return colors.success;
    case 'connecting': return colors.warning;
    case 'closed': return colors.text.tertiary;
    case 'error': return colors.error;
  }
}

export default function TerminalSessionList({ onSelectSession }: TerminalSessionListProps) {
  const { sessions, removeSession } = useTerminalSessionStore();

  const handleDeleteSession = useCallback((session: TerminalSession) => {
    Alert.alert(
      '删除终端',
      `确定要删除 "${session.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            sshService.closeShell(session.id);
            removeSession(session.id);
          },
        },
      ]
    );
  }, [removeSession]);

  const renderSession = useCallback(({ item }: { item: TerminalSession }) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => onSelectSession(item.id)}
      onLongPress={() => handleDeleteSession(item)}
      activeOpacity={animation.activeOpacity}
    >
      <View style={styles.sessionIcon}>
        <View style={styles.terminalIconBox}>
          <Text style={styles.terminalIconCursor}>{'>_'}</Text>
        </View>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <View style={styles.sessionStatus}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.timeText}>{formatTime(item.lastActiveAt)}</Text>
    </TouchableOpacity>
  ), [onSelectSession, handleDeleteSession]);

  // Sort sessions by lastActiveAt (most recent first)
  const sortedSessions = [...sessions].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <View style={styles.emptyTerminalBox}>
            <Text style={styles.emptyTerminalCursor}>{'>_'}</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>暂无终端会话</Text>
        <Text style={styles.emptyHint}>点击右上角 + 创建新终端</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sortedSessions}
      keyExtractor={item => item.id}
      renderItem={renderSession}
      contentContainerStyle={styles.list}
      ListFooterComponent={
        <Text style={styles.hint}>长按删除终端</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.codeBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  terminalIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalIconCursor: {
    color: colors.success,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: typography.weight.bold,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.size.footnote,
    color: colors.text.tertiary,
  },
  timeText: {
    fontSize: typography.size.footnote,
    color: colors.text.disabled,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.codeBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTerminalBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTerminalCursor: {
    color: colors.text.tertiary,
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: typography.weight.bold,
  },
  emptyText: {
    fontSize: typography.size.headline,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  hint: {
    fontSize: typography.size.footnote,
    color: colors.text.disabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
