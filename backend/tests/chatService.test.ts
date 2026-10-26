import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cliente OpenAI falso: nenhum teste deste arquivo faz requisição de verdade.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('openai', () => ({
  default: class OpenAIMock {
    chat = { completions: { create: createMock } };
  },
}));

import { parseModelResponse, processUserMessage, sanitizeMessage } from '../src/services/chatService';

function completionWith(message: { content: string | null; refusal?: string | null }) {
  return { choices: [{ message: { role: 'assistant', refusal: null, ...message } }] };
}

function modelJson(data: Record<string, unknown>) {
  return JSON.stringify({ valor: 50, tipo: 'gasto', categoria: 'mercado', comentario: '', ...data });
}

beforeEach(() => {
  createMock.mockReset();
  // Os logs de erro/aviso do serviço são esperados nos cenários de falha.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sanitizeMessage', () => {
  it('mantém acentos, ç, R$, números e pontuação comum', () => {
    const text = 'Gastei R$ 1.234,56 no açougue (promoção!) — ônibus: 4,50?';
    expect(sanitizeMessage(text)).toBe(text);
  });

  it('remove emojis (inclusive com tom de pele, bandeiras e ZWJ)', () => {
    expect(sanitizeMessage('gastei 50 no mercado 🛒😀')).toBe('gastei 50 no mercado');
    expect(sanitizeMessage('👍🏽 recebi 100 🇧🇷')).toBe('recebi 100');
    expect(sanitizeMessage('paguei 30 👨‍👩‍👧 pizza ❤️')).toBe('paguei 30 pizza');
  });

  it('remove URLs', () => {
    expect(sanitizeMessage('comprei 20 em https://loja.com/item?id=1 ontem')).toBe('comprei 20 em ontem');
    expect(sanitizeMessage('paguei 10 www.exemplo.com.br')).toBe('paguei 10');
  });

  it('remove caracteres de controle e normaliza espaços', () => {
    expect(sanitizeMessage('  gastei\u0000 50\n\nno\tmercado​  ')).toBe('gastei 50 no mercado');
  });

  it('normaliza acentos decompostos (NFD) para NFC', () => {
    expect(sanitizeMessage('café')).toBe('café');
  });

  it('devolve string vazia quando não sobra nada', () => {
    expect(sanitizeMessage('')).toBe('');
    expect(sanitizeMessage('   ')).toBe('');
    expect(sanitizeMessage('😀🎉 https://x.com')).toBe('');
  });
});

describe('parseModelResponse', () => {
  it('aceita uma resposta válida e apara categoria/comentário', () => {
    expect(
      parseModelResponse(modelJson({ valor: 12.5, tipo: 'receita', categoria: ' salário ', comentario: ' extra ' }))
    ).toEqual({ valor: 12.5, tipo: 'receita', categoria: 'salário', comentario: 'extra' });
  });

  it.each([
    ['valor null', { valor: null }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['tipo "outro"', { tipo: 'outro' }],
  ])('%s → NO_TRANSACTION', (_label, data) => {
    expect(parseModelResponse(modelJson(data))).toMatchObject({
      error: 'NO_TRANSACTION',
      valor: null,
      tipo: 'outro',
    });
  });

  it('JSON inválido → INVALID_JSON_RESPONSE', () => {
    expect(parseModelResponse('não é json')).toMatchObject({ error: 'INVALID_JSON_RESPONSE', valor: null });
  });

  it.each([
    ['valor como string', { valor: '50' }],
    ['tipo fora do enum', { tipo: 'despesa' }],
    ['campo ausente', { categoria: undefined }],
  ])('JSON fora do schema (%s) → INVALID_JSON_RESPONSE', (_label, data) => {
    expect(parseModelResponse(modelJson(data))).toMatchObject({ error: 'INVALID_JSON_RESPONSE', valor: null });
  });
});

describe('processUserMessage', () => {
  it('mensagem vazia após limpeza não chama a OpenAI', async () => {
    const result = await processUserMessage('  🎉🎉 ');

    expect(result).toMatchObject({ error: 'EMPTY_MESSAGE', valor: null, tipo: 'outro' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('entrada que não é string é tratada como vazia', async () => {
    const result = await processUserMessage(undefined as unknown as string);

    expect(result).toMatchObject({ error: 'EMPTY_MESSAGE' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('mensagem longa demais não chama a OpenAI', async () => {
    const result = await processUserMessage('a'.repeat(151));

    expect(result).toMatchObject({ error: 'MESSAGE_TOO_LONG', valor: null });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('mensagem com exatamente 150 caracteres é aceita', async () => {
    createMock.mockResolvedValue(completionWith({ content: modelJson({}) }));

    await processUserMessage('a'.repeat(150));

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('envia o texto sanitizado, com o mesmo modelo e limite de tokens', async () => {
    createMock.mockResolvedValue(completionWith({ content: modelJson({ valor: 50 }) }));

    const result = await processUserMessage('gastei R$ 50 no mercado 🛒 https://nota.com/123');

    expect(result).toEqual({ valor: 50, tipo: 'gasto', categoria: 'mercado', comentario: '' });
    expect(createMock).toHaveBeenCalledTimes(1);

    const params = createMock.mock.calls[0][0];
    expect(params.model).toBe('gpt-4o-mini');
    expect(params.max_tokens).toBe(120);
    expect(params.response_format).toMatchObject({ type: 'json_schema' });
    expect(params.messages).toHaveLength(2);
    expect(params.messages[0].role).toBe('system');
    expect(params.messages[1]).toEqual({ role: 'user', content: 'gastei R$ 50 no mercado' });
  });

  it('recusa do modelo → OPENAI_REFUSAL', async () => {
    createMock.mockResolvedValue(completionWith({ content: null, refusal: 'não posso ajudar' }));

    expect(await processUserMessage('gastei 50 no mercado')).toMatchObject({ error: 'OPENAI_REFUSAL', valor: null });
  });

  it('resposta sem conteúdo → OPENAI_NO_RESPONSE', async () => {
    createMock.mockResolvedValue({ choices: [] });

    expect(await processUserMessage('gastei 50 no mercado')).toMatchObject({ error: 'OPENAI_NO_RESPONSE' });
  });

  it('exceção do cliente → OPENAI_API_ERROR', async () => {
    createMock.mockRejectedValue(new Error('timeout'));

    expect(await processUserMessage('gastei 50 no mercado')).toMatchObject({ error: 'OPENAI_API_ERROR', valor: null });
  });

  it('resposta sem transação → NO_TRANSACTION', async () => {
    createMock.mockResolvedValue(completionWith({ content: modelJson({ valor: null, tipo: 'outro' }) }));

    expect(await processUserMessage('oi, tudo bem?')).toMatchObject({ error: 'NO_TRANSACTION' });
  });
});
