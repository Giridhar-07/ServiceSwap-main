# Compliance Verification (India)

## DPDP Bill (Digital Personal Data Protection)
- Purpose limitation: clearly defined data uses in APIs.
- User consent: explicit signup; optional social login consent to be added.
- Data minimization: only necessary fields collected.
- Rights: endpoints to fetch and update profile (`/api/auth/me`). Add deletion endpoint in future.
- Security safeguards: validation, rate limits, JWT auth, audit trails.
- Breach notification plan: to be defined.

## Information Technology Act, 2000
- Reasonable security practices: Helmet, rate limit, validation.
- Audit trails: `TradeAudit` records.
- Payment handling via gateways: avoid storing card data; logs only transaction references.
- Encryption-in-transit: enforce HTTPS in production.

## PCI-DSS (for payments via gateway)
- Do not store PAN, CVV, magnetic stripe data.
- Use gateway tokenization and server-side verification only.
- Restrict access and log transactions.