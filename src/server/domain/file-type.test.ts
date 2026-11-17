import { describe, expect, it } from 'vitest';

import { ATTACHMENT_TYPE, detectAttachmentType, safeFileName } from '@/server/domain/file-type';

const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

describe('detectAttachmentType (trust the bytes, not the file name)', () => {
  it('recognises PDF, PNG, JPEG and WebP from their signatures', () => {
    expect(detectAttachmentType(bytes(...ascii('%PDF-1.7')))).toBe(ATTACHMENT_TYPE.PDF);
    expect(detectAttachmentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      ATTACHMENT_TYPE.PNG,
    );
    expect(detectAttachmentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(ATTACHMENT_TYPE.JPEG);
    expect(detectAttachmentType(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP')))).toBe(
      ATTACHMENT_TYPE.WEBP,
    );
  });

  it('refuses anything else, such as HTML or a script renamed to .pdf', () => {
    expect(detectAttachmentType(bytes(...ascii('<html><script>')))).toBeNull();
    expect(detectAttachmentType(new Uint8Array())).toBeNull();
  });
});

describe('safeFileName', () => {
  it('keeps a readable name but drops path parts and header-breaking characters', () => {
    expect(safeFileName('..\\..\\etc/receipt "march".pdf')).toBe('receipt march.pdf');
    expect(safeFileName('   ')).toBe('attachment');
  });
});
