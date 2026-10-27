import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

export type AddMenuOption<T extends string> = {
  value: T;
  label: string;
  /** SF Symbol (iOS) and Material Symbol (Android/web). */
  ios: SFSymbol;
  md: AndroidSymbol;
};

type AddMenuProps<T extends string> = {
  visible: boolean;
  /** Screen Y of the tap that opened it; the menu drops just below. */
  anchorY: number;
  options: AddMenuOption<T>[];
  onPick: (value: T) => void;
  onClose: () => void;
};

const OPEN_MS = 150;

/**
 * Small menu that drops from a top-right «add» button. It's a plain overlay, not a native Modal:
 * iOS animates a Modal away even with animationType="none", which made the menu slide up before
 * vanishing. Render it as the last child of the screen (outside any ScrollView) so it covers it.
 */
export function AddMenu<T extends string>({ visible, anchorY, options, onPick, onClose }: AddMenuProps<T>) {
  const theme = useTheme();
  const layerRef = useRef<ComponentRef<typeof View>>(null);
  // Window Y of this layer's top, to turn the tap's window Y into a position inside the layer.
  const [layerTop, setLayerTop] = useState(0);

  return (
    <View
      ref={layerRef}
      pointerEvents={visible ? 'auto' : 'none'}
      onLayout={() => layerRef.current?.measureInWindow((_x, y) => setLayerTop(y))}
      style={StyleSheet.absoluteFill}>
      {visible ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} style={StyleSheet.absoluteFill} />
          <Animated.View
            entering={FadeIn.duration(OPEN_MS)}
            accessibilityViewIsModal
            style={[
              styles.menu,
              { top: anchorY - layerTop + spacing.lg, backgroundColor: theme.surf, borderColor: theme.line, shadowColor: theme.shadow },
            ]}>
            {options.map((option, index) => (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                onPress={() => {
                  onClose();
                  onPick(option.value);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
                  pressed && { backgroundColor: theme.track },
                ]}>
                <SymbolIcon ios={option.ios} other={option.md} color={theme.accent} size={18} />
                <Typography style={styles.label}>{option.label}</Typography>
              </Pressable>
            ))}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** Top-right icon button that opens an AddMenu (or acts directly). */
export function AddButton({ accessibilityLabel, onPress, compact = false }: {
  accessibilityLabel: string;
  onPress: (anchorY: number) => void;
  /** Smaller, for section headings; the touch area stays 44 pt. */
  compact?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={compact ? 4 : undefined}
      onPress={(event) => onPress(event.nativeEvent.pageY)}
      style={({ pressed }) => [styles.button, compact && styles.compact, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
      <SymbolIcon ios={compact ? 'plus' : 'square.and.pencil'} other={compact ? 'add' : 'edit_square'} color={theme.accentInk} size={compact ? 18 : 20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    right: spacing.lg,
    minWidth: 200,
    borderRadius: radii.chip,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: { minHeight: minTouchSize + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  label: { fontWeight: '600' },
  compact: { width: 36, height: 36, borderRadius: 18 },
  button: {
    width: minTouchSize + 4,
    height: minTouchSize + 4,
    borderRadius: (minTouchSize + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
