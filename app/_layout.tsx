import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/theme';
import { WorkspaceProvider } from '@/providers/workspace-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppTheme.accent,
    background: AppTheme.canvas,
    card: AppTheme.canvas,
    text: AppTheme.text,
    border: AppTheme.outline,
    notification: AppTheme.secondary,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WorkspaceProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ contentStyle: { backgroundColor: AppTheme.canvas } }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Details' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </WorkspaceProvider>
    </SafeAreaProvider>
  );
}
