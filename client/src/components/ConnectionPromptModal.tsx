import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useConnectionStore } from '../store/connectionStore';
import { sshService } from '../services/ssh';
import { wsClient } from '../services/websocket';
import { offlineCache } from '../services/offlineCache';
import { ServerConfig } from '../types';
import { colors, spacing, typography, radius, animation } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  serverConfig: ServerConfig | null;
}

export default function ConnectionPromptModal({ visible, onClose, serverConfig }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setServer, setConnectionParams, status } = useConnectionStore();

  const handleConnect = async () => {
    if (!serverConfig) return;

    setIsConnecting(true);
    setError(null);

    try {
      wsClient.connect(serverConfig.host, serverConfig.wsPort, serverConfig.wsToken);
      await wsClient.waitForConnection(10000);

      await sshService.connect(
        serverConfig.host,
        serverConfig.sshPort,
        serverConfig.sshUsername,
        { password: serverConfig.sshPassword }
      );

      await offlineCache.setLastServer(serverConfig.id);

      setConnectionParams({
        host: serverConfig.host,
        port: serverConfig.wsPort,
        token: serverConfig.wsToken,
      });

      setServer(serverConfig);
      onClose();
    } catch (err: any) {
      setError(err.message || '连接失败');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!serverConfig) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>检测到未连接</Text>

          <View style={styles.serverInfo}>
            <Text style={styles.serverName}>{serverConfig.name}</Text>
            <Text style={styles.serverDetail}>
              {serverConfig.host}:{serverConfig.sshPort}
            </Text>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={animation.activeOpacity}
              disabled={isConnecting}
            >
              <Text style={styles.cancelButtonText}>稍后</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.connectButton, isConnecting && styles.buttonDisabled]}
              onPress={handleConnect}
              activeOpacity={animation.activeOpacity}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.connectButtonText}>立即连接</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  serverInfo: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  serverName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  serverDetail: {
    fontSize: typography.size.footnote,
    color: colors.text.tertiary,
  },
  errorText: {
    fontSize: typography.size.footnote,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  connectButton: {
    backgroundColor: colors.primary,
  },
  connectButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
