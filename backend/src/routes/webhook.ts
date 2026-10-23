import { Router, Request, Response } from 'express';
import { processUserMessage } from '../services/chatService';
import {prisma} from '../lib/prisma';

const router = Router();

/**
 * @openapi
 * /webhook/messages:
 *   post:
 *     summary: Recebe mensagens do cliente e processa via webhook
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
 *                   text:
 *                     type: string
 *                     example: "gastei 50 reais em comida"
 *                   userPhone:
 *                     type: string
 *                     deprecated: true
 *                     description: Ignorado — a transação é sempre gravada no telefone do usuário do token.
 *     responses:
 *       200:
 *         description: Mensagem processada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tipo:
 *                   type: string
 *                   example: "despesa"
 *                 valor:
 *                   type: number
 *                   example: 50
 *                 categoria:
 *                   type: string
 *                   example: "comida"
 *                 comentario:
 *                   type: string
 *                   example: "gasto informado pelo usuário"
 *       400:
 *         description: Erro no processamento da mensagem
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/messages', async (req: Request, res: Response) => {
  const ClientMessage = req.body;

  // console.log('Mensagem recebida');
  // console.log('Conteúdo: ', ClientMessage);
  // console.log('Telefone', ClientMessage.userMessage.userPhone);

  try {
    const messageProcessed = await processUserMessage(ClientMessage.userMessage.text);

    if (messageProcessed.error) {
      console.warn('Erro no processamento:', messageProcessed.error);
      return res
        .status(400)
        .json({ error: 'Não foi possível processar a mensagem' });
    }

    try {
      await prisma.transaction.create({
        data: {
          phone: req.user.phone,
          type: messageProcessed.tipo,
          amount: messageProcessed.valor,
          category: messageProcessed.categoria,
          description: messageProcessed.comentario,
          messageId: ClientMessage.id,
        },
      });
      console.log('Mensagem salva no banco com sucesso');
    } catch (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(200).json(messageProcessed);
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar a mensagem' });
  }
});

export default router;
