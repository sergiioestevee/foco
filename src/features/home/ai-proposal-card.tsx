import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import type { DailyProposal } from '@/services/ai-service';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

export function AiProposalCard({ proposal }: { proposal: DailyProposal }) {
  const theme = useTheme();
  const addStudyBlock = useFocoStore((state) => state.addStudyBlock);
  const proposedBlock = proposal.block;

  return (
    <View style={[styles.card, { backgroundColor: theme.aiBg }]}>
      <View style={styles.label}>
        <SymbolIcon ios="sparkles" other="auto_awesome" color={theme.accent} size={16} />
        <Typography style={{ color: theme.accent, fontWeight: '700' }}>Foco IA te propone</Typography>
      </View>
      <Typography style={styles.message}>{proposal.message}</Typography>
      <View style={styles.actions}>
        {proposedBlock ? (
          <ActionButton
            label="Añadir al día"
            style={styles.action}
            onPress={() => {
              addStudyBlock(proposedBlock);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          />
        ) : null}
        {proposal.alreadyPlanned ? (
          <View style={styles.added}>
            <SymbolIcon ios="checkmark.circle.fill" other="check_circle" color={theme.ok} size={18} />
            <Typography style={{ color: theme.ok, fontWeight: '700' }}>Añadido a tu día</Typography>
          </View>
        ) : null}
        <Link href="/assistant" asChild>
          <ActionButton label="Hablar con la IA" variant="secondary" style={styles.action} />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  message: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  action: { flexGrow: 1 },
  added: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexGrow: 1, minHeight: 52 },
});
