import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClaudeMessage, ServerConfig } from '../types';

const KEYS = {
  MESSAGES: 'offline_messages',
  SERVERS: 'saved_servers',
  LAST_SERVER: 'last_server',
  FILE_CACHE: 'file_cache',
};

const MAX_CACHED_MESSAGES = 100;
const MAX_CACHED_FILES = 50;

interface CachedFile {
  path: string;
  content: string;
  timestamp: number;
}

class OfflineCacheService {
  // Messages cache
  async saveMessages(messages: ClaudeMessage[]): Promise<void> {
    try {
      const toCache = messages.slice(-MAX_CACHED_MESSAGES);
      await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(toCache));
    } catch (error) {
      console.error('Failed to save messages to cache:', error);
    }
  }

  async getMessages(): Promise<ClaudeMessage[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get messages from cache:', error);
      return [];
    }
  }

  async clearMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.MESSAGES);
    } catch (error) {
      console.error('Failed to clear messages cache:', error);
    }
  }

  // Server configs cache
  async saveServer(server: ServerConfig): Promise<void> {
    try {
      const servers = await this.getServers();
      const existingIndex = servers.findIndex((s) => s.id === server.id);

      if (existingIndex >= 0) {
        servers[existingIndex] = server;
      } else {
        servers.push(server);
      }

      await AsyncStorage.setItem(KEYS.SERVERS, JSON.stringify(servers));
    } catch (error) {
      console.error('Failed to save server to cache:', error);
    }
  }

  async getServers(): Promise<ServerConfig[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SERVERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get servers from cache:', error);
      return [];
    }
  }

  async deleteServer(serverId: string): Promise<void> {
    try {
      const servers = await this.getServers();
      const filtered = servers.filter((s) => s.id !== serverId);
      await AsyncStorage.setItem(KEYS.SERVERS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete server from cache:', error);
    }
  }

  async setLastServer(serverId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SERVER, serverId);
    } catch (error) {
      console.error('Failed to save last server:', error);
    }
  }

  async getLastServer(): Promise<ServerConfig | null> {
    try {
      const lastServerId = await AsyncStorage.getItem(KEYS.LAST_SERVER);
      if (!lastServerId) return null;

      const servers = await this.getServers();
      return servers.find((s) => s.id === lastServerId) || null;
    } catch (error) {
      console.error('Failed to get last server:', error);
      return null;
    }
  }

  // File content cache
  async cacheFile(path: string, content: string): Promise<void> {
    try {
      const cache = await this.getFileCache();
      const existingIndex = cache.findIndex((f) => f.path === path);

      const newEntry: CachedFile = {
        path,
        content,
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        cache[existingIndex] = newEntry;
      } else {
        cache.push(newEntry);
      }

      // Keep only the most recent files
      const sorted = cache.sort((a, b) => b.timestamp - a.timestamp);
      const trimmed = sorted.slice(0, MAX_CACHED_FILES);

      await AsyncStorage.setItem(KEYS.FILE_CACHE, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to cache file:', error);
    }
  }

  async getCachedFile(path: string): Promise<string | null> {
    try {
      const cache = await this.getFileCache();
      const file = cache.find((f) => f.path === path);
      return file?.content || null;
    } catch (error) {
      console.error('Failed to get cached file:', error);
      return null;
    }
  }

  private async getFileCache(): Promise<CachedFile[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FILE_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get file cache:', error);
      return [];
    }
  }

  async clearFileCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.FILE_CACHE);
    } catch (error) {
      console.error('Failed to clear file cache:', error);
    }
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.MESSAGES,
        KEYS.FILE_CACHE,
      ]);
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  // Get cache size info
  async getCacheInfo(): Promise<{ messages: number; files: number; servers: number }> {
    try {
      const messages = await this.getMessages();
      const files = await this.getFileCache();
      const servers = await this.getServers();

      return {
        messages: messages.length,
        files: files.length,
        servers: servers.length,
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return { messages: 0, files: 0, servers: 0 };
    }
  }
}

export const offlineCache = new OfflineCacheService();
