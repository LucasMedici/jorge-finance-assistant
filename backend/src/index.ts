import dotenv from 'dotenv';
dotenv.config();

import { loadEnvOrExit } from './config/env';

// Valida antes de carregar o app: sem as variáveis obrigatórias o processo encerra com código 1.
const env = loadEnvOrExit();

import { app } from './app';

const port = env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
