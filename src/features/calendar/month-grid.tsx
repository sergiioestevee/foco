import { format, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';
import { Directions, GestureDetector, useCompetingGestures, useFlingGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, spacing } from '@/theme/tokens';

import { getMonthGrid, toDayKey } from './calendar-utils';

const weekdayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type MonthGridProps = {
  /** Any day of the month shown. */
  month: Date;
  selectedKey: string;
  today: Date;
  hasEvents: (day: Date) => boolean;
  onSelect: (day: Date) => void;
  onChangeMonth: (delta: -1 | 1) => void;
};

/** Whole month with a dot on busy days; swipe or use the arrows to change month. */
export function MonthGrid({ month, selectedKey, today, hasEvents, onSelect, onChangeMonth }: MonthGridProps) {
  const theme = useTheme();
  const weeks = getMonthGrid(month);
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const next = useFlingGesture({ direction: Directions.LEFT, runOnJS: true, onActivate: () => onChangeMonth(1) });
  const previous = useFlingGesture({ direction: Directions.RIGHT, runOnJS: true, onActivate: () => onChangeMonth(-1) });
  const swipe = useCompetingGestures(next, previous);

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Typography kind="heading" style={styles.month}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Typography>
          <View style={styles.arrows}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => onChangeMonth(-1)} style={styles.arrow}>
              <SymbolIcon ios="chevron.left" other="chevron_left" color={theme.text} size={16} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => onChangeMonth(1)} style={styles.arrow}>
              <SymbolIcon ios="chevron.right" other="chevron_right" color={theme.text} size={16} />
            </Pressable>
          </View>
        </View>
        <View style={styles.week}>
          {weekdayLetters.map((letter) => (
            <Typography key={letter} kind="caption" style={[styles.letter, { color: theme.muted }]}>{letter}</Typography>
          ))}
        </View>
        <Animated.View key={format(month, 'yyyy-MM')} entering={FadeIn.duration(180)} style={styles.weeks}>
          {weeks.map((week) => (
            <View key={toDayKey(week[0])} style={styles.week}>
              {week.map((day) => {
                const selected = toDayKey(day) === selectedKey;
                const isToday = isSameDay(day, today);
                const inMonth = isSameMonth(day, month);
                const color = selected ? theme.accentInk : isToday ? theme.accent : inMonth ? theme.text : theme.muted;
                return (
                  <Pressable
                    key={toDayKey(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${format(day, "EEEE d 'de' MMMM", { locale: es })}${isToday ? ', hoy' : ''}`}
                    accessibilityState={{ selected }}
                    onPress={() => onSelect(day)}
                    style={styles.cell}>
                    <View style={[styles.circle, selected && { backgroundColor: theme.accent }, !selected && isToday && { borderWidth: 1.5, borderColor: theme.accent }]}>
                      <Typography style={[styles.number, { color, opacity: inMonth || selected ? 1 : 0.45 }]}>{day.getDate()}</Typography>
                    </View>
                    <View style={[styles.dot, { backgroundColor: hasEvents(day) ? theme.accent : 'transparent' }]} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { flex: 1 },
  arrows: { flexDirection: 'row', gap: spacing.xxs },
  arrow: { width: minTouchSize, height: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  weeks: { gap: 2 },
  week: { flexDirection: 'row' },
  letter: { flex: 1, textAlign: 'center', fontWeight: '700' },
  cell: { flex: 1, minHeight: minTouchSize + 4, alignItems: 'center', justifyContent: 'center', gap: 2 },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 16, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
