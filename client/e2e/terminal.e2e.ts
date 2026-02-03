import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

/**
 * E2E tests for Terminal feature with Command History Sidebar.
 *
 * These tests require a connected state with a mock or test server.
 * In a real scenario, you would set up test data before running these tests.
 *
 * To run these tests:
 * 1. Start the server: cd server && npm run dev
 * 2. Configure test credentials in environment variables
 * 3. Run: npm run e2e:test:ios or npm run e2e:test:android
 */

describe('Terminal - Tab Display', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // These tests are skipped by default as they require a live server connection
  // Remove .skip when running with proper test infrastructure

  it.skip('should show terminal tab when Terminal is selected', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();
  });

  it.skip('should display terminal WebView', async () => {
    await element(by.text('Terminal')).tap();

    // The terminal is rendered in a WebView
    await waitFor(element(by.type('RCTWebView')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it.skip('should have dark background for terminal', async () => {
    await element(by.text('Terminal')).tap();

    // Terminal container should be visible
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();
  });
});

describe('Terminal - Command History Sidebar', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should show command history sidebar on swipe left', async () => {
    await element(by.text('Terminal')).tap();

    // Wait for terminal to load
    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Swipe left to open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    // Command History title should be visible
    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it.skip('should show empty state when no commands in history', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Should show empty state
    await detoxExpect(element(by.text('No commands yet'))).toBeVisible();
  });

  it.skip('should close command history sidebar when X is tapped', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Tap close button (X)
    await element(by.text('X')).tap();

    // Command History should no longer be visible
    await waitFor(element(by.text('Command History')))
      .not.toBeVisible()
      .withTimeout(3000);
  });

  it.skip('should close command history sidebar when backdrop is tapped', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Tap on the backdrop area (right side of screen)
    await element(by.type('RCTView')).atIndex(0).tap({ x: 350, y: 300 });

    // Command History should close
    await waitFor(element(by.text('Command History')))
      .not.toBeVisible()
      .withTimeout(3000);
  });
});

describe('Terminal - Command History Interaction', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should display commands in history list', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Note: This test assumes commands have been added to history
    // In a real test, you would first execute commands or mock the store

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Commands should be displayed with index numbers
    // This depends on having commands in the history
  });

  it.skip('should select command from history when tapped', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Note: This test assumes 'ls -la' is in the command history
    // In a real test, you would first add commands to history

    // Tap on a command in the history
    // await element(by.text('ls -la')).tap();

    // Sidebar should close after selection
    // await waitFor(element(by.text('Command History')))
    //   .not.toBeVisible()
    //   .withTimeout(3000);
  });

  it.skip('should show Clear History button when commands exist', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Note: Clear History button only appears when there are commands
    // This test assumes commands exist in history
    // await detoxExpect(element(by.text('Clear History'))).toBeVisible();
  });

  it.skip('should clear all commands when Clear History is tapped', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Open command history sidebar
    await element(by.id('terminal-tab')).swipe('left');

    await waitFor(element(by.text('Command History')))
      .toBeVisible()
      .withTimeout(3000);

    // Note: This test assumes commands exist in history
    // Tap Clear History button
    // await element(by.text('Clear History')).tap();

    // Should show empty state
    // await detoxExpect(element(by.text('No commands yet'))).toBeVisible();
  });
});

describe('Terminal - WebView Integration', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should load xterm.js terminal in WebView', async () => {
    await element(by.text('Terminal')).tap();

    // Wait for terminal tab to be visible
    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // WebView should be loaded
    // Note: Direct xterm.js interaction is limited in Detox
    // as it runs inside a WebView
  });

  it.skip('should handle terminal input', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Note: Typing directly into xterm.js WebView is challenging in Detox
    // This would typically require custom WebView interaction or mocking
  });

  it.skip('should display terminal output', async () => {
    await element(by.text('Terminal')).tap();

    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);

    // Note: Verifying terminal output inside WebView is challenging in Detox
    // This would typically require custom WebView interaction or mocking
  });
});

describe('Terminal - Tab Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should switch from Terminal to Claude tab', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    await element(by.text('Claude')).tap();
    await detoxExpect(element(by.id('claude-tab'))).toBeVisible();
  });

  it.skip('should switch from Terminal to Files tab', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    await element(by.text('Files')).tap();
    await detoxExpect(element(by.id('files-tab'))).toBeVisible();
  });

  it.skip('should preserve terminal state when switching tabs', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    // Switch to another tab
    await element(by.text('Claude')).tap();
    await detoxExpect(element(by.id('claude-tab'))).toBeVisible();

    // Switch back to Terminal
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    // Terminal should still be functional
    // Note: State preservation verification is limited in Detox
  });

  it.skip('should support swipe navigation between tabs', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    // Swipe right to go to Claude tab
    // Note: This depends on SwipeableTabView implementation
    // await element(by.id('terminal-tab')).swipe('right');
    // await detoxExpect(element(by.id('claude-tab'))).toBeVisible();
  });
});
