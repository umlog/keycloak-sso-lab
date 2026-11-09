import { escapeHtml } from './escapeHtml.js';

function describeLoginMethod(reusedKeycloakSession) {
  return reusedKeycloakSession
    ? { label: 'SSO 자동 로그인 (기존 Keycloak 세션 재사용, 비밀번호 입력 없음)', tone: 'info' }
    : { label: 'Keycloak 로그인 화면에서 직접 인증', tone: 'ok' };
}

function formatEpoch(seconds) {
  return new Date(seconds * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/** 각 서비스 홈 상단에 보이는 "현재 SSO 세션" 카드 */
export function ssoStatusCard({ claims, reusedKeycloakSession }, serviceName) {
  const method = describeLoginMethod(reusedKeycloakSession);
  return `<section class="card">
  <h2>🔐 ${escapeHtml(serviceName)} 로그인 상태</h2>
  <table class="kv">
    <tr><th>사용자</th><td>${escapeHtml(claims.preferred_username)} (${escapeHtml(claims.email)})</td></tr>
    <tr><th>Keycloak 세션 ID (sid)</th><td>${escapeHtml(claims.sid)}</td></tr>
    <tr><th>최초 인증 시각 (auth_time)</th><td>${formatEpoch(claims.auth_time)}</td></tr>
    <tr><th>이 서비스 토큰 발급 (iat)</th><td>${formatEpoch(claims.iat)}</td></tr>
    <tr><th>로그인 방식</th><td><span class="pill ${method.tone}">${method.label}</span></td></tr>
  </table>
</section>`;
}

export function tokenInspectionPage({ idToken, verification, clientId }) {
  const [header, payload, signature] = idToken.split('.');
  const status = verification.ok
    ? `<span class="pill ok">✔ RS256 서명 검증 성공</span>`
    : `<span class="pill bad">✘ 검증 실패: ${escapeHtml(verification.error)}</span>`;
  const claimRows = verification.ok
    ? ['iss', 'aud', 'azp', 'sub', 'preferred_username', 'sid', 'nonce', 'auth_time', 'iat', 'exp']
        .map((key) => `<tr><th>${key}</th><td>${escapeHtml(formatClaim(key, verification.claims[key]))}</td></tr>`)
        .join('')
    : '';
  return `<section class="card">
  <h2>ID 토큰(JWT) 서명 검증</h2>
  <p class="muted">이 서비스(${escapeHtml(clientId)})는 Keycloak 의 JWKS 공개키로 ID 토큰의 서명을 직접 검증합니다. 서명·issuer·audience·만료시간이 모두 맞아야 로그인으로 인정합니다.</p>
  <p>${status} ${verification.ok ? `<span class="pill info">alg ${escapeHtml(verification.header.alg)} · kid ${escapeHtml(verification.header.kid)}</span>` : ''}</p>
  <div class="jwt"><span class="h">${escapeHtml(header)}</span>.<span class="p">${escapeHtml(payload)}</span>.<span class="s">${escapeHtml(signature)}</span></div>
  <p class="muted">빨강 = Header(Base64URL) · 보라 = Payload(클레임) · 파랑 = Signature = RSASSA-PKCS1-v1_5(SHA-256(header.payload), Keycloak 개인키)</p>
</section>
<section class="card">
  <h2>검증된 클레임</h2>
  <table class="kv">${claimRows}</table>
</section>`;
}

function formatClaim(key, value) {
  if (['auth_time', 'iat', 'exp'].includes(key)) return `${value} (${formatEpoch(value)})`;
  return Array.isArray(value) ? value.join(', ') : value;
}

export function loggedOutPage(service) {
  return `<section class="card hero">
  <h1>로그아웃되었습니다</h1>
  <p class="muted">Keycloak SSO 세션이 종료되었고, 백채널 로그아웃으로 ${escapeHtml(service.partner.name)} 의 세션도 함께 파기되었습니다.</p>
  <div class="row" style="justify-content:center">
    <a class="btn" href="/">${escapeHtml(service.name)} 다시 로그인</a>
    <a class="btn light" href="${escapeHtml(service.partner.url)}">${escapeHtml(service.partner.name)} 열기</a>
  </div>
</section>`;
}

export function errorPage(message) {
  return `<section class="card hero">
  <h1>요청을 처리하지 못했습니다</h1>
  <p class="muted">${escapeHtml(message)}</p>
  <div class="row" style="justify-content:center"><a class="btn" href="/">처음으로</a></div>
</section>`;
}
