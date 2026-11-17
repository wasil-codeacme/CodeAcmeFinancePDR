import { describe, expect, it } from 'vitest';

import { InvoiceStatus, ProjectStatus } from '@/generated/prisma/enums';
import {
  invoiceStatusFrom,
  projectStatusFrom,
  splitClientAndPlatform,
} from '@/server/import/workbook-mapping';

const PLATFORMS = ['Upwork', 'Direct'];

describe('splitClientAndPlatform', () => {
  it('uses the separate platform column when the month has one', () => {
    expect(
      splitClientAndPlatform({ clientLabel: 'Client C', platformLabel: 'Upwork' }, PLATFORMS),
    ).toEqual({
      clientName: 'Client C',
      platformName: 'Upwork',
      projectName: null,
    });
  });

  it('splits "Client - Platform" and "Client Platform" labels', () => {
    expect(
      splitClientAndPlatform({ clientLabel: 'Client O - Upwork', platformLabel: null }, PLATFORMS),
    ).toEqual({
      clientName: 'Client O',
      platformName: 'Upwork',
      projectName: null,
    });
    expect(
      splitClientAndPlatform({ clientLabel: 'Client D Direct', platformLabel: null }, PLATFORMS),
    ).toEqual({
      clientName: 'Client D',
      platformName: 'Direct',
      projectName: null,
    });
  });

  it('folds "… - Receivables" rows into the same client', () => {
    expect(
      splitClientAndPlatform(
        { clientLabel: 'Client I Upwork - Receiveables', platformLabel: null },
        PLATFORMS,
      ),
    ).toEqual({ clientName: 'Client I', platformName: 'Upwork', projectName: null });
  });

  it('keeps a bare client name', () => {
    expect(
      splitClientAndPlatform({ clientLabel: 'Client A', platformLabel: null }, PLATFORMS),
    ).toEqual({
      clientName: 'Client A',
      platformName: null,
      projectName: null,
    });
  });
});

describe('status mapping', () => {
  it('maps workbook wording to statuses, defaulting when blank or unknown', () => {
    expect(projectStatusFrom('In Review')).toBe(ProjectStatus.IN_REVIEW);
    expect(projectStatusFrom(null)).toBe(ProjectStatus.IN_PROGRESS);
    expect(invoiceStatusFrom('Partially Paid')).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(invoiceStatusFrom('Something else')).toBe(InvoiceStatus.INITIATED);
  });
});

describe('splitClientAndPlatform with project names', () => {
  it('treats an unknown suffix as a project, not a platform', () => {
    expect(
      splitClientAndPlatform(
        { clientLabel: 'Client G - Project 1', platformLabel: null },
        PLATFORMS,
      ),
    ).toEqual({ clientName: 'Client G', platformName: null, projectName: 'Project 1' });
  });
});
