export type StoredFileData = { data: Uint8Array<ArrayBuffer>; contentType: string };

/** Keeps uploaded files. Callers depend on this port, not on where the bytes live. */
export interface FileStorage {
  /** Stores the bytes and returns the key to read them back with. */
  save(file: StoredFileData): Promise<string>;
  read(key: string): Promise<StoredFileData | null>;
}
