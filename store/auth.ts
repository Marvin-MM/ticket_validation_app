import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Manager } from '@/types/api';

interface AuthState {
  manager: Manager | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setManager: (manager: Manager) => void;
  clearAuth: () => void;
  initAuth: () => Promise<void>;
}

const MANAGER_KEY = 'manager_data';

const saveManager = async (manager: Manager) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(MANAGER_KEY, JSON.stringify(manager));
    } else {
      await SecureStore.setItemAsync(MANAGER_KEY, JSON.stringify(manager));
    }
  } catch (error) {
    console.error('[Auth] Failed to save manager:', error);
  }
};

const loadManager = async (): Promise<Manager | null> => {
  try {
    if (Platform.OS === 'web') {
      const data = localStorage.getItem(MANAGER_KEY);
      return data ? JSON.parse(data) : null;
    } else {
      const data = await SecureStore.getItemAsync(MANAGER_KEY);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    console.error('[Auth] Failed to load manager:', error);
    return null;
  }
};

const removeManager = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(MANAGER_KEY);
    } else {
      await SecureStore.deleteItemAsync(MANAGER_KEY);
    }
  } catch (error) {
    console.error('[Auth] Failed to remove manager:', error);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  manager: null,
  isAuthenticated: false,
  isLoading: true,
  
  setManager: (manager: Manager) => {
    saveManager(manager);
    set({ manager, isAuthenticated: true });
  },
  
  clearAuth: () => {
    removeManager();
    set({ manager: null, isAuthenticated: false });
  },
  
  initAuth: async () => {
    const manager = await loadManager();
    set({ 
      manager, 
      isAuthenticated: !!manager, 
      isLoading: false 
    });
  },
}));
