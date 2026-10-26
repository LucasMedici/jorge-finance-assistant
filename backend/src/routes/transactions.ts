import { Router } from 'express';
import { getUserTransactions, ValidationError } from '../services/transactionService';

const router = Router();


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
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   type:
 *                     type: string
 *                     example: "gasto"
 *                   amount:
 *                     type: number
 *                     description: Valor com 2 casas decimais
 *                     example: 50.9
 *                   category:
 *                     type: string
 *                     nullable: true
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   messageId:
 *                     type: string
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
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
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
