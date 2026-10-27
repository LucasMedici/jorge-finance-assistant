// Lógica do chat (funções puras, sem React), testada em __tests__/chat.test.ts
import { isAxiosError } from 'axios';
import { format, isSameDay, isSameYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTransactionType } from '../../components/correctTransaction';
import { formatCurrency } from '../../global/formatCurrency';
import type { Transaction } from '../../services/transactions';

/** Item da conversa. Só existe enquanto a tela está montada (não é salvo). */
export type ChatItem =
  /** Saudação do Jorge; o texto é montado na hora (o nome chega depois). */
  | { kind: 'greeting'; id: string }
  | { kind: 'text'; id: string; sender: 'user' | 'bot'; text: string }
  /**
   * Lançamento gravado pelo webhook. `confirmed: false` = cartão "Entendi assim, confere?";
   * `true` = recibo (descrição, tipo · hora, valor).
   */
  | { kind: 'transaction'; id: string; transaction: Transaction; confirmed: boolean };

export const GENERIC_ERROR_MESSAGE =
  'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.';
export const OFFLINE_QUEUED_MESSAGE =
  'Você está offline. Sua mensagem foi salva e será enviada quando a conexão for restabelecida.';
export const OFFLINE_QUEUE_ERROR_MESSAGE =
  'Tivemos problemas ao enviar sua mensagem para a fila OFFLINE. Reenvie quando estiver online.';
export const DELETED_MESSAGE = 'Pronto, apaguei esse lançamento.';

/** "Boa noite, Lucas! O que rolou hoje?" (primeiro nome; sem nome, só "Boa noite!"). */
export function getGreeting(now: Date, name?: string | null): string {
  const hour = now.getHours();
  const salute =
    hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = name?.trim().split(/\s+/)[0];
  return `${salute}${firstName ? `, ${firstName}` : ''}! O que rolou hoje?`;
}

/** Letra do botão de perfil: inicial do nome ou, sem nome, do e-mail. */
export function getProfileInitial(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  return source ? source.charAt(0).toLocaleUpperCase('pt-BR') : '?';
}

export type JorgeStatus = {
  label: string;
  /** `thinking`: texto verde; `idle`: texto apagado com ponto verde; `offline`: ponto apagado. */
  tone: 'thinking' | 'idle' | 'offline';
};

/** Status abaixo do nome do Jorge no cabeçalho. */
export function getJorgeStatus(state: {
  busy: boolean;
  awaitingConfirmation: boolean;
  isConnected: boolean;
}): JorgeStatus {
  if (state.busy) return { label: 'pensando…', tone: 'thinking' };
  if (state.awaitingConfirmation) return { label: 'esperando você conferir', tone: 'idle' };
  if (!state.isConnected) return { label: 'sem conexão', tone: 'offline' };
  return { label: 'online', tone: 'idle' };
}

/** Corpo do 200 de POST /webhook/messages (`{ id, valor, tipo, categoria, comentario }`). */
export type WebhookSuccessResponse = {
  id?: unknown;
  valor?: unknown;
  tipo?: unknown;
  categoria?: unknown;
  comentario?: unknown;
};

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/**
 * Monta a `Transaction` gravada a partir do 200 do webhook (a transação já está salva; a data é a do
 * aparelho, praticamente a mesma do servidor). `null` se a resposta não tiver `id`/valor válidos.
 */
export function transactionFromWebhook(
  data: WebhookSuccessResponse | null | undefined,
  context: { phone: string; messageId: string; now: Date },
): Transaction | null {
  const id = textOrNull(data?.id);
  const amount = data?.valor;
  if (!id || typeof amount !== 'number' || !Number.isFinite(amount)) return null;

  return {
    id,
    phone: context.phone,
    type: getTransactionType(typeof data?.tipo === 'string' ? data.tipo : ''),
    amount,
    category: textOrNull(data?.categoria),
    description: textOrNull(data?.comentario),
    messageId: context.messageId,
    createdAt: context.now.toISOString(),
  };
}

/** Resposta em texto do v1, usada se o 200 vier sem `id` (não dá para mostrar o cartão). */
export function buildSuccessReply(data: WebhookSuccessResponse | null | undefined): string {
  const valor = data?.valor;
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'Anotado ✅';

  const tipo = data?.tipo === 'receita' ? 'Receita' : 'Gasto';
  const categoria = textOrNull(data?.categoria);
  const comentario = textOrNull(data?.comentario);

  let reply = `Anotado ✅ ${tipo} de ${formatCurrency(valor)}`;
  reply += categoria ? ` em ${categoria}.` : '.';
  if (comentario) reply += `\n📝 ${comentario}`;
  return reply;
}

/** Mensagem amigável de um 400 do webhook; qualquer outro erro vira a mensagem genérica. */
export function getErrorReply(error: unknown): string {
  if (isAxiosError<{ error?: unknown }>(error) && error.response?.status === 400) {
    const message = error.response.data?.error;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return GENERIC_ERROR_MESSAGE;
}

/** "Gasto", "Receita" ou "Lançamento" (tipo "outro"). */
export function getTypeLabel(type: string): string {
  const normalized = getTransactionType(type);
  if (normalized === 'gasto') return 'Gasto';
  if (normalized === 'receita') return 'Receita';
  return 'Lançamento';
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);

/** Título do recibo: a descrição; sem ela, a categoria; sem as duas, o tipo. */
export function getReceiptTitle(transaction: Transaction): string {
  const description = textOrNull(transaction.description);
  if (description) return capitalize(description);
  return textOrNull(transaction.category) ?? getTypeLabel(transaction.type);
}

/** "Receita · 19:24" (hoje) ou "Receita · 22 out" (outro dia). */
export function formatReceiptMeta(transaction: Transaction, now: Date): string {
  const date = new Date(transaction.createdAt);
  const label = getTypeLabel(transaction.type);
  if (Number.isNaN(date.getTime())) return label;
  const when = isSameDay(date, now) ? format(date, 'HH:mm') : formatShortDay(date, now);
  return `${label} · ${when}`;
}

/** "+ R$ 1.200,00" (receita), "− R$ 50,00" (gasto) ou "R$ 10,00" (outro). */
export function formatSignedAmount(transaction: Transaction): string {
  const value = formatCurrency(Math.abs(transaction.amount));
  const type = getTransactionType(transaction.type);
  if (type === 'receita') return `+ ${value}`;
  if (type === 'gasto') return `− ${value}`;
  return value;
}

// "23 out" (mesmo ano) ou "23 out 2025"
function formatShortDay(date: Date, now: Date): string {
  return format(date, isSameYear(date, now) ? 'd MMM' : 'd MMM yyyy', { locale: ptBR });
}

/** Data do cartão Confirmar: "Hoje, 23 out", "Ontem, 22 out", "20 out" ou "20 out 2025". */
export function formatCardDate(createdAt: string, now: Date): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  const day = formatShortDay(date, now);
  if (isSameDay(date, now)) return `Hoje, ${day}`;
  if (isSameDay(date, subDays(now, 1))) return `Ontem, ${day}`;
  return day;
}

/** Algum cartão Confirmar aberto. */
export function hasPendingConfirmation(items: ChatItem[]): boolean {
  return items.some((item) => item.kind === 'transaction' && !item.confirmed);
}

/** Fecha os cartões abertos (viram recibo). Devolve o mesmo array se não havia nenhum. */
export function confirmAll(items: ChatItem[]): ChatItem[] {
  if (!hasPendingConfirmation(items)) return items;
  return items.map((item) =>
    item.kind === 'transaction' && !item.confirmed ? { ...item, confirmed: true } : item,
  );
}

/** Fecha o cartão de um item (vira recibo). */
export function confirmItem(items: ChatItem[], itemId: string): ChatItem[] {
  return items.map((item) =>
    item.kind === 'transaction' && item.id === itemId ? { ...item, confirmed: true } : item,
  );
}

/** Troca a transação corrigida em todos os itens com o mesmo id; o cartão vira recibo. */
export function applyCorrection(items: ChatItem[], transaction: Transaction): ChatItem[] {
  return items.map((item) =>
    item.kind === 'transaction' && item.transaction.id === transaction.id
      ? { ...item, transaction, confirmed: true }
      : item,
  );
}

/** Lançamento apagado: o cartão/recibo vira uma mensagem do Jorge avisando. */
export function applyDeletion(items: ChatItem[], transactionId: string): ChatItem[] {
  return items.map((item) =>
    item.kind === 'transaction' && item.transaction.id === transactionId
      ? { kind: 'text', id: item.id, sender: 'bot', text: DELETED_MESSAGE }
      : item,
  );
}
