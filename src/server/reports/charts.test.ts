import { describe, expect, it } from 'vitest';

import { Decimal } from '@/lib/decimal';
import { rankWithOther, toChartNumber } from '@/server/reports/charts';

describe('chart helpers', () => {
  it('keeps the largest entries and folds the rest into "Other" (never a 9th colour)', () => {
    const ranked = rankWithOther(
      [
        { name: 'A', value: new Decimal(50) },
        { name: 'B', value: new Decimal(300) },
        { name: 'C', value: new Decimal(20) },
        { name: 'D', value: new Decimal(100) },
      ],
      2,
    );
    expect(ranked).toEqual([
      { label: 'B', value: 300 },
      { label: 'D', value: 100 },
      { label: 'Other', value: 70 },
    ]);
  });

  it('adds names that appear twice before ranking', () => {
    const ranked = rankWithOther(
      [
        { name: 'A', value: new Decimal(10) },
        { name: 'A', value: new Decimal(15) },
      ],
      5,
    );
    expect(ranked).toEqual([{ label: 'A', value: 25 }]);
  });

  it('rounds money to cents for the chart and keeps blanks blank', () => {
    expect(toChartNumber(new Decimal('10.005'))).toBe(10.01);
    expect(toChartNumber(null)).toBeNull();
  });
});
