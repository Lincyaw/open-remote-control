import { WebSocketClient } from '../services/websocket';

// Mock WebSocket constants
const mockWsInstance = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
};

const MockWebSocket = jest.fn().mockImplementation(() => mockWsInstance);
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;

(global as any).WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.disconnect();
  });

  it('should create WebSocket connection', () => {
    client.connect('localhost', 8080, 'test-token');
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
  });

  it('should send messages when connected', () => {
    client.connect('localhost', 8080, 'test-token');
    const mockWs = MockWebSocket.mock.results[0].value;

    // Simulate WebSocket open
    if (mockWs.onopen) {
      mockWs.onopen({} as Event);
    }

    client.send({ type: 'test', data: 'hello' });
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'test', data: 'hello' })
    );
  });

  it('should disconnect cleanly', () => {
    client.connect('localhost', 8080, 'test-token');
    const mockWs = MockWebSocket.mock.results[0].value;

    client.disconnect();
    expect(mockWs.close).toHaveBeenCalled();
  });
});
