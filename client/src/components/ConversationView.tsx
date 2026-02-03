import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { useSessionBrowserStore } from '../store/sessionBrowserStore';
import { wsClient } from '../services/websocket';
import { SessionMessage, SubagentInfo } from '../types';
import { ConversationScreenProps, ClaudeStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius, shadows, animation } from '../theme';

// Check if content looks like JSON
function isJsonContent(content: string): boolean {
  const trimmed = content.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function ToolCallItem({
  item,
  toolResult,
  onPress,
}: {
  item: SessionMessage;
  toolResult?: SessionMessage;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.toolCallBubble}
      onPress={onPress}
      activeOpacity={animation.activeOpacity}
    >
      <View style={styles.toolCallHeader}>
        <Text style={styles.toolCallIcon}>{'>'}_</Text>
        <Text style={styles.toolCallName}>{item.toolName || 'Tool'}</Text>
        <Text style={styles.toolCallArrow}>{'>'}</Text>
      </View>
      {toolResult && (
        <Text style={styles.toolCallResult} numberOfLines={1}>
          {toolResult.content.substring(0, 50)}...
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MessageItem({
  item,
  allMessages,
  onToolPress,
}: {
  item: SessionMessage;
  allMessages: SessionMessage[];
  onToolPress: (toolUse: SessionMessage, toolResult?: SessionMessage) => void;
}) {
  if (item.type === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.userLabel}>User</Text>
        <Text style={styles.userText}>{item.content}</Text>
      </View>
    );
  }

  if (item.type === 'assistant') {
    const isJson = isJsonContent(item.content);
    return (
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantLabel}>Assistant</Text>
        {isJson ? (
          <Text style={styles.jsonText}>{item.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        )}
      </View>
    );
  }

  if (item.type === 'tool_use') {
    // Find matching tool_result
    const toolResult = allMessages.find(
      m => m.type === 'tool_result' && m.uuid.includes(item.uuid.replace('_tool', ''))
    );
    return (
      <ToolCallItem
        item={item}
        toolResult={toolResult}
        onPress={() => onToolPress(item, toolResult)}
      />
    );
  }

  return null;
}

function SubagentItem({
  item,
  onPress,
}: {
  item: SubagentInfo;
  onPress: (agentId: string) => void;
}) {
  const truncatedPrompt = item.firstPrompt.length > 100
    ? item.firstPrompt.substring(0, 100) + '...'
    : item.firstPrompt;

  return (
    <TouchableOpacity
      style={styles.subagentItem}
      onPress={() => onPress(item.agentId)}
      activeOpacity={animation.activeOpacity}
    >
      <View style={styles.subagentHeader}>
        <Text style={styles.subagentSlug}>{item.slug || item.agentId}</Text>
        <Text style={styles.subagentMeta}>{item.messageCount} msgs</Text>
      </View>
      <Text style={styles.subagentPrompt} numberOfLines={2}>
        {truncatedPrompt}
      </Text>
    </TouchableOpacity>
  );
}

const PAGE_SIZE = 50;

export default function ConversationView() {
  const navigation = useNavigation<NativeStackNavigationProp<ClaudeStackParamList, 'Conversation'>>();
  const route = useRoute<ConversationScreenProps['route']>();
  const { workspaceDirName, sessionId } = route.params;

  const {
    messages,
    loading,
    subagents,
    sessionFolderInfo,
    hasMoreMessages,
    oldestMessageIndex,
    loadingMore,
  } = useSessionBrowserStore();
  const flatListRef = useRef<FlatList<SessionMessage>>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'subagents'>('messages');

  // Request subagents and session folder info when session is selected
  // Note: Initial messages are already requested by SessionList before navigation
  useEffect(() => {
    wsClient.requestSubagents(workspaceDirName, sessionId);
    wsClient.requestSessionFolderInfo(workspaceDirName, sessionId);
  }, [workspaceDirName, sessionId]);

  // Filter to show user, assistant, and tool_use messages (but not tool_result)
  const filteredMessages = useMemo(
    () => messages.filter(m => m.type === 'user' || m.type === 'assistant' || m.type === 'tool_use'),
    [messages]
  );

  // Inverted FlatList needs data in reverse order (newest first)
  const invertedData = useMemo(
    () => [...filteredMessages].reverse(),
    [filteredMessages]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMoreMessages || loadingMore || loading) return;
    useSessionBrowserStore.getState().setLoadingMore(true);
    wsClient.requestSessionMessagesPage(workspaceDirName, sessionId, PAGE_SIZE, oldestMessageIndex);
  }, [hasMoreMessages, loadingMore, loading, workspaceDirName, sessionId, oldestMessageIndex]);

  const handleGoBack = useCallback(() => {
    wsClient.unwatchSession();
    navigation.goBack();
  }, [navigation]);

  const handleSubagentPress = useCallback(
    (agentId: string) => {
      wsClient.requestSubagentMessages(workspaceDirName, sessionId, agentId);
      navigation.navigate('Subagent', { workspaceDirName, sessionId, agentId });
    },
    [workspaceDirName, sessionId, navigation]
  );

  const handleToolPress = useCallback(
    (toolUse: SessionMessage, toolResult?: SessionMessage) => {
      navigation.navigate('ToolDetail', {
        toolName: toolUse.toolName || 'Unknown Tool',
        toolInput: toolUse.toolInput || {},
        toolResult: toolResult?.content,
        timestamp: toolUse.timestamp,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: SessionMessage }) => (
      <MessageItem item={item} allMessages={messages} onToolPress={handleToolPress} />
    ),
    [messages, handleToolPress]
  );

  const renderSubagentItem = useCallback(
    ({ item }: { item: SubagentInfo }) => (
      <SubagentItem item={item} onPress={handleSubagentPress} />
    ),
    [handleSubagentPress]
  );

  // Loading indicator shown at visual top (ListFooterComponent in inverted mode)
  const renderLoadMoreIndicator = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadMoreText}>Loading earlier messages...</Text>
        </View>
      );
    }
    if (!hasMoreMessages && filteredMessages.length > 0) {
      return (
        <View style={styles.loadMoreContainer}>
          <Text style={styles.loadMoreText}>All messages loaded</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore, hasMoreMessages, filteredMessages.length]);

  const subagentCount = sessionFolderInfo?.subagentCount || subagents.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleGoBack}
        activeOpacity={animation.activeOpacity}
      >
        <Text style={styles.backText}>← Sessions</Text>
      </TouchableOpacity>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subagents' && styles.tabActive]}
          onPress={() => setActiveTab('subagents')}
          activeOpacity={animation.activeOpacity}
        >
          <Text style={[styles.tabText, activeTab === 'subagents' && styles.tabTextActive]}>
            Subagents {subagentCount > 0 ? `(${subagentCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : activeTab === 'messages' ? (
        <FlatList
          ref={flatListRef}
          data={invertedData}
          inverted
          keyExtractor={(item, index) => item.uuid + '_' + index}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderLoadMoreIndicator}
          ListEmptyComponent={
            <Text style={styles.empty}>No messages</Text>
          }
        />
      ) : (
        <FlatList
          data={subagents}
          keyExtractor={(item) => item.agentId}
          renderItem={renderSubagentItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No subagents</Text>
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
  backBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backText: {
    fontSize: typography.size.body,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
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

  // Load more indicator
  loadMoreContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },

  // User bubble
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userBubble,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
    ...shadows.sm,
  },
  userLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: 'rgba(255,255,255,0.85)',
  },
  userText: {
    color: colors.text.inverse,
    fontSize: typography.size.subheadline,
    marginTop: spacing.xs,
  },

  // Assistant bubble
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.assistantBubble,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  assistantLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  jsonText: {
    color: colors.text.primary,
    fontSize: typography.size.footnote,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },

  // Tool call styles
  toolCallBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.toolCallBubble,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  toolCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolCallIcon: {
    fontSize: typography.size.caption,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: typography.weight.bold,
    marginRight: spacing.sm,
  },
  toolCallName: {
    fontSize: typography.size.footnote,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    flex: 1,
  },
  toolCallArrow: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  toolCallResult: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },

  // Subagent list styles
  subagentItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  subagentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subagentSlug: {
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  subagentMeta: {
    fontSize: typography.size.caption,
    color: colors.text.secondary,
  },
  subagentPrompt: {
    fontSize: typography.size.footnote,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

// Markdown styles
const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text.primary,
    fontSize: typography.size.subheadline,
  },
  heading1: {
    fontSize: typography.size.title3,
    fontWeight: typography.weight.bold,
    marginVertical: spacing.sm,
    color: colors.text.primary,
  },
  heading2: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    marginVertical: spacing.sm,
    color: colors.text.primary,
  },
  heading3: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginVertical: spacing.xs,
    color: colors.text.primary,
  },
  paragraph: {
    marginVertical: spacing.xs,
  },
  strong: {
    fontWeight: typography.weight.bold,
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    fontFamily: 'monospace',
    fontSize: typography.size.footnote,
  },
  code_block: {
    backgroundColor: colors.codeBg,
    color: colors.codeFg,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: 'monospace',
    fontSize: typography.size.caption,
    marginVertical: spacing.sm,
  },
  fence: {
    backgroundColor: colors.codeBg,
    color: colors.codeFg,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: 'monospace',
    fontSize: typography.size.caption,
    marginVertical: spacing.sm,
  },
  blockquote: {
    backgroundColor: colors.background.secondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    marginVertical: spacing.sm,
  },
  bullet_list: {
    marginVertical: spacing.xs,
  },
  ordered_list: {
    marginVertical: spacing.xs,
  },
  list_item: {
    marginVertical: spacing.xs,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
