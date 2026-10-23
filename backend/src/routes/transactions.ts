import { Router } from 'express';
import getUserTransactions from '../services/transactionService';

const router = Router();


/**
 * @openapi
 * /transactions:
 *   get:
 *     summary: Lista transações do usuário filtradas por data
 *     tags:
 *       - Transactions
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: "2024-01-01"
 *       - name: endDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: "2024-12-31"
 *       - name: Authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer seu_token_jwt"
 *     responses:
 *       200:
 *         description: Lista de transações do usuário
 *       400:
 *         description: Erro na requisição
 *       401:
 *         description: Token inválido ou ausente
 */
router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const UserTransactions = await getUserTransactions(
      startDate as string,
      endDate as string,
      req.user.phone
    );
    res.json(UserTransactions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
