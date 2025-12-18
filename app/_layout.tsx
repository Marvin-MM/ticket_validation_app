import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/store/auth";
import { initDatabase } from "@/lib/database";
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from "@/store/app";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const inMainGroup = segments[0] === '(main)';

    if (!isAuthenticated && inMainGroup) {
      console.log('[Navigation] Not authenticated, redirecting to login');
      router.replace('/');
    } else if (isAuthenticated && !inMainGroup) {
      console.log('[Navigation] Authenticated, redirecting to main');
      router.replace('/scanner');
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

function RootLayoutNav() {
  useProtectedRoute();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

export default function RootLayout() {
  const { initAuth } = useAuthStore();
  const { setOnline } = useAppStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        console.log('[App] Database initialized');
        
        await initAuth();
        console.log('[App] Auth initialized');
        
        const unsubscribe = NetInfo.addEventListener((state) => {
          setOnline(state.isConnected ?? true);
        });
        
        await SplashScreen.hideAsync();
        
        return unsubscribe;
      } catch (error) {
        console.error('[App] Initialization error:', error);
        await SplashScreen.hideAsync();
      }
    };

    initialize();
  }, [initAuth, setOnline]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
