import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ClaudeMessage } from '../types';
import DiffViewer from './DiffViewer';

interface Props {
  message: ClaudeMessage;
}

function MessageBubble({ message }: Props) {
  const [showDiff, setShowDiff] = useState(false);
  const isUser = message.type === 'user';
  const isTool = message.type === 'tool_call';
  const isFileChange = message.type === 'file_change';

  const hasFileChange =
    isFileChange &&
    message.metadata?.filePath &&
    message.metadata?.oldContent !== undefined &&
    message.metadata?.newContent !== undefined;

  const handleShowDiff = useCallback(() => setShowDiff(true), []);
  const handleHideDiff = useCallback(() => setShowDiff(false), []);

  return (
    <View
      style={[
        styles.container,
        isUser && styles.userContainer,
        isTool && styles.toolContainer,
        isFileChange && styles.fileChangeContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser && styles.userBubble,
          isTool && styles.toolBubble,
          isFileChange && styles.fileChangeBubble,
        ]}
      >
        {isFileChange && (
          <View style={styles.fileChangeHeader}>
            <Text style={styles.fileChangeIcon}>
              {message.metadata?.operation === 'write' ? '📝' : '✏️'}
            </Text>
            <Text style={styles.fileChangePath} numberOfLines={1}>
              {message.metadata?.filePath}
            </Text>
          </View>
        )}
        <Text
          style={[styles.content, isUser && styles.userContent]}
        >
          {message.content}
        </Text>
        {hasFileChange && (
          <TouchableOpacity
            style={styles.viewDiffButton}
            onPress={handleShowDiff}
          >
            <Text style={styles.viewDiffButtonText}>View Diff</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      {hasFileChange && (
        <Modal
          visible={showDiff}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleHideDiff}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleHideDiff}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            <DiffViewer
              filePath={message.metadata!.filePath!}
              oldContent={message.metadata!.oldContent!}
              newContent={message.metadata!.newContent!}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    marginHorizontal: 10,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  toolContainer: {
    alignItems: 'center',
  },
  fileChangeContainer: {
    alignItems: 'stretch',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  toolBubble: {
    backgroundColor: '#FFF3CD',
  },
  fileChangeBubble: {
    backgroundColor: '#E8F5E9',
    maxWidth: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    borderRadius: 4,
  },
  fileChangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileChangeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileChangePath: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Courier',
    color: '#2E7D32',
  },
  content: {
    fontSize: 15,
    color: '#000',
  },
  userContent: {
    color: '#fff',
  },
  viewDiffButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewDiffButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
  },
  userTimestamp: {
    color: '#e0e0e0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default memo(MessageBubble);
