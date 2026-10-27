import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { spacing } from '@/theme/tokens';

type SummaryCardProps = {
  /** 0–1, drives the ring. */
  progress: number;
  /** Big figure next to the ring, e.g. «8 de 10» or «60%». */
  value: string;
  label: string;
  details: string[];
};

/** Overview at the top of the Rutinas and Metas sheets: ring, big figure and a couple of lines. */
export function SummaryCard({ progress, value, label, details }: SummaryCardProps) {
  return (
    <Surface style={styles.card} accessible accessibilityLabel={[`${value} ${label}`, ...details].join('. ')}>
      <ProgressRing progress={progress} size={72} />
      <View style={styles.copy}>
        <Typography allowFontScaling={false} style={styles.value}>{value}</Typography>
        <Typography style={styles.label}>{label}</Typography>
        {details.map((detail) => <Typography key={detail} kind="secondary" style={styles.detail}>{detail}</Typography>)}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  copy: { flex: 1, gap: 1 },
  value: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  label: { fontSize: 15, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
});
