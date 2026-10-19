import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

type SurfaceProps = PropsWithChildren<ViewProps & { inset?: boolean }>;

export function Surface({ children, inset = true, style, ...props }: SurfaceProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.surface,
        { backgroundColor: theme.surf, borderColor: theme.line },
        inset && styles.inset,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth },
  inset: { padding: spacing.lg },
});
