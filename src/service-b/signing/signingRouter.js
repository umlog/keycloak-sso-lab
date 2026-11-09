import express from 'express';
import { UserFacingError } from '../../core/errors.js';
import { signDocument, verifyDocument } from './documentSigner.js';
import { signDeskHomePage, signResultPage, verifyFormPage, verifyResultPage } from './signingPages.js';

const MAX_TITLE_LENGTH = 100;
const MAX_DOCUMENT_LENGTH = 20_000;
const FORM_BODY_LIMIT = '100kb';

export function createSigningRouter({ signingKey, receiptStore, requireAuth, render }) {
  const router = express.Router();
  const parseForm = express.urlencoded({ extended: false, limit: FORM_BODY_LIMIT });

  router.get('/', requireAuth, async (req, res) => {
    const receipts = await receiptStore.list(req.session.auth.claims.sub);
    render(res, { title: '전자서명', body: signDeskHomePage({ auth: req.session.auth, receipts, keyId: signingKey.keyId }) });
  });

  router.post('/sign', requireAuth, parseForm, async (req, res) => {
    const title = requireText(req.body.title, '문서 제목', MAX_TITLE_LENGTH).trim();
    const text = requireText(req.body.text, '문서 본문', MAX_DOCUMENT_LENGTH);
    const signer = req.session.auth.claims.preferred_username;
    const receipt = signDocument({ title, text, signer, signingKey });
    await receiptStore.add(req.session.auth.claims.sub, { id: receipt.signature.slice(0, 16), receipt });
    render(res, { title: '서명 완료', body: signResultPage({ receipt, text }) });
  });

  router.get('/verify', requireAuth, (req, res) => {
    render(res, { title: '서명 검증', body: verifyFormPage() });
  });

  router.post('/verify', requireAuth, parseForm, (req, res) => {
    const text = requireText(req.body.text, '문서 본문', MAX_DOCUMENT_LENGTH);
    const receipt = parseReceipt(req.body.receipt);
    const result = verifyDocument({ text, receipt, publicKey: signingKey.publicKey });
    render(res, { title: '검증 결과', body: verifyResultPage({ receipt, result, text, receiptJson: req.body.receipt }) });
  });

  // 누구나 서명을 검증할 수 있도록 공개키는 인증 없이 공개
  router.get('/public-key.pem', (req, res) => {
    res.type('application/x-pem-file').send(signingKey.publicKeyPem);
  });

  return router;
}

function requireText(value, label, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new UserFacingError(`${label}을(를) 1~${maxLength}자로 입력해 주세요.`);
  }
  return value.replace(/\r\n/g, '\n'); // 브라우저 폼의 줄바꿈(CRLF)을 정규화해 해시가 일관되게 한다
}

function parseReceipt(raw) {
  try {
    const receipt = JSON.parse(raw);
    if (typeof receipt?.documentHash !== 'string' || typeof receipt?.signature !== 'string') throw new Error('필드 누락');
    return receipt;
  } catch (error) {
    throw new UserFacingError('서명 영수증이 올바른 JSON 형식이 아닙니다.', { cause: error });
  }
}
