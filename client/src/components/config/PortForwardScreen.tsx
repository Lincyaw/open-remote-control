import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useConnectionStore } from '../../store/connectionStore';
import { usePortForwardStore } from '../../store/portForwardStore';
import { sshService } from '../../services/ssh';
import { colors, spacing, typography, radius, animation } from '../../theme';

export default function PortForwardScreen() {
  const [newLocalPort, setNewLocalPort] = useState('');
  const [newRemoteHost, setNewRemoteHost] = useState('');
  const [newRemotePort, setNewRemotePort] = useState('');
  const [isAddingForward, setIsAddingForward] = useState(false);

  const { status } = useConnectionStore();
  const { forwards, addForward, removeForward, updateStatus } = usePortForwardStore();

  const isConnected = status.ssh === 'connected' && status.ws === 'connected';

  const getStatusColor = (forwardStatus: 'active' | 'stopped' | 'error') => {
    switch (forwardStatus) {
      case 'active': return colors.success;
      case 'stopped': return colors.text.tertiary;
      case 'error': return colors.error;
    }
  };

  const handleAddPortForward = async () => {
    const local = parseInt(newLocalPort, 10);
    const remote = parseInt(newRemotePort, 10);
    const remoteHostValue = newRemoteHost || 'localhost';

    if (isNaN(local) || isNaN(remote)) {
      Alert.alert('错误', '请输入有效的端口号');
      return;
    }

    if (local < 1 || local > 65535 || remote < 1 || remote > 65535) {
      Alert.alert('错误', '端口号必须在 1-65535 之间');
      return;
    }

    if (!isConnected) {
      Alert.alert('错误', '请先连接服务器');
      return;
    }

    setIsAddingForward(true);
    try {
      await sshService.setupPortForward(local, remoteHostValue, remote);
      addForward({ localPort: local, remoteHost: remoteHostValue, remotePort: remote });
      setNewLocalPort('');
      setNewRemotePort('');
      setNewRemoteHost('');
    } catch (error: any) {
      Alert.alert('错误', error.message || '创建端口转发失败');
    } finally {
      setIsAddingForward(false);
    }
  };

  const handleStopPortForward = async (id: string, port: number) => {
    try {
      await sshService.stopPortForward(port);
      updateStatus(id, 'stopped');
    } catch (error) {
      updateStatus(id, 'error');
      Alert.alert('错误', `停止端口转发失败: ${error}`);
    }
  };

  const handleOpenPortForward = (port: number) => {
    Linking.openURL(`http://localhost:${port}`);
  };

  const renderForward = ({ item }: { item: typeof forwards[0] }) => (
    <View style={styles.forwardItem}>
      <View style={styles.forwardInfo}>
        <View style={[styles.forwardDot, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={styles.forwardText}>
          :{item.localPort} → {item.remoteHost}:{item.remotePort}
        </Text>
      </View>
      <View style={styles.forwardActions}>
        {item.status === 'active' ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.openButton]}
              onPress={() => handleOpenPortForward(item.localPort)}
              activeOpacity={animation.activeOpacity}
            >
              <Text style={styles.actionButtonText}>打开</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.stopButton]}
              onPress={() => handleStopPortForward(item.id, item.localPort)}
              activeOpacity={animation.activeOpacity}
            >
              <Text style={styles.actionButtonText}>停止</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => removeForward(item.id)}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.actionButtonText}>移除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Active forwards list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>活跃转发</Text>
        {forwards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无端口转发</Text>
          </View>
        ) : (
          <FlatList
            data={forwards}
            keyExtractor={item => item.id}
            renderItem={renderForward}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Add new forward */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>添加端口转发</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.portInput]}
              placeholder="本地端口"
              value={newLocalPort}
              onChangeText={setNewLocalPort}
              keyboardType="numeric"
              placeholderTextColor={colors.text.disabled}
            />
            <Text style={styles.arrow}>→</Text>
            <TextInput
              style={[styles.input, styles.hostInput]}
              placeholder="远程主机"
              value={newRemoteHost}
              onChangeText={setNewRemoteHost}
              autoCapitalize="none"
              placeholderTextColor={colors.text.disabled}
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              style={[styles.input, styles.portInput]}
              placeholder="端口"
              value={newRemotePort}
              onChangeText={setNewRemotePort}
              keyboardType="numeric"
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, (!isConnected || isAddingForward) && styles.buttonDisabled]}
            onPress={handleAddPortForward}
            disabled={!isConnected || isAddingForward}
            activeOpacity={animation.activeOpacity}
          >
            {isAddingForward ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.addButtonText}>
                {isConnected ? '添加转发' : '请先连接服务器'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: spacing.base,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  emptyContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
  },
  forwardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  forwardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forwardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  forwardText: {
    fontSize: typography.size.footnote,
    fontFamily: 'monospace',
    color: colors.text.primary,
  },
  forwardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  openButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: colors.warning,
  },
  removeButton: {
    backgroundColor: colors.text.tertiary,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.size.body,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  portInput: {
    width: 80,
    textAlign: 'center',
  },
  hostInput: {
    flex: 1,
  },
  arrow: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },
  colon: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
