import type { ProjectStatus } from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import { db } from '@/server/repositories/db';
import { nullableDecimalToString } from '@/server/repositories/mappers';

export type ProjectRecord = {
  id: string;
  clientId: string;
  name: string;
  platformId: string | null;
  feePercentOverride: DecimalString | null;
  status: ProjectStatus;
  active: boolean;
};

export type ClientRecord = {
  id: string;
  name: string;
  defaultPlatformId: string | null;
  defaultFeePercent: DecimalString | null;
  active: boolean;
  projects: ProjectRecord[];
};

export type ClientData = Omit<ClientRecord, 'id' | 'projects'>;
export type ProjectData = Omit<ProjectRecord, 'id'>;

type ProjectRow = Omit<ProjectRecord, 'feePercentOverride'> & {
  feePercentOverride: Parameters<typeof nullableDecimalToString>[0];
};

const PROJECT_SELECT = {
  id: true,
  clientId: true,
  name: true,
  platformId: true,
  feePercentOverride: true,
  status: true,
  active: true,
} as const;

const CLIENT_SELECT = {
  id: true,
  name: true,
  defaultPlatformId: true,
  defaultFeePercent: true,
  active: true,
  projects: { select: PROJECT_SELECT, orderBy: { name: 'asc' } },
} as const;

function toProject(row: ProjectRow): ProjectRecord {
  return { ...row, feePercentOverride: nullableDecimalToString(row.feePercentOverride) };
}

function toClient(row: {
  id: string;
  name: string;
  defaultPlatformId: string | null;
  defaultFeePercent: Parameters<typeof nullableDecimalToString>[0];
  active: boolean;
  projects: ProjectRow[];
}): ClientRecord {
  return {
    ...row,
    defaultFeePercent: nullableDecimalToString(row.defaultFeePercent),
    projects: row.projects.map(toProject),
  };
}

export const clientRepository = {
  async list(): Promise<ClientRecord[]> {
    const rows = await db().client.findMany({ select: CLIENT_SELECT, orderBy: { name: 'asc' } });
    return rows.map(toClient);
  },

  async findById(id: string): Promise<ClientRecord | null> {
    const row = await db().client.findUnique({ where: { id }, select: CLIENT_SELECT });
    return row ? toClient(row) : null;
  },

  async create(data: ClientData): Promise<ClientRecord> {
    return toClient(await db().client.create({ data, select: CLIENT_SELECT }));
  },

  async update(id: string, data: ClientData): Promise<ClientRecord> {
    return toClient(await db().client.update({ where: { id }, data, select: CLIENT_SELECT }));
  },
};

export const projectRepository = {
  async findById(id: string): Promise<ProjectRecord | null> {
    const row = await db().project.findUnique({ where: { id }, select: PROJECT_SELECT });
    return row ? toProject(row) : null;
  },

  async create(data: ProjectData): Promise<ProjectRecord> {
    return toProject(await db().project.create({ data, select: PROJECT_SELECT }));
  },

  async update(id: string, data: Partial<ProjectData>): Promise<ProjectRecord> {
    return toProject(await db().project.update({ where: { id }, data, select: PROJECT_SELECT }));
  },
};
