# CLAUDE.md — Jorge (monorepo)

**Jorge** é um assistente financeiro pessoal. O usuário escreve gastos e receitas em linguagem natural
("gastei 50 reais no mercado"), a OpenAI extrai valor/tipo/categoria, o backend grava uma transação e o app
mostra relatórios por categoria. Uso pessoal: um único usuário real (o dono), app distribuído como APK.

```
backend/   API — Express 5 + Prisma + Postgres (Supabase) + OpenAI. Deploy na Railway.   → backend/CLAUDE.md
mobile/    App — Expo SDK 54 / React Native. APK gerado pelo EAS.                          → mobile/CLAUDE.md
```

As duas pastas são projetos independentes (sem workspaces): cada uma tem seu `package.json`, lockfile,
`.env` e `node_modules`. Rode os comandos de dentro da pasta correspondente.

## Prioridades do projeto

- **Custo baixo é o objetivo principal.** Hoje é uma chamada curta ao `gpt-4o-mini` por mensagem.
  Não adicione chamadas extras ao LLM, modelos mais caros ou serviços pagos sem discutir antes.
- Versão 2.0 em andamento: correções e melhorias acompanhadas pelas issues do GitHub; depois, renovar a
  interface e adicionar funcionalidades.

## Contrato app ↔ API

- Auth: `POST /auth/login` → `{ token }`. JWT com payload `{ sub, email, phone }`; o app decodifica esse
  payload no cliente e envia `Authorization: Bearer <token>` em tudo.
- O backend identifica o usuário **sempre pelo token** (`req.user`); nada do body/URL define o dono dos dados.
  Um 401 em qualquer rota faz o app deslogar.
- Envio de mensagem: `POST /webhook/messages` com `{ userMessage: { id, text, sender, timestamp, userPhone } }`.
  - `id` (gerado no celular) torna o envio idempotente: `phone` + `messageId` é único, e um reenvio devolve a
    transação já gravada sem chamar a OpenAI.
  - `userPhone` é ignorado pelo backend, mas o app usa para saber de quem é cada item da fila offline.
  - Respostas: **200** `{ id, valor, tipo, categoria, comentario }` (`id` da transação gravada, também no reenvio); **400** `{ error, code }` quando a mensagem não vira
    transação (`code`: `NO_TRANSACTION`, `EMPTY_MESSAGE`, `MESSAGE_TOO_LONG`, `INVALID_JSON_RESPONSE`, `OPENAI_*`).
- Relatórios: `GET /transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`, datas no fuso de São Paulo (-03:00);
  `amount` é `Decimal(12,2)` no banco e número no JSON.
- Categorias: lista fechada em `backend/src/services/chatService.ts` (`CATEGORIAS`), a mesma no prompt e no `enum`
  do structured output. As transações antigas (texto livre) foram convertidas para essa lista em 2026-10-27.
- Correção: `PATCH /transactions/:id` (opcionais `type`, `amount`, `category`, `description`, `createdAt` como
  `YYYY-MM-DD`, que mantém o horário, ou ISO com fuso) → 200 com a transação; `DELETE /transactions/:id` → 204.
  Transação inexistente ou de outro usuário → 404.
- Perfil: `GET /user/:id` → `{ id, email, phone, name, createdAt, monthlyGoal }`; `PUT /user/:id` aceita
  `{ name?, monthlyGoal? }` e só altera o que vier (`monthlyGoal: null` remove a meta). A meta mensal de gastos
  vale para todos os meses; `monthlyGoal` também é `Decimal(12,2)` no banco e número (ou `null`) no JSON.
- Transações pertencem ao usuário pelo `phone` (não há FK entre `user` e `transaction`).

Ao mudar o contrato, altere `backend/` e `mobile/` juntos, de preferência no mesmo commit.

## Rodando localmente

1. `backend/`: `.env` a partir do `.env.example`, `yarn install && npx prisma generate && yarn dev` (porta 3065).
2. `mobile/`: `.env` com `API_URL`, `npm install && npm start`. Em celular físico use o IP da máquina na rede
   (`http://192.168.x.x:3065`), não `localhost`; no emulador Android, `http://10.0.2.2:3065`.

## Deploy

- **Backend:** Railway, serviço com Root Directory `/backend` (watch path `/backend/**`), Node da versão em
  `backend/.node-version`. **Todo merge na `main` que toca `backend/` vai para produção na hora**, enquanto o app
  no celular só muda com um APK novo — mudanças no backend precisam continuar compatíveis com o APK instalado.
  - Pre-deploy Command: `npx prisma migrate deploy` (migrations rodam antes de o código novo subir).
  - `DATABASE_DIRECT_URL` precisa ser o **session pooler** do Supabase (mesmo host do `DATABASE_URL`, porta 5432,
    sem `?pgbouncer=true`): o host direto `db.<ref>.supabase.co` só tem IPv6 e a Railway não alcança.
  - `NODE_ENV=production` definido (esconde o `/api-docs`).
- **Mobile:** `cd mobile && eas build -p android --profile preview` (APK). O `API_URL` de produção vem do `env`
  do profile em `mobile/eas.json`.

## Fluxo de trabalho

- Mudanças entram por **PR para a `main`** (nunca commit direto na `main`); o dono revisa e faz o merge.
  Use `Closes #N` no corpo para fechar a issue no merge (ou `Parte de #N` quando resolver só uma parte).
- Para trabalho em paralelo com subagentes, separe as tarefas por arquivos que não se sobrepõem, um worktree e
  um PR por grupo; antes de liberar os PRs, junte as branches num worktree temporário e rode tsc/testes no conjunto.

## Git e commits

- Mensagens curtas em português no padrão do histórico: `feat: ...`, `fix: ...`, `chore: ...`
  (use escopo quando ajudar: `fix(backend): ...`, `feat(mobile): ...`).
- **Não incluir atribuição ao Claude** em commits nem PRs: nada de `Co-Authored-By: Claude ...`,
  "Generated with Claude Code" ou similares.
- Nunca commitar `.env`.
- **Conta do GitHub:** este repo é pessoal (`LucasMedici`), mas a conta ativa do `gh` na máquina é a do trabalho.
  O git local já está configurado (user + credential helper locais) para usar `LucasMedici`. Para o `gh`, sempre
  prefixe: `GH_TOKEN=$(gh auth token -u LucasMedici) gh ...`. Nunca troque a conta ativa nem altere o git global.
- Histórico anterior ao monorepo foi importado com `git subtree`: `git blame` mostra os commits originais,
  mas para `git log` de um arquivo antigo use o caminho sem o prefixo (ex.: `git log -- src/index.ts`
  em vez de `backend/src/index.ts`). Repositórios originais: `LucasMedici/finance-assistent-backend` e
  `LucasMedici/finance-assistent-frontend`.
