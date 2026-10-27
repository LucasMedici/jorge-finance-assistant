# CLAUDE.md — backend/

API do **Jorge**. O usuário escreve em linguagem natural ("gastei 50 reais no mercado"), a OpenAI
extrai valor/tipo/categoria e o resultado vira uma `transaction` no Postgres.

Visão geral do projeto, contrato app ↔ API, deploy, regras de Git e de custo: `../CLAUDE.md`. O app que consome
esta API fica em `../mobile`. Todos os comandos abaixo rodam de dentro de `backend/`.

## Comandos

```bash
yarn install
npx prisma generate        # obrigatório após install: o client é gerado em src/generated/prisma (fora do git)
yarn dev                   # ts-node-dev com reload, porta = PORT do .env (padrão do exemplo: 3065)
yarn build                 # prisma generate + tsc -> dist/
yarn start                 # node dist/index.js (usado pelo Procfile)
yarn test                  # Vitest + Supertest (tests/), Prisma e OpenAI mockados
yarn lint                  # ESLint 9 (eslint.config.mjs, typescript-eslint); deve ficar com 0 erros/warnings
npx tsc --noEmit           # checagem de tipos
npx prisma migrate status  # estado das migrations no banco do .env (somente leitura)
```

Use **yarn** (lockfile: `yarn.lock`). O Vitest está fixo na v2 de propósito (a v3 exige Node ≥ 20.19).

### Migrations

`prisma.config.ts` exige `DATABASE_URL` e `DATABASE_DIRECT_URL` (o CLI usa a direta). Para criar uma migration
sem banco local, gere o SQL com `npx prisma migrate diff --from-schema-datamodel <schema antigo>
--to-schema-datamodel prisma/schema.prisma --script`, revise à mão (preservando dados, ex.: `USING` em mudanças de
tipo) e salve em `prisma/migrations/<timestamp>_<nome>/migration.sql`. Em produção elas rodam no Pre-deploy
Command da Railway (`npx prisma migrate deploy`). Antes de mexer no banco real, confira com `migrate status` e
consultas somente leitura.

## Stack

Node 24 (`.node-version`, usado pela Railway) · Express 5 · TypeScript (strict) · Prisma 6 (generator
`prisma-client`, `relationMode = "prisma"`) · Postgres no Supabase (schema `assistent`) · JWT + bcryptjs · Zod 4 ·
OpenAI `gpt-4o-mini` (structured outputs) · swagger-jsdoc.

## Arquitetura

```
src/index.ts                  carrega o .env, valida as variáveis (config/env.ts) e sobe o servidor
src/app.ts                    monta o Express: trust proxy, rate limit em /auth/login e /auth/signup,
                              rotas, /api-docs fora de produção (importado pelos testes)
src/config/env.ts             validação das variáveis obrigatórias com Zod (encerra o processo se faltar)
src/routes/*.ts               handlers HTTP + documentação Swagger em JSDoc (@openapi)
src/services/*.ts             regra de negócio (chat/OpenAI, auth, usuário, transações)
src/middlewares/              authMiddleware (Bearer JWT → req.user) e rateLimit (em memória, por IP)
src/lib/prisma.ts             PrismaClient singleton
prisma/schema.prisma          modelos `user` e `transaction`
tests/                        um arquivo por área (authorization, webhook, transactions, user, signup, chatService, ...)
```

Rotas:

| Rota | Auth | O que faz |
| --- | --- | --- |
| `POST /auth/signup` | não | cria usuário; 400 `{ error, fields }` se inválido, 409 se e-mail/telefone já existe |
| `POST /auth/login` | não | devolve `{ token }` |
| `POST /webhook/messages` | sim | OpenAI extrai a transação e grava; idempotente por `phone` + `messageId`; devolve o `id` da transação |
| `GET /transactions?startDate&endDate` | sim | transações do usuário no período (`YYYY-MM-DD`, fuso -03:00) |
| `PATCH /transactions/:id` | sim | corrige `type/amount/category/description/createdAt` (parcial); 400 `{ error, fields }`; 404 se não existe ou é de outro usuário |
| `DELETE /transactions/:id` | sim | apaga; 204; 404 se não existe ou é de outro usuário |
| `GET /user/:id` / `PUT /user/:id` | sim | lê perfil (com `monthlyGoal`) / altera `name` e/ou `monthlyGoal` (parcial; `null` remove a meta); 400 `{ error, fields }`; 403 se o id não for o do token |
| `GET /serverstatus` | não | health check |

Pontos importantes:

- `authMiddleware` popula `req.user = { id, email, phone }` a partir do token (`sub`, `email`, `phone`). Rotas
  identificam o usuário **sempre** por `req.user`, nunca por dados do body/URL.
- **`user` e `transaction` não têm relação no banco**: a transação pertence ao usuário pelo campo `phone`.
- `chatService.processUserMessage` sanitiza o texto (remove URLs/emojis, mantém acentos e `R$`), faz **uma**
  chamada ao `gpt-4o-mini` com JSON schema estrito e valida com Zod. Devolve `{ valor, tipo, categoria, comentario }`
  ou, em falha, `error` (`EMPTY_MESSAGE`, `MESSAGE_TOO_LONG`, `NO_TRANSACTION`, `INVALID_JSON_RESPONSE`,
  `OPENAI_REFUSAL`, `OPENAI_NO_RESPONSE`, `OPENAI_API_ERROR`) com um `comentario` amigável — o webhook devolve
  isso como 400 `{ error: comentario, code: error }`.
- Categorias: lista fechada `CATEGORIAS` no `chatService` (vai no prompt, com exemplos, e no `enum` do schema);
  `normalizeCategoria` garante que a categoria é da lista do tipo, senão vira "Outros".
- Update/delete de transação filtram por `{ id, phone }` na mesma query; o 404 não revela se a transação existe.
- `amount` e `user.monthlyGoal` são `Decimal(12,2)`; converta para número ao devolver JSON (`serializeTransaction`, `serializeUser`).

## Convenções

- Erros HTTP no formato `{ error: string }` (com campos extras quando útil: `code`, `fields`); mensagens para o
  usuário final em português.
- Ao criar/alterar uma rota, atualize o bloco `@openapi` acima dela.
- Validação de entrada com Zod.
- Testes não podem chamar a OpenAI real nem um banco real: mocke `../src/lib/prisma` e o chatService/`openai`.
- Custo: uma chamada curta à OpenAI por mensagem (ver `../CLAUDE.md`).

## Variáveis de ambiente

Veja `.env.example`. Obrigatórias no boot: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `OPENAI_API_KEY`.
`DATABASE_DIRECT_URL` é exigida pelo Prisma CLI (build e migrations) e deve apontar para o session pooler do
Supabase. Opcionais: `PORT`, `NODE_ENV`, `API_DOCS_ENABLED`, `PRISMA_DISABLE_PREPARED_STATEMENTS`.

## Deploy

Railway, com **Root Directory = `/backend`**, via `Procfile` (`web: node dist/index.js`); o build roda
`prisma generate && tsc` e o Pre-deploy Command roda `npx prisma migrate deploy`. Detalhes em `../CLAUDE.md`.
