import AsyncStorage from '@react-native-async-storage/async-storage';
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

export async function addToOfflineQueue(userMessage: OfflineQueueItem) {
  const queue = await readQueue();
  queue.push(userMessage);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function processOfflineQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Sem usuário logado o envio falharia com 401; espera o login.
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const queue = await readQueue();
    if (queue.length === 0) return;

    for (const userMessage of queue) {
      try {
        await api.post(`/webhook/messages`, { userMessage });
      } catch (error) {
        console.log('Erro ao processar fila OFFLINE: ', error);
        break;
      }
      await removeFromQueue(userMessage.id);
    }
  } catch (error) {
    console.log('Erro ao ler fila OFFLINE: ', error);
  } finally {
    isProcessing = false;
  }
}

async function removeFromQueue(id: string) {
  // Relê a fila: mensagens podem ter sido adicionadas durante o envio.
  const queue = await readQueue();
  const newQueue = queue.filter((userMessage) => userMessage.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
}
