import { Router, Request, Response } from 'express';
import { createUser, findUserByEmail } from '../services/userService';
import { signLoginToken, verifyPassword, hashPassword } from '../services/authService';


const router = Router();

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
 *         description: Campos obrigatórios ausentes
 *       409:
 *         description: Usuário já existe
 *       500:
 *         description: Erro interno ao criar usuário
 */
router.post('/signup', async (req: Request, res: Response) => {
    const { email, password, phone } = req.body;
    if(!email || !password || !phone) {
        return res.status(400).json({ error: "Email, password, and phone are required" });
    }

    try{
        const existingUser = await findUserByEmail(email);
        if(existingUser) {
            return res.status(409).json({ error: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);
        const user = await createUser({ email, password: hashedPassword, phone });
        return res.status(201).json({ id: user.id, email: user.email, phone: user.phone });
    } catch (error) {
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