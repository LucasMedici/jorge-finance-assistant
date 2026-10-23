
<div align="center">
  <img width="150" height="150" alt="jorge_acenando" src="https://github.com/user-attachments/assets/322b0b30-e19c-4b48-94d9-2509a6fc3cbe" />
</div>

# 📱 Finance Assistant App - Frontend (React Native + EXPO)

## 🚀 Overview
A mobile app for managing personal finances with an AI-powered chat assistant.  
Persistent login, offline message queue, and interactive charts.  

## 🛠 Tech Stack
- **Framework:** React Native + TypeScript  
- **Storage:** AsyncStorage (JWT, messages)  
- **Network:** Axios / Fetch API  
- **Connectivity:** `@react-native-community/netinfo`  
- **UI:** FlatList for chat, charts for reports  

## 🗂 Project Structure
```
/src
  /components   🔹 reusable UI components
  /screens      🔹 Login, Chat, Reports
  /services     🔹 API calls
  /store        🔹 State management
  /utils        🔹 Helpers (date, validation, etc.)
```

## 🔑 Features

### 1️⃣ Login & Auth
- Email & password login  
- Remember me ✅ (AsyncStorage)  
- Auto-session check on app launch  
- JWT stored securely  

### 2️⃣ Chat Interface
- Conversation like ChatGPT / WhatsApp 💬  
- Scrollable messages (FlatList)  
- User vs bot message bubbles  
- Local message history  

### 3️⃣ Sending Messages
- API: `POST webhook/messages`  
- Payload: `{
  "id": "msg-12345",
  "userPhone": "5511999999999",
  "userMessage": {
    "text": "gastei 50 reais em comida"
  }
}`  
- Bot reply: standard confirmation message received ✅

### 4️⃣ Offline Queue
- Detect network with `NetInfo` 📶  
- Messages saved with `"pending"` status  
- Auto resend on reconnect 🔄  

### 5️⃣ Secure API
- `Authorization: Bearer <token>`  
- Token auto-refresh  
- Stored securely in AsyncStorage  

### 6️⃣ Reports
- Spending by category 📊  
- Last transactions list  
- Date range filter (default: 1st of month → today)  

## ⚡ Quick Start
```bash
npm install
# make sure the finance-assistent-frontend is running and API_URL is set in .env frontend
npm start
```

## 🖼 App Screenshots
Here are some screenshots of the Finance Assistant app:

| Login Screen                 | Chat Screen                | Reports Screen                   |
| ---------------------------- | -------------------------- | -------------------------------- |
| ![Login](./doc-images/jorge_login.PNG) | ![Chat](./doc-images/jorge_chat.PNG) | ![Reports](./doc-images/jorge_reports.PNG) |

---

# 📱 Frontend App - PT-BR (Resumo)

## 🚀 Visão Geral
App de finanças com assistente via chat AI.  
Login persistente, mensagens offline e gráficos interativos.  

## 🛠 Tecnologias
- React Native + TypeScript  
- AsyncStorage (JWT, mensagens)  
- Axios / Fetch API  
- FlatList para chat, gráficos para relatórios  

## 🔑 Funcionalidades
- **Login & Auth:** email/senha, lembrar-me ✅, sessão automática  
- **Chat:** conversa estilo ChatGPT 💬, histórico local, bolhas usuário/bot  
- **Envio Mensagens:** `POST /webhook/messages`, bot responde confirmação ✅  
- **Offline:** fila de mensagens ⏳ → ✅, reenvio automático 🔄  
- **API Segura:** token no header `Authorization`, renovação automática  
- **Relatórios:** gastos por categoria 📊, últimas transações, filtro de datas  

## ⚡ Quick Start
```bash
yarn install
# backend rodando e API_URL configurado no .env
yarn start
```  

