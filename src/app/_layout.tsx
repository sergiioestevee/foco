import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSyncTracking } from '@/data/sync-engine';
import { BOOT_MIN_DURATION, BootScreen } from '@/features/entry/boot-screen';
import { useFocoStore } from '@/store/use-foco-store';
import { syncTaskReminders } from '@/services/notification-service';
import { fontAssets } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme, bg } = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || fontError !== null;
  const hasHydrated = useFocoStore((state) => state.hasHydrated);
  const hasCompletedFirstRun = useFocoStore((state) => state.hasCompletedFirstRun);
  const profile = useFocoStore((state) => state.profile);
  const tasks = useFocoStore((state) => state.tasks);
  const notificationsEnabled = useFocoStore((state) => state.settings.notificationsEnabled);
  const reminderMinutesBefore = useFocoStore((state) => state.settings.reminderMinutesBefore);
  const segments = useSegments();
  const isEntryFlow = segments[0] === 'welcome' || segments[0] === 'account' || segments[0] === 'onboarding';
  const [bootMinElapsed, setBootMinElapsed] = useState(false);
  const showBoot = !hasHydrated || !bootMinElapsed;

  useEffect(() => {
    if (!hasHydrated || !fontsReady) return;

    if ((!hasCompletedFirstRun || !profile) && !isEntryFlow) {
      router.replace('/welcome');
    } else if (hasCompletedFirstRun && profile && (segments[0] === 'welcome' || segments[0] === 'account')) {
      router.replace('/');
    }
  }, [fontsReady, hasCompletedFirstRun, hasHydrated, isEntryFlow, profile, segments]);

  useEffect(() => {
    if (hasHydrated) void startSyncTracking();
  }, [hasHydrated]);

  // The native splash only shows the logo; BootScreen takes over at the same position once text can render.
  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hide();
    const timer = setTimeout(() => setBootMinElapsed(true), BOOT_MIN_DURATION);
    return () => clearTimeout(timer);
  }, [fontsReady]);

  useEffect(() => {
    if (hasHydrated) void syncTaskReminders(tasks, { notificationsEnabled, reminderMinutesBefore }).catch(() => undefined);
  }, [hasHydrated, notificationsEnabled, reminderMinutesBefore, tasks]);

  if (!fontsReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: bg }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: bg },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="subjects" options={{ presentation: 'modal' }} />
            <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
            <Stack.Screen name="account" />
            <Stack.Screen name="onboarding" />
          </Stack>
          {showBoot ? <BootScreen /> : null}
        </View>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
