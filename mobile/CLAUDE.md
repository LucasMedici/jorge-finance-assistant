# CLAUDE.md — mobile/

App mobile do **Jorge**. O usuário escreve gastos/receitas em linguagem natural numa tela de chat;
o backend extrai os dados com IA e grava transações; os relatórios mostram quanto foi gasto no período, por
categoria, contra uma meta mensal de gastos. Distribuído como APK (profile `preview` do EAS), só para o dono.

Visão geral do projeto, contrato app ↔ API, deploy, regras de Git e de custo: `../CLAUDE.md`. A API fica em
`../backend`; mudanças de contrato mexem nas duas pastas (de preferência no mesmo PR). Todos os comandos abaixo
rodam de dentro de `mobile/`.

## Comandos

```bash
npm install
npm start                  # expo start (Expo Go / dev client)
npm run android            # abre no Android
npx tsc --noEmit           # checagem de tipos
npm test                   # Jest (jest-expo): lógica pura (relatórios, chat, folhas, meta, fila offline, token)
npm run lint               # ESLint 9 (eslint.config.js = eslint-config-expo + prettier); deve ficar com 0 problemas
npx expo export --platform android        # gera o bundle (bom para checar assets/imports; apague dist/ depois)
eas build -p android --profile preview    # gera o APK
```

Use **npm** (`package-lock.json` é o lockfile versionado).

## Stack

Expo SDK 54 · React Native 0.81 (New Architecture) · React 19 · TypeScript (strict) · React Navigation 7
(native-stack + bottom-tabs) · axios · AsyncStorage · NetInfo · react-native-svg (gráficos) · date-fns · jwt-decode.

## Configuração / API_URL

A configuração do Expo fica **só** em `app.config.ts` (não existe `app.json`). Ele lê `API_URL` do `.env`
(via `dotenv`) e expõe em `extra.API_URL`; `src/services/api.ts` lê de `Constants.expoConfig.extra`. Em builds
EAS, o `API_URL` vem do `env` do profile em `eas.json`. Ao mexer na config, compare `npx expo config --type public`
antes e depois.

## Arquitetura

```
App.tsx                       fontes + AuthProvider > ConnectionProvider > Routes
src/routes/stack.routes.tsx   telas conforme o login: com user → MainApp (tabs) + Profile; sem user → Login + Register
src/routes/tab.routes.tsx     abas com a TabBar do v2: HomeTab (chat) e ReportsTab (stack de reports.routes.tsx)
src/routes/reports.routes.tsx stack da aba Relatórios: Reports (painel), CategoryDetail, Transactions
src/routes/types.ts           RootStackParamList, TabParamList, RootStackScreenProps, TabScreenProps
src/pages/<tela>/index.tsx    tela;  src/pages/<tela>/styles.ts  estilos (StyleSheet)
src/context/AuthContext.tsx   sessão: user, loading, signIn(token), signOut(); valida o token no boot
src/context/ConectionContext.tsx  NetInfo + dispara a fila offline (ao reconectar, logar ou restaurar a sessão)
src/global/                   tema, fontes, formatCurrency, isTokenValid, fila offline
src/components/               componentes base do v2 (barrel index.ts): JorgeAvatar, Sheet, Chip, SegmentedControl,
                              Switch, PrimaryButton, TextButton, GoalBar, TabBar e ícones (react-native-svg)
src/services/api.ts           axios: injeta o Bearer token; em 401 limpa o token e derruba a sessão
src/services/transactions.ts  GET/PATCH/DELETE de transações;  src/services/user.ts  perfil e meta mensal
src/hooks/                    useMonthlyGoal (meta compartilhada entre telas, sem Provider), useAverageMonthlySpending
src/assets/v2/                artes do Jorge: avatar (JorgeAvatar) e corpo inteiro (splash)
src/assets/app-icon/v2/       ícone do app: loja/legado, camadas do adaptativo e monocromático
```

Pontos importantes:

- **Sessão**: token no AsyncStorage (`userToken`); o user (`sub`, `email`, `phone`) é decodificado do JWT no
  `AuthProvider`. Entrar/sair é sempre via `signIn`/`signOut` — o stack troca as telas sozinho; não navegue
  manualmente para `Login`/`MainApp`.
- **Chat** (`pages/home`): resumo do mês (gasto, hoje, `GoalBar`) no topo; depois do 200 do webhook mostra o cartão
  Confirmar/Corrigir — a transação já foi salva, "Confirmar" só fecha o cartão e "Corrigir" abre a
  `CorrectTransactionSheet` (PATCH/DELETE pelo `id` que o webhook devolve). O `error` do 400 vira mensagem do Jorge.
  Atalhos ("Quanto gastei hoje?", "Resumo da semana") são calculados no app, sem chamar a IA. O teclado é tratado
  por `useKeyboardOverlap` (o `KeyboardAvoidingView` deixa sobra no Android edge-to-edge).
- **Fila offline** (`global/offlineQueue.ts`, chave `offlineQueue`): sem conexão a mensagem é guardada (com
  `userPhone`) e reenviada depois — só os itens do usuário logado, sem execução em paralelo. Mensagens rejeitadas
  pelo backend (4xx, exceto 401/408/429 e `OPENAI_*`) são descartadas; falhas transitórias mantêm o item e param
  a fila (`getSendFailureAction`). O backend é idempotente pelo `id` da mensagem.
- **Relatórios**: `GET /transactions` com `startDate`/`endDate` formatados com `date-fns` no fuso local
  (nunca `toISOString()`); tudo considera só `gasto`. Painel do mês com meta, ritmo acumulado vs mês anterior e
  projeção (gráficos em `react-native-svg`), categorias (top 4 com `categoryColors` por ranking, resto em Outros),
  Detalhe da categoria e Lançamentos. Os cálculos ficam em funções puras em `pages/reports/` (testadas).
- **Categorias**: lista fechada em `global/categories.ts`, igual à do backend; compare com `normalizeCategory`.
- **Layout**: o `SafeAreaView` do `App.tsx` protege só o topo; telas com folha branca embaixo somam
  `useSafeAreaInsets().bottom` e a `TabBar`/`Sheet` já tratam a barra do Android.

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
