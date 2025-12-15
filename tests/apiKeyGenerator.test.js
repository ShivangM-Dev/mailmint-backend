import { describe, it, expect } from 'vitest';
import * as apiKeyGen from '../src/utils/apiKeyGenerator';

const { generateApiKey, isApiKeyFormat } = apiKeyGen;

describe('apiKeyGenerator', () => {
  it('generates keys that match the expected format', () => {
    const key = generateApiKey({ environment: 'live' });
    expect(isApiKeyFormat(key)).toBe(true);
    expect(key.startsWith('mmk_live_')).toBe(true);
  });

  it('generates test environment keys', () => {
    const key = generateApiKey({ environment: 'test' });
    expect(isApiKeyFormat(key)).toBe(true);
    expect(key.startsWith('mmk_test_')).toBe(true);
  });

  it('produces different keys across invocations', () => {
    const keyA = generateApiKey();
    const keyB = generateApiKey();
    expect(keyA).not.toBe(keyB);
  });
});

