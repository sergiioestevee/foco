import { ActionSheetIOS, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

export type AddChoice = 'task' | 'exam' | 'routine' | 'goal' | 'project';

const choices: { value: AddChoice; label: string }[] = [
  { value: 'task', label: 'Tarea' },
  { value: 'exam', label: 'Examen' },
  { value: 'routine', label: 'Rutina' },
  { value: 'goal', label: 'Objetivo' },
  { value: 'project', label: 'Proyecto' },
];

/** iOS: native action sheet for the Tareas + button. Other platforms render `AddMenu` instead. */
export function showAddMenu(onPick: (choice: AddChoice) => void) {
  ActionSheetIOS.showActionSheetWithOptions(
    { title: '¿Qué quieres añadir?', options: [...choices.map((choice) => choice.label), 'Cancelar'], cancelButtonIndex: choices.length },
    (index) => {
      if (index < choices.length) onPick(choices[index].value);
    },
  );
}

/** Same choices as a bottom menu, for Android and web (their alerts allow only three buttons). */
export function AddMenu({ visible, onPick, onClose }: { visible: boolean; onPick: (choice: AddChoice) => void; onClose: () => void }) {
  const theme = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.surf }]}>
          <Typography kind="secondary" style={styles.title}>¿Qué quieres añadir?</Typography>
          {[...choices, { value: null, label: 'Cancelar' }].map((choice) => (
            <Pressable
              key={choice.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                if (choice.value) onPick(choice.value);
              }}
              style={[styles.option, { borderTopColor: theme.line }]}>
              <Typography style={{ fontWeight: choice.value ? '600' : '700', color: choice.value ? theme.text : theme.muted }}>{choice.label}</Typography>
            </Pressable>
          ))}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, paddingTop: spacing.md },
  title: { textAlign: 'center', marginBottom: spacing.xs },
  option: { minHeight: minTouchSize + 8, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
