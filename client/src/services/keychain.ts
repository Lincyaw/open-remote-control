import * as Keychain from 'react-native-keychain';

const SSH_KEY_SERVICE = 'com.remotedev.sshkey';
const SSH_KEY_USERNAME = 'ssh_private_key';

export class KeychainService {
  /**
   * Save SSH private key to secure storage
   */
  async savePrivateKey(key: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(SSH_KEY_USERNAME, key, {
        service: SSH_KEY_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
      console.log('SSH key saved to keychain');
    } catch (error) {
      console.error('Failed to save SSH key:', error);
      throw new Error('Failed to save SSH key to secure storage');
    }
  }

  /**
   * Retrieve SSH private key from secure storage
   */
  async getPrivateKey(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SSH_KEY_SERVICE,
      });

      if (credentials) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve SSH key:', error);
      return null;
    }
  }

  /**
   * Delete SSH private key from secure storage
   */
  async deletePrivateKey(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: SSH_KEY_SERVICE,
      });
      console.log('SSH key deleted from keychain');
    } catch (error) {
      console.error('Failed to delete SSH key:', error);
      throw new Error('Failed to delete SSH key from secure storage');
    }
  }

  /**
   * Check if SSH key exists in secure storage
   */
  async hasPrivateKey(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SSH_KEY_SERVICE,
      });
      return !!credentials;
    } catch (error) {
      console.error('Failed to check SSH key:', error);
      return false;
    }
  }

  /**
   * Generate a new SSH key pair (placeholder - requires native module)
   * In production, use a library like react-native-rsa-native
   */
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    throw new Error('Key generation not implemented - import existing key instead');
  }
}

export const keychainService = new KeychainService();
