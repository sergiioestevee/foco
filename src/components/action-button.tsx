import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

type ActionButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'plain';
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({
  label,
  icon,
  variant = 'primary',
  style,
  ...props
}: ActionButtonProps) {
  const theme = useTheme();
  const backgroundColor = variant === 'primary' ? theme.accent : variant === 'secondary' ? theme.surf : 'transparent';
  const foregroundColor = variant === 'primary' ? theme.accentInk : variant === 'plain' ? theme.accent : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: pressed ? 0.82 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.line },
        style,
      ]}>
      <View style={styles.content}>
        {icon}
        <Typography style={{ color: foregroundColor, fontWeight: '700' }}>{label}</Typography>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: Math.max(minTouchSize, 52), borderRadius: radii.button, justifyContent: 'center', paddingHorizontal: spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
