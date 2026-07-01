import { describe, it, expect } from 'vitest';
import { pickLocalized, isLocale, defaultLocale } from './locales';

describe('pickLocalized', () => {
  it('returns the requested locale value from a plain object', () => {
    expect(pickLocalized({ en: 'Bag' }, 'en')).toBe('Bag');
  });

  it('returns the requested locale value from a Map (mongoose)', () => {
    expect(pickLocalized(new Map([['en', 'Bag']]), 'en')).toBe('Bag');
  });

  it('falls back to the default locale when the requested one is missing', () => {
    const map = new Map([[defaultLocale, 'Fallback']]);
    // simulate a newly added locale with no translation yet
    expect(pickLocalized(map, 'zz' as never)).toBe('Fallback');
  });

  it('returns empty string for null/undefined maps', () => {
    expect(pickLocalized(null, defaultLocale)).toBe('');
    expect(pickLocalized(undefined, defaultLocale)).toBe('');
  });
});

describe('isLocale', () => {
  it('accepts configured locales and rejects others', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('xx')).toBe(false);
  });
});
