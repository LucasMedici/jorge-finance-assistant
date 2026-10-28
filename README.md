<div align="center">
  <img width="180" height="180" alt="Jorge waving" src="./mobile/src/assets/v2/jorge_corpo_inteiro.png" />

  # Jorge — Finance Assistant

  **Your personal finance assistant: just tell Jorge what you spent.**

  ![Version](https://img.shields.io/badge/version-2.0-8DC63E)

  ![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?logo=expo&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
  ![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
  ![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)

  [Overview](#overview) · [What's new in v2](#whats-new-in-v2) · [Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [API](#api)

  **English** · [Português](./README.pt-BR.md)
</div>

---

## Overview

Jorge is a mobile app with an AI-powered chat for tracking personal finances. Instead of filling in forms, you write
what happened in plain Portuguese — Jorge understands it, stores it as a transaction and turns it into reports.

```
You:    "gastei 50 reais no mercado"
Jorge:  Entendi assim, confere?   Gasto · R$ 50,00 · Mercado · Hoje   [Confirmar] [Corrigir]
```

> [!NOTE]
> This is **Jorge v2**: a full redesign of the app, plus monthly spending goals, corrections and new reports.
> See [what's new](#whats-new-in-v2). The v1 screenshots are kept at the end of the [Screenshots](#screenshots) section.

This repository contains the whole product:

| Folder | What it is | Stack | Deployed on |
| --- | --- | --- | --- |
| [`mobile/`](./mobile) | Android app | Expo · React Native · TypeScript | EAS Build (APK) |
| [`backend/`](./backend) | REST API | Node.js · Express · Prisma · PostgreSQL · OpenAI | Railway |

## Screenshots

Real screenshots of **v2** (demo account with sample data).

| Login | Chat | Fix a transaction |
| :---: | :---: | :---: |
| <img src="./mobile/doc-images/v2/app/01-login.png" width="230" alt="Login" /> | <img src="./mobile/doc-images/v2/app/04-chat-confirmar.png" width="230" alt="Chat with the confirm card" /> | <img src="./mobile/doc-images/v2/app/05-chat-corrigir.png" width="230" alt="Fix a transaction sheet" /> |

| Reports | Spending pace | Category detail |
| :---: | :---: | :---: |
| <img src="./mobile/doc-images/v2/app/06-relatorios.png" width="230" alt="Reports — month panel" /> | <img src="./mobile/doc-images/v2/app/07-relatorios-ritmo.png" width="230" alt="Spending pace chart with projection" /> | <img src="./mobile/doc-images/v2/app/09-categoria.png" width="230" alt="Category detail" /> |

| All transactions | Monthly goal | Profile |
| :---: | :---: | :---: |
| <img src="./mobile/doc-images/v2/app/10-lancamentos.png" width="230" alt="All transactions" /> | <img src="./mobile/doc-images/v2/app/11-meta.png" width="230" alt="Monthly goal sheet" /> | <img src="./mobile/doc-images/v2/app/12-perfil.png" width="230" alt="Profile" /> |

<details>
<summary>v1 screenshots</summary>

| Login | Chat | Reports |
| :---: | :---: | :---: |
| <img src="./mobile/doc-images/v1/jorge_login.PNG" width="200" alt="v1 login screen" /> | <img src="./mobile/doc-images/v1/jorge_chat.PNG" width="200" alt="v1 chat screen" /> | <img src="./mobile/doc-images/v1/jorge_reports.PNG" width="200" alt="v1 reports screen" /> |

</details>

## What's new in v2

- 🎨 **New look** — purple and green theme, Prompt font, new Jorge art and a new app icon (with Android adaptive and
  themed icons). The approved design screens are in [`mobile/doc-images/v2/`](./mobile/doc-images/v2).
- ✅ **Confirm or fix** — after each message Jorge shows what he understood (type, amount, category, date) with
  *Confirmar* and *Corrigir*; any transaction can be fixed or deleted later.
- 🎯 **Monthly spending goal** — the app tracks how much you spent against a goal you set, with a pace chart against
  last month, an end-of-month projection and a warning when you are heading over it.
- 📊 **New reports** — spending by category with the change from last month, a 6-month category detail and a list of
  all transactions with search and category filters.
- 🏷️ **Fixed categories** — Jorge now always uses the same list (Mercado, Mercadinho, Comer fora, Transporte, Saúde,
  Lazer, …); older free-text categories were converted.
- 💸 **Same cost** — still one short `gpt-4o-mini` call per message. Summaries, shortcuts ("Quanto gastei hoje?") and
  reports are calculated in the app.

## Features

### Mobile app

- 🔐 **Account & session** — sign up with email, password and phone; the JWT is kept in AsyncStorage so you stay
  logged in, and every request is sent with `Authorization: Bearer <token>`.
- 💬 **Chat with Jorge** — month summary with the goal bar at the top, a confirm/fix card for every new transaction and
  shortcuts ("Quanto gastei hoje?", "Resumo da semana") answered by the app itself.
- 📶 **Offline queue** — connectivity is watched with NetInfo; messages written offline are stored locally and sent
  automatically when the connection comes back.
- 🎯 **Monthly goal** — set how much you want to spend per month; the app shows the % used, what is left, the pace
  against last month and the projection for the end of the month.
- 📊 **Reports** — week, month, 3 months or year; spending by category, biggest expenses, category detail (last 6
  months) and all transactions with search and filters.
- ✏️ **Corrections** — fix the type, amount, category, description or date of any transaction, or delete it.
- 👤 **Profile** — view your email, edit your display name and log out.

### API

- 🤖 **Natural language → transaction** — the message is sent to OpenAI with a strict extraction prompt that returns
  `valor` (amount), `tipo` (`gasto` / `receita` / `outro`), `categoria` (from a fixed list) and `comentario`, which is
  saved as a transaction.
- 💸 **Cost guards** — messages are limited to 150 characters, with low temperature and a small `max_tokens`.
- 🔑 **Authentication** — signup and login with bcrypt-hashed passwords and JWT; protected routes go through an auth middleware.
- 📅 **Transactions by period** — the user's transactions filtered by date, newest first; each one can be fixed
  (`PATCH`) or deleted (`DELETE`).
- 🎯 **Monthly goal** — stored on the user profile (`monthlyGoal`).
- 📄 **Interactive docs** — Swagger / OpenAPI at `/api-docs`.

## Architecture

```mermaid
flowchart LR
    APP["📱 Mobile app<br/>Expo / React Native"]
    API["⚡ API<br/>Express + Prisma"]
    AI["🤖 OpenAI<br/>gpt-4o-mini"]
    DB[("🐘 PostgreSQL<br/>Supabase")]

    APP -- "HTTPS + JWT" --> API
    API -- "1 short prompt per message" --> AI
    API -- "users & transactions" --> DB
```

What happens when you send a message:

1. The app posts the text to `POST /webhook/messages` (or keeps it in the offline queue if there's no connection).
2. The API validates the token and the message size, then asks OpenAI to extract amount, type and category.
3. The result is saved as a transaction and returned to the app.
4. The chat shows a confirm/fix card; *Corrigir* sends `PATCH /transactions/:id`.
5. Reports read `GET /transactions` and do all the math in the app (totals, pace, projection, categories).

### Project structure

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       data model
│   │   └── migrations/         SQL migrations
│   ├── src/
│   │   ├── routes/             Express routes + OpenAPI annotations
│   │   ├── services/           business logic (chat/OpenAI, auth, users, transactions)
│   │   ├── middlewares/        JWT auth
│   │   ├── lib/prisma.ts       Prisma client
│   │   ├── swagger.ts          Swagger / OpenAPI setup
│   │   └── index.ts            app entry point
│   └── Procfile                Railway start command
│
└── mobile/
    ├── App.tsx                 providers + navigation
    ├── app.config.ts           Expo config (reads API_URL)
    ├── eas.json                build profiles
    └── src/
        ├── pages/              login, register, home (chat), reports, category detail, transactions, profile
        ├── components/         v2 building blocks (avatar, sheets, chips, goal bar, tab bar, icons)
        ├── routes/             stack + bottom tabs (+ reports stack)
        ├── context/            auth and connectivity
        ├── hooks/              monthly goal, average monthly spending
        ├── services/           axios instance with the auth interceptor, transactions, user
        ├── global/             theme, fonts, categories, money and token helpers, offline queue
        └── assets/             Jorge illustrations and app icons (v2/)
```

## Getting started

### Prerequisites

- **Node.js 24** (version in `backend/.node-version`), **Yarn** (backend) and **npm** (mobile)
- A **PostgreSQL** database (a free Supabase project works) and an **OpenAI API key**
- **Expo Go** on your phone, or an Android emulator
- **EAS CLI** (`npm i -g eas-cli`) only if you want to build the APK

### 1. API

```bash
cd backend
cp .env.example .env            # fill in the variables below
yarn install
npx prisma generate             # generates the Prisma client in src/generated/prisma
npx prisma migrate deploy       # creates the tables
yarn dev                        # http://localhost:3065 — docs at http://localhost:3065/api-docs
```

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (example: `3065`) |
| `DATABASE_URL` | PostgreSQL connection string used by the app (pooled, on Supabase) |
| `DATABASE_DIRECT_URL` | Direct connection string, used by migrations |
| `OPENAI_API_KEY` | OpenAI key |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `PRISMA_DISABLE_PREPARED_STATEMENTS` | `true` when using a connection pooler (Supabase) |

### 2. Mobile app

```bash
cd mobile
cp .env.example .env            # API_URL=http://<your-api>
npm install
npm start                       # scan the QR code with Expo Go, or press "a" for Android
```

> [!TIP]
> `localhost` only works on the computer itself. On a physical phone, point `API_URL` to your machine's IP on the
> local network (e.g. `http://192.168.0.10:3065`); on the Android emulator, use `http://10.0.2.2:3065`.

## API

All routes except `/auth/*` and `/serverstatus` require `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account — `{ email, password, phone }` |
| `POST` | `/auth/login` | Log in — `{ email, password }` → `{ token }` |
| `POST` | `/webhook/messages` | Send a message to Jorge and store the transaction |
| `GET` | `/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Transactions in the period |
| `PATCH` | `/transactions/:id` | Fix a transaction — any of `{ type, amount, category, description, createdAt }` |
| `DELETE` | `/transactions/:id` | Delete a transaction |
| `GET` | `/user/:id` | Get a user profile (including the monthly spending goal) |
| `PUT` | `/user/:id` | Update the display name and/or monthly spending goal — `{ name?, monthlyGoal? }` |
| `GET` | `/serverstatus` | Health check (returns `on`) |

**Example — sending a message**

```http
POST /webhook/messages
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "userMessage": {
    "id": "1730000000000",
    "text": "gastei 50 reais no mercado",
    "userPhone": "5511999999999"
  }
}
```

```json
{
  "id": "3f0c2b9e-8a41-4d6e-9f57-1c2d3e4f5a6b",
  "valor": 50,
  "tipo": "gasto",
  "categoria": "Mercado",
  "comentario": ""
}
```

The full, interactive documentation is served by Swagger at **`/api-docs`**:

<img width="800" alt="Jorge API — Swagger / OpenAPI docs" src="https://github.com/user-attachments/assets/e1d84014-baf4-4331-9f50-07ad4a392c70" />

Prefer Insomnia? Import the ready-made collection: [Insomnia-RequestsFile.yaml](https://github.com/user-attachments/files/24020089/Insomnia-RequestsFile.yaml).
