import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useGlobalSearchParams, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSyncTracking } from '@/data/sync-engine';
import { BOOT_MIN_DURATION, BootScreen } from '@/features/entry/boot-screen';
import { useFocoStore } from '@/store/use-foco-store';
import { syncReminders } from '@/services/notification-service';
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
  const exams = useFocoStore((state) => state.exams);
  const routines = useFocoStore((state) => state.routines);
  const settings = useFocoStore((state) => state.settings);
  const segments = useSegments();
  const isEntryFlow = segments[0] === 'welcome' || segments[0] === 'account' || segments[0] === 'onboarding';
  // «Ver la bienvenida» in Perfil walks the entry flow with ?preview=1; a set-up user isn't sent home then.
  const { preview } = useGlobalSearchParams<{ preview?: string }>();
  const [bootMinElapsed, setBootMinElapsed] = useState(false);
  const showBoot = !hasHydrated || !bootMinElapsed;

  useEffect(() => {
    if (!hasHydrated || !fontsReady) return;

    if ((!hasCompletedFirstRun || !profile) && !isEntryFlow) {
      router.replace('/welcome');
    } else if (hasCompletedFirstRun && profile && preview !== '1' && (segments[0] === 'welcome' || segments[0] === 'account')) {
      router.replace('/');
    }
  }, [fontsReady, hasCompletedFirstRun, hasHydrated, isEntryFlow, preview, profile, segments]);

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
    if (hasHydrated) void syncReminders({ tasks, exams, routines }, settings).catch(() => undefined);
  }, [hasHydrated, settings, tasks, exams, routines]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="routines" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true, sheetCornerRadius: 24 }} />
              <Stack.Screen name="goals" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true, sheetCornerRadius: 24 }} />
              <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
              <Stack.Screen name="account" />
              <Stack.Screen name="onboarding" />
            </Stack>
            {showBoot ? <BootScreen /> : null}
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
