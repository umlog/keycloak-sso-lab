# Keycloak SSO Lab

Keycloak(OpenID Connect)으로 두 웹 서비스에 SSO 를 적용한 암호학 과제 프로젝트.

| 서비스 | 주소 | 기능 | 적용 암호 |
|---|---|---|---|
| Keycloak 26.8.2 | http://localhost:8080 | 인증 서버, realm `sso-lab` | RS256 서명 토큰, JWKS |
| 서비스 A · SecureNote | http://service-a.localhost:3001 | 브라우저 측 암호화 메모 | PBKDF2-SHA256 + AES-256-GCM |
| 서비스 B · SignDesk | http://service-b.localhost:3002 | 문서 전자서명 / 검증 | SHA-256 + ECDSA P-256 |

공통 인증: Authorization Code + PKCE(S256), state/nonce, ID 토큰 RS256 검증, 백채널 로그아웃(서명된 logout_token 검증).

## 실행

준비물: Node.js 22+, [Keycloak 26 zip](https://github.com/keycloak/keycloak/releases), JDK 21.

1. `.env.example` 을 `.env` 로 복사하고 경로와 비밀값을 채운다.
2. `npm install`
3. Keycloak: `powershell -ExecutionPolicy Bypass -File scripts/start-keycloak.ps1` (realm 자동 import)
4. 서비스 A: `npm run start:a`, 서비스 B: `npm run start:b`
5. http://service-a.localhost:3001 접속 → `alice` / `.env` 의 `SSO_TEST_PASSWORD` 로 로그인 → 상단의 "SignDesk 로 이동" 클릭 시 로그인 화면 없이 입장

테스트: `npm test` (단위 테스트 12개)

## 구조

```
keycloak/sso-lab-realm.json     realm·클라이언트·사용자 정의 (비밀값은 ${ENV} 치환)
scripts/start-keycloak.ps1      Keycloak 개발 모드 실행
src/core/auth/                  OIDC 클라이언트, 로그인/로그아웃 라우트, 백채널 세션 레지스트리
src/service-a/                  SecureNote (암호문 저장 API)
src/service-b/                  SignDesk (ECDSA 서명·검증)
public/service-a/secure-notes.js  Web Crypto 암·복호화
docs/                           발표 자료(PPT)와 동작 검증 스크린샷
```
