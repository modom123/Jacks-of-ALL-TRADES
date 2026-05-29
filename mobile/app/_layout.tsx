import { useEffect, createContext, useContext } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

type AuthContextType = ReturnType<typeof useAuth>;
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

export default function RootLayout() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lions.dark },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: Colors.lions.black },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account', headerShown: false }} />
        <Stack.Screen name="apply" options={{ title: 'Apply for Apprenticeship' }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="(donor)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </AuthContext.Provider>
  );
}
