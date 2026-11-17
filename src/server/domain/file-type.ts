/** The file types an expense can carry (receipts and invoices). */
export const ATTACHMENT_TYPE = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
} as const;
export type AttachmentType = (typeof ATTACHMENT_TYPE)[keyof typeof ATTACHMENT_TYPE];

const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

type Signature = { type: AttachmentType; offset: number; bytes: readonly number[] };

const SIGNATURES: readonly Signature[] = [
  { type: ATTACHMENT_TYPE.PDF, offset: 0, bytes: ascii('%PDF-') },
  { type: ATTACHMENT_TYPE.PNG, offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: ATTACHMENT_TYPE.JPEG, offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { type: ATTACHMENT_TYPE.WEBP, offset: 8, bytes: ascii('WEBP') },
];

const WEBP_RIFF = ascii('RIFF');

function startsWith(data: Uint8Array, offset: number, expected: readonly number[]): boolean {
  return expected.every((value, index) => data[offset + index] === value);
}

/**
 * The real type of an upload from its first bytes. The browser's declared type and the
 * file name are only claims; serving a file under the wrong type is how HTML gets run.
 */
export function detectAttachmentType(data: Uint8Array): AttachmentType | null {
  for (const signature of SIGNATURES) {
    if (!startsWith(data, signature.offset, signature.bytes)) continue;
    if (signature.type === ATTACHMENT_TYPE.WEBP && !startsWith(data, 0, WEBP_RIFF)) continue;
    return signature.type;
  }
  return null;
}

const FALLBACK_NAME = 'attachment';
const MAX_NAME_LENGTH = 200;
const UNSAFE_CHARACTERS = /["\\/\r\n\t;]/g;

/** A display and download name: no folders, no quotes or line breaks (header-safe). */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).at(-1) ?? '';
  const cleaned = base.replace(UNSAFE_CHARACTERS, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, MAX_NAME_LENGTH) || FALLBACK_NAME;
}
