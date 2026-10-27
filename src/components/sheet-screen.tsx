import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** Body of a route presented as a native form sheet. The title lives in the content: Android sheets show no stack header. */
export function SheetScreen({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.header}>
          <Typography kind="title" accessibilityRole="header" style={styles.title}>{title}</Typography>
          {action}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: 26, lineHeight: 32 },
});
