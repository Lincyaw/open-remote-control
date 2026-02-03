import { useTerminalStore } from '../store/terminalStore';

describe('terminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({ commandHistory: [] });
  });

  it('adds command to history', () => {
    const { addCommand } = useTerminalStore.getState();
    addCommand('ls -la');

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toContain('ls -la');
    expect(commandHistory).toHaveLength(1);
  });

  it('keeps most recent commands first', () => {
    const { addCommand } = useTerminalStore.getState();
    addCommand('first');
    addCommand('second');
    addCommand('third');

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory[0]).toBe('third');
    expect(commandHistory[1]).toBe('second');
    expect(commandHistory[2]).toBe('first');
  });

  it('limits history to 100 commands', () => {
    const { addCommand } = useTerminalStore.getState();
    for (let i = 0; i < 110; i++) {
      addCommand(`command-${i}`);
    }

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toHaveLength(100);
  });

  it('removes oldest commands when limit exceeded', () => {
    const { addCommand } = useTerminalStore.getState();
    for (let i = 0; i < 110; i++) {
      addCommand(`command-${i}`);
    }

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory[0]).toBe('command-109');
    expect(commandHistory[99]).toBe('command-10');
    expect(commandHistory).not.toContain('command-0');
    expect(commandHistory).not.toContain('command-9');
  });

  it('clears history', () => {
    const { addCommand, clearHistory } = useTerminalStore.getState();
    addCommand('test1');
    addCommand('test2');
    addCommand('test3');

    expect(useTerminalStore.getState().commandHistory).toHaveLength(3);

    clearHistory();

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toHaveLength(0);
  });

  it('handles empty command', () => {
    const { addCommand } = useTerminalStore.getState();
    addCommand('');

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toHaveLength(1);
    expect(commandHistory[0]).toBe('');
  });

  it('preserves command with special characters', () => {
    const { addCommand } = useTerminalStore.getState();
    const specialCommand = 'echo "hello world" | grep -E "^[a-z]+" && ls -la';
    addCommand(specialCommand);

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory[0]).toBe(specialCommand);
  });

  it('allows duplicate commands', () => {
    const { addCommand } = useTerminalStore.getState();
    addCommand('ls');
    addCommand('ls');
    addCommand('ls');

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toHaveLength(3);
    expect(commandHistory.every((cmd) => cmd === 'ls')).toBe(true);
  });

  it('maintains order after clear and re-add', () => {
    const { addCommand, clearHistory } = useTerminalStore.getState();
    addCommand('old1');
    addCommand('old2');
    clearHistory();
    addCommand('new1');
    addCommand('new2');

    const { commandHistory } = useTerminalStore.getState();
    expect(commandHistory).toHaveLength(2);
    expect(commandHistory[0]).toBe('new2');
    expect(commandHistory[1]).toBe('new1');
  });
});
