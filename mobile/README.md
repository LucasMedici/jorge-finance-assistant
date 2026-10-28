# Jorge — mobile app

Android app of **Jorge**, a personal finance assistant: you type expenses and income in plain language
in a chat screen, the API extracts the data with AI and stores a transaction, and the reports screen shows
spending by category. Built with Expo SDK 54, React Native, TypeScript and React Navigation.

This folder is only the app. The API lives in [`../backend`](../backend); the full project overview,
features and API reference are in the [root README](../README.md).

## Running locally

Requirements: Node.js, npm and the API running (see [`../backend`](../backend)).

```bash
npm install
cp .env.example .env   # then set API_URL
npm start              # Expo dev server (Expo Go / dev client)
```

`API_URL` is read by `app.config.ts` and exposed in `extra.API_URL`. On a physical phone use your machine's
LAN IP, not `localhost`; on the Android emulator use `http://10.0.2.2:3065`.

Other commands:

```bash
npm run android        # open on Android
npm test               # Jest (jest-expo): reports math, offline queue, token, goal and form helpers
npm run lint           # ESLint (eslint-config-expo + prettier)
npx tsc --noEmit       # type check
```

## Building the APK

```bash
eas build -p android --profile preview
```

The `preview` profile builds an APK, and its `API_URL` comes from the profile's `env` in `eas.json`.

## Project structure

```
App.tsx                 fonts + AuthProvider > ConnectionProvider > routes
app.config.ts           Expo config (the only one; there is no app.json)
src/
  routes/               stack (Login, Register, MainApp, Profile) and tabs (Chat, Reports), with navigation types
  pages/<screen>/       index.tsx + styles.ts for login, register, home (chat), reports, profile
  components/           v2 building blocks (JorgeAvatar, Sheet, Chip, SegmentedControl, PrimaryButton, GoalBar,
                        TabBar, icons, ...) and the sheets to fix a transaction and set the monthly goal
  hooks/                monthly goal and average monthly spending
  context/              AuthContext (session from the saved JWT), ConectionContext (network status + offline queue)
  global/               theme, fonts, formatCurrency, categories, monthly goal helpers, token check, offline queue
  services/             api.ts (axios with the Bearer token; a 401 logs out), transactions.ts, user.ts
  assets/               Jorge images and app icon
doc-images/             screenshots used in the READMEs; doc-images/v2/ has the reference screens of the redesign
```

Pure logic lives outside the components, with Jest tests in `__tests__/` next to it.

## How it behaves

- **Session:** the JWT is saved in AsyncStorage and restored on launch if it has not expired. There is no
  token refresh: when the token expires (or the API answers 401) you are sent back to the login screen.
- **Chat:** each message is sent to `POST /webhook/messages`; the API turns it into a transaction and the chat
  shows what was recorded ("Anotado ✅ Gasto de R$ 50,00 …") or the API's error message.
- **Offline queue:** messages sent without a connection are queued and sent when the connection comes back
  or when the same user logs in again. Messages from another account stay queued. Messages the API rejects
  (e.g. "not a transaction") are dropped; temporary failures keep the item and retry later. Resending is safe
  because the API is idempotent by message `id`.
- **Reports:** expenses by category, income, balance and latest transactions for a date range
  (default: first day of the month → today). Dates are sent as `YYYY-MM-DD` in local time.

## Screenshots

These are v1 screenshots; login, register and profile already follow the v2 design, whose reference screens are
in [`doc-images/v2/`](./doc-images/v2).

| Login | Chat | Reports |
| --- | --- | --- |
| ![Login](./doc-images/jorge_login.PNG) | ![Chat](./doc-images/jorge_chat.PNG) | ![Reports](./doc-images/jorge_reports.PNG) |
