import { CONFIG } from '../config';
import { logger } from '../utils/logger';

export class AuthManager {
  validateToken(token: string): boolean {
    if (!CONFIG.authToken) {
      logger.warn('No AUTH_TOKEN configured, accepting all connections');
      return true;
    }
    return token === CONFIG.authToken;
  }

  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
