import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSessionBrowserStore } from '../store/sessionBrowserStore';
import { wsClient } from '../services/websocket';
import { WorkspaceInfo } from '../types';
import { ClaudeStackParamList } from '../navigation/types';
import { colors, spacing, typography, radius, animation } from '../theme';

type NavigationProp = NativeStackNavigationProp<ClaudeStackParamList, 'Workspaces'>;

export default function WorkspaceList() {
  const navigation = useNavigation<NavigationProp>();
  const {
    workspaces,
    searchQuery,
    loading,
    setSearchQuery,
  } = useSessionBrowserStore();

  useEffect(() => {
    wsClient.requestWorkspaces();
    useSessionBrowserStore.getState().setLoading(true);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return workspaces;
    const q = searchQuery.toLowerCase();
    return workspaces.filter((w) => w.displayPath.toLowerCase().includes(q));
  }, [workspaces, searchQuery]);

  const handleSelect = (item: WorkspaceInfo) => {
    wsClient.requestSessions(item.dirName);
    navigation.navigate('Sessions', {
      workspaceDirName: item.dirName,
      workspaceDisplayPath: item.displayPath,
    });
  };

  const renderItem = ({ item }: { item: WorkspaceInfo }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelect(item)}
      activeOpacity={animation.activeOpacity}
    >
      <Text style={styles.path} numberOfLines={1}>
        {item.displayPath}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{item.sessionCount} sessions</Text>
        <Text style={styles.metaText}>
          {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search workspaces..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.text.disabled}
      />
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.dirName}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No workspaces found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  search: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.tertiary,
    fontSize: typography.size.body,
    color: colors.text.primary,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
  },
  path: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginTop: spacing.xxl,
    fontSize: typography.size.subheadline,
  },
});
