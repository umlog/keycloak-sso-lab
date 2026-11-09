import { escapeHtml } from '../../core/ui/escapeHtml.js';
import { ssoStatusCard } from '../../core/ui/authViews.js';

export function signDeskHomePage({ auth, receipts, keyId }) {
  const history = receipts.length
    ? receipts
        .map(({ receipt }) => `<tr><td>${escapeHtml(receipt.title)}</td><td>${escapeHtml(new Date(receipt.signedAt).toLocaleString('ko-KR'))}</td><td>${escapeHtml(receipt.documentHash.slice(0, 24))}…</td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="muted">아직 서명한 문서가 없습니다.</td></tr>';
  return `${ssoStatusCard(auth, 'SignDesk')}
<div class="grid2">
  <section class="card">
    <h2>✍️ 문서 전자서명</h2>
    <p class="muted">본문의 <b>SHA-256</b> 해시와 서명자(Keycloak 인증 사용자), 시각을 묶어 서버 개인키로 <b>ECDSA P-256</b> 서명합니다. 서명자 이름은 입력받지 않고 검증된 ID 토큰에서 가져옵니다.</p>
    <form method="post" action="/sign">
      <label for="title">문서 제목</label>
      <input id="title" name="title" type="text" maxlength="100" required>
      <label for="text">문서 본문</label>
      <textarea id="text" name="text" required></textarea>
      <div class="row"><button class="btn" type="submit">서명하기</button><a class="btn light" href="/verify">서명 검증하기</a></div>
    </form>
  </section>
  <section class="card">
    <h2>🔏 서명 키 정보</h2>
    <table class="kv">
      <tr><th>알고리즘</th><td>ECDSA, 곡선 P-256 (secp256r1), 해시 SHA-256</td></tr>
      <tr><th>공개키 지문 (keyId)</th><td>${escapeHtml(keyId)}</td></tr>
      <tr><th>공개키</th><td><a href="/public-key.pem">/public-key.pem</a> (누구나 검증 가능)</td></tr>
    </table>
    <h3>내 서명 내역</h3>
    <table class="kv"><tr><th>제목</th><th>서명 시각</th><th>SHA-256</th></tr>${history}</table>
  </section>
</div>`;
}

export function signResultPage({ receipt, text }) {
  return `<section class="card">
  <h2><span class="pill ok">✔ 서명 완료</span> ${escapeHtml(receipt.title)}</h2>
  <table class="kv">
    <tr><th>서명자</th><td>${escapeHtml(receipt.signer)}</td></tr>
    <tr><th>문서 해시 (SHA-256)</th><td>${escapeHtml(receipt.documentHash)}</td></tr>
    <tr><th>서명 (base64, r‖s 64바이트)</th><td>${escapeHtml(receipt.signature)}</td></tr>
  </table>
</section>
${verifyForm({ text, receiptJson: JSON.stringify(receipt, null, 2), heading: '바로 검증해 보기 (본문을 한 글자 바꾸면 검증 실패)' })}`;
}

export function verifyFormPage() {
  return verifyForm({ text: '', receiptJson: '', heading: '서명 검증' });
}

export function verifyResultPage({ receipt, result, text, receiptJson }) {
  const pill = (ok, okText, badText) => `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? '✔ ' + okText : '✘ ' + badText}</span>`;
  return `<section class="card">
  <h2>${pill(result.valid, '유효한 서명입니다', '검증 실패')}</h2>
  <table class="kv">
    <tr><th>① 문서 해시 비교</th><td>${pill(result.hashMatches, '일치', '불일치 — 문서가 변조됨')}</td></tr>
    <tr><th>영수증의 해시</th><td>${escapeHtml(receipt.documentHash)}</td></tr>
    <tr><th>지금 계산한 해시</th><td>${escapeHtml(result.computedHash)}</td></tr>
    <tr><th>② ECDSA 서명 검증</th><td>${pill(result.signatureValid, '공개키로 검증 성공', '서명 무효 — 영수증 위조/손상')}</td></tr>
    <tr><th>서명자 / 시각</th><td>${escapeHtml(receipt.signer)} / ${escapeHtml(receipt.signedAt)}</td></tr>
  </table>
</section>
${verifyForm({ text, receiptJson, heading: '다시 검증' })}`;
}

function verifyForm({ text, receiptJson, heading }) {
  return `<section class="card">
  <h2>${escapeHtml(heading)}</h2>
  <form method="post" action="/verify">
    <div class="grid2">
      <div><label for="verify-text">문서 본문</label><textarea id="verify-text" name="text" required>${escapeHtml(text)}</textarea></div>
      <div><label for="verify-receipt">서명 영수증 (JSON)</label><textarea id="verify-receipt" class="mono" name="receipt" required>${escapeHtml(receiptJson)}</textarea></div>
    </div>
    <div class="row"><button class="btn" type="submit">검증하기</button><a class="btn light" href="/">처음으로</a></div>
  </form>
</section>`;
}
