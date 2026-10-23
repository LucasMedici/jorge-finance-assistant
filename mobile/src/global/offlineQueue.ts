import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export async function addToOfflineQueue(userMessage: any) {
  const raw = await AsyncStorage.getItem('offlineQueue');
  const queue = raw ? JSON.parse(raw) : [];
  queue.push(userMessage);
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
}

export async function processOfflineQueue() {
  const raw = await AsyncStorage.getItem('offlineQueue');
  const queue = raw ? JSON.parse(raw) : [];

  if (queue.length === 0) return;

  for (const userMessage of queue) {
    try {
      await api.post(`/webhook/messages`, { userMessage });
      await removeFromQueue(userMessage.id);
    } catch (error) {
      console.log('Erro ao processar fila OFFLINE: ', error);
      break;
    }
  }
}

async function removeFromQueue(id: any) {
  const raw = await AsyncStorage.getItem('offlineQueue');
  const queue = raw ? JSON.parse(raw) : [];

  const newQueue = queue.filter((userMessage: any) => userMessage.id !== id);
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(newQueue));
}
