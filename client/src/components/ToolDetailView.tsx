import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ToolDetailScreenProps } from '../navigation/types';

export default function ToolDetailView() {
  const navigation = useNavigation<ToolDetailScreenProps['navigation']>();
  const route = useRoute<ToolDetailScreenProps['route']>();
  const { toolName, toolInput, toolResult, timestamp } = route.params;

  const [activeSection, setActiveSection] = useState<'input' | 'result'>('input');

  // Format JSON with indentation
  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.toolIcon}>{'>'}_</Text>
        <Text style={styles.toolName}>{toolName}</Text>
      </View>

      {timestamp && (
        <Text style={styles.timestamp}>
          {new Date(timestamp).toLocaleString()}
        </Text>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'input' && styles.tabActive]}
          onPress={() => setActiveSection('input')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeSection === 'input' && styles.tabTextActive]}>
            Input
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'result' && styles.tabActive]}
          onPress={() => setActiveSection('result')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeSection === 'result' && styles.tabTextActive]}>
            Result
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeSection === 'input' ? (
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{formatJson(toolInput)}</Text>
          </View>
        ) : (
          <View style={styles.codeBlock}>
            {toolResult ? (
              <Text style={styles.codeText}>{toolResult}</Text>
            ) : (
              <Text style={styles.emptyResult}>No result available</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toolIcon: {
    fontSize: 18,
    color: '#0066cc',
    fontFamily: 'monospace',
    fontWeight: '700',
    marginRight: 8,
  },
  toolName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d4d4d4',
    lineHeight: 18,
  },
  emptyResult: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
