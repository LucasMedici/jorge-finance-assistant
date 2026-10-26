import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL as string;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Chamado quando a API responde 401 para o token atual (registrado pelo AuthProvider)
let onUnauthorized: (() => void) | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const sentAuth = error?.config?.headers?.Authorization;

    // Só derruba a sessão se a requisição foi feita com token (ex.: login com senha errada também é 401)
    if (error?.response?.status === 401 && sentAuth && !handlingUnauthorized) {
      handlingUnauthorized = true;
      try {
        const token = await AsyncStorage.getItem('userToken');

        // Ignora 401 de requisições antigas, feitas com um token que já foi trocado
        if (token && sentAuth === `Bearer ${token}`) {
          await AsyncStorage.removeItem('userToken');
          onUnauthorized?.();
        }
      } finally {
        handlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  }
);
