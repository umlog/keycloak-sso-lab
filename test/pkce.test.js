import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCodeChallenge, randomToken, safeReturnPath } from '../src/core/auth/pkce.js';

test('S256 code_challenge 는 RFC 7636 부록 B 예시와 일치한다', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

  assert.equal(createCodeChallenge(verifier), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('randomToken 은 매번 다른 43자 base64url 값을 만든다', () => {
  const first = randomToken();
  const second = randomToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});

test('safeReturnPath 는 외부 URL 로의 리다이렉트를 막는다', () => {
  assert.equal(safeReturnPath('/notes?x=1'), '/notes?x=1');
  assert.equal(safeReturnPath('https://evil.example'), '/');
  assert.equal(safeReturnPath('//evil.example'), '/');
  assert.equal(safeReturnPath('/\\evil.example'), '/');
  assert.equal(safeReturnPath(undefined), '/');
});
