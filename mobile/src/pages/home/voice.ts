// Entrada por voz do chat: o reconhecimento é o do próprio celular (sem custo de API),
// e o texto só preenche o campo; o envio continua pelo botão de enviar.
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';

export const VOICE_LANG = 'pt-BR';

// Mesmo limite do campo de mensagem
export const MESSAGE_MAX_LENGTH = 500;

export const VOICE_PERMISSION_REPLY =
  'Preciso da permissão do microfone pra te ouvir. Dá pra liberar nas configurações do celular.';
export const VOICE_NO_SPEECH_REPLY = 'Não ouvi nada. Toca no microfone e fala de novo.';
export const VOICE_NETWORK_REPLY =
  'Não consegui transcrever agora, parece que falta internet. Tenta de novo ou digita a mensagem.';
export const VOICE_UNAVAILABLE_REPLY =
  'O reconhecimento de voz não está disponível neste celular. Digita a mensagem que eu entendo.';
export const VOICE_GENERIC_REPLY = 'Não consegui te ouvir agora. Tenta de novo ou digita a mensagem.';

// Junta o que foi falado ao que já estava escrito no campo antes de começar a ouvir
export function appendTranscript(base: string, transcript: string): string {
  const spoken = transcript.trim();
  const written = base.trimEnd();
  const text = written && spoken ? `${written} ${spoken}` : written || spoken;
  return text.slice(0, MESSAGE_MAX_LENGTH);
}

// Resposta do Jorge para um erro do reconhecimento; null quando não precisa avisar (cancelado)
export function getVoiceErrorReply(code: ExpoSpeechRecognitionErrorCode): string | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'no-speech':
    case 'speech-timeout':
      return VOICE_NO_SPEECH_REPLY;
    case 'not-allowed':
      return VOICE_PERMISSION_REPLY;
    case 'network':
      return VOICE_NETWORK_REPLY;
    case 'language-not-supported':
    case 'service-not-allowed':
      return VOICE_UNAVAILABLE_REPLY;
    default:
      return VOICE_GENERIC_REPLY;
  }
}
