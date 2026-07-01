import { describe, it, expect } from 'vitest';
import { mergeProductIds } from './merge';

describe('mergeProductIds', () => {
  it('appends guest items after user items', () => {
    expect(mergeProductIds(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops duplicates already in the user cart', () => {
    expect(mergeProductIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates within the guest cart itself', () => {
    expect(mergeProductIds([], ['a', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('handles empty carts', () => {
    expect(mergeProductIds([], [])).toEqual([]);
    expect(mergeProductIds(['a'], [])).toEqual(['a']);
    expect(mergeProductIds([], ['a'])).toEqual(['a']);
  });
});
