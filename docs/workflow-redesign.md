# Secure Trade Workflow Redesign

## Architecture
- Frontend → Middleware (validation+routing) → Backend API (Express) → Database (MongoDB)
- Real-time channel via Socket.IO with optional JWT auth.
- Payment stubs integrated with secure webhook verification.

## Layered Validation & Error Handling
- Frontend: forms validate required fields; clear toasts for errors.
- Middleware: `express-validator` enforces schemas; status-aware error responses.
- Backend: auth guards, rate limits, CSRF optional for cookie flows.

## Fraud Prevention Mechanisms
- 2FA (TOTP) required for sensitive actions (login if enabled, session finalization already uses per-session MFA).
- Encrypted trade credentials at rest using AES-256-GCM.
- Anomaly detection on refresh-token usage (user-agent/ip mismatches logged).
- Trade session restrictions: disallow external payment codes; license checks.

## Authentication System
- OAuth 2.0 (internal) with `/api/oauth/authorize` and `/api/oauth/token` scaffold.
- JWT short-lived access tokens; refresh-token rotation via HttpOnly cookie.
- 2FA TOTP: `/api/auth/2fa/setup`, `/verify`, `/disable`.

## Payment Integration
- Razorpay & Paytm webhook endpoints with HMAC signature verification using raw request body.
- Order creation stub for Razorpay.

## Data Security
- AES-256-GCM encryption util for sensitive credential fields.
- Password policy: min 8 with complexity.

## Session Management
- Refresh token rotation & revocation.
- Session anomaly logging.

## UX Flows
- TwoFactor settings page with guided steps.
- Dashboard Settings includes navigation to 2FA.
- Clear status indicators and toasts for errors.

## Security Audit Points
- Frontend: input validation coverage, error feedback, token handling.
- Middleware: validators present for all endpoints; rate limits; CSRF optional.
- Backend: auth guarding on protected routes; encryption at rest; logs.
- Payments: webhook signature verification.
- Sessions: refresh rotation and anomaly logs.

## Performance Benchmarks (Plan)
- API latency targets: <200ms for `GET /api/services`, <300ms for protected endpoints.
- Load testing with 500 concurrent users; error rate <1%.
- Socket event fan-out: services room broadcast <100ms.

## User Acceptance Testing (Plan)
- Happy paths for signup/login, 2FA setup/verify, list service, create/accept/decline/cancel trades.
- Negative paths: invalid inputs, expired tokens, webhook invalid signatures, 2FA mismatch.
- Accessibility checks: keyboard focus, labels, contrast.

## Compliance & Logging
- DPDP/IT Act alignment documented in `docs/compliance-verification.md`.
- Structured logs for requests and anomalies.