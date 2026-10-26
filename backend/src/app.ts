import express from 'express';
import webhookRoutes from './routes/webhook';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import transactionRouter from './routes/transactions';
import { authMiddleware } from './middlewares/authMiddleware';
import { createRateLimiter } from './middlewares/rateLimit';
import { isApiDocsEnabled, swaggerUi, swaggerSpec } from "./swagger";

export const app = express();

// A Railway fica atrás de um proxy: confia no primeiro hop para `req.ip` ser o IP real do cliente.
app.set('trust proxy', 1);
app.use(express.json());

app.get('/serverstatus', (req, res) => {
  res.send('on');
});

// 10 tentativas por IP a cada 15 min em login/signup (desativado quando NODE_ENV=test).
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
app.post(['/auth/login', '/auth/signup'], authRateLimit);

app.use('/webhook', authMiddleware, webhookRoutes);
app.use('/auth', authRouter);
app.use('/user', authMiddleware, userRouter);
app.use('/transactions', authMiddleware, transactionRouter);

// Documentação só fora de produção, ou em produção com API_DOCS_ENABLED=true.
if (isApiDocsEnabled()) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
