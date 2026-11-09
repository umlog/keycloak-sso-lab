import crypto from 'node:crypto';

const RANDOM_TOKEN_BYTES = 32;

/** state, nonce, PKCE code_verifier 에 쓰는 256비트 난수 (base64url) */
export function randomToken() {
  return crypto.randomBytes(RANDOM_TOKEN_BYTES).toString('base64url');
}

/** RFC 7636 S256: code_challenge = BASE64URL(SHA-256(code_verifier)) */
export function createCodeChallenge(codeVerifier) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/** 로그인 후 돌아갈 경로를 같은 사이트의 상대 경로로만 제한 (Open Redirect 방지) */
export function safeReturnPath(candidate) {
  if (typeof candidate !== 'string') return '/';
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return '/';
  return candidate;
}
