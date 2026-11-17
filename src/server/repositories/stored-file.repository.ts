import { db } from '@/server/repositories/db';

/** Raw file bytes for the Postgres file-storage adapter. */
export const storedFileRepository = {
  async create(data: Uint8Array<ArrayBuffer>, contentType: string): Promise<string> {
    const row = await db().storedFile.create({
      data: { data, contentType, size: data.byteLength },
      select: { id: true },
    });
    return row.id;
  },

  async find(id: string): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
    const row = await db().storedFile.findUnique({ where: { id } });
    return row ? { data: new Uint8Array(row.data), contentType: row.contentType } : null;
  },
};
