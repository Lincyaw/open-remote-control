import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

// Helper to find elements by placeholder text (using testID as fallback)
const byPlaceholder = (placeholder: string) => by.id(`input-${placeholder.toLowerCase().replace(/\s+/g, '-')}`);

/**
 * E2E tests for Port Forwarding feature.
 *
 * These tests require a connected state with a mock or test server.
 * In a real scenario, you would set up test data before running these tests.
 *
 * To run these tests:
 * 1. Start the server: cd server && npm run dev
 * 2. Configure test credentials in environment variables
 * 3. Run: npm run e2e:test:ios or npm run e2e:test:android
 */

describe('Port Forwarding - Panel Display', () => {
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

  it.skip('should show port forwarding panel', async () => {
    // Navigate to a tab that contains port forwarding (e.g., Ports tab if exists)
    await detoxExpect(element(by.text('Port Forwarding'))).toBeVisible();
  });

  it.skip('should show input fields for local and remote ports', async () => {
    await detoxExpect(element(byPlaceholder('Local Port'))).toBeVisible();
    await detoxExpect(element(byPlaceholder('Remote Host'))).toBeVisible();
    await detoxExpect(element(byPlaceholder('Remote Port'))).toBeVisible();
  });

  it.skip('should show Add Forward button', async () => {
    await detoxExpect(element(by.text('Add Forward'))).toBeVisible();
  });

  it.skip('should show empty state when no forwards configured', async () => {
    await detoxExpect(
      element(by.text('No port forwards configured'))
    ).toBeVisible();
  });
});

describe('Port Forwarding - Adding Forwards', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should add a port forward with valid ports', async () => {
    // Enter local port
    await element(byPlaceholder('Local Port')).typeText('3000');

    // Enter remote port
    await element(byPlaceholder('Remote Port')).typeText('8080');

    // Tap Add Forward button
    await element(by.text('Add Forward')).tap();

    // Verify the forward appears in the list
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it.skip('should show error for invalid port numbers', async () => {
    // Enter invalid port (non-numeric)
    await element(byPlaceholder('Local Port')).typeText('abc');
    await element(byPlaceholder('Remote Port')).typeText('8080');

    await element(by.text('Add Forward')).tap();

    // Should show error alert
    await detoxExpect(
      element(by.text('Please enter valid port numbers'))
    ).toBeVisible();
  });

  it.skip('should show error for out-of-range port numbers', async () => {
    // Enter port number out of valid range (1-65535)
    await element(byPlaceholder('Local Port')).typeText('70000');
    await element(byPlaceholder('Remote Port')).typeText('8080');

    await element(by.text('Add Forward')).tap();

    // Should show error alert
    await detoxExpect(
      element(by.text('Port numbers must be between 1 and 65535'))
    ).toBeVisible();
  });

  it.skip('should clear input fields after successful add', async () => {
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');

    await element(by.text('Add Forward')).tap();

    // Wait for the forward to be added
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Input fields should be cleared
    await detoxExpect(element(byPlaceholder('Local Port'))).toHaveText('');
    await detoxExpect(element(byPlaceholder('Remote Port'))).toHaveText('');
  });
});

describe('Port Forwarding - Managing Forwards', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should show Open button for active forwards', async () => {
    // First add a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    // Wait for forward to appear
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Open button should be visible
    await detoxExpect(element(by.text('Open'))).toBeVisible();
  });

  it.skip('should show Stop button for active forwards', async () => {
    // First add a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    // Wait for forward to appear
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Stop button should be visible
    await detoxExpect(element(by.text('Stop'))).toBeVisible();
  });

  it.skip('should open port in browser when Open is tapped', async () => {
    // First add a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    // Wait for forward to appear
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Tap Open button
    await element(by.text('Open')).tap();

    // Note: Linking.openURL behavior cannot be directly verified in Detox
    // In a real test, you would mock Linking and verify the call
  });

  it.skip('should stop a port forward when Stop is tapped', async () => {
    // First add a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    // Wait for forward to appear
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Tap Stop button
    await element(by.text('Stop')).tap();

    // Stop button should be replaced with Remove button
    await waitFor(element(by.text('Remove')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it.skip('should remove a stopped forward when Remove is tapped', async () => {
    // First add and stop a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.text('Stop')).tap();

    await waitFor(element(by.text('Remove')))
      .toBeVisible()
      .withTimeout(5000);

    // Tap Remove button
    await element(by.text('Remove')).tap();

    // Forward should be removed, empty state should appear
    await waitFor(element(by.text('No port forwards configured')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('Port Forwarding - Status Indicators', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.skip('should show green status dot for active forwards', async () => {
    // Add a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    // Wait for forward to appear
    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    // Status dot should be visible (green for active)
    // Note: Color verification is limited in Detox
    // This test verifies the forward item is displayed correctly
  });

  it.skip('should show gray status dot for stopped forwards', async () => {
    // Add and stop a forward
    await element(byPlaceholder('Local Port')).typeText('3000');
    await element(byPlaceholder('Remote Port')).typeText('8080');
    await element(by.text('Add Forward')).tap();

    await waitFor(element(by.text(':3000 -> localhost:8080')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.text('Stop')).tap();

    // Status should change to stopped (gray)
    // Note: Color verification is limited in Detox
  });
});
