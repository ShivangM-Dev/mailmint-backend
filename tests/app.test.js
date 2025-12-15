import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

beforeAll(() => {
  process.env.SKIP_DB_CHECK = 'true';
  process.env.RATE_LIMIT_MAX = '1';
  process.env.RATE_LIMIT_WINDOW_MS = '1000';
});

import app from '../src/app';

describe('app', () => {
  it('responds to /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('enforces rate limiting', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    const r1 = await request(app).get('/api/v1/validate');
    const r2 = await request(app).get('/api/v1/validate');
    const limitHeader = r1.headers['ratelimit-limit'] || r1.headers['x-ratelimit-limit'];
    const remaining1 = Number(r1.headers['ratelimit-remaining'] || r1.headers['x-ratelimit-remaining']);
    const remaining2 = Number(r2.headers['ratelimit-remaining'] || r2.headers['x-ratelimit-remaining']);
    expect(limitHeader).toBeDefined();
    expect(remaining2).toBeLessThan(remaining1);
  });
});

