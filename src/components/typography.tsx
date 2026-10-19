import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontForWeight } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';

type TextKind = 'title' | 'heading' | 'body' | 'secondary' | 'caption';

type TypographyProps = PropsWithChildren<TextProps & { kind?: TextKind }>;

export function Typography({ kind = 'body', style, children, ...props }: TypographyProps) {
  const theme = useTheme();
  const { fontWeight, ...flattened }: TextStyle = StyleSheet.flatten([
    styles.base,
    styles[kind],
    { color: kind === 'secondary' || kind === 'caption' ? theme.muted : theme.text },
    style,
  ]);

  return (
    <Text allowFontScaling {...props} style={[flattened, { fontFamily: fontForWeight(fontWeight) }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '500' },
  secondary: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
