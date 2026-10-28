# Jorge — API

REST API of **Jorge**, a personal finance assistant: the app sends a message in plain language
("gastei 50 reais no mercado"), OpenAI (`gpt-4o-mini`) extracts amount, type and category, and the result is stored
as a transaction in Postgres. Built with Node.js, Express 5, TypeScript, Prisma and Zod.

This is the **v2** API: on top of v1 it has a fixed category list, corrections (`PATCH`/`DELETE
/transactions/:id`) and the monthly spending goal (`monthlyGoal`), still with one OpenAI call per message.

This folder is only the API. The app lives in [`../mobile`](../mobile); the full project overview, features and
API reference are in the [root README](../README.md).

## Running locally

Requirements: Node.js (version in `.node-version`), Yarn, a PostgreSQL database (a Supabase project works) and an
OpenAI API key.

```bash
yarn install
cp .env.example .env        # then fill in the variables below
npx prisma generate         # required after install: the client is generated in src/generated/prisma (not in git)
npx prisma migrate deploy   # creates/updates the tables
yarn dev                    # http://localhost:3065 — Swagger at http://localhost:3065/api-docs
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection used by the app (Supabase pooler) |
| `OPENAI_API_KEY` | yes | OpenAI key |
| `JWT_SECRET` | yes | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | yes | Token lifetime with a unit, e.g. `7d`, `12h` |
| `DATABASE_DIRECT_URL` | for the Prisma CLI | Used by builds and migrations. On Supabase, use the **session pooler** (same host as `DATABASE_URL`, port 5432, without `?pgbouncer=true`) |
| `PORT` | no | HTTP port (`3065` in the example) |
| `PRISMA_DISABLE_PREPARED_STATEMENTS` | no | `true` when using a connection pooler |
| `NODE_ENV` | no | `production` hides `/api-docs` |
| `API_DOCS_ENABLED` | no | `true` serves `/api-docs` even in production |

The server validates the required variables on boot (`src/config/env.ts`) and exits if any is missing.

## Scripts

```bash
yarn dev                    # ts-node-dev with reload
yarn build                  # prisma generate + tsc -> dist/
yarn start                  # node dist/index.js (used by the Procfile)
yarn test                   # Vitest + Supertest; Prisma and OpenAI are mocked
yarn lint                   # ESLint
npx tsc --noEmit            # type check
npx prisma migrate status   # migration state of the database in .env (read only)
```

## Routes

All routes except `/auth/*` and `/serverstatus` require `Authorization: Bearer <token>`. The user is always taken
from the token, never from the body or URL.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account — `{ email, password, phone }` |
| `POST` | `/auth/login` | Log in — `{ email, password }` → `{ token }` |
| `POST` | `/webhook/messages` | Turn a message into a transaction and store it; idempotent by message `id` |
| `GET` | `/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Transactions in the period (São Paulo time) |
| `PATCH` | `/transactions/:id` | Fix a transaction — any of `{ type, amount, category, description, createdAt }` |
| `DELETE` | `/transactions/:id` | Delete a transaction (204) |
| `GET` | `/user/:id` | Profile, including the monthly spending goal |
| `PUT` | `/user/:id` | Update `{ name?, monthlyGoal? }` (`monthlyGoal: null` removes the goal) |
| `GET` | `/serverstatus` | Health check (returns `on`) |

Request/response examples and error codes are in the [root README](../README.md#api) and in Swagger
(`/api-docs`, outside production). Login and signup are rate limited to 10 attempts per IP every 15 minutes.

## How a message becomes a transaction

1. The text is sanitized (URLs and emojis removed, accents and `R$` kept) and limited to 150 characters.
2. **One** call to `gpt-4o-mini` with a strict JSON schema (low temperature, small `max_tokens`) returns
   `valor`, `tipo` (`gasto` / `receita` / `outro`), `categoria` and `comentario`.
3. The category comes from a closed list (`CATEGORIAS` in `src/services/chatService.ts`); anything outside the
   list for that type becomes `Outros`.
4. The transaction is saved and its `id` is returned. A resend with the same message `id` returns the stored
   transaction without calling OpenAI again.

When the message is not a transaction (or OpenAI fails), the API answers 400 `{ error, code }` with a friendly
message in Portuguese.

## Project structure

```
src/
  index.ts              loads .env, validates it and starts the server
  app.ts                Express app: trust proxy, rate limit, routes, /api-docs (also used by the tests)
  config/env.ts         environment validation with Zod
  routes/               HTTP handlers + OpenAPI docs in JSDoc (@openapi)
  services/             business logic: chat/OpenAI, auth, users, transactions
  middlewares/          authMiddleware (Bearer JWT → req.user) and in-memory rate limit
  lib/prisma.ts         Prisma client
  swagger.ts            Swagger / OpenAPI setup
prisma/
  schema.prisma         `user` and `transaction` models (schema `assistent`)
  migrations/           SQL migrations
tests/                  one file per area (auth, webhook, transactions, user, chatService, ...)
```

Transactions belong to a user through the `phone` field; there is no foreign key between the two tables.
`amount` and `monthlyGoal` are `Decimal(12,2)` in the database and numbers in the JSON.

## Deploy

Railway, with Root Directory `/backend`. The build runs `prisma generate && tsc`, the Pre-deploy Command runs
`npx prisma migrate deploy` and the `Procfile` starts `node dist/index.js`. Every merge to `main` that touches
`backend/` goes to production right away, so changes must stay compatible with the APK already installed.
