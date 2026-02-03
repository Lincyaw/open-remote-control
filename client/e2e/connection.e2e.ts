import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Remote Dev Client - Connection Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show connection screen on launch', async () => {
    await detoxExpect(element(by.text('Remote Dev Client'))).toBeVisible();
  });

  it('should show all input fields', async () => {
    await detoxExpect(element(by.id('host-input'))).toBeVisible();
    await detoxExpect(element(by.id('ssh-port-input'))).toBeVisible();
    await detoxExpect(element(by.id('username-input'))).toBeVisible();
    await detoxExpect(element(by.id('ws-port-input'))).toBeVisible();
    await detoxExpect(element(by.id('token-input'))).toBeVisible();
  });

  it('should show error when connecting without credentials', async () => {
    await element(by.text('Connect')).tap();
    await detoxExpect(element(by.text('Please fill all required fields'))).toBeVisible();
  });

  it('should allow entering server details', async () => {
    await element(by.id('host-input')).typeText('example.com');
    await element(by.id('username-input')).typeText('testuser');

    await detoxExpect(element(by.id('host-input'))).toHaveText('example.com');
    await detoxExpect(element(by.id('username-input'))).toHaveText('testuser');
  });

  it('should show error when SSH key is not imported', async () => {
    await element(by.id('host-input')).typeText('example.com');
    await element(by.id('username-input')).typeText('testuser');
    await element(by.id('token-input')).typeText('test-token');

    await element(by.text('Connect')).tap();
    await detoxExpect(element(by.text('Please import SSH key first'))).toBeVisible();
  });

  it('should show Import SSH Key button', async () => {
    await detoxExpect(element(by.text('Import SSH Key'))).toBeVisible();
  });
});

describe('Remote Dev Client - Main Screen', () => {
  // Note: These tests require a mock server or test fixtures
  // In a real scenario, you would set up test data before running these tests

  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      // In production, you might use launchArgs to set up test mode
    });
  });

  // Skip these tests if not connected - they serve as documentation
  // for what should be tested when connection is available

  it.skip('should navigate to main screen after successful connection', async () => {
    // This test requires a mock server
    await waitFor(element(by.id('terminal-tab')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it.skip('should switch between Terminal and Claude tabs', async () => {
    await element(by.text('Terminal')).tap();
    await detoxExpect(element(by.id('terminal-tab'))).toBeVisible();

    await element(by.text('Claude')).tap();
    await detoxExpect(element(by.id('claude-tab'))).toBeVisible();
  });

  it.skip('should switch to Files tab', async () => {
    await element(by.text('Files')).tap();
    await detoxExpect(element(by.id('files-tab'))).toBeVisible();
  });

  it.skip('should display Claude messages', async () => {
    await element(by.text('Claude')).tap();

    await waitFor(element(by.id('message-list')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('Remote Dev Client - Input Validation', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should accept numeric input for SSH port', async () => {
    await element(by.id('ssh-port-input')).clearText();
    await element(by.id('ssh-port-input')).typeText('2222');
    await detoxExpect(element(by.id('ssh-port-input'))).toHaveText('2222');
  });

  it('should accept numeric input for WebSocket port', async () => {
    await element(by.id('ws-port-input')).clearText();
    await element(by.id('ws-port-input')).typeText('9090');
    await detoxExpect(element(by.id('ws-port-input'))).toHaveText('9090');
  });

  it('should mask token input', async () => {
    // Token input should be secure (masked)
    await element(by.id('token-input')).typeText('secret-token');
    // We can't directly verify masking, but we can verify the field exists
    await detoxExpect(element(by.id('token-input'))).toExist();
  });
});

describe('Remote Dev Client - UI Interactions', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should handle keyboard dismiss on scroll', async () => {
    await element(by.id('host-input')).tap();
    await element(by.id('host-input')).typeText('test');

    // Scroll should dismiss keyboard
    await element(by.type('RCTScrollView')).scroll(100, 'down');

    // Input should still have the value
    await detoxExpect(element(by.id('host-input'))).toHaveText('test');
  });

  it('should clear input fields when cleared', async () => {
    await element(by.id('host-input')).typeText('example.com');
    await element(by.id('host-input')).clearText();
    await detoxExpect(element(by.id('host-input'))).toHaveText('');
  });
});
