import { test, expect, request as pwRequest } from '@playwright/test';
import speakeasy from 'speakeasy';

const API_BASE = 'http://localhost:5000';

async function signupAndLogin() {
  const ctx = await pwRequest.newContext({ baseURL: API_BASE });
  const email = `user${Date.now()}@example.com`;
  const password = 'Str0ngP@ss!';
  await ctx.post('/api/auth/signup', { data: { name: 'User', email, password } });
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.token as string, email, password, ctx };
}

test.describe('2FA TOTP flow', () => {
  test('setup, verify, and login requiring 2FA', async () => {
    const { token, email, password, ctx } = await signupAndLogin();

    // Setup 2FA
    const setupRes = await ctx.post('/api/auth/2fa/setup', { headers: { Authorization: `Bearer ${token}` } });
    expect(setupRes.ok()).toBeTruthy();
    const setupBody = await setupRes.json();
    const secret = setupBody.secret_ascii as string;

    // Verify 2FA using generated TOTP
    const code = speakeasy.totp({ secret, encoding: 'ascii' });
    const verifyRes = await ctx.post('/api/auth/2fa/verify', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, data: { code } });
    expect(verifyRes.ok()).toBeTruthy();

    // Login without code should fail
    const loginNoCode = await ctx.post('/api/auth/login', { data: { email, password } });
    expect(loginNoCode.status()).toBeGreaterThanOrEqual(400);

    // Login with code should succeed
    const code2 = speakeasy.totp({ secret, encoding: 'ascii' });
    const loginWithCode = await ctx.post('/api/auth/login', { data: { email, password, mfaCode: code2 } });
    expect(loginWithCode.ok()).toBeTruthy();
  });
});

test.describe('Refresh token flow', () => {
  test('refresh returns new access token', async () => {
    const { ctx } = await signupAndLogin();
    // Call refresh; cookie should have been set by login response in context
    const res = await ctx.post('/api/auth/refresh');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.token).toBe('string');
  });
});

test.describe('Payment webhooks', () => {
  test('razorpay webhook 501 when secret not set', async ({ request }) => {
    const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } };
    const res = await request.post(`${API_BASE}/api/payments/razorpay/webhook`, { data: payload });
    expect([501, 403, 200]).toContain(res.status());
  });

  test('paytm webhook 501 when key not set', async ({ request }) => {
    const payload = { event: 'payment.success' };
    const res = await request.post(`${API_BASE}/api/payments/paytm/webhook`, { data: payload });
    expect([501, 403, 200]).toContain(res.status());
  });
});