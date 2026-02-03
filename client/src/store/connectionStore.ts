import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServerConfig, ConnectionStatus } from '../types';

export type ConnectionQuality = 'good' | 'degraded' | 'poor';

export interface ConnectionParams {
  host: string;
  port: number;
  token: string;
}

interface ConnectionState {
  currentServer: ServerConfig | null;
  status: ConnectionStatus;
  connectionQuality: ConnectionQuality;
  // 持久化的连接参数
  connectionParams: ConnectionParams | null;
  // 是否正在自动重连
  isAutoReconnecting: boolean;
  setServer: (server: ServerConfig) => void;
  setSSHStatus: (status: ConnectionStatus['ssh']) => void;
  setWSStatus: (status: ConnectionStatus['ws']) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setConnectionParams: (params: ConnectionParams | null) => void;
  setAutoReconnecting: (reconnecting: boolean) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      currentServer: null,
      status: {
        ssh: 'disconnected',
        ws: 'disconnected',
      },
      connectionQuality: 'good',
      connectionParams: null,
      isAutoReconnecting: false,
      setServer: (server) => set({ currentServer: server }),
      setSSHStatus: (status) =>
        set((state) => ({
          status: { ...state.status, ssh: status },
        })),
      setWSStatus: (status) =>
        set((state) => ({
          status: { ...state.status, ws: status },
        })),
      setConnectionQuality: (quality) => set({ connectionQuality: quality }),
      setConnectionParams: (params) => set({ connectionParams: params }),
      setAutoReconnecting: (reconnecting) => set({ isAutoReconnecting: reconnecting }),
      disconnect: () =>
        set({
          status: { ssh: 'disconnected', ws: 'disconnected' },
          connectionQuality: 'good',
          isAutoReconnecting: false,
        }),
    }),
    {
      name: 'connection-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // 只持久化连接参数，不持久化连接状态
      partialize: (state) => ({
        connectionParams: state.connectionParams,
      }),
    }
  )
);
