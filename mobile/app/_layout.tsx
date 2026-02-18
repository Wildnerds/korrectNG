import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { usePushNotifications, clearBadge } from '../src/hooks/usePushNotifications';

function AppContent() {
  const { user } = useAuth();
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    // Clear badge when app opens
    clearBadge();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="artisan/[slug]" options={{ title: 'Artisan Profile' }} />
        <Stack.Screen name="search-results" options={{ title: 'Search Results' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
