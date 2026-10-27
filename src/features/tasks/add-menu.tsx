import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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

const OPEN_MS = 160;
const CLOSE_MS = 120;

/** Small menu that drops from a top-right «add» button, with one row per choice. */
export function AddMenu<T extends string>({ visible, anchorY, options, onPick, onClose }: AddMenuProps<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Stays mounted while the closing animation plays; the Modal itself doesn't animate.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  // The choice runs once the menu is gone: on iOS, presenting the form while this modal is still
  // on screen makes both stutter.
  const pendingRef = useRef<T | null>(null);

  if (visible && !mounted) setMounted(true);

  const runPending = () => {
    const value = pendingRef.current;
    pendingRef.current = null;
    if (value !== null) onPick(value);
  };

  const unmount = () => {
    setMounted(false);
    // iOS reports the modal gone through onDismiss; elsewhere it's gone right away.
    if (Platform.OS !== 'ios') runPending();
  };

  useEffect(() => {
    if (visible) {
      progress.value = reduceMotion ? 1 : withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
    } else {
      // With «Reduce motion» the close is instant, but still reported through the animation callback.
      progress.value = withTiming(0, { duration: reduceMotion ? 0 : CLOSE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(unmount);
      });
    }
    // unmount only reads refs and setters; re-running on its identity would restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, progress]);

  // Shrinks towards the button (top right) instead of sliding.
  const menuStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  const choose = (value: T) => {
    pendingRef.current = value;
    onClose();
  };

  return (
    <Modal animationType="none" onDismiss={runPending} onRequestClose={onClose} transparent visible={mounted}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.menu,
          { top: anchorY + spacing.lg, backgroundColor: theme.surf, borderColor: theme.line, shadowColor: theme.shadow },
          menuStyle,
        ]}>
        {options.map((option, index) => (
          <Pressable
            key={option.value}
            accessibilityRole="menuitem"
            onPress={() => choose(option.value)}
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
    </Modal>
  );
}

/** Top-right icon button that opens an AddMenu (or acts directly). */
export function AddButton({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: (anchorY: number) => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(event) => onPress(event.nativeEvent.pageY)}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
      <SymbolIcon ios="square.and.pencil" other="edit_square" color={theme.accentInk} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    transformOrigin: 'top right',
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
  button: {
    width: minTouchSize + 4,
    height: minTouchSize + 4,
    borderRadius: (minTouchSize + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
