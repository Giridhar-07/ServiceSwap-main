# Security Measures for ServiceSwap (India-focused)

## Authentication
- JWT-based auth with `Authorization: Bearer <token>` and validator middleware.
- Password policy: minimum 8 chars, uppercase, lowercase, number, special character.
- Optional `WWW-Authenticate: Bearer` header on 401 to standardize client reactions.
- MFA in Trade Sessions: per-session 6-digit codes required for finalization (server-validated).
- Future OAuth 2.0: plan to integrate Google and Facebook via Passport, issue JWT post OAuth.
- Future 2FA (TOTP): add `mfaEnabled` and `mfaSecret` fields to user model with TOTP app support.

## Data Protection and Compliance
- Input validation via `express-validator` with trim/sanitize.
- Avoid storing sensitive credentials in plain text in trades; plan to encrypt fields at rest using AES-256.
- Helmet for secure headers and `express-rate-limit` for abuse control.
- CORS restricted to localhost development origins.
- DPDP Bill (India) alignment: purpose limitation, user consent, right to correction, secure processing, retention limits.
- Indian IT Act alignment: log access attempts, protect data in transit (HTTPS in production), audit trails via `TradeAudit`.

## Payment Processing (India Gateways)
- Planned Razorpay and Paytm integration, INR-only.
- PCI-DSS considerations: client tokens handled by gateway; server stores only transaction references, not PAN or CVV.
- Webhooks for transaction state; durable logs for reconciliations.

## Secure Session Management
- Recommend migrating to HttpOnly secure cookies for access tokens in production (domain-bound) and short-lived JWTs with refresh tokens.
- CSRF optional middleware available; enable for cookie-based auth flows.

## Logging and Monitoring
- Structured request logging with method, path, status, duration, userId, ip.
- Socket auth context verified via JWT when provided.