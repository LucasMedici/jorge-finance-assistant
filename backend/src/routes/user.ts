import { Router } from 'express';
import { findUserById, updateUserName } from '../services/userService';


const router = Router();



/**
 * @openapi
 * /user/{id}:
 *   put:
 *     summary: Atualiza o nome de um usuário
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
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       400:
 *         description: Erro na requisição
 *       403:
 *         description: O id não é o do usuário autenticado
 */
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    if (id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const updatedUser = await updateUserName(id, { name });
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
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
 *       400:
 *         description: Requisição inválida
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