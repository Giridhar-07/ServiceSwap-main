import { test, expect, request as pwRequest } from '@playwright/test';

const API_BASE = 'http://localhost:5000';

async function getAuthToken() {
  const ctx = await pwRequest.newContext({ baseURL: API_BASE });
  const email = `tester+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  // Signup (ignore if already exists)
  await ctx.post('/api/auth/signup', {
    data: { name: 'Tester', email, password }
  }).catch(() => {});

  const res = await ctx.post('/api/auth/login', {
    data: { email, password }
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.token as string;
}

// 401: missing/invalid token
test('Finalize requires auth token (401)', async ({ request }) => {
  const res = await request.post(`${API_BASE}/api/trade-sessions/507f1f77bcf86cd799439011/finalize`, {
    data: { mfaA: '123456', mfaB: '654321' }
  });
  expect(res.status()).toBe(401);
});

// 400: invalid body (non-numeric or wrong length)
test('Finalize rejects invalid body (400)', async () => {
  const token = await getAuthToken();
  const ctx = await pwRequest.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const res = await ctx.post('/api/trade-sessions/507f1f77bcf86cd799439011/finalize', {
    data: { mfaA: '1234', mfaB: 'abcd' }
  });
  expect(res.status()).toBe(400);
});

// 404: session not found
test('Finalize returns 404 for unknown session', async () => {
  const token = await getAuthToken();
  const ctx = await pwRequest.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const res = await ctx.post('/api/trade-sessions/507f1f77bcf86cd799439011/finalize', {
    data: { mfaA: '123456', mfaB: '654321' }
  });
  expect(res.status()).toBe(404);
});