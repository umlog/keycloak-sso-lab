import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const KEY_ID_HEX_CHARS = 16;
const PRIVATE_KEY_FILE_MODE = 0o600;

/**
 * SignDesk 서버의 ECDSA P-256 서명 키를 불러오고, 없으면 새로 생성해 저장한다.
 * keyId = SHA-256(공개키 SPKI DER) 앞 16자리 (공개키 지문)
 */
export async function loadOrCreateSigningKey(privateKeyPath) {
  if (!existsSync(privateKeyPath)) {
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    await mkdir(path.dirname(privateKeyPath), { recursive: true });
    await writeFile(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: PRIVATE_KEY_FILE_MODE });
  }
  const privateKey = crypto.createPrivateKey(await readFile(privateKeyPath, 'utf8'));
  return fromPrivateKey(privateKey);
}

export function fromPrivateKey(privateKey) {
  const publicKey = crypto.createPublicKey(privateKey);
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  return {
    privateKey,
    publicKey,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    keyId: crypto.createHash('sha256').update(spkiDer).digest('hex').slice(0, KEY_ID_HEX_CHARS),
  };
}
