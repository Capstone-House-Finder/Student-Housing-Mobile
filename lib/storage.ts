import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getString: (key: string) => AsyncStorage.getItem(key),
  setString: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key)
};

export const secureStorage = {
  getToken: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setToken: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('Failed to save secure token', e);
    }
  },
  removeToken: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('Failed to remove secure token', e);
    }
  },
  getBiometricPreference: async () => {
    try {
      const value = await SecureStore.getItemAsync('biometric_enabled');
      return value === 'true';
    } catch {
      return false;
    }
  },
  setBiometricPreference: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('biometric_enabled', enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save biometric preference', e);
    }
  }
};
