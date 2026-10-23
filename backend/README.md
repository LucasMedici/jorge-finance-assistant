
# ⚡ Finance Assistant Backend (Node.js + TypeScript)

## 🚀 Overview
Backend API for a virtual finance assistant.
Handles user authentication, processes chat messages, stores expense data, and generates reports.

## 🛠 Tech Stack
- **Node.js + TypeScript**
- **Express.js**
- **PostgreSQL via Prisma ORM**
- **JWT for authentication**
- **Hosted on Railway**
- **Supabase for storage/realtime**
- **Swagger / OpenAPI for full API documentation**
  
## 🗂 Project Structure
```
/src
  /@types       🔹 TypeScript interfaces
  /middlewares  🔹 Auth, error handling
  /routes       🔹 Express routes
  /services     🔹 Business logic (chat processing, reports)
  index.ts      🔹 App entry point
  swagger.ts    🔹 Swagger/OpenAPI setup
```

## 🔑 Features

- **Auth: JWT login & session validation 🔑**
- **Chat: POST webhook/messages, confirmation message ✅**
- **Expenses & Reports: store expenses, generate category reports 📊**
- **Security: Auth middleware, input validation, safe data handling**
- **Swagger / OpenAPI: Full API documentation available at /api-docs 📄**
  <img width="800" height="600" alt="jorge backend api swagger open api docs" src="https://github.com/user-attachments/assets/e1d84014-baf4-4331-9f50-07ad4a392c70" />


## ⚡ Quick Start
```bash
yarn install
# configure your .env with PORT, DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, JWT_EXPIRES_IN etc (in .env.example)
yarn dev
# access full API documentation at http://localhost:PORT/api-docs
```

## 📨 Insomnia Requests

[Insomnia-RequestsFile.yaml](https://github.com/user-attachments/files/24020089/Insomnia-RequestsFile.yaml)

---


# ⚡ Backend App - PT-BR (Resumo)

## 🚀 Overview
API backend de um assistente financeiro virtual.
Autenticação, processamento de mensagens, armazenamento de despesas e geração de relatórios.

## 🛠 Tech Stack
- **Node.js + TypeScript**
- **Express.js**
- **PostgreSQL via Prisma ORM**
- **JWT para autenticação**
- **Hospedado no Railway**
- **Supabase para storage/realtime**
- **Swagger / OpenAPI para documentação da API**
  
## 🔑 Features

- **Auth: login JWT, validação de sessão 🔑**
- **Chat: POST webhook/messages, mensagem de confirmação ✅**
- **Despesas & Relatórios: registro de gastos, relatórios por categoria 📊**
- **Segurança: middleware de auth, validação de entrada, dados seguros**
- **Swagger / OpenAPI: Documentação completa da API disponível em /api-docs 📄**

## ⚡ Quick Start
```bash
yarn install
# configure o seu .env with PORT, DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, JWT_EXPIRES_IN etc (exemplo em .env.example)
yarn dev
# acesse a documentação completa em http://localhost:PORT/api-docs
```

