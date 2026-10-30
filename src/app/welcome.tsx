import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ProgressRing } from '@/components/progress-ring';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

type Slide = { key: string; title: string; body: string; visual: ReactNode };

/** Staggered entrance for the first slide's pieces. */
const enter = (index: number) => FadeInDown.delay(120 + index * 90).duration(450);

export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const slides: Slide[] = [
    {
      key: 'course',
      title: 'Todo tu curso,\nen un solo sitio.',
      body: 'Exámenes, tareas, prácticas, proyectos y rutinas. Y una IA que te ayuda a decidir qué estudiar y cuándo.',
      visual: <CourseCards />,
    },
    {
      key: 'progress',
      title: 'Mira cómo avanzas\ncada día.',
      body: 'El anillo se completa con cada tarea que terminas. La racha y los objetivos te ayudan a mantener el ritmo.',
      visual: <ProgressPreview active={page === 1} />,
    },
    {
      key: 'ai',
      title: 'Un plan que se\nadapta a ti.',
      body: 'Foco IA tiene en cuenta tus exámenes, tus tareas y tus huecos libres, y te propone bloques de estudio concretos.',
      visual: <PlanPreview />,
    },
  ];

  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const goToAccount = () => router.push(preview === '1' ? { pathname: '/account', params: { preview: '1' } } : '/account');

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={goToAccount} hitSlop={8} style={styles.skip}>
          <Typography style={{ color: theme.accent, fontWeight: '700' }}>Saltar</Typography>
        </Pressable>
      </View>

      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={styles.carousel}>
        {slides.map((slide, index) => (
          <SlideView key={slide.key} slide={slide} index={index} width={width} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <Animated.View entering={enter(3)} style={styles.footer}>
        <View style={styles.dots} accessible accessibilityLabel={`Página ${page + 1} de ${slides.length}`}>
          {slides.map((slide, index) => (
            <PageDot key={slide.key} index={index} width={width} scrollX={scrollX} />
          ))}
        </View>
        <ActionButton label="Empezar" onPress={goToAccount} />
        <ActionButton label="Ya tengo cuenta" variant="plain" onPress={goToAccount} />
      </Animated.View>
    </View>
  );
}

/** The visual drifts slower than the page and the text fades, so slides feel layered as you swipe. */
function SlideView({ slide, index, width, scrollX }: { slide: Slide; index: number; width: number; scrollX: SharedValue<number> }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const visualStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, range, [0.9, 1, 0.9], Extrapolation.CLAMP) },
    ],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(scrollX.value, range, [width * 0.15, 0, -width * 0.15], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.visual, visualStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {slide.visual}
      </Animated.View>
      {/* Entrance and swipe animations on separate views: a layout animation would override the swipe's opacity and transform. */}
      <Animated.View entering={index === 0 ? enter(1) : undefined}>
        <Animated.View style={[styles.copy, textStyle]}>
          <Typography accessibilityRole="header" style={styles.title}>{slide.title}</Typography>
          <Typography kind="secondary" style={styles.body}>{slide.body}</Typography>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function PageDot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const theme = useTheme();
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [7, 22, 7], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, range, [theme.line, theme.accent, theme.line]),
  }));
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

function CourseCards() {
  const theme = useTheme();

  return (
    <View style={styles.cards}>
      <PreviewCard
        index={0}
        icon={<SymbolIcon ios="calendar" other="calendar_month" color={theme.warn} size={22} />}
        tint={theme.warn}
        title="Examen de Cálculo"
        subtitle="Viernes · faltan 5 días"
        trailing={<Typography style={{ color: theme.warn, fontWeight: '800' }}>40%</Typography>}
      />
      <PreviewCard
        icon={<SymbolIcon ios="checkmark" other="check" color={theme.ok} size={22} />}
        tint={theme.ok}
        title="Práctica 2 entregada"
        subtitle="Hoy · 5 de 8 tareas hechas"
        style={styles.indentedCard}
        index={1}
      />
      <PreviewCard
        index={2}
        icon={<SymbolIcon ios="sparkles" other="auto_awesome" color={theme.accent} size={22} />}
        tint={theme.accent}
        title="Foco IA"
        subtitle="Repasa 45 min a las 18:30"
      />
    </View>
  );
}

function PreviewCard({ index, icon, tint, title, subtitle, trailing, style }: {
  index: number;
  icon: ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 110).duration(500).springify()} style={style}>
      <Surface inset={false} style={styles.previewCard}>
        <View style={[styles.previewIcon, { backgroundColor: `${tint}22` }]}>{icon}</View>
        <View style={styles.previewCopy}>
          <Typography numberOfLines={1} style={styles.previewTitle}>{title}</Typography>
          <Typography kind="secondary" numberOfLines={1} style={styles.previewSubtitle}>{subtitle}</Typography>
        </View>
        {trailing}
      </Surface>
    </Animated.View>
  );
}

/** The ring fills when its slide comes into view. */
function ProgressPreview({ active }: { active: boolean }) {
  return (
    <Surface style={styles.progressCard}>
      <ProgressRing progress={active ? 0.62 : 0} size={104} />
      <View style={styles.previewCopy}>
        <Typography style={styles.progressPercent}>62%</Typography>
        <Typography style={styles.previewTitle}>del día completado</Typography>
        <Typography kind="secondary" style={styles.previewSubtitle}>5 de 8 tareas · racha de 6 días</Typography>
      </View>
    </Surface>
  );
}

function PlanPreview() {
  const theme = useTheme();
  const rows = [
    { day: 'LUN', title: 'Práctica 2: terminar y probar', time: '17:00–19:00', color: theme.warn },
    { day: 'MAR', title: 'Cálculo: límites', time: '18:00–19:30', color: theme.accent },
    { day: 'JUE', title: 'Simulacro de examen', time: '17:30–19:30', color: theme.ok },
  ];

  return (
    <View style={[styles.planCard, { backgroundColor: theme.aiBg }]}>
      {rows.map((row, index) => (
        <View key={row.day} style={[styles.planRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
          <Typography kind="caption" style={styles.planDay}>{row.day}</Typography>
          <View style={styles.previewCopy}>
            <Typography numberOfLines={1} style={styles.previewTitle}>{row.title}</Typography>
            <Typography kind="secondary" style={styles.previewSubtitle}>{row.time}</Typography>
          </View>
          <View style={[styles.planDot, { backgroundColor: row.color }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg },
  skip: { minHeight: minTouchSize, justifyContent: 'center' },
  carousel: { flex: 1 },
  slide: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  copy: { gap: spacing.md },
  visual: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1 },
  body: { fontSize: 17, lineHeight: 25 },
  footer: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
  cards: { gap: spacing.sm },
  indentedCard: { marginLeft: spacing.xl },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  previewIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewCopy: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  previewSubtitle: { fontSize: 14, lineHeight: 19 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  progressPercent: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1.2 },
  planCard: { borderRadius: radii.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  planDay: { width: 36, fontWeight: '700' },
  planDot: { width: 9, height: 9, borderRadius: 5 },
});
