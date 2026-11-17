/** A change the user just made to a list, shown before the server confirms it. */
export type ListChange<TItem extends { id: string }> =
  | { type: 'update'; id: string; patch: Partial<TItem> }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: TItem };

function applyOne<TItem extends { id: string }>(
  items: readonly TItem[],
  change: ListChange<TItem>,
): TItem[] {
  switch (change.type) {
    case 'update':
      return items.map((item) => (item.id === change.id ? { ...item, ...change.patch } : item));
    case 'remove':
      return items.filter((item) => item.id !== change.id);
    case 'add':
      return [...items, change.item];
  }
}

function isChangeList<TItem extends { id: string }>(
  changes: ListChange<TItem> | readonly ListChange<TItem>[],
): changes is readonly ListChange<TItem>[] {
  return Array.isArray(changes);
}

/**
 * Applies one change, or several in order. Server Actions run one at a time, so edits made
 * while an earlier save is in flight queue up; applying them in order keeps them stacked on
 * the latest server data instead of overwriting each other.
 */
export function applyListChanges<TItem extends { id: string }>(
  items: readonly TItem[],
  changes: ListChange<TItem> | readonly ListChange<TItem>[],
): TItem[] {
  const list = isChangeList(changes) ? changes : [changes];
  return list.reduce<TItem[]>((current, change) => applyOne(current, change), [...items]);
}
