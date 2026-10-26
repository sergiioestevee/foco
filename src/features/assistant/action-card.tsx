import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';
import type { AiAction } from '@/types/models';

import { describeAiAction, type ActionTone } from './ai-actions';

type ActionCardProps = {
  actions: AiAction[];
  applied: boolean;
  /** A newer, unconfirmed proposal in the chat replaces this one (e.g. after "me equivoqué de fecha"). */
  superseded: boolean;
  onConfirm: () => void;
  onAdjust: () => void;
};

/** The changes Foco IA proposes (add, change or delete exams, tasks and routines), saved only when the student confirms. */
export function ActionCard({ actions, applied, superseded, onConfirm, onAdjust }: ActionCardProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const onlyAdds = actions.every((action) => action.type.startsWith('add'));
  const toneColor: Record<ActionTone, string> = { add: theme.accent, update: theme.warn, delete: theme.danger };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }, superseded && styles.superseded]}>
        {actions.map((action, index) => {
          const { tone, verb, title, detail, icon } = describeAiAction(action, subjects);
          return (
            <View
              key={`${action.type}-${index}`}
              accessible
              accessibilityLabel={`${verb}: ${title}. ${detail}`}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
              <SymbolIcon ios={icon.ios} other={icon.other} color={toneColor[tone]} size={20} />
              <View style={styles.copy}>
                <Typography kind="caption" style={[styles.verb, { color: toneColor[tone] }]}>{verb.toLocaleUpperCase()}</Typography>
                <Typography
                  numberOfLines={2}
                  style={[styles.title, tone === 'delete' && { textDecorationLine: 'line-through' }]}>
                  {title}
                </Typography>
                {detail ? <Typography kind="secondary" style={styles.detail}>{detail}</Typography> : null}
              </View>
            </View>
          );
        })}
      </View>
      {applied ? (
        <View style={styles.applied}>
          <SymbolIcon ios="checkmark.circle.fill" other="check_circle" color={theme.ok} size={18} />
          <Typography style={{ color: theme.ok, fontWeight: '700' }}>{onlyAdds ? 'Añadido' : 'Cambios guardados'}</Typography>
        </View>
      ) : superseded ? (
        <Typography kind="secondary" style={styles.note}>Sustituido por la propuesta más reciente</Typography>
      ) : (
        <View style={styles.actions}>
          <ActionButton label={onlyAdds ? 'Añadir' : 'Confirmar cambios'} onPress={onConfirm} style={styles.action} />
          <ActionButton label="Corregir" variant="secondary" onPress={onAdjust} style={styles.action} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, maxWidth: '88%' },
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  copy: { flex: 1, gap: 2 },
  verb: { fontWeight: '800', letterSpacing: 0.4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  detail: { fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  superseded: { opacity: 0.5 },
  note: { fontSize: 14 },
  applied: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
});
