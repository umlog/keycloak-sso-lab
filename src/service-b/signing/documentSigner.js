import crypto from 'node:crypto';

export const SIGNATURE_ALGORITHM = 'ECDSA-P256-SHA256';
const RECEIPT_VERSION = 1;

/** 문서 지문: SHA-256(UTF-8 본문) 16진수 */
export function hashDocument(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 서명 대상 문자열. 필드 순서를 고정해 서명/검증 양쪽이 같은 바이트열을 만든다. */
function canonicalPayload({ title, documentHash, signer, signedAt, keyId }) {
  return JSON.stringify({ v: RECEIPT_VERSION, alg: SIGNATURE_ALGORITHM, keyId, title, documentHash, signer, signedAt });
}

/**
 * 문서를 서명하고 "서명 영수증"을 만든다.
 * 영수증 = 문서 해시 + 서명자(Keycloak 인증 사용자) + 시각 + ECDSA 서명
 */
export function signDocument({ title, text, signer, signingKey, now = new Date() }) {
  const fields = {
    title,
    documentHash: hashDocument(text),
    signer,
    signedAt: now.toISOString(),
    keyId: signingKey.keyId,
  };
  const signature = crypto
    .sign('sha256', Buffer.from(canonicalPayload(fields)), { key: signingKey.privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64');
  return { version: RECEIPT_VERSION, algorithm: SIGNATURE_ALGORITHM, ...fields, signature };
}

/** 원문과 영수증을 받아 (1) 해시 일치 (2) 서명 유효성을 각각 판정한다. */
export function verifyDocument({ text, receipt, publicKey }) {
  const computedHash = hashDocument(text);
  const hashMatches = computedHash === receipt.documentHash;
  let signatureValid = false;
  try {
    signatureValid = crypto.verify(
      'sha256',
      Buffer.from(canonicalPayload(receipt)),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(String(receipt.signature), 'base64'),
    );
  } catch {
    signatureValid = false; // 형식이 깨진 서명은 무효로 처리
  }
  return { computedHash, hashMatches, signatureValid, valid: hashMatches && signatureValid };
}
