import { ssoStatusCard } from '../../core/ui/authViews.js';

export function notesPage(auth) {
  return `${ssoStatusCard(auth, 'SecureNote')}
<div class="grid2">
  <section class="card">
    <h2>📝 새 암호화 메모</h2>
    <p class="muted">본문은 브라우저에서 <b>AES-256-GCM</b> 으로 암호화된 뒤 전송됩니다. 키는 패스프레이즈에서 <b>PBKDF2-SHA256 (600,000회)</b> 로 유도되며, 패스프레이즈와 키는 서버로 전송되지 않습니다.</p>
    <form id="note-form">
      <label for="note-title">제목 (평문)</label>
      <input id="note-title" type="text" maxlength="100" required>
      <label for="note-body">본문 (암호화 대상)</label>
      <textarea id="note-body" required></textarea>
      <div class="row"><button class="btn" type="submit">암호화하여 저장</button></div>
    </form>
  </section>
  <section class="card">
    <h2>🔑 마스터 패스프레이즈</h2>
    <p class="muted">저장·복호화 모두 이 패스프레이즈를 사용합니다. 틀리면 GCM 인증 태그 검증에 실패해 복호화되지 않습니다.</p>
    <label for="passphrase">패스프레이즈</label>
    <input id="passphrase" type="password" autocomplete="off">
    <p id="status" class="status muted" role="status" aria-live="polite"></p>
  </section>
</div>
<section class="card">
  <h2>내 메모 <span class="muted">(서버에는 암호문만 저장됨)</span></h2>
  <div id="notes"><p class="muted">불러오는 중…</p></div>
</section>`;
}
