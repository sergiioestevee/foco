import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  bottomContent?: ReactNode;
}>;

export function AppScreen({ children, scroll = true, bottomContent }: AppScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {scroll ? (
        <ScrollView
          // React Native turns iOS inset adjustment off by default; on a tab this lets the end of the
          // content scroll clear of the floating tab bar instead of hiding under it.
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
      {bottomContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
