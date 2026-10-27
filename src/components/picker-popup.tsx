import type { PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

type PickerPopupProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  /** Tap outside: just closes. */
  onClose: () => void;
  /** «Listo»; defaults to onClose. */
  onDone?: () => void;
  /** Optional second action under «Listo», e.g. «Quitar hora». */
  clearLabel?: string;
  onClear?: () => void;
}>;

/** Centred card for a native iOS picker; closes with «Listo» or a tap outside, so the form scrolls freely again. */
export function PickerPopup({ visible, title, onClose, onDone = onClose, clearLabel, onClear, children }: PickerPopupProps) {
  const theme = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }]}>
          <Typography kind="heading" style={styles.title}>{title}</Typography>
          {children}
          <ActionButton label="Listo" onPress={onDone} />
          {clearLabel && onClear ? <ActionButton label={clearLabel} variant="plain" onPress={onClear} style={styles.clear} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 360, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  title: { textAlign: 'center' },
  clear: { minHeight: 44 },
});
