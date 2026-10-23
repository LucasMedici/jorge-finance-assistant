<div align="center">
  <img width="150" height="150" alt="Jorge acenando" src="./mobile/src/assets/jorge_acenando.png" />

  # Jorge — assistente financeiro

  Registre gastos e receitas em linguagem natural e acompanhe seus relatórios por categoria.
</div>

> "gastei 50 reais no mercado" → **gasto · R$ 50,00 · mercado**

| Login | Chat | Relatórios |
| --- | --- | --- |
| ![Login](./mobile/doc-images/jorge_login.PNG) | ![Chat](./mobile/doc-images/jorge_chat.PNG) | ![Relatórios](./mobile/doc-images/jorge_reports.PNG) |

## Estrutura

| Pasta | O que é | Stack | Deploy |
| --- | --- | --- | --- |
| [`backend/`](./backend) | API | Node.js, Express 5, TypeScript, Prisma, PostgreSQL (Supabase), OpenAI, JWT, Swagger | Railway |
| [`mobile/`](./mobile) | App Android | Expo SDK 54, React Native, TypeScript, React Navigation | EAS (APK) |

## Rodando localmente

```bash
# API
cd backend
cp .env.example .env          # preencha DATABASE_URL, OPENAI_API_KEY, JWT_SECRET...
yarn install && npx prisma generate
yarn dev                      # http://localhost:3065 — docs em /api-docs

# App (em outro terminal)
cd mobile
cp .env.example .env          # API_URL apontando para a API (em celular físico, use o IP da máquina)
npm install
npm start
```

## Histórico

Este repositório une os antigos [`finance-assistent-backend`](https://github.com/LucasMedici/finance-assistent-backend)
e [`finance-assistent-frontend`](https://github.com/LucasMedici/finance-assistent-frontend), com o histórico de commits preservado.

## Licença

[MIT](./LICENSE)
