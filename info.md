# ServiceSwap Codebase Overview

## Purpose
Marketplace to list, browse, and trade service subscriptions with real-time updates.

## Architecture
- Frontend: React + Vite + Radix UI, Tailwind.
- Backend: Node.js + Express + MongoDB (Mongoose), Socket.IO for real-time.
- Tests: Playwright (UI and API tests), Jest + Supertest (server routes).

## Key Modules
- `server/middleware/auth.js`: JWT validator, sets `req.user`.
- `server/routes/auth.js`: signup/login/me, issues JWT.
- `server/routes/services.js`: browse and manage services, `/api/services/my` for current user.
- `server/routes/trades.js`: trade offers and lifecycle.
- `server/routes/tradeSessions.js`: interactive trade sessions with MFA.
- `server/routes/chat.js`: session chat history, send messages, read receipts.
- `server/socket.js`: socket server, user rooms, session join, real-time chat signals.
- `src/contexts/AuthContext.tsx`: token storage, user state.
- `src/contexts/TradeContext.tsx`: trades fetching and socket events.
- `src/contexts/TradeSessionContext.tsx`: session lifecycle and MFA finalize.
- `src/contexts/ChatContext.tsx`: chat state, connection management, message sync.
- `src/components/ChatPanel.tsx`: chat UI for sessions.
- `src/components/SessionWizard.tsx`: guided steps for items → confirm → MFA finalize.
- `src/pages/Dashboard.tsx`: user listings and socket updates.

## Data Flow
- User logs in → JWT stored in `localStorage` → requests include `Authorization` header → backend verifies and processes → responses update React state.
- Socket connects optionally with auth token → server associates socket with user room for events.
- Trade offer creation automatically opens a linked `TradeSession` and emits `trade_session_opened`.
- Frontend joins the session via sockets and fetches chat history via REST.
- Chat messages are persisted and broadcast to the `session:{id}` room with decrypted `content` for server-encrypted messages.

## Example Workflow
- User signs up, lists a service, another user sends a trade offer; both confirm via Trade Session and finalize with MFA codes.

## Trading Session Workflow
- Open: A `TradeSession` is created automatically for new trade offers, or via `POST /api/trade-sessions` with a `kmt @UserName` command.
- Items: Each participant proposes items via `PUT /api/trade-sessions/:id/items`.
- Confirm: Each participant confirms via `POST /api/trade-sessions/:id/confirm`.
- Finalize (MFA): Both participants enter their 6-digit MFA codes via `POST /api/trade-sessions/:id/finalize`.

## Chat Module
- History: `GET /api/trade-sessions/:id/messages` requires membership; returns list with `content` (decrypted) or `ciphertext`.
- Send: `POST /api/trade-sessions/:id/messages` accepts `content` or `ciphertext`; broadcasts `chat:message` payload with `content`.
- Read: `POST /api/trade-sessions/:id/read` marks messages read and emits `chat:read`.
- Sockets: `join_session` joins the `session:{id}` room after membership validation. `chat:message`, `chat:typing`, and `chat:read` are real-time signals.

## MFA Codes
- Generation: When a session opens, `tradeSessions.js` creates two codes (`mfa.a` and `mfa.b`). The API response returns `mfaCodeForYou` for the current user.
- Exchange: Users must share their MFA codes with each other (via chat or other secure means).
- Finalization: `POST /api/trade-sessions/:id/finalize` requires both `mfaA` and `mfaB`. It validates session state (confirmed) and codes.

## Security Considerations
- Authentication: All session and chat endpoints require JWT (`authRequired`).
- Validation: Express-validator enforces input shapes and types; items codes are constrained.
- Encryption: Server-side encryption using `ENCRYPTION_KEY` for plaintext content; decrypts to `content` in responses.
- Rate Limiting: Session endpoints and chat messages rate-limited to prevent abuse.

## Troubleshooting
- 500 on `GET /api/trade-sessions/:id/messages`: Ensure client sends `Authorization` header; backend now uses `req.user.id` for membership checks.
- 400 on finalize: Confirm both sides first and provide both 6-digit codes.
- Socket connection errors: Chat UI displays a banner and falls back to REST history.
- “Video element not found (content.js:1454)”: External script; globally suppressed in `App.tsx` via `GlobalErrorHandler`.