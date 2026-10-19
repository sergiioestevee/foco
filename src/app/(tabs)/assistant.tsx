import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { createAIService, type AssistantContext, type AssistantSuggestion } from '@/services/ai-service';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/tokens';

type ChatEntry = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AssistantSuggestion[];
};

const quickPrompts = ['Organízame la semana', 'Ayúdame con un objetivo', '¿Qué debería priorizar?'];
const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function AssistantScreen() {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  const tasks = useFocoStore((state) => state.tasks);
  const goals = useFocoStore((state) => state.goals);
  const scheduleBlocks = useFocoStore((state) => state.scheduleBlocks);
  const aiBackendUrl = useFocoStore((state) => state.settings.aiBackendUrl);
  const addTask = useFocoStore((state) => state.addTask);
  const updateTask = useFocoStore((state) => state.updateTask);
  const addScheduleBlock = useFocoStore((state) => state.addScheduleBlock);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hola. Puedo ayudarte a dividir un objetivo en tareas, reservar tiempo para estudiar o decidir por dónde empezar. Cuéntame qué tienes en mente.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());
  const context = useMemo<AssistantContext>(() => ({ subjects, projects, tasks, goals, scheduleBlocks }), [goals, projects, scheduleBlocks, subjects, tasks]);
  const service = useMemo(() => createAIService(aiBackendUrl), [aiBackendUrl]);

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isThinking) return;
    setDraft('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: trimmed }]);
    setIsThinking(true);
    try {
      const reply = await service.respond(trimmed, context);
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply.message,
        suggestions: reply.suggestions,
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: 'No he podido conectar con el asistente. Comprueba el endpoint en Ajustes o prueba de nuevo en modo local.',
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const acceptSuggestion = (suggestion: AssistantSuggestion) => {
    if (acceptedIds.has(suggestion.id)) return;
    if (suggestion.kind === 'task') {
      addTask({
        title: suggestion.title,
        notes: suggestion.notes,
        dueDate: suggestion.dueDate,
        priority: suggestion.priority,
        goalId: suggestion.goalId,
        categoryId: suggestion.categoryId,
        categoryType: suggestion.categoryType,
      });
    } else if (suggestion.kind === 'scheduleBlock') {
      addScheduleBlock({
        weekday: suggestion.weekday,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        place: suggestion.place,
        color: suggestion.color,
        categoryId: suggestion.categoryId,
        categoryType: suggestion.categoryType,
      });
    } else {
      updateTask(suggestion.taskId, { priority: suggestion.priority });
    }
    setAcceptedIds((current) => new Set(current).add(suggestion.id));
    void Haptics.selectionAsync();
  };

  const suggestionTitle = (suggestion: AssistantSuggestion) => {
    if (suggestion.kind === 'task') return `Tarea · ${suggestion.title}`;
    if (suggestion.kind === 'scheduleBlock') return `Bloque · ${weekdays[suggestion.weekday]} · ${suggestion.startTime}–${suggestion.endTime}`;
    return `Prioridad alta · ${suggestion.taskTitle}`;
  };

  return (
    <AppScreen>
      <ScreenHeader title="Foco IA" subtitle="Te ayuda a decidir qué estudiar y cuándo." />
      <View style={styles.chat}>
        {messages.map((message) => (
          <View key={message.id} style={[styles.messageGroup, message.role === 'user' && styles.userMessageGroup]}>
            <View style={[styles.bubble, { backgroundColor: message.role === 'user' ? theme.accent : theme.surf }]}>
              <Typography style={{ color: message.role === 'user' ? theme.accentInk : theme.text }}>{message.content}</Typography>
            </View>
            {message.suggestions?.map((suggestion) => {
              const accepted = acceptedIds.has(suggestion.id);
              return (
                <Surface key={suggestion.id} style={styles.suggestionCard}>
                  <Typography kind="secondary">{suggestionTitle(suggestion)}</Typography>
                  <ActionButton
                    label={accepted ? 'Añadido' : 'Aceptar propuesta'}
                    disabled={accepted}
                    variant={accepted ? 'secondary' : 'primary'}
                    onPress={() => acceptSuggestion(suggestion)}
                  />
                </Surface>
              );
            })}
          </View>
        ))}
        {isThinking ? <Typography kind="caption">Pensando una propuesta…</Typography> : null}
        {messages.length === 1 ? (
          <View style={styles.quickPrompts}>
            {quickPrompts.map((prompt) => (
              <Pressable key={prompt} onPress={() => void sendPrompt(prompt)} style={[styles.quickPrompt, { backgroundColor: theme.track }]}>
                <Typography kind="caption">{prompt}</Typography>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Mensaje para el asistente"
            maxLength={400}
            onChangeText={setDraft}
            onSubmitEditing={() => void sendPrompt(draft)}
            placeholder="¿Qué necesitas organizar?"
            placeholderTextColor={theme.muted}
            returnKeyType="send"
            style={[styles.input, { backgroundColor: theme.surf, color: theme.text }]}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityState={{ disabled: !draft.trim() || isThinking }}
            disabled={!draft.trim() || isThinking}
            onPress={() => void sendPrompt(draft)}
            style={[styles.sendButton, { backgroundColor: theme.accent, opacity: !draft.trim() || isThinking ? 0.5 : 1 }]}>
            <SymbolIcon ios="arrow.up" other="arrow_upward" color={theme.accentInk} size={19} />
          </Pressable>
        </View>
        <Typography kind="caption" style={styles.disclaimer}>Las respuestas de esta versión son propuestas de demostración. Revísalas antes de añadirlas.</Typography>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chat: { gap: spacing.md },
  messageGroup: { alignItems: 'flex-start', gap: spacing.sm },
  userMessageGroup: { alignItems: 'flex-end' },
  bubble: { maxWidth: '92%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionCard: { width: '100%', gap: spacing.sm, padding: spacing.md },
  quickPrompts: { gap: spacing.xs },
  quickPrompt: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  input: { minHeight: 48, flex: 1, borderRadius: 24, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: fonts.medium },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { textAlign: 'center', paddingBottom: spacing.md },
});
