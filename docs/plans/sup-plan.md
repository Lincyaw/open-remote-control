 ---
  Mobile Remote Development - Remaining Tasks Implementation Plan

  For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

  Goal: Complete the remaining features for the mobile remote development client, focusing on real SSH terminal integration, port forwarding, syntax highlighting, and mobile UX enhancements.

  Architecture: The existing dual-connection architecture (SSH + WebSocket) is solid. Remaining work focuses on: (1) replacing mock SSH with real implementation, (2) adding xterm.js terminal, (3) implementing port
   forwarding, (4) adding syntax highlighting, (5) enhancing mobile UX with gestures.

  Tech Stack:
  - Server: Node.js, TypeScript, Express (new), ws
  - Client: React Native, react-native-ssh-sftp, xterm.js, react-native-gesture-handler, react-syntax-highlighter

  ---
  Phase 4: SSH Terminal Integration

  Task 1: Add Express HTTP Server for Health Check and Token

  Files:
  - Create: server/src/http/server.ts
  - Modify: server/src/index.ts

  Step 1: Create HTTP server with health check

  // server/src/http/server.ts
  import express from 'express';
  import { CONFIG } from '../config';
  import { logger } from '../utils/logger';

  export function createHttpServer() {
    const app = express();

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    app.get('/token', (req, res) => {
      // In production, verify SSH session first
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${CONFIG.authToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      res.json({ token: CONFIG.authToken });
    });

    const httpPort = CONFIG.port + 1; // 8081
    app.listen(httpPort, () => {
      logger.info(`HTTP server running on port ${httpPort}`);
    });

    return app;
  }

  Step 2: Integrate into main server

  Add to server/src/index.ts:
  import { createHttpServer } from './http/server';

  // In constructor:
  createHttpServer();

  Step 3: Test

  curl http://localhost:8081/health
  # Expected: {"status":"ok","timestamp":...}

  Step 4: Commit

  git add server/src/http/
  git commit -m "feat(server): add HTTP server with health check and token endpoint"

  ---
  Task 2: Real SSH Service Implementation (Client)

  Files:
  - Modify: client/src/services/ssh.ts

  Step 1: Replace mock with real implementation

  // client/src/services/ssh.ts
  import SSHClient from 'react-native-ssh-sftp';
  import { useConnectionStore } from '../store/connectionStore';

  export class SSHService {
    private client: any = null;
    private shellCallbacks: ((data: string) => void)[] = [];

    async connect(
      host: string,
      port: number,
      username: string,
      privateKey: string
    ): Promise<void> {
      try {
        useConnectionStore.getState().setSSHStatus('connecting');

        this.client = await SSHClient.connectWithKey(
          host,
          port,
          username,
          privateKey,
          '' // passphrase
        );

        useConnectionStore.getState().setSSHStatus('connected');
      } catch (error) {
        useConnectionStore.getState().setSSHStatus('disconnected');
        throw error;
      }
    }

    async startShell(onData: (data: string) => void): Promise<void> {
      if (!this.client) throw new Error('SSH not connected');

      this.shellCallbacks.push(onData);

      await SSHClient.startShell(this.client, 'xterm-256color', (event: any) => {
        if (event.type === 'data') {
          this.shellCallbacks.forEach(cb => cb(event.data));
        }
      });
    }

    async writeToShell(data: string): Promise<void> {
      if (!this.client) throw new Error('SSH not connected');
      await SSHClient.writeToShell(this.client, data);
    }

    async setupPortForward(
      localPort: number,
      remoteHost: string,
      remotePort: number
    ): Promise<void> {
      if (!this.client) throw new Error('SSH not connected');
      await SSHClient.startLocalPortForward(
        this.client,
        localPort,
        remoteHost,
        remotePort
      );
    }

    async stopPortForward(localPort: number): Promise<void> {
      if (!this.client) throw new Error('SSH not connected');
      await SSHClient.stopLocalPortForward(this.client, localPort);
    }

    disconnect(): void {
      if (this.client) {
        SSHClient.disconnect(this.client);
        this.client = null;
        this.shellCallbacks = [];
        useConnectionStore.getState().setSSHStatus('disconnected');
      }
    }
  }

  export const sshService = new SSHService();

  Step 2: Commit

  git add client/src/services/ssh.ts
  git commit -m "feat(client): implement real SSH service with port forwarding"

  ---
  Task 3: xterm.js Terminal Component

  Files:
  - Modify: client/src/components/TerminalTab.tsx

  Step 1: Replace mock terminal with xterm.js WebView

  // client/src/components/TerminalTab.tsx
  import React, { useRef, useEffect, useCallback } from 'react';
  import { View, StyleSheet } from 'react-native';
  import { WebView } from 'react-native-webview';
  import { sshService } from '../services/ssh';

  const TERMINAL_HTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; background: #1e1e1e; overflow: hidden; }
      #terminal { height: 100%; width: 100%; }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script>
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selection: 'rgba(255, 255, 255, 0.3)',
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      term.open(document.getElementById('terminal'));
      fitAddon.fit();

      window.addEventListener('resize', () => fitAddon.fit());

      term.onData((data) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'input',
          data: data
        }));
      });

      window.writeToTerminal = (data) => {
        term.write(data);
      };

      window.clearTerminal = () => {
        term.clear();
      };

      window.resizeTerminal = () => {
        fitAddon.fit();
      };
    </script>
  </body>
  </html>
  `;

  export default function TerminalTab() {
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
      const handleShellData = (data: string) => {
        if (webViewRef.current) {
          const escaped = JSON.stringify(data);
          webViewRef.current.injectJavaScript(
            \`window.writeToTerminal(\${escaped}); true;\`
          );
        }
      };

      sshService.startShell(handleShellData).catch(console.error);

      return () => {
        // Cleanup handled by disconnect
      };
    }, []);

    const handleMessage = useCallback((event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'input') {
          sshService.writeToShell(message.data).catch(console.error);
        }
      } catch (error) {
        console.error('Terminal message error:', error);
      }
    }, []);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: TERMINAL_HTML }}
          onMessage={handleMessage}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
        />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1e1e' },
    webview: { flex: 1 },
  });

  Step 2: Commit

  git add client/src/components/TerminalTab.tsx
  git commit -m "feat(client): integrate xterm.js terminal with real SSH"

  ---
  Task 4: Port Forwarding UI

  Files:
  - Create: client/src/components/PortForwardPanel.tsx
  - Create: client/src/store/portForwardStore.ts

  Step 1: Create port forward store

  // client/src/store/portForwardStore.ts
  import { create } from 'zustand';

  interface PortForward {
    id: string;
    localPort: number;
    remoteHost: string;
    remotePort: number;
    status: 'active' | 'stopped' | 'error';
  }

  interface PortForwardState {
    forwards: PortForward[];
    addForward: (forward: Omit<PortForward, 'id' | 'status'>) => void;
    removeForward: (id: string) => void;
    updateStatus: (id: string, status: PortForward['status']) => void;
  }

  export const usePortForwardStore = create<PortForwardState>((set) => ({
    forwards: [],
    addForward: (forward) =>
      set((state) => ({
        forwards: [
          ...state.forwards,
          { ...forward, id: Date.now().toString(), status: 'active' },
        ],
      })),
    removeForward: (id) =>
      set((state) => ({
        forwards: state.forwards.filter((f) => f.id !== id),
      })),
    updateStatus: (id, status) =>
      set((state) => ({
        forwards: state.forwards.map((f) =>
          f.id === id ? { ...f, status } : f
        ),
      })),
  }));

  Step 2: Create port forward panel component

  // client/src/components/PortForwardPanel.tsx
  import React, { useState } from 'react';
  import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Linking,
    Alert,
  } from 'react-native';
  import { usePortForwardStore } from '../store/portForwardStore';
  import { sshService } from '../services/ssh';

  export default function PortForwardPanel() {
    const { forwards, addForward, removeForward, updateStatus } =
      usePortForwardStore();
    const [localPort, setLocalPort] = useState('');
    const [remotePort, setRemotePort] = useState('');

    const handleAdd = async () => {
      const local = parseInt(localPort);
      const remote = parseInt(remotePort);

      if (!local || !remote) {
        Alert.alert('Error', 'Please enter valid port numbers');
        return;
      }

      try {
        await sshService.setupPortForward(local, 'localhost', remote);
        addForward({ localPort: local, remoteHost: 'localhost', remotePort: remote });
        setLocalPort('');
        setRemotePort('');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    };

    const handleStop = async (id: string, localPort: number) => {
      try {
        await sshService.stopPortForward(localPort);
        removeForward(id);
      } catch (error: any) {
        updateStatus(id, 'error');
      }
    };

    const handleOpen = (port: number) => {
      Linking.openURL(\`http://localhost:\${port}\`);
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Port Forwards</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Local"
            value={localPort}
            onChangeText={setLocalPort}
            keyboardType="numeric"
          />
          <Text style={styles.arrow}>→</Text>
          <TextInput
            style={styles.input}
            placeholder="Remote"
            value={remotePort}
            onChangeText={setRemotePort}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={forwards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.forwardItem}>
              <Text style={styles.forwardText}>
                {item.localPort} → {item.remoteHost}:{item.remotePort}
              </Text>
              <View style={styles.forwardActions}>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpen(item.localPort)}
                >
                  <Text style={styles.buttonText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={() => handleStop(item.id, item.localPort)}
                >
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active port forwards</Text>
          }
        />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 10,
    },
    arrow: { marginHorizontal: 8, fontSize: 16 },
    addButton: {
      backgroundColor: '#007AFF',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    forwardItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#f8f8f8',
      borderRadius: 8,
      marginBottom: 8,
    },
    forwardText: { fontSize: 14 },
    forwardActions: { flexDirection: 'row' },
    openButton: {
      backgroundColor: '#34C759',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      marginRight: 8,
    },
    stopButton: {
      backgroundColor: '#FF3B30',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    buttonText: { color: '#fff', fontSize: 12 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  });

  Step 3: Commit

  git add client/src/store/portForwardStore.ts client/src/components/PortForwardPanel.tsx
  git commit -m "feat(client): add port forwarding UI and store"

  ---
  Phase 5: Syntax Highlighting

  Task 5: Add Syntax Highlighting to File Viewer

  Files:
  - Modify: client/src/components/FileViewer.tsx

  Step 1: Install react-native-syntax-highlighter

  cd client && npm install react-syntax-highlighter @types/react-syntax-highlighter

  Step 2: Update FileViewer with syntax highlighting

  // Add to client/src/components/FileViewer.tsx
  import SyntaxHighlighter from 'react-syntax-highlighter';
  import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

  // In the render, replace plain text with:
  <SyntaxHighlighter
    language={language}
    style={vs2015}
    showLineNumbers
    customStyle={{
      margin: 0,
      padding: 16,
      backgroundColor: '#1e1e1e',
    }}
    lineNumberStyle={{
      minWidth: 40,
      paddingRight: 16,
      color: '#858585',
    }}
  >
    {content}
  </SyntaxHighlighter>

  Step 3: Commit

  git add client/src/components/FileViewer.tsx
  git commit -m "feat(client): add syntax highlighting to file viewer"

  ---
  Phase 6: Mobile UX Enhancements

  Task 6: Add Gesture Handlers

  Files:
  - Modify: client/src/screens/MainScreen.tsx
  - Create: client/src/components/SwipeableTabView.tsx

  Step 1: Install gesture handler

  cd client && npm install react-native-gesture-handler

  Step 2: Create SwipeableTabView

  // client/src/components/SwipeableTabView.tsx
  import React, { useRef } from 'react';
  import { View, Animated, Dimensions, StyleSheet } from 'react-native';
  import {
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
  } from 'react-native-gesture-handler';

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

  interface Props {
    tabs: React.ReactNode[];
    activeIndex: number;
    onIndexChange: (index: number) => void;
  }

  export default function SwipeableTabView({
    tabs,
    activeIndex,
    onIndexChange,
  }: Props) {
    const translateX = useRef(new Animated.Value(0)).current;

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === 5) {
        // State.END
        const { translationX: tx, velocityX } = event.nativeEvent;

        let newIndex = activeIndex;

        if (tx < -SWIPE_THRESHOLD || velocityX < -500) {
          newIndex = Math.min(activeIndex + 1, tabs.length - 1);
        } else if (tx > SWIPE_THRESHOLD || velocityX > 500) {
          newIndex = Math.max(activeIndex - 1, 0);
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

        if (newIndex !== activeIndex) {
          onIndexChange(newIndex);
        }
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {tabs[activeIndex]}
        </Animated.View>
      </PanGestureHandler>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1 },
  });

  Step 3: Integrate into MainScreen

  // Update MainScreen.tsx to use SwipeableTabView
  import SwipeableTabView from '../components/SwipeableTabView';

  // In render:
  <SwipeableTabView
    tabs={[<TerminalTab />, <ClaudeTab />, <FilesTab />]}
    activeIndex={TAB_INDEX[activeTab]}
    onIndexChange={(index) => setActiveTab(TABS[index])}
  />

  Step 4: Commit

  git add client/src/components/SwipeableTabView.tsx client/src/screens/MainScreen.tsx
  git commit -m "feat(client): add swipe gesture for tab switching"

  ---
  Task 7: Add Quick Actions Panel for Claude Tab

  Files:
  - Create: client/src/components/QuickActionsPanel.tsx
  - Modify: client/src/components/ClaudeTab.tsx

  Step 1: Create QuickActionsPanel

  // client/src/components/QuickActionsPanel.tsx
  import React from 'react';
  import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

  interface QuickAction {
    label: string;
    icon: string;
    command: string;
  }

  const QUICK_ACTIONS: QuickAction[] = [
    { label: '继续', icon: '💬', command: 'continue' },
    { label: '修复', icon: '🐛', command: 'fix the bug' },
    { label: '重构', icon: '📝', command: 'refactor' },
    { label: '测试', icon: '🧪', command: 'write tests' },
    { label: '解释', icon: '📖', command: 'explain this code' },
    { label: '优化', icon: '✨', command: 'optimize' },
  ];

  interface Props {
    onSelect: (command: string) => void;
  }

  export default function QuickActionsPanel({ onSelect }: Props) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.command}
              style={styles.actionButton}
              onPress={() => onSelect(action.command)}
            >
              <Text style={styles.icon}>{action.icon}</Text>
              <Text style={styles.label}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
    },
    actionButton: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      backgroundColor: '#fff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    icon: { fontSize: 20, marginBottom: 4 },
    label: { fontSize: 12, color: '#333' },
  });

  Step 2: Commit

  git add client/src/components/QuickActionsPanel.tsx
  git commit -m "feat(client): add quick actions panel for Claude tab"

  ---
  Task 8: Add Command History Sidebar for Terminal

  Files:
  - Create: client/src/components/CommandHistorySidebar.tsx
  - Create: client/src/store/terminalStore.ts

  Step 1: Create terminal store

  // client/src/store/terminalStore.ts
  import { create } from 'zustand';

  interface TerminalState {
    commandHistory: string[];
    addCommand: (command: string) => void;
    clearHistory: () => void;
  }

  export const useTerminalStore = create<TerminalState>((set) => ({
    commandHistory: [],
    addCommand: (command) =>
      set((state) => ({
        commandHistory: [command, ...state.commandHistory].slice(0, 100),
      })),
    clearHistory: () => set({ commandHistory: [] }),
  }));

  Step 2: Create CommandHistorySidebar

  // client/src/components/CommandHistorySidebar.tsx
  import React from 'react';
  import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
  } from 'react-native';
  import { useTerminalStore } from '../store/terminalStore';

  interface Props {
    onSelect: (command: string) => void;
    onClose: () => void;
  }

  export default function CommandHistorySidebar({ onSelect, onClose }: Props) {
    const { commandHistory, clearHistory } = useTerminalStore();

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Command History</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={commandHistory}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.command}>{item}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No command history</Text>
          }
        />

        {commandHistory.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 250,
      backgroundColor: '#1e1e1e',
      borderLeftWidth: 1,
      borderLeftColor: '#333',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
    },
    title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    closeButton: { color: '#999', fontSize: 18 },
    historyItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
    },
    command: { color: '#d4d4d4', fontFamily: 'monospace' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
    clearButton: {
      padding: 16,
      backgroundColor: '#333',
      alignItems: 'center',
    },
    clearButtonText: { color: '#FF3B30' },
  });

  Step 3: Commit

  git add client/src/store/terminalStore.ts client/src/components/CommandHistorySidebar.tsx
  git commit -m "feat(client): add command history sidebar for terminal"

  ---
  Task 9: Add Pinch-to-Zoom for File Viewer

  Files:
  - Modify: client/src/components/FileViewer.tsx

  Step 1: Add pinch gesture handler

  // Add to FileViewer.tsx
  import { PinchGestureHandler, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
  import Animated, { useAnimatedGestureHandler, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

  // In component:
  const scale = useSharedValue(1);
  const [fontSize, setFontSize] = useState(14);

  const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onActive: (event) => {
      scale.value = event.scale;
    },
    onEnd: () => {
      const newSize = Math.min(Math.max(fontSize * scale.value, 10), 24);
      runOnJS(setFontSize)(Math.round(newSize));
      scale.value = 1;
    },
  });

  // Wrap content in:
  <PinchGestureHandler onGestureEvent={pinchHandler}>
    <Animated.View>
      {/* SyntaxHighlighter with dynamic fontSize */}
    </Animated.View>
  </PinchGestureHandler>

  Step 2: Commit

  git add client/src/components/FileViewer.tsx
  git commit -m "feat(client): add pinch-to-zoom for file viewer"

  ---
  Phase 7: Testing and Polish

  Task 10: Add Unit Tests for New Features

  Files:
  - Create: client/src/__tests__/portForwardStore.test.ts
  - Create: client/src/__tests__/terminalStore.test.ts

  Step 1: Write port forward store tests

  // client/src/__tests__/portForwardStore.test.ts
  import { usePortForwardStore } from '../store/portForwardStore';

  describe('portForwardStore', () => {
    beforeEach(() => {
      usePortForwardStore.setState({ forwards: [] });
    });

    it('adds a port forward', () => {
      const { addForward } = usePortForwardStore.getState();
      addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

      const { forwards } = usePortForwardStore.getState();
      expect(forwards).toHaveLength(1);
      expect(forwards[0].localPort).toBe(3000);
      expect(forwards[0].status).toBe('active');
    });

    it('removes a port forward', () => {
      const { addForward, removeForward } = usePortForwardStore.getState();
      addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

      const { forwards: before } = usePortForwardStore.getState();
      removeForward(before[0].id);

      const { forwards: after } = usePortForwardStore.getState();
      expect(after).toHaveLength(0);
    });

    it('updates port forward status', () => {
      const { addForward, updateStatus } = usePortForwardStore.getState();
      addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

      const { forwards: before } = usePortForwardStore.getState();
      updateStatus(before[0].id, 'error');

      const { forwards: after } = usePortForwardStore.getState();
      expect(after[0].status).toBe('error');
    });
  });

  Step 2: Write terminal store tests

  // client/src/__tests__/terminalStore.test.ts
  import { useTerminalStore } from '../store/terminalStore';

  describe('terminalStore', () => {
    beforeEach(() => {
      useTerminalStore.setState({ commandHistory: [] });
    });

    it('adds command to history', () => {
      const { addCommand } = useTerminalStore.getState();
      addCommand('ls -la');

      const { commandHistory } = useTerminalStore.getState();
      expect(commandHistory).toContain('ls -la');
    });

    it('keeps most recent commands first', () => {
      const { addCommand } = useTerminalStore.getState();
      addCommand('first');
      addCommand('second');

      const { commandHistory } = useTerminalStore.getState();
      expect(commandHistory[0]).toBe('second');
      expect(commandHistory[1]).toBe('first');
    });

    it('limits history to 100 commands', () => {
      const { addCommand } = useTerminalStore.getState();
      for (let i = 0; i < 110; i++) {
        addCommand(`command-${i}`);
      }

      const { commandHistory } = useTerminalStore.getState();
      expect(commandHistory).toHaveLength(100);
    });

    it('clears history', () => {
      const { addCommand, clearHistory } = useTerminalStore.getState();
      addCommand('test');
      clearHistory();

      const { commandHistory } = useTerminalStore.getState();
      expect(commandHistory).toHaveLength(0);
    });
  });

  Step 3: Run tests

  cd client && npm test

  Step 4: Commit

  git add client/src/__tests__/portForwardStore.test.ts client/src/__tests__/terminalStore.test.ts
  git commit -m "test(client): add unit tests for port forward and terminal stores"

  ---
  Task 11: Add E2E Tests for New Features

  Files:
  - Create: client/e2e/portForward.e2e.ts
  - Create: client/e2e/terminal.e2e.ts

  Step 1: Write port forward E2E tests

  // client/e2e/portForward.e2e.ts
  import { device, element, by, expect } from 'detox';

  describe('Port Forwarding', () => {
    beforeAll(async () => {
      await device.launchApp();
      // Navigate to connected state (mock or test server)
    });

    it('shows port forward panel', async () => {
      await element(by.text('Ports')).tap();
      await expect(element(by.text('Port Forwards'))).toBeVisible();
    });

    it('adds a port forward', async () => {
      await element(by.placeholder('Local')).typeText('3000');
      await element(by.placeholder('Remote')).typeText('8080');
      await element(by.text('+')).tap();

      await expect(element(by.text('3000 → localhost:8080'))).toBeVisible();
    });

    it('opens port in browser', async () => {
      await element(by.text('Open')).tap();
      // Verify Linking.openURL was called (mock verification)
    });

    it('stops a port forward', async () => {
      await element(by.text('Stop')).tap();
      await expect(element(by.text('No active port forwards'))).toBeVisible();
    });
  });

  Step 2: Write terminal E2E tests

  // client/e2e/terminal.e2e.ts
  import { device, element, by, expect } from 'detox';

  describe('Terminal', () => {
    beforeAll(async () => {
      await device.launchApp();
      // Navigate to connected state
    });

    it('shows terminal tab', async () => {
      await element(by.text('Terminal')).tap();
      await expect(element(by.id('terminal-webview'))).toBeVisible();
    });

    it('shows command history sidebar on swipe', async () => {
      await element(by.id('terminal-container')).swipe('left');
      await expect(element(by.text('Command History'))).toBeVisible();
    });

    it('selects command from history', async () => {
      // Add command to history first
      await element(by.text('ls -la')).tap();
      // Verify command is sent to terminal
    });

    it('closes history sidebar', async () => {
      await element(by.text('✕')).tap();
      await expect(element(by.text('Command History'))).not.toBeVisible();
    });
  });

  Step 3: Run E2E tests

  cd client && npm run e2e:ios

  Step 4: Commit

  git add client/e2e/portForward.e2e.ts client/e2e/terminal.e2e.ts
  git commit -m "test(client): add E2E tests for port forwarding and terminal"

  ---
  Task 12: Performance Optimization

  Files:
  - Modify: client/src/components/ClaudeTab.tsx
  - Modify: client/src/components/FilesTab.tsx

  Step 1: Optimize ClaudeTab with memo and callbacks

  // Update ClaudeTab.tsx
  import React, { memo, useCallback, useMemo } from 'react';

  const MemoizedMessageBubble = memo(MessageBubble);

  export default function ClaudeTab() {
    const { messages } = useClaudeStore();

    const renderItem = useCallback(
      ({ item }: { item: ClaudeMessage }) => (
        <MemoizedMessageBubble message={item} />
      ),
      []
    );

    const keyExtractor = useCallback((item: ClaudeMessage) => item.id, []);

    const getItemLayout = useCallback(
      (_: any, index: number) => ({
        length: 80,
        offset: 80 * index,
        index,
      }),
      []
    );

    return (
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
      />
    );
  }

  Step 2: Optimize FilesTab with virtualization

  // Update FilesTab.tsx - use FlashList for better performance
  // npm install @shopify/flash-list

  import { FlashList } from '@shopify/flash-list';

  // Replace FlatList with FlashList
  <FlashList
    data={files}
    renderItem={renderItem}
    estimatedItemSize={50}
    keyExtractor={keyExtractor}
  />

  Step 3: Commit

  git add client/src/components/ClaudeTab.tsx client/src/components/FilesTab.tsx
  git commit -m "perf(client): optimize list rendering with memo and FlashList"

  ---
  Task 13: Add Loading and Error States

  Files:
  - Modify: client/src/components/TerminalTab.tsx
  - Modify: client/src/components/PortForwardPanel.tsx

  Step 1: Add loading state to TerminalTab

  // Update TerminalTab.tsx
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initShell = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await sshService.startShell(handleShellData);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    initShell();
  }, []);

  if (isLoading) {
    return <LoadingState message="Connecting to shell..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to connect: {error}</Text>
        <TouchableOpacity onPress={retry}>
          <Text style={styles.retryButton}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  Step 2: Add loading state to PortForwardPanel

  // Update PortForwardPanel.tsx
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await sshService.setupPortForward(local, 'localhost', remote);
      addForward({ localPort: local, remoteHost: 'localhost', remotePort: remote });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsAdding(false);
    }
  };

  // In render:
  <TouchableOpacity
    style={[styles.addButton, isAdding && styles.addButtonDisabled]}
    onPress={handleAdd}
    disabled={isAdding}
  >
    {isAdding ? (
      <ActivityIndicator color="#fff" size="small" />
    ) : (
      <Text style={styles.addButtonText}>+</Text>
    )}
  </TouchableOpacity>

  Step 3: Commit

  git add client/src/components/TerminalTab.tsx client/src/components/PortForwardPanel.tsx
  git commit -m "feat(client): add loading and error states to terminal and port forward"

  ---
  Phase 8: Final Integration

  Task 14: Integrate Port Forward Panel into MainScreen

  Files:
  - Modify: client/src/screens/MainScreen.tsx

  Step 1: Add Ports tab to MainScreen

  // Update MainScreen.tsx
  type TabType = 'terminal' | 'claude' | 'files' | 'ports';

  const TABS: TabType[] = ['terminal', 'claude', 'files', 'ports'];
  const TAB_INDEX: Record<TabType, number> = {
    terminal: 0,
    claude: 1,
    files: 2,
    ports: 3,
  };

  // In render:
  const renderTab = () => {
    switch (activeTab) {
      case 'terminal':
        return <TerminalTab />;
      case 'claude':
        return <ClaudeTab />;
      case 'files':
        return <FilesTab />;
      case 'ports':
        return <PortForwardPanel />;
    }
  };

  // Update tab bar:
  <View style={styles.tabBar}>
    {TABS.map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, activeTab === tab && styles.activeTab]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={styles.tabText}>
          {tab === 'terminal' && '🖥️'}
          {tab === 'claude' && '🤖'}
          {tab === 'files' && '📁'}
          {tab === 'ports' && '🔗'}
        </Text>
        <Text style={styles.tabLabel}>{tab}</Text>
      </TouchableOpacity>
    ))}
  </View>

  Step 2: Commit

  git add client/src/screens/MainScreen.tsx
  git commit -m "feat(client): integrate port forward panel into main screen"

  ---
  Task 15: Integrate Command History into Terminal

  Files:
  - Modify: client/src/components/TerminalTab.tsx

  Step 1: Add command history sidebar integration

  // Update TerminalTab.tsx
  import CommandHistorySidebar from './CommandHistorySidebar';
  import { useTerminalStore } from '../store/terminalStore';

  export default function TerminalTab() {
    const [showHistory, setShowHistory] = useState(false);
    const { addCommand } = useTerminalStore();

    const handleCommandSelect = (command: string) => {
      // Send command to terminal
      if (webViewRef.current) {
        const escaped = JSON.stringify(command + '\n');
        webViewRef.current.injectJavaScript(
          `window.writeToTerminal(${escaped}); true;`
        );
      }
      sshService.writeToShell(command + '\n').catch(console.error);
      setShowHistory(false);
    };

    // Track commands sent
    const handleMessage = useCallback((event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'input' && message.data.includes('\r')) {
          // User pressed enter, extract command
          const command = message.data.replace('\r', '').trim();
          if (command) {
            addCommand(command);
          }
        }
        sshService.writeToShell(message.data).catch(console.error);
      } catch (error) {
        console.error('Terminal message error:', error);
      }
    }, [addCommand]);

    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setShowHistory(true)}>
            <Text style={styles.toolbarButton}>History</Text>
          </TouchableOpacity>
        </View>

        <WebView
          ref={webViewRef}
          source={{ html: TERMINAL_HTML }}
          onMessage={handleMessage}
          style={styles.webview}
        />

        {showHistory && (
          <CommandHistorySidebar
            onSelect={handleCommandSelect}
            onClose={() => setShowHistory(false)}
          />
        )}
      </View>
    );
  }

  Step 2: Commit

  git add client/src/components/TerminalTab.tsx
  git commit -m "feat(client): integrate command history sidebar into terminal"

  ---
  Task 16: Integrate Quick Actions into Claude Tab

  Files:
  - Modify: client/src/components/ClaudeTab.tsx

  Step 1: Add quick actions panel integration

  // Update ClaudeTab.tsx
  import QuickActionsPanel from './QuickActionsPanel';

  export default function ClaudeTab() {
    const { messages } = useClaudeStore();

    const handleQuickAction = (command: string) => {
      // Send command to Claude via terminal or WebSocket
      // This depends on how Claude Code accepts input
      console.log('Quick action:', command);
      // For now, we can copy to clipboard or show in input
      Alert.alert('Quick Action', `Command: ${command}\n\nCopy to terminal to send to Claude.`);
    };

    return (
      <View style={styles.container}>
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.messageList}
        />
        <QuickActionsPanel onSelect={handleQuickAction} />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    messageList: { flex: 1 },
  });

  Step 2: Commit

  git add client/src/components/ClaudeTab.tsx
  git commit -m "feat(client): integrate quick actions panel into Claude tab"

  ---
  Task 17: Final Testing and Documentation

  Files:
  - Update: README.md (if exists)
  - Run all tests

  Step 1: Run all unit tests

  cd server && npm test
  cd client && npm test

  Step 2: Run E2E tests

  cd client && npm run e2e:ios
  cd client && npm run e2e:android

  Step 3: Manual testing checklist

  - [ ] Server starts and watches Claude Code files
  - [ ] Client connects via SSH and WebSocket
  - [ ] Terminal displays and accepts input
  - [ ] Claude messages appear in real-time
  - [ ] File browsing works with syntax highlighting
  - [ ] Search returns results
  - [ ] Diff viewer shows changes
  - [ ] Port forwarding works
  - [ ] Command history sidebar works
  - [ ] Quick actions panel works
  - [ ] Swipe gestures work for tab switching
  - [ ] Pinch-to-zoom works in file viewer
  - [ ] Reconnection works after network loss
  - [ ] App runs smoothly on iOS and Android

  Step 4: Commit final changes

  git add .
  git commit -m "chore: complete implementation and testing"

  ---
  Success Criteria

  Phase 4 (SSH Terminal Integration):
  - [x] HTTP server with health check endpoint
  - [x] Real SSH service implementation
  - [x] xterm.js terminal component
  - [x] Port forwarding UI and functionality

  Phase 5 (Syntax Highlighting):
  - [x] Syntax highlighting in file viewer

  Phase 6 (Mobile UX Enhancements):
  - [x] Swipe gesture for tab switching
  - [x] Quick actions panel for Claude tab
  - [x] Command history sidebar for terminal
  - [x] Pinch-to-zoom for file viewer

  Phase 7 (Testing and Polish):
  - [x] Unit tests for new stores
  - [x] E2E tests for new features
  - [x] Performance optimization
  - [x] Loading and error states

  Phase 8 (Final Integration):
  - [x] Port forward panel in main screen
  - [x] Command history in terminal
  - [x] Quick actions in Claude tab
  - [x] Final testing and documentation

  ---
  Next Steps After Implementation

  1. Security hardening: SSH key encryption, certificate pinning
  2. Performance optimization: Lazy loading, pagination for large files
  3. Advanced features: Code editing, git operations, multiple terminals
  4. UI polish: Animations, haptic feedback, custom themes
  5. App Store deployment: iOS App Store, Google Play Store