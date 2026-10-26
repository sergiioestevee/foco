import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, spacing } from '@/theme/tokens';

const focusTimeLabels = { morning: 'por la mañana', afternoon: 'por la tarde', night: 'por la noche' } as const;

/** Perfil: what Foco IA remembers across chats, with per-item and full deletion. */
export function AiMemorySection() {
  const theme = useTheme();
  const memories = useFocoStore((state) => state.aiMemories);
  const focusTime = useFocoStore((state) => state.profile?.focusTime);
  const deleteAiMemory = useFocoStore((state) => state.deleteAiMemory);
  const clearAiMemories = useFocoStore((state) => state.clearAiMemories);

  const confirmClear = () => {
    Alert.alert('Borrar la memoria', 'Foco IA olvidará todo lo que ha aprendido de ti. Tus chats no se borran.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: clearAiMemories },
    ]);
  };

  return (
    <Surface style={styles.section}>
      <Typography kind="heading">Memoria de Foco IA</Typography>
      <Typography kind="secondary">
        Lo que Foco IA tiene en cuenta en todos tus chats, además de tus asignaturas, exámenes y tareas.
      </Typography>
      {focusTime ? (
        <View style={styles.item}>
          <SymbolIcon ios="person" other="person" color={theme.muted} size={16} />
          <Typography style={styles.text}>Prefieres estudiar {focusTimeLabels[focusTime]} (de tu perfil)</Typography>
        </View>
      ) : null}
      {memories.map((memory) => (
        <View key={memory.id} style={styles.item}>
          <SymbolIcon ios="sparkles" other="auto_awesome" color={theme.accent} size={16} />
          <Typography style={styles.text}>{memory.text}</Typography>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Olvidar: ${memory.text}`}
            onPress={() => deleteAiMemory(memory.id)}
            style={styles.remove}>
            <SymbolIcon ios="xmark" other="close" color={theme.muted} size={16} />
          </Pressable>
        </View>
      ))}
      {!memories.length ? (
        <Typography kind="caption">Aún no recuerda nada más. Cuando le cuentes cómo estudias, lo apuntará aquí.</Typography>
      ) : (
        <ActionButton label="Borrar toda la memoria" variant="secondary" onPress={confirmClear} />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchSize },
  text: { flex: 1 },
  remove: { width: minTouchSize, height: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
