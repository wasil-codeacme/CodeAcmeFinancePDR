import { describe, expect, it } from 'vitest';

import { SalesChannel } from '@/generated/prisma/enums';
import { salesChannelFromItem } from '@/server/import/workbook-mapping';

describe('salesChannelFromItem (tags imported sales lines for Sales CAC)', () => {
  it('reads the channel from the item names the workbook uses', () => {
    expect(salesChannelFromItem('Upwork Connects')).toBe(SalesChannel.UPWORK);
    expect(salesChannelFromItem('Employee 12 (Upwork BD)')).toBe(SalesChannel.UPWORK);
    expect(salesChannelFromItem('Cold Email Infrastructure Cost ')).toBe(SalesChannel.COLD_EMAIL);
    expect(salesChannelFromItem('Cold Call Tools')).toBe(SalesChannel.COLD_CALL);
    expect(salesChannelFromItem('LinkedIn Sales Navigator')).toBe(SalesChannel.LINKEDIN);
  });

  it('leaves anything else untagged rather than guess', () => {
    expect(salesChannelFromItem('Employee 6 Salary')).toBeNull();
  });
});
