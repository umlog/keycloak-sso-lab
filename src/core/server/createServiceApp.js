import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { createKeycloakClient } from '../auth/keycloakClient.js';
import { createSessionRegistry } from '../auth/sessionRegistry.js';
import { createAuthModule } from '../auth/authRouter.js';
import { renderLayout } from '../ui/layout.js';
import { errorPage } from '../ui/authViews.js';

const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
const GENERIC_ERROR_MESSAGE = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

/**
 * 서비스 A/B 공통 Express 앱: 세션 + Keycloak OIDC 인증 라우트를 장착한다.
 * 각 서비스는 반환된 app 에 자기 기능 라우트만 추가하면 된다.
 */
export function createServiceApp({ service, clientId, clientSecret, issuer, baseUrl, sessionSecret, publicDir }) {
  const app = express();
  app.disable('x-powered-by');

  // 실습용 메모리 세션 저장소 (운영 환경에서는 Redis 등 외부 저장소 사용)
  const sessionStore = new session.MemoryStore();
  app.use(
    session({
      name: `${clientId}.sid`,
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: SESSION_MAX_AGE_MS },
    }),
  );
  if (publicDir) app.use('/static', express.static(path.resolve(publicDir)));

  app.use((req, res, next) => {
    res.locals.user = req.session.auth?.claims.preferred_username;
    next();
  });

  const render = (res, { title, body, scripts, status = 200 }) =>
    res.status(status).send(renderLayout({ service, title, body, scripts, user: res.locals.user }));

  const keycloak = createKeycloakClient({ issuer, clientId, clientSecret, redirectUri: `${baseUrl}/callback` });
  const registry = createSessionRegistry(sessionStore);
  const auth = createAuthModule({ keycloak, clientId, baseUrl, registry, render, service });
  app.use(auth.router);

  function listen(port) {
    app.use((req, res) => render(res, { title: '없는 페이지', body: errorPage('요청한 페이지를 찾을 수 없습니다.'), status: 404 }));
    app.use((error, req, res, next) => {
      console.error(`[${clientId}] ${req.method} ${req.path} 실패:`, error);
      if (res.headersSent) {
        next(error);
        return;
      }
      const status = error.status ?? 500;
      const message = error.userMessage ?? GENERIC_ERROR_MESSAGE;
      if (req.path.startsWith('/api/')) {
        res.status(status).json({ error: message });
        return;
      }
      render(res, { title: '오류', body: errorPage(message), status });
    });
    app.listen(port, () => console.info(`${service.badge} ${service.name} → ${baseUrl}`));
  }

  return { app, render, requireAuth: auth.requireAuth, requireApiAuth: auth.requireApiAuth, listen };
}
