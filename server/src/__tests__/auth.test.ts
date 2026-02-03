// Mock CONFIG before importing AuthManager
jest.mock('../config', () => ({
  CONFIG: {
    port: 8080,
    authToken: '',
    claudeHome: '/home/user/.claude',
    maxFileSize: 10485760,
    searchTimeout: 5000,
    logLevel: 'info',
  }
}));

import { AuthManager } from '../websocket/auth';
import { CONFIG } from '../config';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
  });

  describe('validateToken', () => {
    it('should return true for valid token', () => {
      (CONFIG as any).authToken = 'test-token';
      const result = authManager.validateToken('test-token');
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      (CONFIG as any).authToken = 'test-token';
      const result = authManager.validateToken('wrong-token');
      expect(result).toBe(false);
    });

    it('should return true when no token configured', () => {
      (CONFIG as any).authToken = '';
      const result = authManager.validateToken('any-token');
      expect(result).toBe(true);
    });
  });

  describe('generateClientId', () => {
    it('should generate unique client IDs', () => {
      const id1 = authManager.generateClientId();
      const id2 = authManager.generateClientId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', () => {
      const id = authManager.generateClientId();
      expect(id).toMatch(/^client_\d+_[a-z0-9]+$/);
    });
  });
});
