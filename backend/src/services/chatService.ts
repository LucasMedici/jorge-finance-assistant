import OpenAI from 'openai';
import { z } from 'zod';

const clientOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_MESSAGE_LENGTH = 150;

const prompt = `
Você é um extrator de dados financeiros. Dado um texto curto do usuário,
extraia **apenas informações explícitas**, sem inferir ou criar nada além do que está escrito.

Campos:
- "valor": número positivo em reais (ex: "R$ 1.234,56" → 1234.56); null se não houver valor explícito.
- "tipo": "gasto" se indicar despesa (gastei, paguei, comprei); "receita" se indicar entrada (recebi, ganhei, vendi); "outro" se não for nenhum dos dois.
- "categoria": palavra-chave principal (ex: mercado, restaurante, transporte).
- "comentario": apenas o que sobrar da mensagem original, sem inferir nada; vazio se não houver.
`;

// Structured outputs: a OpenAI garante que a resposta segue este schema (mesma chamada, sem custo extra).
const transactionJsonSchema = {
  type: 'object',
  properties: {
    valor: { type: ['number', 'null'] },
    tipo: { type: 'string', enum: ['gasto', 'receita', 'outro'] },
    categoria: { type: 'string' },
    comentario: { type: 'string' },
  },
  required: ['valor', 'tipo', 'categoria', 'comentario'],
  additionalProperties: false,
};

const modelResponseSchema = z.object({
  valor: z.number().nullable(),
  tipo: z.enum(['gasto', 'receita', 'outro']),
  categoria: z.string(),
  comentario: z.string(),
});

export type ChatErrorCode =
  | 'EMPTY_MESSAGE'
  | 'MESSAGE_TOO_LONG'
  | 'NO_TRANSACTION'
  | 'OPENAI_NO_RESPONSE'
  | 'OPENAI_REFUSAL'
  | 'OPENAI_API_ERROR'
  | 'INVALID_JSON_RESPONSE';

export type ChatSuccess = {
  error?: undefined;
  valor: number;
  tipo: 'gasto' | 'receita';
  categoria: string;
  comentario: string;
};

export type ChatFailure = {
  error: ChatErrorCode;
  valor: null;
  tipo: 'outro';
  categoria: string;
  comentario: string;
};

export type ChatResult = ChatSuccess | ChatFailure;

function failure(error: ChatErrorCode, comentario: string): ChatFailure {
  return { error, valor: null, tipo: 'outro', categoria: 'não identificado', comentario };
}

/**
 * Limpa a mensagem antes de enviá-la à OpenAI: remove URLs, emojis e caracteres de controle
 * e normaliza espaços. Mantém letras acentuadas, `ç`, números, `R$` e pontuação comum.
 */
export function sanitizeMessage(message: string): string {
  return message
    .normalize('NFC')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, ' ')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}⃣️]/gu, '')
    .replace(/[\p{Cc}\p{Co}\p{Cs}]/gu, ' ')
    .replace(/\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converte o conteúdo retornado pelo modelo no resultado do serviço. */
export function parseModelResponse(content: string): ChatResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    console.warn('GPT retornou JSON inválido:', content);
    return failure('INVALID_JSON_RESPONSE', 'Erro no formato da resposta da IA');
  }

  const parsed = modelResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn('GPT retornou JSON fora do schema:', content);
    return failure('INVALID_JSON_RESPONSE', 'Erro no formato da resposta da IA');
  }

  const { valor, tipo, categoria, comentario } = parsed.data;
  if (tipo === 'outro' || valor === null || !Number.isFinite(valor) || valor <= 0) {
    return failure(
      'NO_TRANSACTION',
      'Não encontrei um gasto ou receita com valor nessa mensagem. Tente algo como "gastei 50 reais no mercado".'
    );
  }

  return { valor, tipo, categoria: categoria.trim(), comentario: comentario.trim() };
}

export async function processUserMessage(message: string): Promise<ChatResult> {
  const sanitizedMessage = sanitizeMessage(typeof message === 'string' ? message : '');

  if (!sanitizedMessage) {
    return failure('EMPTY_MESSAGE', 'Mensagem vazia após limpeza, envie algo válido.');
  }

  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    return failure(
      'MESSAGE_TOO_LONG',
      `Mensagem muito longa (${sanitizedMessage.length} caracteres), limite de ${MAX_MESSAGE_LENGTH}.`
    );
  }

  try {
    const completion = await clientOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: sanitizedMessage },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'transacao', strict: true, schema: transactionJsonSchema },
      },
      temperature: 0.2,
      max_tokens: 120,
    });

    const choice = completion.choices[0]?.message;

    if (choice?.refusal) {
      console.warn('GPT recusou a mensagem:', choice.refusal);
      return failure('OPENAI_REFUSAL', 'A IA não conseguiu processar essa mensagem');
    }

    if (!choice?.content) {
      return failure('OPENAI_NO_RESPONSE', 'Erro no processamento da IA');
    }

    return parseModelResponse(choice.content);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return failure('OPENAI_API_ERROR', 'Erro na comunicação com a IA');
  }
}
