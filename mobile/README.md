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

Type check: `npx tsc --noEmit`.

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
  context/              AuthContext (session from the saved JWT), ConectionContext (network status + offline queue)
  global/               theme, fonts, token check, offline queue
  services/api.ts       axios instance that sends the saved token as `Authorization: Bearer <token>`
  assets/               Jorge images and app icon
doc-images/             screenshots used in the READMEs
```

## How it behaves

- **Session:** the JWT is saved in AsyncStorage and restored on launch if it has not expired. There is no
  token refresh: when the token expires (or the API answers 401) you are sent back to the login screen.
- **Chat:** each message is sent to `POST /webhook/messages`; the API turns it into a transaction.
- **Offline queue:** messages sent without a connection are queued and sent when the connection comes back
  or when the same user logs in again. Messages from another account stay queued.
- **Reports:** expenses by category, income, balance and latest transactions for a date range
  (default: first day of the month → today).

## Screenshots

| Login | Chat | Reports |
| --- | --- | --- |
| ![Login](./doc-images/jorge_login.PNG) | ![Chat](./doc-images/jorge_chat.PNG) | ![Reports](./doc-images/jorge_reports.PNG) |
