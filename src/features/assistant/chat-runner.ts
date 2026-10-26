import { create } from 'zustand';

import { AiError, askFocoIa, type AiErrorCode } from '@/services/ai-chat';
import { useFocoStore } from '@/store/use-foco-store';

type ChatStatus = {
  thinking: boolean;
  error: { code: AiErrorCode; message: string } | null;
  /** Reply that just arrived and is being "typed" on screen; older messages show at once. */
  typingMessageId: string | null;
};

/** Per-chat request state. Not persisted: it only lives while the app is open. */
export const useChatStatus = create<{ byChat: Record<string, ChatStatus> }>(() => ({ byChat: {} }));

const idle: ChatStatus = { thinking: false, error: null, typingMessageId: null };

function setStatus(chatId: string, status: ChatStatus) {
  useChatStatus.setState((state) => ({ byChat: { ...state.byChat, [chatId]: status } }));
}

export function getChatStatus(chatId: string): ChatStatus {
  return useChatStatus.getState().byChat[chatId] ?? idle;
}

/** Asks Foco IA to answer the chat's last message and stores the reply. Safe to call again to retry. */
export async function runChatTurn(chatId: string) {
  if (getChatStatus(chatId).thinking) return;
  setStatus(chatId, { thinking: true, error: null, typingMessageId: null });

  const state = useFocoStore.getState();
  const history = state.chatMessages.filter((message) => message.chatId === chatId);
  const summary = state.chats.find((chat) => chat.id === chatId)?.summary ?? '';
  try {
    const reply = await askFocoIa(history, summary, state);
    const store = useFocoStore.getState();
    const messageId = store.addChatMessage({ chatId, role: 'assistant', content: reply.message, plan: reply.plan, actions: reply.actions });
    if (reply.remember.length) store.addAiMemories(reply.remember);
    if (reply.chatSummary) store.updateChatSummary(chatId, reply.chatSummary);
    const chat = store.chats.find((item) => item.id === chatId);
    if (chat?.title === 'Nuevo chat' && reply.chatTitle) store.renameChat(chatId, reply.chatTitle);
    setStatus(chatId, { ...idle, typingMessageId: messageId });
  } catch (error) {
    const aiError = error instanceof AiError ? error : new AiError('failed', 'Foco IA no ha podido responder. Vuelve a intentarlo.');
    setStatus(chatId, { ...idle, error: { code: aiError.code, message: aiError.message } });
  }
}

/** The typing animation of the latest reply finished (or was skipped). */
export function finishTyping(chatId: string) {
  if (getChatStatus(chatId).typingMessageId) setStatus(chatId, { ...getChatStatus(chatId), typingMessageId: null });
}

/** Adds the student's message and asks for the reply. Ignored while a reply is on its way. */
export function sendChatMessage(chatId: string, text: string) {
  const content = text.trim();
  if (!content || getChatStatus(chatId).thinking) return;
  useFocoStore.getState().addChatMessage({ chatId, role: 'user', content, plan: [] });
  void runChatTurn(chatId);
}
