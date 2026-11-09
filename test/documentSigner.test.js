import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hashDocument, signDocument, verifyDocument } from '../src/service-b/signing/documentSigner.js';
import { fromPrivateKey } from '../src/service-b/signing/signingKeyStore.js';

const createKey = () => fromPrivateKey(crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey);
const DOCUMENT = '계약서: 갑은 을에게 100만원을 지급한다.';

test('서명한 문서와 영수증은 검증에 성공한다', () => {
  const signingKey = createKey();
  const receipt = signDocument({ title: '계약서', text: DOCUMENT, signer: 'alice', signingKey });

  const result = verifyDocument({ text: DOCUMENT, receipt, publicKey: signingKey.publicKey });

  assert.equal(result.valid, true);
  assert.equal(receipt.documentHash, hashDocument(DOCUMENT));
});

test('본문을 한 글자만 바꿔도 해시 불일치로 실패한다', () => {
  const signingKey = createKey();
  const receipt = signDocument({ title: '계약서', text: DOCUMENT, signer: 'alice', signingKey });

  const result = verifyDocument({ text: DOCUMENT.replace('100', '900'), receipt, publicKey: signingKey.publicKey });

  assert.equal(result.hashMatches, false);
  assert.equal(result.valid, false);
});

test('영수증의 서명자를 위조하면 서명 검증이 실패한다', () => {
  const signingKey = createKey();
  const receipt = signDocument({ title: '계약서', text: DOCUMENT, signer: 'alice', signingKey });

  const result = verifyDocument({ text: DOCUMENT, receipt: { ...receipt, signer: 'mallory' }, publicKey: signingKey.publicKey });

  assert.equal(result.hashMatches, true);
  assert.equal(result.signatureValid, false);
});

test('다른 키의 공개키로는 검증되지 않는다', () => {
  const receipt = signDocument({ title: '계약서', text: DOCUMENT, signer: 'alice', signingKey: createKey() });

  const result = verifyDocument({ text: DOCUMENT, receipt, publicKey: createKey().publicKey });

  assert.equal(result.signatureValid, false);
});

test('형식이 깨진 서명은 예외 없이 무효로 처리된다', () => {
  const signingKey = createKey();
  const receipt = signDocument({ title: '계약서', text: DOCUMENT, signer: 'alice', signingKey });

  const result = verifyDocument({ text: DOCUMENT, receipt: { ...receipt, signature: 'not-base64!!' }, publicKey: signingKey.publicKey });

  assert.equal(result.signatureValid, false);
});
