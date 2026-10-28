import {
  MESSAGE_MAX_LENGTH,
  VOICE_GENERIC_REPLY,
  VOICE_NETWORK_REPLY,
  VOICE_NO_SPEECH_REPLY,
  VOICE_PERMISSION_REPLY,
  VOICE_UNAVAILABLE_REPLY,
  appendTranscript,
  getVoiceErrorReply,
} from '../voice';

describe('appendTranscript', () => {
  it('usa só o que foi falado quando o campo está vazio', () => {
    expect(appendTranscript('', ' gastei 50 no mercado ')).toBe('gastei 50 no mercado');
  });

  it('continua o que já estava escrito, com um espaço', () => {
    expect(appendTranscript('Recebi um pix de ', '200 reais')).toBe('Recebi um pix de 200 reais');
  });

  it('mantém o texto escrito enquanto ainda não veio nada falado', () => {
    expect(appendTranscript('almoço', '')).toBe('almoço');
  });

  it('corta no limite do campo', () => {
    const result = appendTranscript('a'.repeat(490), 'b'.repeat(20));
    expect(result).toHaveLength(MESSAGE_MAX_LENGTH);
  });
});

describe('getVoiceErrorReply', () => {
  it('não avisa quando o reconhecimento foi cancelado', () => {
    expect(getVoiceErrorReply('aborted')).toBeNull();
  });

  it('traduz os erros comuns', () => {
    expect(getVoiceErrorReply('no-speech')).toBe(VOICE_NO_SPEECH_REPLY);
    expect(getVoiceErrorReply('speech-timeout')).toBe(VOICE_NO_SPEECH_REPLY);
    expect(getVoiceErrorReply('not-allowed')).toBe(VOICE_PERMISSION_REPLY);
    expect(getVoiceErrorReply('network')).toBe(VOICE_NETWORK_REPLY);
    expect(getVoiceErrorReply('service-not-allowed')).toBe(VOICE_UNAVAILABLE_REPLY);
    expect(getVoiceErrorReply('language-not-supported')).toBe(VOICE_UNAVAILABLE_REPLY);
  });

  it('usa a mensagem genérica para o resto', () => {
    expect(getVoiceErrorReply('busy')).toBe(VOICE_GENERIC_REPLY);
    expect(getVoiceErrorReply('unknown')).toBe(VOICE_GENERIC_REPLY);
  });
});
