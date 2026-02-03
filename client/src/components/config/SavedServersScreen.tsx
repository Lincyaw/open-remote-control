import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { offlineCache } from '../../services/offlineCache';
import { ServerConfig } from '../../types';
import { colors, spacing, typography, radius, animation } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function SavedServersScreen({ navigation }: Props) {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const savedServers = await offlineCache.getServers();
      setServers(savedServers);
    } catch (error) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectServer = useCallback(async (server: ServerConfig) => {
    await offlineCache.setLastServer(server.id);
    navigation.goBack();
  }, [navigation]);

  const handleDeleteServer = useCallback((serverId: string) => {
    Alert.alert(
      '删除服务器',
      '确定要删除这个保存的配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await offlineCache.deleteServer(serverId);
            setServers(prev => prev.filter(s => s.id !== serverId));
          },
        },
      ]
    );
  }, []);

  const renderServer = useCallback(({ item }: { item: ServerConfig }) => (
    <TouchableOpacity
      style={styles.serverItem}
      onPress={() => handleSelectServer(item)}
      onLongPress={() => handleDeleteServer(item.id)}
      activeOpacity={animation.activeOpacity}
    >
      <View style={styles.serverIcon}>
        <View style={styles.serverIconInner} />
      </View>
      <View style={styles.serverInfo}>
        <Text style={styles.serverName}>{item.name}</Text>
        <Text style={styles.serverDetail}>{item.host}:{item.sshPort}</Text>
      </View>
      <Text style={styles.chevron}>{'›'}</Text>
    </TouchableOpacity>
  ), [handleSelectServer, handleDeleteServer]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {servers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无保存的服务器</Text>
          <Text style={styles.emptyHint}>在连接设置中保存服务器配置</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={servers}
            keyExtractor={item => item.id}
            renderItem={renderServer}
            contentContainerStyle={styles.list}
          />
          <Text style={styles.hint}>长按删除服务器</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  list: {
    padding: spacing.base,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  serverIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  serverIconInner: {
    width: 20,
    height: 14,
    borderWidth: 2,
    borderColor: colors.text.inverse,
    borderRadius: 2,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  serverDetail: {
    fontSize: typography.size.footnote,
    color: colors.text.tertiary,
  },
  chevron: {
    fontSize: 22,
    color: colors.text.disabled,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
