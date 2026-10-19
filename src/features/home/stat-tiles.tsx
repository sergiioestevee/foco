import { StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { spacing } from '@/theme/tokens';

type StatTile = { label: string; value: string; accessibilityLabel: string };

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <Surface key={tile.label} inset={false} style={styles.tile} accessible accessibilityLabel={tile.accessibilityLabel}>
          <Typography kind="caption" numberOfLines={1}>{tile.label}</Typography>
          <Typography numberOfLines={1} adjustsFontSizeToFit style={styles.value}>{tile.value}</Typography>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: spacing.xxs, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 20 },
  value: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 },
});
