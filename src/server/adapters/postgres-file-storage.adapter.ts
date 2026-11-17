import type { FileStorage } from '@/server/ports/file-storage.port';
import { storedFileRepository } from '@/server/repositories/stored-file.repository';

/**
 * Files in the app's own Postgres: no extra service to run, fine for receipts of a few MB.
 * Swap for a blob-storage adapter in the container if attachments grow large or many.
 */
export const postgresFileStorage: FileStorage = {
  save: (file) => storedFileRepository.create(file.data, file.contentType),
  read: (key) => storedFileRepository.find(key),
};
