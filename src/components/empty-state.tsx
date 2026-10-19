import { StyleSheet, View } from 'react-native';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

type EmptyStateProps = {
  symbol: SFSymbol;
  androidSymbol?: AndroidSymbol;
  title: string;
  message: string;
};

export function EmptyState({ symbol, androidSymbol = 'check_circle', title, message }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.track }]}>
        <SymbolIcon ios={symbol} other={androidSymbol} color={theme.accent} size={26} />
      </View>
      <Typography kind="heading" style={styles.title}>{title}</Typography>
      <Typography kind="secondary" style={styles.message}>{message}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.sm },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', maxWidth: 280 },
});
