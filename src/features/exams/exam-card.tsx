import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';
import type { Exam } from '@/types/models';

import { formatCountdown, formatExamWhen, isExamPast } from './exam-utils';

type ExamCardProps = {
  exam: Exam;
  /** Shows the "PRÓXIMO EXAMEN" label used on Inicio. */
  isNext?: boolean;
  onPress: () => void;
};

export function ExamCard({ exam, isNext = false, onPress }: ExamCardProps) {
  const theme = useTheme();
  const subject = useFocoStore((state) => state.subjects.find((item) => item.id === exam.subjectId));
  const countdown = formatCountdown(exam.date);
  const title = [subject?.name, exam.title].filter(Boolean).join(' · ');
  const isPast = isExamPast(exam);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNext ? 'Próximo examen: ' : ''}${title}, ${formatExamWhen(exam)}, ${countdown}, ${exam.reviewProgress} % repasado`}
      accessibilityHint="Abre el examen para editarlo"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : isPast ? 0.7 : 1 },
      ]}>
      <View style={styles.top}>
        {isNext ? (
          <Typography kind="caption" style={[styles.label, { color: theme.warn }]}>PRÓXIMO EXAMEN</Typography>
        ) : (
          <View style={styles.subject}>
            <View style={[styles.dot, { backgroundColor: subject?.color ?? theme.muted }]} />
            <Typography kind="caption" numberOfLines={1}>{subject?.name ?? 'Sin asignatura'}</Typography>
          </View>
        )}
        <Typography kind="secondary" style={styles.countdown}>{countdown}</Typography>
      </View>
      <Typography numberOfLines={2} style={styles.title}>{isNext ? title : exam.title}</Typography>
      <Typography kind="secondary" style={styles.when}>{formatExamWhen(exam)}</Typography>
      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <View style={[styles.fill, { backgroundColor: theme.warn, width: `${exam.reviewProgress}%` }]} />
        </View>
        <Typography style={styles.progressLabel}>{exam.reviewProgress}% repasado</Typography>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.xxs },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  subject: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countdown: { fontSize: 14 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 },
  when: { fontSize: 15 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  track: { flex: 1, height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  progressLabel: { fontSize: 14, fontWeight: '700' },
});
