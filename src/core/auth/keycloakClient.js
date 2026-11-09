import { createRemoteJWKSet, jwtVerify } from 'jose';

const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';
const OIDC_SCOPE = 'openid profile email';

/**
 * Keycloak(OpenID Provider)과 통신하는 최소 OIDC 클라이언트.
 * - Authorization Code + PKCE(S256) 로그인
 * - ID 토큰 / 로그아웃 토큰의 RS256 서명을 Keycloak JWKS 공개키로 검증
 */
export function createKeycloakClient({ issuer, clientId, clientSecret, redirectUri }) {
  let discoveryPromise = null;

  function discover() {
    if (!discoveryPromise) {
      discoveryPromise = loadDiscovery(issuer).catch((error) => {
        discoveryPromise = null; // Keycloak 이 늦게 뜬 경우 다음 요청에서 재시도
        throw error;
      });
    }
    return discoveryPromise;
  }

  async function buildAuthorizationUrl({ state, nonce, codeChallenge }) {
    const { metadata } = await discover();
    const url = new URL(metadata.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: OIDC_SCOPE,
      redirect_uri: redirectUri,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  async function exchangeCode({ code, codeVerifier }) {
    const { metadata } = await discover();
    const response = await fetch(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`토큰 교환 실패 (${response.status}): ${body.error ?? 'unknown'} ${body.error_description ?? ''}`);
    }
    return body;
  }

  async function verifyIdToken(idToken, expectedNonce) {
    const { metadata, jwks } = await discover();
    const { payload, protectedHeader } = await jwtVerify(idToken, jwks, {
      issuer: metadata.issuer,
      audience: clientId,
    });
    if (expectedNonce !== undefined && payload.nonce !== expectedNonce) {
      throw new Error('ID 토큰의 nonce 가 로그인 요청과 다릅니다 (재전송 공격 의심).');
    }
    return { claims: payload, header: protectedHeader };
  }

  async function verifyLogoutToken(logoutToken) {
    const { metadata, jwks } = await discover();
    const { payload } = await jwtVerify(logoutToken, jwks, {
      issuer: metadata.issuer,
      audience: clientId,
    });
    if (!payload.events || !(BACKCHANNEL_LOGOUT_EVENT in payload.events)) {
      throw new Error('로그아웃 토큰에 backchannel-logout 이벤트가 없습니다.');
    }
    if ('nonce' in payload) {
      throw new Error('로그아웃 토큰에는 nonce 가 있으면 안 됩니다.');
    }
    if (!payload.sid) {
      throw new Error('로그아웃 토큰에 sid 가 없습니다.');
    }
    return payload;
  }

  async function buildLogoutUrl({ idTokenHint, postLogoutRedirectUri }) {
    const { metadata } = await discover();
    const url = new URL(metadata.end_session_endpoint);
    const params = new URLSearchParams({ client_id: clientId, post_logout_redirect_uri: postLogoutRedirectUri });
    if (idTokenHint) params.set('id_token_hint', idTokenHint);
    url.search = params.toString();
    return url.toString();
  }

  return { buildAuthorizationUrl, exchangeCode, verifyIdToken, verifyLogoutToken, buildLogoutUrl };
}

async function loadDiscovery(issuer) {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error(`Keycloak discovery 실패 (${response.status}). Keycloak 이 실행 중인지 확인하세요.`);
  }
  const metadata = await response.json();
  if (metadata.issuer !== issuer) {
    throw new Error(`issuer 불일치: 설정값 ${issuer}, Keycloak 응답 ${metadata.issuer}`);
  }
  return { metadata, jwks: createRemoteJWKSet(new URL(metadata.jwks_uri)) };
}
