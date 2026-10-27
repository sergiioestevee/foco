import { addDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

import { toDayKey } from './calendar-utils';
import { useSwipePager } from './use-swipe-pager';

const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

type WeekStripProps = {
  /** Monday of the week shown. */
  weekStart: Date;
  selectedKey: string;
  today: Date;
  hasEvents: (day: Date) => boolean;
  onSelect: (day: Date) => void;
  onChangeWeek: (delta: -1 | 1) => void;
};

export function WeekStrip({ weekStart, selectedKey, today, hasEvents, onSelect, onChangeWeek }: WeekStripProps) {
  const theme = useTheme();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthLabel = format(days[3], 'MMMM yyyy', { locale: es });
  // The days follow the finger; left brings the next week, right the previous one.
  const pager = useSwipePager(toDayKey(weekStart), onChangeWeek);

  return (
    <GestureDetector gesture={pager.gesture}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Typography kind="heading" style={styles.month}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Typography>
          <View style={styles.arrows}>
            <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={() => pager.go(-1)} style={styles.arrow}>
              <SymbolIcon ios="chevron.left" other="chevron_left" color={theme.text} size={16} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Semana siguiente" onPress={() => pager.go(1)} style={styles.arrow}>
              <SymbolIcon ios="chevron.right" other="chevron_right" color={theme.text} size={16} />
            </Pressable>
          </View>
        </View>
        <View onLayout={pager.onLayout} style={styles.viewport}>
          <Animated.View style={[styles.days, pager.style]}>
            {days.map((day) => {
              const selected = toDayKey(day) === selectedKey;
              const isToday = isSameDay(day, today);
              const color = selected ? theme.accentInk : isToday ? theme.accent : theme.text;
              return (
                <Pressable
                  key={toDayKey(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${format(day, "EEEE d 'de' MMMM", { locale: es })}${isToday ? ', hoy' : ''}`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(day)}
                  style={[styles.day, { backgroundColor: selected ? theme.accent : theme.surf, borderColor: selected ? theme.accent : theme.line }]}>
                  <Typography kind="caption" style={{ color: selected ? theme.accentInk : theme.muted }}>{dayLetters[day.getDay()]}</Typography>
                  <Typography style={[styles.number, { color }]}>{day.getDate()}</Typography>
                  <View style={[styles.dot, { backgroundColor: hasEvents(day) ? (selected ? theme.accentInk : theme.accent) : 'transparent' }]} />
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { flex: 1 },
  arrows: { flexDirection: 'row', gap: spacing.xxs },
  arrow: { width: minTouchSize, height: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  // Clips the days while they slide, so they don't run over the screen edges.
  viewport: { overflow: 'hidden' },
  days: { flexDirection: 'row', gap: spacing.xxs },
  day: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.sm + 2, borderWidth: StyleSheet.hairlineWidth },
  number: { fontSize: 17, fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
