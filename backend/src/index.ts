import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import webhookRoutes from './routes/webhook';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import transactionRouter from './routes/transactions';
import { authMiddleware } from './middlewares/authMiddleware';
import { swaggerUi, swaggerSpec } from "./swagger";

const app = express();
app.use(express.json());

app.get('/serverstatus', (req, res) => {
  res.send('on');
});

app.use('/webhook', authMiddleware, webhookRoutes);
app.use('/auth', authRouter);
app.use('/user', authMiddleware, userRouter);
app.use('/transactions', authMiddleware, transactionRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
