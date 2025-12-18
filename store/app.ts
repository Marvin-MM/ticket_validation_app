import { create } from 'zustand';

interface AppState {
  isOfflineMode: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  setOfflineMode: (enabled: boolean) => void;
  setOnline: (online: boolean) => void;
  setLastSyncTime: (time: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOfflineMode: false,
  isOnline: true,
  lastSyncTime: null,
  
  setOfflineMode: (enabled: boolean) => {
    console.log('[App] Offline mode:', enabled);
    set({ isOfflineMode: enabled });
  },
  
  setOnline: (online: boolean) => {
    console.log('[App] Network status:', online ? 'online' : 'offline');
    set({ isOnline: online });
  },
  
  setLastSyncTime: (time: string) => {
    set({ lastSyncTime: time });
  },
}));
