import { test, expect, request as pwRequest } from '@playwright/test';

const API_BASE = 'http://localhost:5000';

async function getAuthToken() {
  const ctx = await pwRequest.newContext({ baseURL: API_BASE });
  const email = `tester+${Date.now()}@example.com`;
  const password = 'Str0ngP@ss!';

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

test.describe('Auth-protected endpoints', () => {
  test('GET /api/services/my returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/services/my`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/services/my returns 200 with token', async () => {
    const token = await getAuthToken();
    const ctx = await pwRequest.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    const res = await ctx.get('/api/services/my');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('GET /api/trades returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/trades`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/trades returns 200 with token', async () => {
    const token = await getAuthToken();
    const ctx = await pwRequest.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    const res = await ctx.get('/api/trades');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });
});