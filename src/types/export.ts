/** A file ready to download; xlsx arrives as bytes, csv as text. */
export type ExportFile = {
  filename: string;
  contentType: string;
  body: Uint8Array<ArrayBuffer> | string;
};
