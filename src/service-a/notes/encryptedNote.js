import crypto from 'node:crypto';
import { UserFacingError } from '../../core/errors.js';

const MAX_TITLE_LENGTH = 100;
const MAX_CIPHERTEXT_LENGTH = 100_000;
const IV_BYTES = 12;   // AES-GCM 권장 IV 길이 (96비트)
const SALT_BYTES = 16; // PBKDF2 salt (128비트)
const GCM_TAG_BYTES = 16;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * 브라우저가 보낸 암호화 메모를 검증한다. 서버는 평문/키를 절대 받지 않으며,
 * 형식(base64, IV/salt 길이)만 확인하고 그대로 저장한다.
 */
export function parseEncryptedNote(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new UserFacingError(`제목은 1~${MAX_TITLE_LENGTH}자로 입력해 주세요.`);
  }
  const ciphertext = requireBase64(body.ciphertext, '암호문', { minBytes: GCM_TAG_BYTES + 1, maxChars: MAX_CIPHERTEXT_LENGTH });
  const iv = requireBase64(body.iv, 'IV', { exactBytes: IV_BYTES });
  const salt = requireBase64(body.salt, 'salt', { exactBytes: SALT_BYTES });
  return {
    id: crypto.randomUUID(),
    title,
    ciphertext,
    iv,
    salt,
    algorithm: 'AES-256-GCM / PBKDF2-SHA256',
    createdAt: new Date().toISOString(),
  };
}

function requireBase64(value, label, { exactBytes, minBytes, maxChars = 1024 }) {
  if (typeof value !== 'string' || value.length > maxChars || !BASE64_PATTERN.test(value)) {
    throw new UserFacingError(`${label} 형식이 올바르지 않습니다.`);
  }
  const byteLength = Buffer.from(value, 'base64').length;
  if ((exactBytes && byteLength !== exactBytes) || (minBytes && byteLength < minBytes)) {
    throw new UserFacingError(`${label} 길이가 올바르지 않습니다.`);
  }
  return value;
}
