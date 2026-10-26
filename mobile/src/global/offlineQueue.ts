import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { api } from '../services/api';

const QUEUE_KEY = 'offlineQueue';
const TOKEN_KEY = 'userToken';

// Mensagem guardada na fila offline (mesmo formato enviado em POST /webhook/messages).
// Depois de passar pelo AsyncStorage, `timestamp` volta como string (JSON).
export interface OfflineQueueItem {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date | string;
  userPhone?: string;
}

// Trava de módulo: impede duas execuções simultâneas (ex.: conexão oscilando)
// que reenviariam a mesma mensagem.
let isProcessing = false;
// Pedido que chegou durante uma execução (ex.: troca de conta); roda ao final dela.
let pendingPhone: string | null = null;

async function readQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

// O interceptor do axios usa o token salvo no momento do envio; confere que ele é do dono da mensagem.
async function isTokenFrom(userPhone: string): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    return jwtDecode<{ phone?: string }>(token).phone === userPhone;
  } catch {
    return false;
  }
}

// O que fazer com um item cujo envio falhou:
// - 'discard': o backend rejeitou a mensagem em si (4xx, ex.: 400 NO_TRANSACTION); reenviar nunca vai
//   funcionar, então o item sai da fila para não travar os seguintes.
// - 'retry': falha transitória (rede, 5xx, 401/408/429, 400 com código OPENAI_*); o item fica e a fila para.
export type SendFailureAction = 'discard' | 'retry';

const RETRYABLE_4XX = new Set([401, 408, 429]);

export function getSendFailureAction(error: unknown): SendFailureAction {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response;
  const status = response?.status;

  // Sem resposta (erro de rede, timeout do cliente) ou status desconhecido
  if (typeof status !== 'number') return 'retry';
  if (status < 400 || status >= 500 || RETRYABLE_4XX.has(status)) return 'retry';

  // Erros da OpenAI chegam como 400 mas são transitórios
  const code = (response?.data as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && code.startsWith('OPENAI_')) return 'retry';

  return 'discard';
}

export async function addToOfflineQueue(userMessage: OfflineQueueItem) {
  const queue = await readQueue();
  queue.push(userMessage);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Envia só as mensagens do usuário logado (`userPhone`). Itens de outra conta ou sem
// `userPhone` ficam na fila até esse usuário logar de novo. Itens rejeitados pelo backend
// são descartados (ver `getSendFailureAction`); em falha transitória a fila para no item.
export async function processOfflineQueue(userPhone: string | null | undefined) {
  if (!userPhone) return;

  if (isProcessing) {
    pendingPhone = userPhone;
    return;
  }
  isProcessing = true;

  try {
    const queue = await readQueue();
    const userItems = queue.filter((item) => item.userPhone === userPhone);

    for (const userMessage of userItems) {
      // A sessão pode ter mudado (logout/login) no meio do envio
      if (!(await isTokenFrom(userPhone))) break;

      try {
        await api.post(`/webhook/messages`, { userMessage });
      } catch (error) {
        if (getSendFailureAction(error) === 'retry') {
          console.log('Erro ao processar fila OFFLINE: ', error);
          break;
        }
        console.log('Mensagem da fila OFFLINE rejeitada pelo servidor, descartada: ', error);
      }
      await removeFromQueue(userMessage.id);
    }
  } catch (error) {
    console.log('Erro ao ler fila OFFLINE: ', error);
  } finally {
    isProcessing = false;
  }

  if (pendingPhone) {
    const nextPhone = pendingPhone;
    pendingPhone = null;
    await processOfflineQueue(nextPhone);
  }
}

async function removeFromQueue(id: string) {
  // Relê a fila: mensagens podem ter sido adicionadas durante o envio.
  const queue = await readQueue();
  const newQueue = queue.filter((userMessage) => userMessage.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
}
