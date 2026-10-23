# CLAUDE.md — backend/

API do **Jorge**. O usuário escreve em linguagem natural ("gastei 50 reais no mercado"), a OpenAI
extrai valor/tipo/categoria e o resultado vira uma `transaction` no Postgres.

Visão geral do projeto, regras de Git e de custo: `../CLAUDE.md`. O app que consome esta API fica em `../mobile`.
Todos os comandos abaixo rodam de dentro de `backend/`.

## Comandos

```bash
yarn install
npx prisma generate        # obrigatório após install: o client é gerado em src/generated/prisma (fora do git)
yarn dev                   # ts-node-dev com reload, porta = PORT do .env (padrão do exemplo: 3065)
yarn build                 # prisma generate + tsc -> dist/
yarn start                 # node dist/index.js (usado pelo Procfile)
npx prisma migrate dev --name <nome>   # nova migration (usa DATABASE_DIRECT_URL)
npx tsc --noEmit           # checagem de tipos
```

Não há testes automatizados. Swagger fica em `http://localhost:PORT/api-docs`.

Use **yarn** (lockfile: `yarn.lock`).

## Stack

Node 18 · Express 5 · TypeScript (strict) · Prisma 6 (generator `prisma-client`, `relationMode = "prisma"`)
· Postgres no Supabase (schema `assistent`) · JWT + bcryptjs · Zod 4 · OpenAI `gpt-4o-mini` · swagger-jsdoc.

## Arquitetura

```
src/index.ts            monta o Express e registra as rotas
src/routes/*.ts         handlers HTTP + documentação Swagger em JSDoc (@openapi)
src/services/*.ts       regra de negócio (chat/OpenAI, auth, usuário, transações)
src/middlewares/        authMiddleware (Bearer JWT)
src/lib/prisma.ts       PrismaClient singleton
prisma/schema.prisma    modelos `user` e `transaction`
```

Rotas:

| Rota | Auth | O que faz |
| --- | --- | --- |
| `POST /auth/signup` | não | cria usuário (`email`, `password`, `phone`) |
| `POST /auth/login` | não | devolve `{ token }` |
| `POST /webhook/messages` | sim | envia o texto para a OpenAI e grava uma `transaction` |
| `GET /transactions?startDate&endDate` | sim | transações do usuário no período (datas `YYYY-MM-DD`) |
| `GET /user/:id` / `PUT /user/:id` | sim | lê perfil / altera `name` |
| `GET /serverstatus` | não | health check |

Pontos importantes:

- **JWT** é assinado com payload `{ sub, email, phone }`. O app mobile decodifica esse payload no cliente.
- **`user` e `transaction` não têm relação no banco**: a transação pertence ao usuário pelo campo `phone`.
- `chatService.processUserMessage` sempre devolve um objeto `{ valor, tipo, categoria, comentario }`
  e, em caso de falha, um campo `error` (`EMPTY_MESSAGE`, `MESSAGE_TOO_LONG`, `OPENAI_*`, `INVALID_JSON_RESPONSE`).
  `tipo` é `gasto | receita | outro`.
- Contrato atual do webhook (o que o app envia):
  `{ userMessage: { id, text, sender, timestamp, userPhone } }`.

## Convenções

- Erros HTTP no formato `{ error: string }`; mensagens para o usuário final em português.
- Ao criar/alterar uma rota, atualize o bloco `@openapi` acima dela.
- Validação de entrada com Zod nos services.
- Custo: uma chamada curta à OpenAI por mensagem (ver `../CLAUDE.md`).

## Variáveis de ambiente

Veja `.env.example`: `PORT`, `DATABASE_URL` (pooler), `DATABASE_DIRECT_URL` (migrations), `OPENAI_API_KEY`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, `PRISMA_DISABLE_PREPARED_STATEMENTS=true`. Nada é validado no boot.

## Deploy

Railway, com **Root Directory = `/backend`**, via `Procfile` (`web: node dist/index.js`); o build roda
`prisma generate && tsc`. Migrations **não** rodam automaticamente no deploy — aplicar com `npx prisma migrate deploy`.

## Problemas conhecidos (revisão de 2026-10)

- `authMiddleware` lê `decoded.id`, mas o token usa `sub` → `req.userId` é sempre `undefined`.
- `POST /webhook/messages` grava o `phone` vindo do body, não do token (um usuário pode gravar em nome de outro).
- `GET/PUT /user/:id` não verificam se o `id` é o do usuário logado.
- `messageId` é lido de `req.body.id`, mas o app envia o id dentro de `userMessage` → sempre `null`.
- `sanitizeMessage` não tem efeito: a mensagem original é que vai para a OpenAI; a regex também removeria acentos e `R$`.
- Resposta da OpenAI não é validada (sem `response_format`/Zod); `valor: null` quebra o `prisma.create` com 500.
- Erros de Zod e de unicidade do Prisma no signup viram 500 em vez de 400/409.
- `amount` é `Float`. ESLint 9 com config legada `.eslintrc.json` (o `yarn lint` provavelmente não roda).
