import { Router, Response } from 'express';
import {
  deleteUserTransaction,
  getUserTransactions,
  TransactionNotFoundError,
  updateUserTransaction,
  ValidationError,
} from '../services/transactionService';

const router = Router();

/** Responde 400/404 para os erros conhecidos do service e 500 para o resto. */
function handleError(res: Response, error: unknown, context: string) {
  if (error instanceof ValidationError) {
    res.status(400).json(error.fields ? { error: error.message, fields: error.fields } : { error: error.message });
    return;
  }
  if (error instanceof TransactionNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  console.error(`Erro ao ${context}:`, error);
  res.status(500).json({ error: 'Erro interno do servidor' });
}

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         phone:
 *           type: string
 *         type:
 *           type: string
 *           example: "gasto"
 *         amount:
 *           type: number
 *           description: Valor com 2 casas decimais
 *           example: 50.9
 *         category:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         messageId:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /transactions:
 *   get:
 *     summary: Lista transações do usuário filtradas por data
 *     description: >
 *       As datas são dias de calendário no fuso America/Sao_Paulo (UTC-03:00). O intervalo vai do
 *       início de `startDate` até o fim de `endDate` (inclusive).
 *     tags:
 *       - Transactions
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *       - name: endDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *       - name: Authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer seu_token_jwt"
 *     responses:
 *       200:
 *         description: Lista de transações do usuário (mais recentes primeiro)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Datas ausentes ou inválidas (`{ error }`)
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const transactions = await getUserTransactions(startDate, endDate, req.user.phone);
    res.json(transactions);
  } catch (error) {
    handleError(res, error, 'buscar transações');
  }
});

/**
 * @openapi
 * /transactions/{id}:
 *   patch:
 *     summary: Corrige uma transação do usuário
 *     description: >
 *       Altera só os campos enviados (todos opcionais, mas ao menos um é obrigatório). Campos desconhecidos
 *       — inclusive `id`, `phone` e `messageId` — são ignorados: o dono é sempre o usuário do token.
 *       Transação inexistente ou de outro usuário responde 404.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [gasto, receita, outro]
 *               amount:
 *                 type: number
 *                 description: Maior que zero; arredondado para 2 casas (máx. 9999999999.99)
 *                 example: 42.5
 *               category:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 100
 *                 description: Texto vazio ou `null` remove a categoria
 *                 example: "mercado"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 500
 *                 example: "compras da semana"
 *               createdAt:
 *                 type: string
 *                 description: >
 *                   `YYYY-MM-DD` (dia em São Paulo; mantém o horário original da transação) ou data/hora
 *                   ISO 8601 com fuso (`Z` ou `±HH:MM`)
 *                 example: "2026-10-20"
 *     responses:
 *       200:
 *         description: Transação atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Corpo inválido ou sem campos para alterar (`{ error, fields? }`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Valor deve ser maior que zero"
 *                 fields:
 *                   type: object
 *                   description: Mensagens de erro por campo
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: string
 *                   example:
 *                     amount: ["Valor deve ser maior que zero"]
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Transação não encontrada (inexistente, id inválido ou de outro usuário)
 *       500:
 *         description: Erro interno do servidor
 */
router.patch('/:id', async (req, res) => {
  try {
    const transaction = await updateUserTransaction(req.params.id, req.user.phone, req.body);
    res.json(transaction);
  } catch (error) {
    handleError(res, error, 'atualizar transação');
  }
});

/**
 * @openapi
 * /transactions/{id}:
 *   delete:
 *     summary: Apaga uma transação do usuário
 *     description: Transação inexistente ou de outro usuário responde 404.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Transação apagada (sem corpo)
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Transação não encontrada (inexistente, id inválido ou de outro usuário)
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteUserTransaction(req.params.id, req.user.phone);
    res.status(204).end();
  } catch (error) {
    handleError(res, error, 'apagar transação');
  }
});

export default router;
