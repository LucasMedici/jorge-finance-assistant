# CLAUDE.md — mobile/

App mobile do **Jorge**. O usuário escreve gastos/receitas em linguagem natural numa tela de chat;
o backend extrai os dados com IA e grava transações; a tela de relatórios mostra gastos por categoria.
Distribuído como APK, só para o dono.

Visão geral do projeto, regras de Git e de custo: `../CLAUDE.md`. A API fica em `../backend`; mudanças
de contrato mexem nas duas pastas (de preferência no mesmo commit). Todos os comandos abaixo rodam de dentro de `mobile/`.

## Comandos

```bash
npm install
npm start                  # expo start (Expo Go / dev client)
npm run android            # abre no Android
npx tsc --noEmit           # checagem de tipos
npm run format             # prettier
eas build -p android --profile preview   # gera o APK (profile `preview` = buildType apk)
```

Não há testes automatizados. Use **npm** (`package-lock.json` é o lockfile versionado).

## Stack

Expo SDK 54 · React Native 0.81 (New Architecture) · React 19 · TypeScript (strict) · React Navigation 7
(native-stack + bottom-tabs) · axios · AsyncStorage · NetInfo · react-native-chart-kit · date-fns · jwt-decode.

## Configuração / API_URL

`app.config.ts` lê `API_URL` do `.env` (via `dotenv`) e expõe em `extra.API_URL`; `src/services/api.ts`
lê de `Constants.expoConfig.extra`. Em builds EAS, o `API_URL` vem do `env` do profile em `eas.json`.
`app.config.ts` exporta um objeto, então ele prevalece sobre o `app.json` (que é basicamente legado).

## Arquitetura

```
App.tsx                      fontes + ConnectionProvider > AuthProvider > Routes
src/routes/stack.routes.js   Login, Register, MainApp (tabs), Profile; decide a rota inicial pelo token
src/routes/tab.routes.js     abas: HomeTab (chat) e ReportsTab (relatórios)
src/pages/<tela>/index.tsx   tela;  src/pages/<tela>/styles.ts  estilos (StyleSheet)
src/context/                 AuthContext (user decodificado do JWT), ConectionContext (NetInfo + fila offline)
src/global/                  tema, fontes, helpers de token e fila offline
src/services/api.ts          axios com interceptor que injeta `Authorization: Bearer <token>`
src/assets/                  imagens do Jorge (acenando, pensando, contando, descansando) e ícones
```

Pontos importantes:

- Token salvo no AsyncStorage na chave `userToken`. O usuário (`sub`, `email`, `phone`) é decodificado
  do JWT no cliente por `useLoadUserFromToken`, chamado dentro da Home.
- Fila offline na chave `offlineQueue`: sem conexão, a mensagem é guardada e reenviada quando a rede volta.
- O chat **não exibe a resposta do backend**: a resposta do bot é um texto fixo mostrado após um `setTimeout`.
- Contrato do envio: `POST /webhook/messages` com `{ userMessage: { id, text, sender, timestamp, userPhone } }`.
- Relatórios: `GET /transactions` com `startDate`/`endDate` em `YYYY-MM-DD`.

## Convenções

- Cores e fontes sempre de `src/global/themes.tsx` (`themas.colors.primary` #31266C, `secondary` #8DC63E)
  e `src/global/fonts.ts` (família Prompt), não hex/fontes soltos.
- Cada tela em `src/pages/<nome>/` com `index.tsx` + `styles.ts`.
- Textos de interface em português.
- Cada tela registra seu próprio handler do botão voltar do Android via `useFocusEffect`.

## Problemas conhecidos (revisão de 2026-10)

- `stack.routes.js` chama `isTokenValid(token)` sem `await` → token expirado entra no app; 401 não é tratado.
- Relatórios somam receitas junto com gastos no "Total de Gastos" e no gráfico.
- Datas enviadas com `toISOString()` (UTC) → após 21h no Brasil o filtro pula para o dia seguinte.
- `user` do contexto só é carregado na Home e nunca é limpo no logout (risco de dados de outra conta após trocar de login).
- `ConnectionProvider` registra o listener do NetInfo sem array de dependências (re-assina a cada render).
- `eas.json` aponta para a Railway; o último deploy do backend citado no histórico foi na Render — conferir a URL antes de buildar.
- Rotas em `.js` dentro de projeto TS; muitos `any`. ESLint 9 com config legada `.eslintrc.js`
  (o `npm run lint` provavelmente não roda).
- README promete renovação automática de token, "lembrar-me" e histórico local de mensagens, que não existem.
