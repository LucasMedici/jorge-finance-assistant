import OpenAI from 'openai';
import { z } from 'zod';

const clientOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_MESSAGE_LENGTH = 150;

/**
 * Lista fechada de categorias, por tipo de transação. A mesma lista vai no prompt e no `enum` do
 * structured output (mesma chamada à OpenAI). Exportada para ser reaproveitada (ex.: filtros e correção no app).
 */
export const CATEGORIAS = {
  gasto: [
    'Mercado',
    'Mercadinho',
    'Comer fora',
    'Transporte',
    'Saúde',
    'Lazer',
    'Bebida e rolê',
    'Família e amigos',
    'Compras',
    'Cuidados pessoais',
    'Apostas',
    'Outros',
  ],
  receita: ['Salário', 'Freela', 'Outros'],
} as const;

export type CategoriaGasto = (typeof CATEGORIAS.gasto)[number];
export type CategoriaReceita = (typeof CATEGORIAS.receita)[number];
export type Categoria = CategoriaGasto | CategoriaReceita;

/**
 * Exemplos do que entra em cada categoria de gasto (tirados do histórico real), para o modelo escolher bem.
 * Vão no mesmo prompt: algumas dezenas de tokens a mais, nenhuma chamada extra.
 */
const EXEMPLOS_GASTO: Record<Exclude<CategoriaGasto, 'Outros'>, string> = {
  Mercado: 'mercado, supermercado, padaria, compra do mês',
  Mercadinho: 'só quando a mensagem disser "mercadinho"',
  'Comer fora': 'restaurante, lanche, pastel, hambúrguer, iFood, delivery, sorvete, café',
  Transporte: 'uber, 99, passagem, metrô, ônibus, gasolina, patinete',
  Saúde: 'farmácia, remédio, dentista, médico',
  Lazer: 'cinema, futebol, jogo, ingresso, passeio',
  'Bebida e rolê': 'bebida, cerveja, adega, balada, festa',
  'Família e amigos': 'dinheiro ou presente para mãe, parente ou amigo (nome de pessoa)',
  Compras: 'loja, roupa, Shopee, Americanas, eletrônicos',
  'Cuidados pessoais': 'cabelo, barbeiro, perfumaria',
  Apostas: 'aposta, bet, rifa',
};

/** Categoria usada quando o modelo devolve algo que não pertence à lista do tipo. */
export const CATEGORIA_OUTROS = 'Outros' satisfies Categoria;

/** Categoria das respostas de erro (sem transação). Não faz parte da lista fechada. */
export const CATEGORIA_NAO_IDENTIFICADA = 'não identificado';

/** Todas as categorias, sem repetição (usada no `enum` do structured output). */
export const TODAS_CATEGORIAS: readonly Categoria[] = [
  ...new Set<Categoria>([...CATEGORIAS.gasto, ...CATEGORIAS.receita]),
];

const prompt = `
Você é um extrator de dados financeiros. Dado um texto curto do usuário,
extraia **apenas informações explícitas**, sem inferir ou criar nada além do que está escrito.

Campos:
- "valor": número positivo em reais (ex: "R$ 1.234,56" → 1234.56); null se não houver valor explícito.
- "tipo": "gasto" se indicar despesa (gastei, paguei, comprei); "receita" se indicar entrada (recebi, ganhei, vendi); "outro" se não for nenhum dos dois.
- "categoria": exatamente uma da lista do tipo; use "Outros" se nenhuma se encaixar.
  - gasto: ${CATEGORIAS.gasto.join(', ')}.
${Object.entries(EXEMPLOS_GASTO)
  .map(([categoria, exemplos]) => `    - ${categoria}: ${exemplos}.`)
  .join('\n')}
  - receita: ${CATEGORIAS.receita.join(', ')}.
- "comentario": apenas o que sobrar da mensagem original, sem inferir nada; vazio se não houver.
`;

// Structured outputs: a OpenAI garante que a resposta segue este schema (mesma chamada, sem custo extra).
const transactionJsonSchema = {
  type: 'object',
  properties: {
    valor: { type: ['number', 'null'] },
    tipo: { type: 'string', enum: ['gasto', 'receita', 'outro'] },
    categoria: { type: 'string', enum: TODAS_CATEGORIAS },
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
  categoria: Categoria;
  comentario: string;
};

export type ChatFailure = {
  error: ChatErrorCode;
  valor: null;
  tipo: 'outro';
  categoria: typeof CATEGORIA_NAO_IDENTIFICADA;
  comentario: string;
};

export type ChatResult = ChatSuccess | ChatFailure;

function failure(error: ChatErrorCode, comentario: string): ChatFailure {
  return { error, valor: null, tipo: 'outro', categoria: CATEGORIA_NAO_IDENTIFICADA, comentario };
}

function normalizeKey(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
}

/**
 * Garante que a categoria pertence à lista do tipo. Aceita variações de caixa/acento ("saude" → "Saúde");
 * qualquer outra coisa (inclusive uma categoria de receita num gasto) vira "Outros".
 */
export function normalizeCategoria(tipo: 'gasto' | 'receita', categoria: string): Categoria {
  const key = normalizeKey(categoria);
  const lista: readonly Categoria[] = CATEGORIAS[tipo];
  return lista.find((item) => normalizeKey(item) === key) ?? CATEGORIA_OUTROS;
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

  return { valor, tipo, categoria: normalizeCategoria(tipo, categoria), comentario: comentario.trim() };
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
