"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const config_1 = require("../config");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
const LEVEL_MAP = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
};
class Logger {
    constructor() {
        this.level = LEVEL_MAP[config_1.CONFIG.logLevel] || LogLevel.INFO;
    }
    log(level, message, ...args) {
        if (level >= this.level) {
            const timestamp = new Date().toISOString();
            const levelName = LogLevel[level];
            console.log(`[${timestamp}] [${levelName}]`, message, ...args);
        }
    }
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }
    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }
}
exports.logger = new Logger();
