import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { VOICE_LANG, VOICE_PERMISSION_REPLY, getVoiceErrorReply } from './voice';

// Opcional: no Expo Go o módulo nativo não existe e o microfone simplesmente não aparece
const speech = requireOptionalNativeModule<typeof ExpoSpeechRecognitionModule>(
  'ExpoSpeechRecognition',
);

type Options = {
  // Texto reconhecido até agora (parcial enquanto fala, final no fim)
  onTranscript: (transcript: string) => void;
  // Mensagem do Jorge quando não deu para ouvir
  onError: (reply: string) => void;
};

export function useVoiceInput({ onTranscript, onError }: Options) {
  const [listening, setListening] = useState(false);
  // Sessão em andamento: resultados que chegam depois de cancelar são ignorados
  const activeRef = useRef(false);
  const callbacks = useRef({ onTranscript, onError });
  callbacks.current = { onTranscript, onError };

  useEffect(() => {
    if (!speech) return;
    const subscriptions = [
      speech.addListener('start', () => setListening(true)),
      speech.addListener('end', () => {
        activeRef.current = false;
        setListening(false);
      }),
      speech.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript;
        if (activeRef.current && transcript) callbacks.current.onTranscript(transcript);
      }),
      speech.addListener('error', (event) => {
        const reply = getVoiceErrorReply(event.error);
        if (reply) callbacks.current.onError(reply);
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      if (activeRef.current) speech.abort();
      activeRef.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (!speech || activeRef.current) return;
    activeRef.current = true;
    const { granted } = await speech.requestPermissionsAsync();
    if (!granted) {
      activeRef.current = false;
      callbacks.current.onError(VOICE_PERMISSION_REPLY);
      return;
    }
    // Sem contínuo: o celular encerra sozinho quando a pessoa para de falar
    speech.start({ lang: VOICE_LANG, interimResults: true, continuous: false, maxAlternatives: 1 });
  }, []);

  // Para de ouvir e mantém o que já foi reconhecido
  const stop = useCallback(() => {
    if (activeRef.current) speech?.stop();
  }, []);

  // Para de ouvir e descarta o que ainda viria (ao enviar ou sair da tela)
  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setListening(false);
    speech?.abort();
  }, []);

  return { available: speech !== null, listening, start, stop, cancel };
}
