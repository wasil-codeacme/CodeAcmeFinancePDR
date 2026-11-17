import { describe, expect, it } from 'vitest';

import { applyListChanges } from '@/lib/optimistic-list';

type Row = { id: string; amount: string; status: string };

const ROWS: Row[] = [
  { id: 'a', amount: '10', status: 'DRAFT' },
  { id: 'b', amount: '20', status: 'DRAFT' },
];

describe('applyListChanges (what the screen shows before the server answers)', () => {
  it('patches one row and leaves the others untouched', () => {
    const next = applyListChanges(ROWS, { type: 'update', id: 'a', patch: { amount: '15' } });
    expect(next).toEqual([
      { id: 'a', amount: '15', status: 'DRAFT' },
      { id: 'b', amount: '20', status: 'DRAFT' },
    ]);
    expect(next[1]).toBe(ROWS[1]);
  });

  it('removes a row at once', () => {
    expect(applyListChanges(ROWS, { type: 'remove', id: 'b' }).map((row) => row.id)).toEqual(['a']);
  });

  it('adds a row at the end', () => {
    const added = { id: 'c', amount: '5', status: 'DRAFT' };
    expect(applyListChanges(ROWS, { type: 'add', item: added }).at(-1)).toBe(added);
  });

  it('stacks several queued changes in order', () => {
    const next = applyListChanges(ROWS, [
      { type: 'update', id: 'a', patch: { amount: '15' } },
      { type: 'update', id: 'a', patch: { status: 'CONFIRMED' } },
      { type: 'remove', id: 'b' },
    ]);
    expect(next).toEqual([{ id: 'a', amount: '15', status: 'CONFIRMED' }]);
  });

  it('ignores a change for a row that is no longer there', () => {
    expect(applyListChanges(ROWS, { type: 'update', id: 'gone', patch: { amount: '1' } })).toEqual(
      ROWS,
    );
  });
});
