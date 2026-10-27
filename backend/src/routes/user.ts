import { Router } from 'express';
import { z } from 'zod';
import { findUserById, isRecordNotFoundError, updateUser, UpdateUserSchema } from '../services/userService';


const router = Router();


/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Perfil do usuário (nunca inclui a senha)
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         monthlyGoal:
 *           type: number
 *           nullable: true
 *           description: Meta de gastos por mês em reais (vale para todos os meses); null = sem meta
 *           example: 1500
 *         createdAt:
 *           type: string
 *           format: date-time
 */


/**
 * @openapi
 * /user/{id}:
 *   put:
 *     summary: Atualiza o nome e/ou a meta mensal de gastos do usuário
 *     description: >
 *       Os dois campos são opcionais, mas pelo menos um precisa ser enviado. Campo ausente não é alterado
 *       (mandar só `monthlyGoal` mantém o nome, e vice-versa). Campos desconhecidos são ignorados.
 *     tags:
 *       - User
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Lucas"
 *               monthlyGoal:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 maximum: 9999999999.99
 *                 description: Número > 0 com até 2 casas decimais, ou null para remover a meta
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "A meta mensal deve ser maior que zero"
 *                 fields:
 *                   type: object
 *                   description: Mensagens de erro por campo
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: string
 *                   example:
 *                     monthlyGoal: ["A meta mensal deve ser maior que zero"]
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: O id não é o do usuário autenticado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno ao atualizar o usuário
 */
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    if (id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = UpdateUserSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        const messages = [...new Set(parsed.error.issues.map((issue) => issue.message))];
        return res.status(400).json({
            error: messages.join('; '),
            fields: z.flattenError(parsed.error).fieldErrors,
        });
    }

    try {
        const updatedUser = await updateUser(id, parsed.data);
        return res.json(updatedUser);
    } catch (error) {
        if (isRecordNotFoundError(error)) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Erro ao atualizar usuário:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * @openapi
 * /user/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags:
 *       - User
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Requisição inválida
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: O id não é o do usuário autenticado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', async (req, res) => {
    const id = req.params.id;

    if (id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try{
        const user = await findUserById(id);
        if(!user) {
            return res.status(404).json({error: 'User not found'});
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})




export default router;
