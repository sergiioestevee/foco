import { differenceInCalendarDays, formatDistanceToNowStrict, isBefore, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  Easing,
  LinearTransition,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppScreen } from '@/components/app-screen';
import { FocoLogo } from '@/components/foco-logo';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { sendChatMessage } from '@/features/assistant/chat-runner';
import { getUpcomingExams } from '@/features/exams/exam-utils';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Chat } from '@/types/models';

/** Staggered entrance, like the onboarding. */
const enter = (index: number) => FadeInDown.delay(index * 70).duration(420);

type Suggestion = {
  key: string;
  title: string;
  subtitle: string;
  icon: { ios: SFSymbol; other: AndroidSymbol };
  /** Sent straight away… */
  prompt?: string;
  /** …or left in the composer for the student to finish. */
  draft?: string;
};

export default function AssistantScreen() {
  const theme = useTheme();
  const name = useFocoStore((state) => state.profile?.name);
  const chats = useFocoStore((state) => state.chats);
  const chatMessages = useFocoStore((state) => state.chatMessages);
  const exams = useFocoStore((state) => state.exams);
  const tasks = useFocoStore((state) => state.tasks);
  const createChat = useFocoStore((state) => state.createChat);
  const deleteChat = useFocoStore((state) => state.deleteChat);
  // Empty chats are left behind only if the app closed while one was open; they aren't worth listing.
  const sortedChats = chats
    .filter((chat) => chatMessages.some((message) => message.chatId === chat.id))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const now = new Date();
  const nextExam = getUpcomingExams(exams, now)[0];
  const nextExamDays = nextExam ? differenceInCalendarDays(new Date(nextExam.date), now) : null;
  const weekEnd = addDays(startOfDay(now), 7);
  const dueThisWeek = tasks.filter((task) => !task.completed && task.dueDate && isBefore(new Date(task.dueDate), weekEnd)).length;
  const examsSoon = getUpcomingExams(exams, now).filter((exam) => isBefore(new Date(exam.date), addDays(weekEnd, 7))).length;

  const startChat = (options: { prompt?: string; draft?: string; focus?: boolean } = {}) => {
    const id = createChat();
    if (options.prompt) sendChatMessage(id, options.prompt);
    router.push({
      pathname: '/chat/[id]',
      params: { id, ...(options.draft ? { draft: options.draft } : {}), ...(options.focus ? { focus: '1' } : {}) },
    });
  };


  const suggestions: Suggestion[] = [
    { key: 'now', title: '¿Qué estudio ahora?', subtitle: 'Según tus huecos de hoy', icon: { ios: 'sparkles', other: 'auto_awesome' }, prompt: '¿Qué estudio ahora?' },
    { key: 'week', title: 'Plan de la semana', subtitle: 'Bloques en tus huecos libres', icon: { ios: 'calendar', other: 'calendar_month' }, prompt: 'Plan de la semana' },
    {
      key: 'exam',
      title: 'Preparar un examen',
      subtitle: nextExam ? `${nextExam.title} · ${nextExamDays === 0 ? 'hoy' : nextExamDays === 1 ? 'mañana' : `en ${nextExamDays} días`}` : 'Te ayudo a repartir el repaso',
      icon: { ios: 'graduationcap', other: 'school' },
      prompt: 'Prepárame el próximo examen',
    },
    { key: 'add', title: 'Apuntar algo', subtitle: 'Un examen, una entrega, una rutina', icon: { ios: 'plus', other: 'add' }, draft: 'Apúntame ' },
  ];

  const summary = [
    examsSoon ? `${examsSoon} ${examsSoon === 1 ? 'examen' : 'exámenes'} en dos semanas` : null,
    dueThisWeek ? `${dueThisWeek} ${dueThisWeek === 1 ? 'tarea' : 'tareas'} esta semana` : null,
  ].filter(Boolean).join(' · ');

  return (
    <AppScreen>
      <Animated.View entering={enter(0)} style={styles.header}>
        <Typography kind="title">Foco IA</Typography>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo chat"
          onPress={() => startChat({ focus: true })}
          style={({ pressed }) => [styles.newChat, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <SymbolIcon ios="square.and.pencil" other="edit_square" color={theme.accentInk} size={20} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={enter(1)} style={[styles.hero, { backgroundColor: theme.aiBg }]}>
        <View style={styles.heroTop}>
          <FocoLogo size={40} />
          <View style={styles.heroCopy}>
            <Typography style={styles.heroTitle}>{name ? `Hola, ${name}` : 'Hola'}</Typography>
            <Typography kind="secondary" style={styles.heroSubtitle}>
              {summary || 'Pregúntame qué estudiar o pídeme un plan.'}
            </Typography>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pregunta a Foco IA"
          accessibilityHint="Abre un chat nuevo"
          onPress={() => startChat({ focus: true })}
          style={({ pressed }) => [styles.ask, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
          <Typography numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.askLabel, { color: theme.muted }]}>
            Pregunta lo que necesites…
          </Typography>
          <View style={[styles.askSend, { backgroundColor: theme.accent }]}>
            <SymbolIcon ios="arrow.up" other="arrow_upward" color={theme.accentInk} size={18} />
          </View>
        </Pressable>
      </Animated.View>

      <View style={styles.grid}>
        {suggestions.map((suggestion, index) => (
          <Animated.View key={suggestion.key} entering={enter(2 + index)} style={styles.cell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${suggestion.title}. ${suggestion.subtitle}`}
              accessibilityHint={suggestion.prompt ? 'Empieza un chat con esta pregunta' : 'Abre un chat para que lo escribas'}
              onPress={() => startChat({ prompt: suggestion.prompt, draft: suggestion.draft, focus: !!suggestion.draft })}
              style={({ pressed }) => [styles.suggestion, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.suggestionIcon, { backgroundColor: theme.aiBg }]}>
                <SymbolIcon ios={suggestion.icon.ios} other={suggestion.icon.other} color={theme.accent} size={18} />
              </View>
              <Typography numberOfLines={2} style={styles.suggestionTitle}>{suggestion.title}</Typography>
              <Typography kind="secondary" numberOfLines={2} style={styles.suggestionSubtitle}>{suggestion.subtitle}</Typography>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={enter(6)} style={styles.section}>
        <Typography kind="secondary" style={styles.sectionTitle}>Chats recientes</Typography>
        {sortedChats.length ? (
          <Animated.View layout={settleUp} style={[styles.list, { backgroundColor: theme.surf, borderColor: theme.line }]}>
            {sortedChats.map((chat, index) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                preview={chatMessages.filter((message) => message.chatId === chat.id).at(-1)?.content ?? 'Sin mensajes todavía'}
                first={index === 0}
                onDelete={() => deleteChat(chat.id)}
              />
            ))}
          </Animated.View>
        ) : (
          <View style={[styles.emptyChats, { borderColor: theme.line }]}>
            <Typography kind="secondary" style={styles.emptyText}>
              Aquí aparecerán tus conversaciones. Foco IA recuerda cada chat para que puedas retomarlo otro día.
            </Typography>
          </View>
        )}
      </Animated.View>

      <Animated.View layout={settleUp} style={styles.privacy}>
        <SymbolIcon ios="lock" other="lock" color={theme.muted} size={13} />
        <Typography kind="caption" style={styles.privacyText}>
          Foco IA recibe tus asignaturas, exámenes, tareas y huecos libres, nunca tu nombre ni tu correo. Groq no guarda tus mensajes. Lo que recuerda lo puedes ver y borrar en Perfil.
        </Typography>
      </Animated.View>
    </AppScreen>
  );
}

const FADE_MS = 240;

/** A deleted chat fades and shrinks slightly in place… */
function fadeAway() {
  'worklet';
  const timing = { duration: FADE_MS, easing: Easing.out(Easing.cubic) };
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: { opacity: withTiming(0, timing), transform: [{ scale: withTiming(0.94, timing) }] },
  };
}

/** …and only once it's gone do the chats below (and the card's edge) glide up into the gap. */
const settleUp = LinearTransition.delay(FADE_MS - 40).duration(300).easing(Easing.inOut(Easing.cubic));

/** How far (as a share of the row) a swipe must go for letting go to ask about deleting the chat. */
const DELETE_THRESHOLD = 0.4;

/** Same kind of warning as "Empezar desde cero" in Perfil. */
function askToDelete(chat: Chat, onDelete: () => void) {
  Alert.alert(
    'Borrar chat',
    `Se borrarán «${chat.title}» y todos sus mensajes. Foco IA dejará de recordar lo que hablasteis en este chat.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: onDelete },
    ],
    { cancelable: true },
  );
}

/**
 * Swipe left past the threshold (or long-press) to delete. The row never stays open: on release it springs back
 * and the warning appears; confirming slides the chat off to the left.
 */
function ChatRow({ chat, preview, first, onDelete }: {
  chat: Chat;
  preview: string;
  first: boolean;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  /** Set while the swipe is past the threshold, read when the finger lifts. */
  const armed = useRef(false);
  const disarmedAt = useRef(0);

  const setArmed = (value: boolean) => {
    if (value && !armed.current) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!value && armed.current) disarmedAt.current = Date.now();
    armed.current = value;
  };

  return (
    <Animated.View
      exiting={fadeAway}
      layout={settleUp}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ReanimatedSwipeable
        friction={1.4}
        // Never reachable, so the row always springs back on release instead of staying open.
        rightThreshold={width * 2}
        overshootRight={false}
        onSwipeableWillClose={() => {
          // The spring back can cross the threshold before this runs, so a disarm a moment ago still counts.
          if (!armed.current && Date.now() - disarmedAt.current > 150) return;
          armed.current = false;
          disarmedAt.current = 0;
          askToDelete(chat, onDelete);
        }}
        // The hint fills the row, so the swipe can travel far enough to cross the threshold.
        renderRightActions={(progress) => <DeleteHint progress={progress} onArmedChange={setArmed} />}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${chat.title}. ${preview}`}
          accessibilityHint="Abre el chat. Desliza a la izquierda o mantén pulsado para borrarlo."
          accessibilityActions={[{ name: 'delete', label: 'Borrar chat' }]}
          onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'delete') askToDelete(chat, onDelete); }}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } })}
          onLongPress={() => askToDelete(chat, onDelete)}
          style={({ pressed }) => [
            styles.chat,
            { backgroundColor: pressed ? theme.track : theme.surf },
            !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
          ]}>
          <View style={styles.chatCopy}>
            <View style={styles.chatTop}>
              <Typography numberOfLines={1} style={styles.chatTitle}>{chat.title}</Typography>
              <Typography kind="caption">{formatDistanceToNowStrict(new Date(chat.updatedAt), { locale: es })}</Typography>
            </View>
            <Typography kind="secondary" numberOfLines={1} style={styles.preview}>{preview}</Typography>
          </View>
          <SymbolIcon ios="chevron.right" other="chevron_right" color={theme.muted} size={14} />
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

/**
 * What shows behind the row while swiping: a bin in a soft red bubble that grows with the swipe, then turns solid,
 * pops and says "Suelta para borrar" once letting go will ask to delete.
 */
function DeleteHint({ progress, onArmedChange }: { progress: SharedValue<number>; onArmedChange: (armed: boolean) => void }) {
  const theme = useTheme();
  const armed = useSharedValue(0);

  useAnimatedReaction(
    () => progress.value >= DELETE_THRESHOLD,
    (isArmed, wasArmed) => {
      if (isArmed === wasArmed) return;
      armed.value = withTiming(isArmed ? 1 : 0, { duration: 160 });
      scheduleOnRN(onArmedChange, isArmed);
    },
  );

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08], [0, 1], Extrapolation.CLAMP),
    transform: [{
      scale: armed.value > 0.5
        ? withSpring(1.12, { damping: 10, stiffness: 260 })
        : interpolate(progress.value, [0, DELETE_THRESHOLD], [0.5, 1], Extrapolation.CLAMP),
    }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: armed.value }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: armed.value,
    transform: [{ translateX: (1 - armed.value) * 8 }],
  }));

  return (
    <View style={styles.hint} importantForAccessibility="no-hide-descendants">
      <Animated.View style={labelStyle}>
        <Typography style={[styles.hintLabel, { color: theme.danger }]}>Suelta para borrar</Typography>
      </Animated.View>
      <Animated.View style={[styles.bubble, { backgroundColor: `${theme.danger}26` }, bubbleStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.bubbleFill, { backgroundColor: theme.danger }, fillStyle]} />
        <SymbolIcon ios="trash.fill" other="delete" color={theme.danger} size={18} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.bubbleIcon, fillStyle]}>
          <SymbolIcon ios="trash.fill" other="delete" color="#FFFFFF" size={18} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  newChat: { width: minTouchSize + 4, height: minTouchSize + 4, borderRadius: (minTouchSize + 4) / 2, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radii.card, padding: spacing.lg, gap: spacing.lg, marginBottom: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 15, lineHeight: 21 },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
  },
  askLabel: { flex: 1, fontSize: 16 },
  askSend: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  // Two columns: half the row minus half the gap.
  cell: { flexBasis: '47%', flexGrow: 1 },
  suggestion: { flex: 1, gap: spacing.xxs, padding: spacing.md, borderRadius: radii.chip, borderWidth: StyleSheet.hairlineWidth, minHeight: 124 },
  suggestionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  suggestionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  suggestionSubtitle: { fontSize: 13, lineHeight: 18 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  list: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  chat: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, minHeight: minTouchSize },
  hint: { flex: 1, minWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, paddingRight: spacing.lg },
  hintLabel: { fontSize: 14, fontWeight: '700' },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bubbleFill: { borderRadius: 20 },
  bubbleIcon: { alignItems: 'center', justifyContent: 'center' },
  chatCopy: { flex: 1, gap: 2 },
  chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chatTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  preview: { fontSize: 14 },
  emptyChats: { borderRadius: radii.card, borderWidth: 1, borderStyle: 'dashed', padding: spacing.lg },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  privacy: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  privacyText: { flex: 1, lineHeight: 17 },
});
