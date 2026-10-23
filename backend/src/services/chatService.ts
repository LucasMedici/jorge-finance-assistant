import OpenAI from 'openai';

const clientOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = `
Você é um extrator de dados financeiros. Dado um texto curto do usuário,
extraia **apenas informações explícitas**, sem inferir ou criar nada além do que está escrito.

Responda no formato JSON:
{
  "valor": <número encontrado ou null>,
  "tipo": "<gasto|receita|outro>",
  "categoria": "<palavra-chave principal relacionada, ex: mercado, restaurante, transporte>",
  "comentario": "<texto livre restante que não faz parte do valor ou da categoria; vazio se não houver>"
}

Regras importantes:
- "tipo" é "gasto" se o texto indicar despesa (ex: gastei, paguei, comprei)
- "tipo" é "receita" se indicar entrada de dinheiro (ex: recebi, ganhei, vendi)
- "tipo" é "outro" se não indicar nem gasto nem receita
- O "comentario" deve ser **apenas o que sobrar da mensagem original**, sem inferir nada.
`;

function sanitizeMessage(message: string) {
  message = message.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g,
    ''
  );
  message = message.replace(/[^a-zA-Z0-9\s,.:]/g, '');
  message = message.replace(/https?:\/\/\S+/gi, '');
  return message.trim();
}

export async function processUserMessage(message: string) {
  const sanitizedMessage = sanitizeMessage(message);

  const MAX_MESSAGE_LENGTH = 150;
  if (!sanitizedMessage) {
    return {
      error: 'EMPTY_MESSAGE',
      valor: null,
      tipo: 'outro',
      categoria: 'não identificado',
      comentario: 'Mensagem vazia após limpeza, envie algo válido.',
    };
  }

  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      error: 'MESSAGE_TOO_LONG',
      valor: null,
      tipo: 'outro',
      categoria: 'não identificado',
      comentario: `Mensagem muito longa (${sanitizedMessage.length} caracteres), limite de ${MAX_MESSAGE_LENGTH}.`,
    };
  }

  try {
    const completion = await clientOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      max_tokens: 120,
    });

    const result = completion.choices[0].message?.content;

    if (!result) {
      return {
        error: 'OPENAI_NO_RESPONSE',
        valor: null,
        tipo: 'outro',
        categoria: 'não identificado',
        comentario: 'Erro no processamento da IA',
      };
    }

    try {
      const parsed = JSON.parse(result);
      return parsed;
    } catch (parseError) {
      console.warn('GPT retornou JSON inválido:', result);
      return {
        error: 'INVALID_JSON_RESPONSE',
        valor: null,
        tipo: 'outro',
        categoria: 'não identificado',
        comentario: 'Erro no formato da resposta da IA',
      };
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return {
      error: 'OPENAI_API_ERROR',
      valor: null,
      tipo: 'outro',
      categoria: 'não identificado',
      comentario: 'Erro na comunicação com a IA',
    };
  }
}
