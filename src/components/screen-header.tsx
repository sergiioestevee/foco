import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/typography';
import { spacing } from '@/theme/tokens';

type ScreenHeaderProps = PropsWithChildren<{ title: string; subtitle?: string }>;

export function ScreenHeader({ title, subtitle, children }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Typography kind="title">{title}</Typography>
        {subtitle ? <Typography kind="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{subtitle}</Typography> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xl },
  copy: { flex: 1, gap: spacing.xxs },
});
