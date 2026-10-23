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
- Versão 2.0 em andamento: corrigir os problemas conhecidos (listados nos CLAUDE.md de cada pasta e nas
  issues do GitHub), renovar a interface e adicionar funcionalidades.

## Contrato app ↔ API

- Auth: `POST /auth/login` → `{ token }`. JWT com payload `{ sub, email, phone }`; o app decodifica esse
  payload no cliente e envia `Authorization: Bearer <token>` em tudo.
- Envio de mensagem: `POST /webhook/messages` com `{ userMessage: { id, text, sender, timestamp, userPhone } }`.
- Relatórios: `GET /transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`.
- Transações pertencem ao usuário pelo `phone` (não há FK entre `user` e `transaction`).

Ao mudar o contrato, altere `backend/` e `mobile/` juntos, de preferência no mesmo commit.

## Rodando localmente

1. `backend/`: `.env` a partir do `.env.example`, `yarn install && npx prisma generate && yarn dev` (porta 3065).
2. `mobile/`: `.env` com `API_URL`, `npm install && npm start`. Em celular físico use o IP da máquina na rede
   (`http://192.168.x.x:3065`), não `localhost`; no emulador Android, `http://10.0.2.2:3065`.

## Deploy

- **Backend:** Railway, serviço com Root Directory `/backend` (watch path `/backend/**`).
- **Mobile:** `cd mobile && eas build -p android --profile preview` (APK). O `API_URL` de produção vem do `env`
  do profile em `mobile/eas.json`.

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
