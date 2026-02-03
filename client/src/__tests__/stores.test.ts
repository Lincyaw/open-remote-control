import { useConnectionStore } from '../store/connectionStore';
import { useClaudeStore } from '../store/claudeStore';

describe('ConnectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      currentServer: null,
      status: { ssh: 'disconnected', ws: 'disconnected' },
    });
  });

  it('should set server config', () => {
    const server = {
      id: '1',
      name: 'test',
      host: 'example.com',
      sshPort: 22,
      sshUsername: 'user',
      wsPort: 8080,
      wsToken: 'token',
    };

    useConnectionStore.getState().setServer(server);
    expect(useConnectionStore.getState().currentServer).toEqual(server);
  });

  it('should update SSH status', () => {
    useConnectionStore.getState().setSSHStatus('connected');
    expect(useConnectionStore.getState().status.ssh).toBe('connected');
  });

  it('should update WebSocket status', () => {
    useConnectionStore.getState().setWSStatus('connected');
    expect(useConnectionStore.getState().status.ws).toBe('connected');
  });

  it('should disconnect and reset status', () => {
    useConnectionStore.getState().setSSHStatus('connected');
    useConnectionStore.getState().setWSStatus('connected');
    useConnectionStore.getState().disconnect();

    expect(useConnectionStore.getState().status).toEqual({
      ssh: 'disconnected',
      ws: 'disconnected',
    });
  });
});

describe('ClaudeStore', () => {
  beforeEach(() => {
    useClaudeStore.setState({ messages: [] });
  });

  it('should add message', () => {
    const message = {
      id: '1',
      type: 'user' as const,
      content: 'test message',
      timestamp: Date.now(),
    };

    useClaudeStore.getState().addMessage(message);
    expect(useClaudeStore.getState().messages).toHaveLength(1);
    expect(useClaudeStore.getState().messages[0]).toEqual(message);
  });

  it('should add multiple messages', () => {
    useClaudeStore.getState().addMessage({
      id: '1',
      type: 'user',
      content: 'message 1',
      timestamp: Date.now(),
    });

    useClaudeStore.getState().addMessage({
      id: '2',
      type: 'assistant',
      content: 'message 2',
      timestamp: Date.now(),
    });

    expect(useClaudeStore.getState().messages).toHaveLength(2);
  });

  it('should clear messages', () => {
    useClaudeStore.getState().addMessage({
      id: '1',
      type: 'user',
      content: 'test',
      timestamp: Date.now(),
    });

    useClaudeStore.getState().clearMessages();
    expect(useClaudeStore.getState().messages).toHaveLength(0);
  });
});
