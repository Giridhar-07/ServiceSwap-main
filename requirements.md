# Requirements

## Functional
- User registration/login with JWT.
- List, browse, update service listings.
- Real-time notifications for new services and trade changes.
- Protected endpoints for user-specific data.
- Trade sessions support items, confirmations, MFA finalization.
- Session chat with history, read receipts, and typing indicators.

## Non-Functional
- Strong authentication and password policy.
- Rate-limiting and secure headers.
- Accessibility and responsiveness (WCAG, mobile-first).
- Performance: pagination and efficient queries.
- Zero-error policy: catch and surface errors gracefully; no crashes.

## Stack
- Frontend: React, Vite, Tailwind, Radix.
- Backend: Express, Mongoose, Socket.IO.
- Testing: Playwright, Jest + Supertest.
 
## UI/UX Best Practices
- Clear, step-by-step Session Wizard flow with progressive disclosure.
- Accessible labels and helper text; visual indicators for required fields.
- Global connection status banner; inline validation near fields.
- Reference trends: Awwwards, Dribbble, Smashing Magazine.
 
## Performance & Scalability
- Chat and session endpoints p95 < 200ms under moderate load.
- Efficient Socket.IO room management per session.
- DB indexes for common lookups (Trade, TradeSession, ChatMessage).
 
## MFA Workflow Requirements
- Generate distinct 6-digit codes per participant at session open.
- Display user’s own MFA code with clear guidance.
- Require both codes to finalize; provide specific error messages.
- Rate-limit finalize attempts and log failures.

## Security & Compliance
- JWT auth, MFA for sensitive flows.
- DPDP-aligned data handling.
- Payment gateway integrations (Razorpay/Paytm) designed for INR.
 - Input sanitization across all API endpoints.
 - Server-side encryption for chat content when plaintext is provided.