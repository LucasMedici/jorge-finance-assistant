import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createUser, CreateUserSchema, findUserByEmail, UserAlreadyExistsError, UniqueUserField } from '../services/userService';
import { signLoginToken, verifyPassword, hashPassword } from '../services/authService';


const router = Router();

const ALREADY_EXISTS_MESSAGES: Record<UniqueUserField | 'unknown', string> = {
    email: 'Este e-mail já está cadastrado',
    phone: 'Este telefone já está cadastrado',
    unknown: 'Usuário já cadastrado',
};

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Cria um novo usuário
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               phone:
 *                 type: string
 *                 example: "5511999999999"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *       400:
 *         description: Dados inválidos (campos ausentes ou fora do formato)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "E-mail inválido; A senha deve ter pelo menos 6 caracteres"
 *                 fields:
 *                   type: object
 *                   description: Mensagens de erro por campo
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: string
 *                   example:
 *                     email: ["E-mail inválido"]
 *                     password: ["A senha deve ter pelo menos 6 caracteres"]
 *       409:
 *         description: E-mail ou telefone já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Este telefone já está cadastrado"
 *       500:
 *         description: Erro interno ao criar usuário
 */
router.post('/signup', async (req: Request, res: Response) => {
    const parsed = CreateUserSchema.safeParse(req.body ?? {});
    if(!parsed.success) {
        const messages = [...new Set(parsed.error.issues.map((issue) => issue.message))];
        return res.status(400).json({
            error: messages.join('; '),
            fields: z.flattenError(parsed.error).fieldErrors,
        });
    }
    const { email, password, phone } = parsed.data;

    try{
        const existingUser = await findUserByEmail(email);
        if(existingUser) {
            return res.status(409).json({ error: ALREADY_EXISTS_MESSAGES.email });
        }

        const hashedPassword = await hashPassword(password);
        const user = await createUser({ email, password: hashedPassword, phone });
        return res.status(201).json({ id: user.id, email: user.email, phone: user.phone });
    } catch (error) {
        if (error instanceof UserAlreadyExistsError) {
            return res.status(409).json({ error: ALREADY_EXISTS_MESSAGES[error.field ?? 'unknown'] });
        }
        console.error('Signup error:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
})


/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Realiza login e retorna um token JWT
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Campos ausentes
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno ao fazer login
 */
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if(!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try{
        const token = await signLoginToken(email, password);
        if(!token) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        return res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

export default router;