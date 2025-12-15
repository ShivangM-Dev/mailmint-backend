import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios before requiring module under test
const axiosMock = { get: vi.fn() };
vi.mock('axios', () => ({ default: axiosMock, get: axiosMock.get }));

const tmpCache = path.join(os.tmpdir(), `disposable-cache-${Date.now()}.json`);
process.env.DISPOSABLE_CACHE_PATH = tmpCache;

let isDisposable;
let refreshCache;

describe('disposableDomains cache', () => {
  beforeEach(async () => {
    axiosMock.get.mockResolvedValue({ data: ['tempmail.com'] });
    process.env.DISPOSABLE_DOMAINS_OVERRIDE = 'tempmail.com';
    if (fs.existsSync(tmpCache)) {
      fs.unlinkSync(tmpCache);
    }
    vi.resetModules();
    const module = await import('../src/utils/disposableDomains');
    isDisposable = module.isDisposable;
    refreshCache = module.refreshCache;
    await refreshCache();
  });

  it('returns true for disposable domains from fetched list', async () => {
    const result = await isDisposable('user@tempmail.com');
    expect(result).toBe(true);
  });

  it('persists to disk and reuses without refetch', async () => {
    // Prime cache
    await isDisposable('user@tempmail.com');
    axiosMock.get.mockClear();
    const result = await isDisposable('user@tempmail.com');
    expect(result).toBe(true);
    expect(axiosMock.get).not.toHaveBeenCalled();
  });
});

