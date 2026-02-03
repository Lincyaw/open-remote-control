import React, { useCallback, useRef, useMemo } from 'react';
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
import { SessionMessage } from '../types';
import { SubagentScreenProps, ClaudeStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
      activeOpacity={0.7}
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

export default function SubagentView() {
  const navigation = useNavigation<NativeStackNavigationProp<ClaudeStackParamList, 'Subagent'>>();
  const route = useRoute<SubagentScreenProps['route']>();
  const { agentId } = route.params;

  const {
    subagentMessages,
    subagentLoading,
    subagents,
  } = useSessionBrowserStore();
  const flatListRef = useRef<FlatList<SessionMessage>>(null);
  const contentHeightRef = useRef(0);

  // Get the selected subagent info
  const subagentInfo = useMemo(
    () => subagents.find(s => s.agentId === agentId),
    [subagents, agentId]
  );

  // Filter to show user, assistant, and tool_use messages
  const filteredMessages = useMemo(
    () => subagentMessages.filter(m => m.type === 'user' || m.type === 'assistant' || m.type === 'tool_use'),
    [subagentMessages]
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({
      offset: contentHeightRef.current,
      animated: true,
    });
  }, []);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
  }, []);

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
      <MessageItem item={item} allMessages={subagentMessages} onToolPress={handleToolPress} />
    ),
    [subagentMessages, handleToolPress]
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
        <Text style={styles.backText}>← Conversation</Text>
      </TouchableOpacity>

      {subagentInfo && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{subagentInfo.slug || subagentInfo.agentId}</Text>
          <Text style={styles.headerMeta}>{filteredMessages.length} messages</Text>
        </View>
      )}

      {subagentLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item, index) => item.uuid + '_' + index}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onContentSizeChange={handleContentSizeChange}
            ListEmptyComponent={
              <Text style={styles.empty}>No messages</Text>
            }
          />
          <TouchableOpacity style={styles.fab} onPress={scrollToBottom} activeOpacity={0.7}>
            <Text style={styles.fabText}>↓</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  backText: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  list: { padding: 12, paddingBottom: 40 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 20, fontWeight: '600' },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  userText: { color: '#fff', fontSize: 14, marginTop: 4 },

  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  assistantLabel: { fontSize: 12, fontWeight: '600', color: '#555' },
  jsonText: {
    color: '#222',
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'monospace',
  },

  // Tool call styles
  toolCallBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#b8d4e8',
  },
  toolCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolCallIcon: {
    fontSize: 12,
    color: '#0066cc',
    fontFamily: 'monospace',
    fontWeight: '700',
    marginRight: 6,
  },
  toolCallName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066cc',
    flex: 1,
  },
  toolCallArrow: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  toolCallResult: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});

// Markdown styles
const markdownStyles = StyleSheet.create({
  body: { color: '#222', fontSize: 14 },
  heading1: { fontSize: 20, fontWeight: '700', marginVertical: 8, color: '#111' },
  heading2: { fontSize: 18, fontWeight: '600', marginVertical: 6, color: '#222' },
  heading3: { fontSize: 16, fontWeight: '600', marginVertical: 4, color: '#333' },
  paragraph: { marginVertical: 4 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  code_inline: {
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 12,
    marginVertical: 6,
  },
  fence: {
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 12,
    marginVertical: 6,
  },
  blockquote: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 10,
    marginVertical: 6,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  link: { color: '#007AFF', textDecorationLine: 'underline' },
});
