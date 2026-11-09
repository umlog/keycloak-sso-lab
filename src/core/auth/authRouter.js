import express from 'express';
import { createCodeChallenge, randomToken, safeReturnPath } from './pkce.js';
import { UserFacingError } from '../errors.js';
import { loggedOutPage, tokenInspectionPage } from '../ui/authViews.js';

/**
 * 로그인/콜백/로그아웃/백채널 로그아웃 라우트와 인증 미들웨어.
 * 두 서비스가 동일한 코드를 쓰고, clientId/secret/baseUrl 만 다르다.
 */
export function createAuthModule({ keycloak, clientId, baseUrl, registry, render, service }) {
  const router = express.Router();

  router.get('/login', async (req, res) => {
    const codeVerifier = randomToken();
    const pendingAuth = {
      state: randomToken(),
      nonce: randomToken(),
      codeVerifier,
      returnTo: safeReturnPath(req.query.returnTo),
      startedAtSeconds: Math.floor(Date.now() / 1000),
    };
    req.session.pendingAuth = pendingAuth;
    const authorizationUrl = await keycloak.buildAuthorizationUrl({
      state: pendingAuth.state,
      nonce: pendingAuth.nonce,
      codeChallenge: createCodeChallenge(codeVerifier),
    });
    res.redirect(authorizationUrl);
  });

  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const pendingAuth = req.session.pendingAuth;
    if (error) {
      throw new UserFacingError(`Keycloak 이 로그인을 거부했습니다 (${error}).`);
    }
    if (!pendingAuth || typeof state !== 'string' || state !== pendingAuth.state || typeof code !== 'string') {
      throw new UserFacingError('로그인 요청이 만료되었거나 위조되었습니다(state 불일치). 다시 로그인해 주세요.');
    }

    const tokens = await keycloak.exchangeCode({ code, codeVerifier: pendingAuth.codeVerifier });
    const { claims } = await keycloak.verifyIdToken(tokens.id_token, pendingAuth.nonce);

    await regenerateSession(req); // 세션 고정(Session Fixation) 방지
    // Keycloak 의 최초 인증 시각이 이 서비스가 로그인을 시작한 시각보다 이르면,
    // 로그인 화면 없이 기존 Keycloak SSO 세션을 재사용한 것이다.
    const reusedKeycloakSession = claims.auth_time < pendingAuth.startedAtSeconds;
    req.session.auth = { idToken: tokens.id_token, claims, reusedKeycloakSession };
    registry.register(claims.sid, req.sessionID);
    res.redirect(pendingAuth.returnTo);
  });

  router.get('/logout', async (req, res) => {
    const idToken = req.session.auth?.idToken;
    await destroySession(req);
    const logoutUrl = await keycloak.buildLogoutUrl({
      idTokenHint: idToken,
      postLogoutRedirectUri: `${baseUrl}/logged-out`,
    });
    res.redirect(logoutUrl);
  });

  // Keycloak 서버가 직접 호출 (브라우저 경유 X). 로그아웃 토큰의 서명을 검증한 뒤 해당 sid 의 세션을 파기한다.
  router.post('/backchannel-logout', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const logoutToken = req.body?.logout_token;
      if (typeof logoutToken !== 'string') {
        res.status(400).json({ error: 'logout_token 누락' });
        return;
      }
      const payload = await keycloak.verifyLogoutToken(logoutToken);
      const revokedCount = await registry.revoke(payload.sid);
      console.info(`[${clientId}] backchannel logout: sid=${payload.sid}, 파기된 로컬 세션 ${revokedCount}개`);
      res.status(200).end();
    } catch (error) {
      console.error(`[${clientId}] backchannel logout 거부:`, error.message);
      res.status(400).json({ error: 'invalid logout_token' });
    }
  });

  router.get('/logged-out', (req, res) => {
    render(res, { title: '로그아웃', body: loggedOutPage(service) });
  });

  router.get('/token', requireAuth, async (req, res) => {
    const { idToken } = req.session.auth;
    const verification = await keycloak
      .verifyIdToken(idToken)
      .then(({ claims, header }) => ({ ok: true, claims, header }))
      .catch((error) => ({ ok: false, error: error.code ?? error.message }));
    render(res, { title: '토큰 검증', body: tokenInspectionPage({ idToken, verification, clientId }) });
  });

  return { router, requireAuth, requireApiAuth };
}

/** 페이지용: 미로그인 시 Keycloak 로그인으로 보낸다 (SSO 세션이 있으면 로그인 화면 없이 즉시 돌아옴) */
function requireAuth(req, res, next) {
  if (req.session.auth) {
    next();
    return;
  }
  res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
}

/** API 용: 미로그인 시 401 JSON */
function requireApiAuth(req, res, next) {
  if (req.session.auth) {
    next();
    return;
  }
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate((error) => (error ? reject(error) : resolve())));
}

function destroySession(req) {
  return new Promise((resolve, reject) => req.session.destroy((error) => (error ? reject(error) : resolve())));
}
