"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class AuthManager {
    validateToken(token) {
        if (!config_1.CONFIG.authToken) {
            logger_1.logger.warn('No AUTH_TOKEN configured, accepting all connections');
            return true;
        }
        return token === config_1.CONFIG.authToken;
    }
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.AuthManager = AuthManager;
