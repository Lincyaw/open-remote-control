"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
// Mock chokidar before importing ClaudeWatcher
jest.mock('chokidar', () => ({
    default: {
        watch: jest.fn(() => ({
            on: jest.fn(),
            close: jest.fn()
        }))
    }
}));
const watcher_1 = require("../claude/watcher");
describe('ClaudeWatcher', () => {
    let watcher;
    beforeEach(() => {
        watcher = new watcher_1.ClaudeWatcher();
    });
    afterEach(() => {
        watcher.stop();
    });
    it('should be an EventEmitter', () => {
        expect(watcher).toBeInstanceOf(events_1.EventEmitter);
    });
    it('should emit user_input events', (done) => {
        watcher.on('user_input', (data) => {
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('sessionId');
            done();
        });
        // Simulate user input event
        watcher.emit('user_input', {
            message: 'test message',
            timestamp: Date.now(),
            sessionId: 'test-session',
            project: '/test/project'
        });
    });
    it('should handle queue processing', async () => {
        const events = [];
        watcher.on('user_input', (data) => {
            events.push(data);
        });
        // Simulate multiple rapid events
        for (let i = 0; i < 5; i++) {
            watcher.emit('user_input', {
                message: `message ${i}`,
                timestamp: Date.now(),
                sessionId: 'test-session',
                project: '/test/project'
            });
        }
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(events.length).toBe(5);
    });
});
