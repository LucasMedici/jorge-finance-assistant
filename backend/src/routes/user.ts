import { Router, Request, Response } from 'express';
import { createUser, findUserById, updateUserName } from '../services/userService';
import { signLoginToken, verifyPassword, hashPassword } from '../services/authService';


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
 */
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    try {
        const updatedUser = await updateUserName(id, { name });
        res.json(updatedUser);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
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
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', async (req, res) => {
    const id = req.params.id;

    try{
        const user = await findUserById(id);
        if(!user) {
            return res.status(404).json({error: 'User not found'});
        }
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}) 




export default router;