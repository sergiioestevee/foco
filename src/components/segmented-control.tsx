import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii } from '@/theme/tokens';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  /** null leaves every option unselected, for questions without a default answer. */
  value: T | null;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={[styles.container, { backgroundColor: theme.surf, borderColor: theme.line }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.item, selected && { backgroundColor: theme.track }]}>
            <Typography
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ fontSize: 15, color: selected ? theme.text : theme.muted, fontWeight: selected ? '700' : '600' }}>
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 4, borderRadius: radii.button + 2, borderWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, minHeight: minTouchSize, borderRadius: radii.sm + 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
