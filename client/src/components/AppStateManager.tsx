import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { wsClient } from '../services/websocket';
import { useConnectionStore } from '../store/connectionStore';

const RECONNECT_COOLDOWN_MS = 5000; // 5 秒冷却时间

/**
 * AppStateManager 组件
 *
 * 监听应用状态和网络状态变化，在以下情况自动触发 WebSocket 重连：
 * 1. 应用从后台恢复到前台
 * 2. 网络从断开恢复到连接
 *
 * 包含防抖机制，避免频繁重连
 */
export function AppStateManager() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastReconnectTime = useRef<number>(0);
  const wsStatus = useConnectionStore((state) => state.status.ws);
  const connectionParams = useConnectionStore((state) => state.connectionParams);

  /**
   * 检查是否应该触发重连
   */
  const shouldReconnect = (): boolean => {
    // 检查冷却时间
    const now = Date.now();
    if (now - lastReconnectTime.current < RECONNECT_COOLDOWN_MS) {
      console.log('AppStateManager: Reconnect cooldown active, skipping');
      return false;
    }

    // 检查是否有保存的连接参数
    if (!connectionParams) {
      console.log('AppStateManager: No connection params, skipping reconnect');
      return false;
    }

    // 检查当前是否已断开
    const currentState = wsClient.getConnectionState();
    if (currentState === 'connected') {
      console.log('AppStateManager: Already connected, skipping reconnect');
      return false;
    }

    if (currentState === 'connecting') {
      console.log('AppStateManager: Already connecting, skipping reconnect');
      return false;
    }

    return true;
  };

  /**
   * 触发重连
   */
  const triggerReconnect = () => {
    if (!shouldReconnect()) {
      return;
    }

    lastReconnectTime.current = Date.now();
    console.log('AppStateManager: Triggering reconnect');

    // 确保 wsClient 有连接参数
    if (!wsClient.canReconnect() && connectionParams) {
      wsClient.setConnectionParams(connectionParams);
    }

    wsClient.reconnect();
  };

  // 监听 AppState 变化
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`AppState changed: ${appState.current} -> ${nextAppState}`);

      // 从后台或非活跃状态恢复到前台
      if (
        (appState.current === 'background' || appState.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('AppStateManager: App came to foreground');
        // 短暂延迟后检查连接，给系统一些时间恢复网络
        setTimeout(() => {
          triggerReconnect();
        }, 500);
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [connectionParams]);

  // 监听网络状态变化
  useEffect(() => {
    let wasDisconnected = false;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      console.log(`Network state changed: connected=${isConnected}, type=${state.type}`);

      if (!isConnected) {
        wasDisconnected = true;
      } else if (wasDisconnected && isConnected) {
        // 网络从断开恢复
        console.log('AppStateManager: Network restored');
        wasDisconnected = false;
        // 延迟一下让网络稳定
        setTimeout(() => {
          triggerReconnect();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [connectionParams]);

  // 同步持久化的连接参数到 wsClient
  useEffect(() => {
    if (connectionParams && !wsClient.canReconnect()) {
      console.log('AppStateManager: Restoring connection params to wsClient');
      wsClient.setConnectionParams(connectionParams);
    }
  }, [connectionParams]);

  // 这是一个纯逻辑组件，不渲染任何 UI
  return null;
}
