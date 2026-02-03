import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useConnectionStore } from '../../store/connectionStore';
import { sshService } from '../../services/ssh';
import { wsClient } from '../../services/websocket';
import { offlineCache } from '../../services/offlineCache';
import { ServerConfig } from '../../types';
import { colors, spacing, typography, radius, animation } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ConnectionSettingsScreen({ navigation }: Props) {
  const [host, setHost] = useState('10.10.10.146');
  const [sshPort, setSshPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [wsPort, setWsPort] = useState('8080');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { setServer, setConnectionParams, status, disconnect } = useConnectionStore();
  const isConnected = status.ssh === 'connected' && status.ws === 'connected';

  useEffect(() => {
    loadLastServer();
  }, []);

  const loadLastServer = async () => {
    try {
      const lastServer = await offlineCache.getLastServer();
      if (lastServer) {
        setHost(lastServer.host);
        setSshPort(lastServer.sshPort.toString());
        setUsername(lastServer.sshUsername);
        setPassword(lastServer.sshPassword || '');
        setWsPort(lastServer.wsPort.toString());
        setToken(lastServer.wsToken);
      }
    } catch (error) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const buildServerConfig = (): ServerConfig => {
    const id = `${host}:${username}`;
    return {
      id,
      name: `${username}@${host}`,
      host,
      sshPort: parseInt(sshPort),
      sshUsername: username,
      sshPassword: password || undefined,
      wsPort: parseInt(wsPort),
      wsToken: token,
    };
  };

  const handleSave = async () => {
    if (!host || !username) {
      Alert.alert('错误', '请填写主机和用户名');
      return;
    }

    const serverConfig = buildServerConfig();
    await offlineCache.saveServer(serverConfig);
    Alert.alert('已保存', '配置保存成功');
  };

  const handleConnect = async () => {
    if (!host || !username) {
      Alert.alert('错误', '请填写主机和用户名');
      return;
    }

    setIsConnecting(true);

    try {
      wsClient.connect(host, parseInt(wsPort), token);
      await wsClient.waitForConnection(10000);

      await sshService.connect(host, parseInt(sshPort), username, { password });

      const serverConfig = buildServerConfig();
      await offlineCache.saveServer(serverConfig);
      await offlineCache.setLastServer(serverConfig.id);

      setConnectionParams({
        host,
        port: parseInt(wsPort),
        token,
      });

      setServer(serverConfig);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('连接失败', error.message || '未知错误');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    wsClient.disconnect();
    sshService.disconnect();
    disconnect();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>主机</Text>
          <TextInput
            style={styles.input}
            placeholder="10.10.10.146"
            value={host}
            onChangeText={setHost}
            autoCapitalize="none"
            editable={!isConnected}
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>SSH 端口</Text>
            <TextInput
              style={styles.input}
              placeholder="22"
              value={sshPort}
              onChangeText={setSshPort}
              keyboardType="numeric"
              editable={!isConnected}
              placeholderTextColor={colors.text.disabled}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.md }]}>
            <Text style={styles.label}>WS 端口</Text>
            <TextInput
              style={styles.input}
              placeholder="8080"
              value={wsPort}
              onChangeText={setWsPort}
              keyboardType="numeric"
              editable={!isConnected}
              placeholderTextColor={colors.text.disabled}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>用户名</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isConnected}
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="(可选)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isConnected}
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>认证令牌</Text>
          <TextInput
            style={styles.input}
            placeholder="WebSocket 令牌"
            value={token}
            onChangeText={setToken}
            secureTextEntry
            editable={!isConnected}
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!isConnected ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={animation.activeOpacity}
            >
              <Text style={styles.saveButtonText}>保存配置</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.connectButton, isConnecting && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={isConnecting}
              activeOpacity={animation.activeOpacity}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.connectButtonText}>连接</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.disconnectButton]}
            onPress={handleDisconnect}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.disconnectButtonText}>断开连接</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
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
  buttonContainer: {
    gap: spacing.md,
  },
  button: {
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  connectButton: {
    backgroundColor: colors.primary,
  },
  connectButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  disconnectButton: {
    backgroundColor: colors.error,
  },
  disconnectButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
