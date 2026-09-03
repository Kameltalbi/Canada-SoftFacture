import { describe, expect, it } from 'vitest';
import { DEFAULT_ORG_COUNTRY, normalizeSiret, resolveOrgCountry } from './validation.js';

describe('resolveOrgCountry', () => {
  it('defaults to Canada when organization has no country', () => {
    expect(resolveOrgCountry(undefined)).toBe('CA');
    expect(resolveOrgCountry(null)).toBe('CA');
    expect(resolveOrgCountry('')).toBe('CA');
    expect(resolveOrgCountry('  ')).toBe('CA');
    expect(DEFAULT_ORG_COUNTRY).toBe('CA');
  });

  it('preserves an existing ISO country code', () => {
    expect(resolveOrgCountry('CA')).toBe('CA');
    expect(resolveOrgCountry('us')).toBe('US');
    expect(resolveOrgCountry(' FR ')).toBe('FR');
  });

  it('falls back to Canada for invalid country values', () => {
    expect(resolveOrgCountry('CAN')).toBe('CA');
    expect(resolveOrgCountry('France')).toBe('CA');
    expect(resolveOrgCountry('1')).toBe('CA');
  });
});

describe('normalizeSiret (Canada NEQ / BN)', () => {
  it('accepts Quebec NEQ (10 digits)', () => {
    expect(normalizeSiret('1234567890')).toBe('1234567890');
  });

  it('accepts federal BN (9 digits)', () => {
    expect(normalizeSiret('123456789')).toBe('123456789');
  });

  it('rejects French-style 14-digit SIRET', () => {
    expect(normalizeSiret('12345678901234')).toBeNull();
  });
});
