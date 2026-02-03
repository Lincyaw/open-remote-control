import { usePortForwardStore } from '../store/portForwardStore';

describe('portForwardStore', () => {
  let mockDateNow: jest.SpyInstance;
  let dateNowCounter = 0;

  beforeEach(() => {
    usePortForwardStore.setState({ forwards: [] });
    dateNowCounter = 0;
    mockDateNow = jest.spyOn(Date, 'now').mockImplementation(() => {
      dateNowCounter += 1;
      return 1700000000000 + dateNowCounter;
    });
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  it('adds a port forward', () => {
    const { addForward } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    const { forwards } = usePortForwardStore.getState();
    expect(forwards).toHaveLength(1);
    expect(forwards[0].localPort).toBe(3000);
    expect(forwards[0].remoteHost).toBe('localhost');
    expect(forwards[0].remotePort).toBe(8080);
    expect(forwards[0].status).toBe('active');
  });

  it('generates unique id for each forward', () => {
    const { addForward } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });
    addForward({ localPort: 3001, remoteHost: 'localhost', remotePort: 8081 });

    const { forwards } = usePortForwardStore.getState();
    expect(forwards).toHaveLength(2);
    expect(forwards[0].id).toBeDefined();
    expect(forwards[1].id).toBeDefined();
    expect(forwards[0].id).not.toBe(forwards[1].id);
  });

  it('removes a port forward', () => {
    const { addForward, removeForward } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    const { forwards: before } = usePortForwardStore.getState();
    expect(before).toHaveLength(1);

    removeForward(before[0].id);

    const { forwards: after } = usePortForwardStore.getState();
    expect(after).toHaveLength(0);
  });

  it('removes only the specified port forward', () => {
    const { addForward, removeForward } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });
    addForward({ localPort: 3001, remoteHost: 'localhost', remotePort: 8081 });

    const { forwards: before } = usePortForwardStore.getState();
    expect(before).toHaveLength(2);

    removeForward(before[0].id);

    const { forwards: after } = usePortForwardStore.getState();
    expect(after).toHaveLength(1);
    expect(after[0].localPort).toBe(3001);
  });

  it('updates port forward status to error', () => {
    const { addForward, updateStatus } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    const { forwards: before } = usePortForwardStore.getState();
    expect(before[0].status).toBe('active');

    updateStatus(before[0].id, 'error');

    const { forwards: after } = usePortForwardStore.getState();
    expect(after[0].status).toBe('error');
  });

  it('updates port forward status to stopped', () => {
    const { addForward, updateStatus } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    const { forwards: before } = usePortForwardStore.getState();
    updateStatus(before[0].id, 'stopped');

    const { forwards: after } = usePortForwardStore.getState();
    expect(after[0].status).toBe('stopped');
  });

  it('updates only the specified port forward status', () => {
    const { addForward, updateStatus } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });
    addForward({ localPort: 3001, remoteHost: 'localhost', remotePort: 8081 });

    const { forwards: before } = usePortForwardStore.getState();
    updateStatus(before[0].id, 'error');

    const { forwards: after } = usePortForwardStore.getState();
    expect(after[0].status).toBe('error');
    expect(after[1].status).toBe('active');
  });

  it('handles removing non-existent forward gracefully', () => {
    const { addForward, removeForward } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    removeForward('non-existent-id');

    const { forwards } = usePortForwardStore.getState();
    expect(forwards).toHaveLength(1);
  });

  it('handles updating non-existent forward gracefully', () => {
    const { addForward, updateStatus } = usePortForwardStore.getState();
    addForward({ localPort: 3000, remoteHost: 'localhost', remotePort: 8080 });

    updateStatus('non-existent-id', 'error');

    const { forwards } = usePortForwardStore.getState();
    expect(forwards).toHaveLength(1);
    expect(forwards[0].status).toBe('active');
  });
});
