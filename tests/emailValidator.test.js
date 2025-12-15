import { describe, it, expect } from 'vitest';
import * as emailValidator from '../src/utils/emailValidator';

const { validateSyntax, isRoleBased } = emailValidator;

describe('emailValidator', () => {
  it('accepts common valid emails', () => {
    expect(validateSyntax('user@example.com')).toBe(true);
    expect(validateSyntax('first.last+tag@sub.domain.co.uk')).toBe(true);
  });

  it('rejects malformed emails', () => {
    expect(validateSyntax('')).toBe(false);
    expect(validateSyntax('no-at-symbol.com')).toBe(false);
    expect(validateSyntax('user@')).toBe(false);
    expect(validateSyntax('user@bad_domain')).toBe(false);
  });

  it('detects role-based addresses', () => {
    expect(isRoleBased('admin@acme.com')).toBe(true);
    expect(isRoleBased('support@acme.com')).toBe(true);
    expect(isRoleBased('hello@acme.com')).toBe(true);
  });

  it('treats personal-looking addresses as non-role-based', () => {
    expect(isRoleBased('jane.doe@acme.com')).toBe(false);
    expect(isRoleBased('user+tag@acme.com')).toBe(false);
  });
});

