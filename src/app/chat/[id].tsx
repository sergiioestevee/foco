import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { finishTyping, runChatTurn, sendChatMessage, useChatStatus } from '@/features/assistant/chat-runner';
import { ActionCard } from '@/features/assistant/action-card';
import { applyAiActions } from '@/features/assistant/ai-actions';
import { PlanCard } from '@/features/assistant/plan-card';
import { quickPrompts } from '@/features/assistant/quick-prompts';
import { TypewriterText } from '@/features/assistant/typewriter-text';
import { TypingIndicator } from '@/features/assistant/typing-indicator';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { ChatMessage } from '@/types/models';

const focusTimeLabels = { morning: 'por la mañana', afternoon: 'por la tarde', night: 'por la noche' } as const;

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  /** `draft` pre-fills the composer and `focus` opens the keyboard (both from the Foco IA screen). */
  const { id, draft: initialDraft, focus } = useLocalSearchParams<{ id: string; draft?: string; focus?: string }>();
  const chat = useFocoStore((state) => state.chats.find((item) => item.id === id));
  const allMessages = useFocoStore((state) => state.chatMessages);
  const focusTime = useFocoStore((state) => state.profile?.focusTime);
  const firstMemory = useFocoStore((state) => state.aiMemories[0]?.text);
  const createChat = useFocoStore((state) => state.createChat);
  const addStudyBlock = useFocoStore((state) => state.addStudyBlock);
  const markPlanAdded = useFocoStore((state) => state.markPlanAdded);
  const markActionsApplied = useFocoStore((state) => state.markActionsApplied);
  const status = useChatStatus((state) => state.byChat[id]);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [skippedTypingId, setSkippedTypingId] = useState<string | null>(null);
  const onTypingDone = useCallback(() => finishTyping(id), [id]);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const messages = allMessages.filter((message) => message.chatId === id);

  // A new chat the student leaves without writing anything isn't kept.
  useEffect(() => () => {
    const state = useFocoStore.getState();
    if (!state.chatMessages.some((message) => message.chatId === id)) state.deleteChat(id);
  }, [id]);
  const latestActionsId = messages.findLast((message) => message.actions?.length)?.id;
  const thinking = status?.thinking ?? false;
  const memoryHint = focusTime ? `prefieres estudiar ${focusTimeLabels[focusTime]}` : firstMemory;

  const send = (text: string) => {
    if (!id) return;
    sendChatMessage(id, text);
    setDraft('');
  };

  const addPlan = (message: ChatMessage) => {
    message.plan.forEach((item) => addStudyBlock(item));
    markPlanAdded(message.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmActions = (message: ChatMessage) => {
    applyAiActions(message.actions ?? []);
    markActionsApplied(message.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const startReply = (text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  };

  if (!chat) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.bg, paddingTop: insets.top + spacing.xl }]}>
        <Typography kind="heading">Este chat ya no existe</Typography>
        <ActionButton label="Volver a Foco IA" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, borderBottomColor: theme.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolIcon ios="chevron.left" other="chevron_left" color={theme.text} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Typography numberOfLines={1} style={styles.headerTitle}>{chat.title}</Typography>
          <Typography kind="caption" numberOfLines={1}>Foco IA · recuerda este chat</Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver todos los chats"
          onPress={() => router.navigate('/assistant')}
          style={[styles.headerButton, styles.headerBox, { backgroundColor: theme.surf, borderColor: theme.line }]}>
          <SymbolIcon ios="bubble.left" other="chat_bubble_outline" color={theme.text} size={18} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo chat"
          onPress={() => router.replace({ pathname: '/chat/[id]', params: { id: createChat() } })}
          style={[styles.headerButton, styles.headerBox, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
          <SymbolIcon ios="plus" other="add" color={theme.accentInk} size={20} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messages}
        // Follow the reply as it's typed; animating every step would stutter.
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !status?.typingMessageId })}>
        {memoryHint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Abre Perfil para ver lo que recuerda Foco IA"
            onPress={() => router.navigate('/profile')}
            style={[styles.memory, { backgroundColor: theme.surf }]}>
            <SymbolIcon ios="clock" other="schedule" color={theme.muted} size={14} />
            <Typography kind="caption" numberOfLines={1} style={styles.memoryText}>Tiene en cuenta: {memoryHint}</Typography>
          </Pressable>
        ) : null}

        {chat.summary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: summaryOpen }}
            accessibilityHint="Muestra u oculta lo hablado en este chat"
            onPress={() => setSummaryOpen((open) => !open)}
            style={[styles.summary, { backgroundColor: theme.aiBg }]}>
            <View style={styles.summaryHeader}>
              <SymbolIcon ios="doc.text" other="description" color={theme.accent} size={16} />
              <Typography style={[styles.summaryTitle, { color: theme.accent }]}>Resumen del chat</Typography>
              <SymbolIcon ios={summaryOpen ? 'chevron.up' : 'chevron.down'} other={summaryOpen ? 'expand_less' : 'expand_more'} color={theme.accent} size={14} />
            </View>
            {summaryOpen ? <Typography kind="secondary" style={styles.summaryText}>{chat.summary}</Typography> : null}
          </Pressable>
        ) : null}

        {!messages.length && !thinking ? (
          <View style={styles.intro}>
            <Typography kind="heading">¿En qué te ayudo?</Typography>
            <Typography kind="secondary">
              Pregúntame qué estudiar ahora o pídeme un plan para la semana. Conozco tus exámenes, tareas y huecos libres.
            </Typography>
          </View>
        ) : null}

        {messages.map((message) => {
          const typing = message.id === status?.typingMessageId;
          const textStyle = [styles.bubbleText, { color: message.role === 'user' ? theme.accentInk : theme.text }];
          return (
            <View key={message.id} style={styles.turn}>
              <Pressable
                accessibilityHint={typing ? 'Toca para ver la respuesta completa' : undefined}
                disabled={!typing}
                onPress={() => setSkippedTypingId(message.id)}
                style={[
                  styles.bubble,
                  message.role === 'user'
                    ? [styles.userBubble, { backgroundColor: theme.accent }]
                    : [styles.aiBubble, { backgroundColor: theme.surf, borderColor: theme.line }],
                ]}>
                {typing ? (
                  <TypewriterText text={message.content} skip={skippedTypingId === message.id} onDone={onTypingDone} style={textStyle} />
                ) : (
                  <Typography style={textStyle}>{message.content}</Typography>
                )}
              </Pressable>
              {message.role === 'assistant' && message.plan.length && !typing ? (
                <PlanCard plan={message.plan} added={message.planAdded} onAdd={() => addPlan(message)} onAdjust={() => startReply('Ajusta el plan: ')} />
              ) : null}
              {message.role === 'assistant' && message.actions?.length && !typing ? (
                <ActionCard
                  actions={message.actions}
                  applied={message.actionsApplied ?? false}
                  superseded={!message.actionsApplied && message.id !== latestActionsId}
                  onConfirm={() => confirmActions(message)}
                  onAdjust={() => startReply('Corrige: ')}
                />
              ) : null}
            </View>
          );
        })}

        {thinking ? <TypingIndicator prompt={messages.findLast((message) => message.role === 'user')?.content ?? ''} /> : null}

        {status?.error ? (
          <View style={[styles.error, { borderColor: theme.danger }]} accessibilityLiveRegion="polite">
            <Typography style={{ color: theme.text }}>{status.error.message}</Typography>
            {status.error.code !== 'daily_limit' ? (
              <ActionButton label="Reintentar" variant="secondary" onPress={() => void runChatTurn(chat.id)} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { borderTopColor: theme.line, paddingBottom: insets.bottom + spacing.sm }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
          {quickPrompts.slice(0, 2).map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              disabled={thinking}
              onPress={() => send(prompt)}
              style={({ pressed }) => [styles.chip, { borderColor: theme.line, opacity: thinking ? 0.5 : pressed ? 0.8 : 1 }]}>
              <Typography style={styles.chipLabel}>{prompt}</Typography>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            autoFocus={focus === '1'}
            accessibilityLabel="Mensaje para Foco"
            maxLength={2000}
            multiline
            onChangeText={setDraft}
            placeholder="Escribe a Foco IA…"
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityState={{ disabled: !draft.trim() || thinking }}
            disabled={!draft.trim() || thinking}
            onPress={() => send(draft)}
            style={[styles.send, { backgroundColor: theme.accent, opacity: !draft.trim() || thinking ? 0.5 : 1 }]}>
            <SymbolIcon ios="arrow.up" other="arrow_upward" color={theme.accentInk} size={22} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: minTouchSize + 4, height: minTouchSize + 4, alignItems: 'center', justifyContent: 'center' },
  headerBox: { borderRadius: radii.button, borderWidth: StyleSheet.hairlineWidth },
  headerCopy: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  messages: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  memory: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, maxWidth: '100%' },
  memoryText: { flexShrink: 1 },
  intro: { gap: spacing.xs, paddingVertical: spacing.xl },
  summary: { borderRadius: radii.chip, padding: spacing.md, gap: spacing.xs },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 28 },
  summaryTitle: { flex: 1, fontWeight: '700' },
  summaryText: { fontSize: 15, lineHeight: 22 },
  turn: { gap: spacing.sm },
  bubble: { maxWidth: '88%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  userBubble: { alignSelf: 'flex-end', borderRadius: 22, borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', borderRadius: 22, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: 17, lineHeight: 24 },
  error: { borderWidth: 1, borderRadius: radii.chip, padding: spacing.md, gap: spacing.sm },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.sm },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.md },
  chip: { minHeight: minTouchSize, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
  chipLabel: { fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: 56, maxHeight: 140, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingTop: 17, paddingBottom: 15, fontSize: 17, fontFamily: fonts.medium },
  send: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
