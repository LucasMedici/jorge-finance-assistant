# CLAUDE.md — mobile/

App mobile do **Jorge**. O usuário escreve gastos/receitas em linguagem natural numa tela de chat;
o backend extrai os dados com IA e grava transações; a tela de relatórios mostra gastos, receitas e saldo
por período. Distribuído como APK (profile `preview` do EAS), só para o dono.

Visão geral do projeto, contrato app ↔ API, deploy, regras de Git e de custo: `../CLAUDE.md`. A API fica em
`../backend`; mudanças de contrato mexem nas duas pastas (de preferência no mesmo PR). Todos os comandos abaixo
rodam de dentro de `mobile/`.

## Comandos

```bash
npm install
npm start                  # expo start (Expo Go / dev client)
npm run android            # abre no Android
npx tsc --noEmit           # checagem de tipos
npm test                   # Jest (jest-expo): lógica dos relatórios, fila offline, token
npm run lint               # ESLint 9 (eslint.config.js = eslint-config-expo + prettier); deve ficar com 0 problemas
npx expo export --platform android        # gera o bundle (bom para checar assets/imports; apague dist/ depois)
eas build -p android --profile preview    # gera o APK
```

Use **npm** (`package-lock.json` é o lockfile versionado).

## Stack

Expo SDK 54 · React Native 0.81 (New Architecture) · React 19 · TypeScript (strict) · React Navigation 7
(native-stack + bottom-tabs) · axios · AsyncStorage · NetInfo · react-native-chart-kit · date-fns · jwt-decode.

## Configuração / API_URL

A configuração do Expo fica **só** em `app.config.ts` (não existe `app.json`). Ele lê `API_URL` do `.env`
(via `dotenv`) e expõe em `extra.API_URL`; `src/services/api.ts` lê de `Constants.expoConfig.extra`. Em builds
EAS, o `API_URL` vem do `env` do profile em `eas.json`. Ao mexer na config, compare `npx expo config --type public`
antes e depois.

## Arquitetura

```
App.tsx                       fontes + AuthProvider > ConnectionProvider > Routes
src/routes/stack.routes.tsx   telas conforme o login: com user → MainApp (tabs) + Profile; sem user → Login + Register
src/routes/tab.routes.tsx     abas: HomeTab (chat) e ReportsTab (relatórios)
src/routes/types.ts           RootStackParamList, TabParamList, RootStackScreenProps, TabScreenProps
src/pages/<tela>/index.tsx    tela;  src/pages/<tela>/styles.ts  estilos (StyleSheet)
src/context/AuthContext.tsx   sessão: user, loading, signIn(token), signOut(); valida o token no boot
src/context/ConectionContext.tsx  NetInfo + dispara a fila offline (ao reconectar, logar ou restaurar a sessão)
src/global/                   tema, fontes, formatCurrency, isTokenValid, fila offline
src/components/               componentes base do v2 (barrel index.ts): JorgeAvatar, Sheet, Chip, SegmentedControl,
                              Switch, PrimaryButton, TextButton, GoalBar, TabBar e ícones (react-native-svg)
src/services/api.ts           axios: injeta o Bearer token; em 401 limpa o token e derruba a sessão
src/assets/                   imagens do Jorge e ícone/splash (src/assets/app-icon)
```

Pontos importantes:

- **Sessão**: token no AsyncStorage (`userToken`); o user (`sub`, `email`, `phone`) é decodificado do JWT no
  `AuthProvider`. Entrar/sair é sempre via `signIn`/`signOut` — o stack troca as telas sozinho; não navegue
  manualmente para `Login`/`MainApp`.
- **Chat** (`pages/home`): mostra o que foi registrado ("Anotado ✅ Gasto de R$ 50,00 em mercado.") ou o `error`
  do 400 do backend; trava o botão enquanto envia.
- **Fila offline** (`global/offlineQueue.ts`, chave `offlineQueue`): sem conexão a mensagem é guardada (com
  `userPhone`) e reenviada depois — só os itens do usuário logado, sem execução em paralelo. Mensagens rejeitadas
  pelo backend (4xx, exceto 401/408/429 e `OPENAI_*`) são descartadas; falhas transitórias mantêm o item e param
  a fila (`getSendFailureAction`). O backend é idempotente pelo `id` da mensagem.
- **Relatórios**: `GET /transactions` com `startDate`/`endDate` formatados com `date-fns` no fuso local
  (nunca `toISOString()`); total e gráfico consideram só `gasto`; receitas e saldo aparecem à parte. Os cálculos
  ficam em funções puras em `pages/reports/summary.ts` (testadas).

## Convenções

- Cores e fontes sempre de `src/global/themes.tsx` (`themas.colors.primary` #31266C, `secondary` #8DC63E)
  e `src/global/fonts.ts` (família Prompt), não hex/fontes soltos. O tema também tem os tokens do v2
  (`surface`, `textDark`, `textMuted`, `fillLight`, `error`, `warning`, `categoryColors`, `spacing`, `radius`).
- Redesign v2: telas de referência em `doc-images/v2/`. Jorge sempre estático (`JorgeAvatar`). Nas folhas brancas,
  selecionado = verde `secondary` com texto `textDark`; botão principal roxo; nunca texto verde sobre branco.
- Valores em reais com `formatCurrency` (`src/global/formatCurrency.ts`).
- Cada tela em `src/pages/<nome>/` com `index.tsx` + `styles.ts`; props tipadas com os tipos de `src/routes/types.ts`.
- Textos de interface em português.
- Lógica testável vai em funções puras fora dos componentes, com testes em `__tests__/` ao lado.
- Cada tela registra seu próprio handler do botão voltar do Android via `useFocusEffect`.
