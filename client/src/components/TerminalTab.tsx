import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useConnectionStore } from '../store/connectionStore';
import { useTerminalSessionStore } from '../store/terminalSessionStore';
import TerminalSessionList from './terminal/TerminalSessionList';
import TerminalView from './terminal/TerminalView';
import { colors, spacing, typography, radius, animation } from '../theme';

export default function TerminalTab() {
  const { status } = useConnectionStore();
  const { activeSessionId, setActiveSession, createSession } = useTerminalSessionStore();

  const isConnected = status.ssh === 'connected' && status.ws === 'connected';

  const handleCreateSession = useCallback(() => {
    if (!isConnected) {
      Alert.alert('未连接', '请先在"我的"页面连接服务器');
      return;
    }
    createSession();
  }, [isConnected, createSession]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
  }, [setActiveSession]);

  const handleBack = useCallback(() => {
    setActiveSession(null);
  }, [setActiveSession]);

  // Show terminal view if a session is active
  if (activeSessionId) {
    return <TerminalView sessionId={activeSessionId} onBack={handleBack} />;
  }

  // Show session list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terminal</Text>
        <TouchableOpacity
          style={[styles.addButton, !isConnected && styles.addButtonDisabled]}
          onPress={handleCreateSession}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={[styles.addButtonText, !isConnected && styles.addButtonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>请先连接服务器</Text>
        </View>
      )}

      <TerminalSessionList onSelectSession={handleSelectSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
  },
  headerTitle: {
    fontSize: typography.size.title3,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontSize: 24,
    fontWeight: typography.weight.regular,
    lineHeight: 28,
  },
  addButtonTextDisabled: {
    color: colors.background.secondary,
  },
  warningBanner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  warningText: {
    color: colors.text.inverse,
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
