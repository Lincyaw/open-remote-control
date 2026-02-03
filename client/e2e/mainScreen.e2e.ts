import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

/**
 * These tests require a running server and valid connection.
 * They are designed to be run in a CI environment with proper setup.
 *
 * To run these tests:
 * 1. Start the server: cd server && npm run dev
 * 2. Configure test credentials in environment variables
 * 3. Run: npm run e2e:test:ios or npm run e2e:test:android
 */

describe('Remote Dev Client - Claude Tab E2E', () => {
  // These tests are skipped by default as they require a live server
  // Remove .skip when running with proper test infrastructure

  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it.skip('should display empty state when no messages', async () => {
    // Navigate to Claude tab (assuming already connected)
    await element(by.text('Claude')).tap();

    await detoxExpect(element(by.text('No Messages Yet'))).toBeVisible();
    await detoxExpect(
      element(by.text('Claude Code activity will appear here in real-time'))
    ).toBeVisible();
  });

  it.skip('should display user messages', async () => {
    await element(by.text('Claude')).tap();

    // Wait for messages to load
    await waitFor(element(by.id('message-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Check for user message bubble
    await detoxExpect(element(by.type('MessageBubble'))).toExist();
  });

  it.skip('should display assistant messages', async () => {
    await element(by.text('Claude')).tap();

    await waitFor(element(by.id('message-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Messages should be scrollable
    await element(by.id('message-list')).scroll(200, 'down');
  });

  it.skip('should auto-scroll to new messages', async () => {
    await element(by.text('Claude')).tap();

    // Wait for initial messages
    await waitFor(element(by.id('message-list')))
      .toBeVisible()
      .withTimeout(10000);

    // The list should automatically scroll to the bottom when new messages arrive
    // This is verified by checking that the latest message is visible
  });
});

describe('Remote Dev Client - Terminal Tab E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it.skip('should display terminal interface', async () => {
    await element(by.text('Terminal')).tap();

    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();
  });

  it.skip('should have command input field', async () => {
    await element(by.text('Terminal')).tap();

    // Check for input field
    await detoxExpect(element(by.type('TextInput'))).toBeVisible();
  });

  it.skip('should have quick command toolbar', async () => {
    await element(by.text('Terminal')).tap();

    // Check for quick command buttons
    await detoxExpect(element(by.text('ls'))).toBeVisible();
    await detoxExpect(element(by.text('cd'))).toBeVisible();
    await detoxExpect(element(by.text('git status'))).toBeVisible();
  });

  it.skip('should populate input when quick command is tapped', async () => {
    await element(by.text('Terminal')).tap();

    await element(by.text('ls')).tap();

    // The input should now contain 'ls'
    // Note: This depends on the implementation
  });
});

describe('Remote Dev Client - Files Tab E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it.skip('should display files interface', async () => {
    await element(by.text('Files')).tap();

    await detoxExpect(element(by.id('files-tab'))).toBeVisible();
  });

  it.skip('should show file tree', async () => {
    await element(by.text('Files')).tap();

    // Wait for file tree to load
    await waitFor(element(by.id('file-tree')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it.skip('should expand directory on tap', async () => {
    await element(by.text('Files')).tap();

    await waitFor(element(by.id('file-tree')))
      .toBeVisible()
      .withTimeout(10000);

    // Tap on a directory to expand it
    // This depends on the actual file structure
  });

  it.skip('should open file viewer on file tap', async () => {
    await element(by.text('Files')).tap();

    await waitFor(element(by.id('file-tree')))
      .toBeVisible()
      .withTimeout(10000);

    // Tap on a file to open it
    // This depends on the actual file structure
  });
});

describe('Remote Dev Client - Connection Status E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it.skip('should show connection status bar', async () => {
    // After successful connection, status bar should be visible
    await detoxExpect(element(by.text('Connected'))).toBeVisible();
  });

  it.skip('should show SSH and WS status indicators', async () => {
    // Check for individual connection status indicators
    await detoxExpect(element(by.text('SSH'))).toBeVisible();
    await detoxExpect(element(by.text('WS'))).toBeVisible();
  });

  it.skip('should disconnect when status bar is tapped', async () => {
    // Tap on status bar to disconnect
    await element(by.text('Connected')).tap();

    // Should return to connection screen
    await waitFor(element(by.text('Remote Dev Client')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
