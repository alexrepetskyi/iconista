/**
 * Merges a guest cart into a user cart on login: user items keep their
 * position, new guest items are appended, duplicates dropped.
 */
export function mergeProductIds(userIds: string[], guestIds: string[]): string[] {
  const seen = new Set(userIds);
  const merged = [...userIds];
  for (const id of guestIds) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}
