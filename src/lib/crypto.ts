import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { LOGIN_CODE_LENGTH, SESSION_TOKEN_BYTES } from '@/lib/constants';

const DECIMAL_RADIX = 10;

export function generateLoginCode(): string {
  return String(randomInt(0, DECIMAL_RADIX ** LOGIN_CODE_LENGTH)).padStart(LOGIN_CODE_LENGTH, '0');
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashLoginCode(userId: string, code: string): string {
  return sha256Hex(`${userId}:${code}`);
}

export function hashesMatch(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
