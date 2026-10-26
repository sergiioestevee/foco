import { useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from 'expo-router/native-stack';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** If `transitionEnd` never arrives, open anyway after this long. */
const SHEET_FALLBACK_MS = 700;

/**
 * Runs `open` once, after the sheet has finished presenting. Opening a form (a React Native Modal)
 * while UIKit is still presenting the sheet can be refused on iOS.
 */
export function useOpenWhenSheetPresented(enabled: boolean, open: () => void) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const openRef = useRef(open);
  const firedRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    const run = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      openRef.current();
    };
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) run();
    });
    const fallback = setTimeout(run, SHEET_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [enabled, navigation]);
}

/** Body of a route presented as a native form sheet. The title lives in the content: Android sheets show no stack header. */
export function SheetScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Typography kind="title" accessibilityRole="header" style={styles.title}>{title}</Typography>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  title: { fontSize: 26, lineHeight: 32 },
});
