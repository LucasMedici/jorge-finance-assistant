import { Router, Request, Response } from 'express';
import { processUserMessage } from '../services/chatService';
import {
  createTransaction,
  findTransactionByMessageId,
  isUniqueConstraintError,
  toMoney,
} from '../services/transactionService';
import type { transaction } from '../generated/prisma/client';

const router = Router();

const MAX_MESSAGE_ID_LENGTH = 100;

/**
 * Id da mensagem gerado no celular. O app envia em `userMessage.id`; `body.id` é aceito por
 * compatibilidade. Sem id válido a mensagem é processada normalmente, só que sem deduplicação.
 */
type WebhookBody = { id?: unknown; userMessage?: { id?: unknown } } | undefined;

function extractMessageId(body: WebhookBody): string | null {
  const raw = body?.userMessage?.id ?? body?.id;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw === 'string') {
    const id = raw.trim();
    if (id && id.length <= MAX_MESSAGE_ID_LENGTH) return id;
  }
  return null;
}

/** Resposta de sucesso a partir de uma transação já gravada (mesmo formato do processamento). */
function responseFromTransaction(tx: transaction) {
  return {
    valor: Number(tx.amount),
    tipo: tx.type,
    categoria: tx.category ?? '',
    comentario: tx.description ?? '',
  };
}

/**
 * @openapi
 * /webhook/messages:
 *   post:
 *     summary: Recebe mensagens do cliente e processa via webhook
 *     description: >
 *       Envia o texto para a IA e grava a transação no telefone do usuário do token.
 *       Idempotente por `userMessage.id`: se já existir transação desse usuário com o mesmo id
 *       (ex.: reenvio da fila offline), responde 200 com os dados dela sem chamar a IA de novo.
 *     tags:
 *       - Webhook
 *     security:
 *       - bearerAuth: []   # Como você usa authMiddleware
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userMessage
 *             properties:
 *               userMessage:
 *                 type: object
 *                 required:
 *                   - text
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "1730000000000"
 *                     description: Id gerado no app; usado para não gravar a mesma mensagem duas vezes.
 *                   text:
 *                     type: string
 *                     example: "gastei 50 reais em comida"
 *                   userPhone:
 *                     type: string
 *                     deprecated: true
 *                     description: Ignorado — a transação é sempre gravada no telefone do usuário do token.
 *     responses:
 *       200:
 *         description: Mensagem processada com sucesso (ou já processada antes, com o mesmo id)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valor:
 *                   type: number
 *                   example: 50
 *                 tipo:
 *                   type: string
 *                   enum: [gasto, receita]
 *                   example: "gasto"
 *                 categoria:
 *                   type: string
 *                   example: "comida"
 *                 comentario:
 *                   type: string
 *                   example: "gasto informado pelo usuário"
 *       400:
 *         description: A mensagem não pôde ser transformada em transação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem amigável em português para mostrar ao usuário
 *                   example: "Não encontrei um gasto ou receita com valor nessa mensagem. Tente algo como \"gastei 50 reais no mercado\"."
 *                 code:
 *                   type: string
 *                   enum: [EMPTY_MESSAGE, MESSAGE_TOO_LONG, NO_TRANSACTION, OPENAI_NO_RESPONSE, OPENAI_REFUSAL, OPENAI_API_ERROR, INVALID_JSON_RESPONSE]
 *                   example: "NO_TRANSACTION"
 *       500:
 *         description: Erro interno do servidor (`{ error }`)
 */
router.post('/messages', async (req: Request, res: Response) => {
  const phone = req.user.phone;
  const messageId = extractMessageId(req.body);

  try {
    // Mensagem já processada (reenvio): devolve a transação existente sem chamar a OpenAI.
    if (messageId) {
      const existing = await findTransactionByMessageId(phone, messageId);
      if (existing) {
        return res.status(200).json(responseFromTransaction(existing));
      }
    }

    const messageProcessed = await processUserMessage(req.body?.userMessage?.text);

    if (messageProcessed.error) {
      console.warn('Erro no processamento:', messageProcessed.error);
      return res
        .status(400)
        .json({ error: messageProcessed.comentario, code: messageProcessed.error });
    }

    const { valor, tipo, categoria, comentario } = messageProcessed;
    // Mesmo arredondamento (2 casas) aplicado ao valor gravado.
    const response = { valor: toMoney(valor).toNumber(), tipo, categoria, comentario };

    try {
      await createTransaction({
        phone,
        type: tipo,
        amount: valor,
        category: categoria,
        description: comentario,
        messageId,
      });
    } catch (dbError) {
      // Corrida: a mesma mensagem foi gravada por outra requisição entre a checagem e o create.
      if (messageId && isUniqueConstraintError(dbError)) {
        const existing = await findTransactionByMessageId(phone, messageId);
        return res.status(200).json(existing ? responseFromTransaction(existing) : response);
      }
      console.error('Erro ao salvar no banco:', dbError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar a mensagem' });
  }
});

export default router;
