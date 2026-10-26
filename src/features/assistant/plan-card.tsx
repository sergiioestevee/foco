import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { fromDayKey } from '@/features/calendar/calendar-utils';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';
import type { PlanItem } from '@/types/models';

type PlanCardProps = {
  plan: PlanItem[];
  added: boolean;
  onAdd: () => void;
  onAdjust: () => void;
};

export function PlanCard({ plan, added, onAdd, onAdjust }: PlanCardProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }]}>
        {plan.map((item, index) => {
          const day = fromDayKey(item.date);
          const color = subjects.find((subject) => subject.id === item.subjectId)?.color ?? theme.accent;
          return (
            <View
              key={`${item.date}-${item.startTime}-${index}`}
              accessible
              accessibilityLabel={`${format(day, "EEEE d 'de' MMMM", { locale: es })}, de ${item.startTime} a ${item.endTime}: ${item.title}`}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
              <Typography kind="caption" style={styles.day}>{format(day, 'EEE', { locale: es }).replace('.', '').toUpperCase()}</Typography>
              <View style={styles.copy}>
                <Typography numberOfLines={2} style={styles.title}>{item.title}</Typography>
                <Typography kind="secondary" style={styles.time}>{item.startTime}–{item.endTime}</Typography>
              </View>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      {added ? (
        <View style={styles.added}>
          <SymbolIcon ios="checkmark.circle.fill" other="check_circle" color={theme.ok} size={18} />
          <Typography style={{ color: theme.ok, fontWeight: '700' }}>Añadido al calendario</Typography>
        </View>
      ) : (
        <View style={styles.actions}>
          <ActionButton label="Añadir al calendario" onPress={onAdd} style={styles.action} />
          <ActionButton label="Ajustar" variant="secondary" onPress={onAdjust} style={styles.action} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, maxWidth: '88%' },
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  day: { width: 40, fontWeight: '700' },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  time: { fontSize: 14 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  added: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
});
