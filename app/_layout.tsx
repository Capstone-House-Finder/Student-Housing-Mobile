import '@/global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { Toast } from '@/components/ui/Toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { useOfflineSync } from '@/hooks/useOfflineSync';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, networkMode: 'offlineFirst' } }
});

persistQueryClient({
  queryClient,
  persister: createAsyncStoragePersister({ storage: AsyncStorage })
});

function AppEffects() {
  usePushNotifications();
  useDeepLinking();
  useOfflineSync();
  return null;
}

function RootStack() {
  const { colors } = useTheme();
  const { isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  // Redirect unauthenticated users to login; kick authenticated users out of auth screens
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, segments, router]);

  return (
    <>
      <AppEffects />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reviews" options={{ title: 'My Reviews' }} />
        <Stack.Screen name="listing/[id]" options={{ title: 'Listing' }} />
        <Stack.Screen name="landlord/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="landlord/create-listing" options={{ title: 'Create listing' }} />
        <Stack.Screen name="landlord/edit-listing/[id]" options={{ title: 'Edit listing' }} />
      </Stack>
      <Toast />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootStack />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
