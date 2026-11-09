/**
 * Keycloak 세션 ID(sid) ↔ 이 서비스의 로컬 세션 ID 매핑.
 * Keycloak 이 백채널 로그아웃을 보내면 sid 로 로컬 세션들을 찾아 파기한다.
 */
export function createSessionRegistry(sessionStore) {
  const localSessionIdsByKeycloakSid = new Map();

  function register(keycloakSid, localSessionId) {
    const ids = localSessionIdsByKeycloakSid.get(keycloakSid) ?? new Set();
    ids.add(localSessionId);
    localSessionIdsByKeycloakSid.set(keycloakSid, ids);
  }

  async function revoke(keycloakSid) {
    const ids = [...(localSessionIdsByKeycloakSid.get(keycloakSid) ?? [])];
    localSessionIdsByKeycloakSid.delete(keycloakSid);
    await Promise.all(ids.map((id) => destroySession(sessionStore, id)));
    return ids.length;
  }

  return { register, revoke };
}

function destroySession(sessionStore, sessionId) {
  return new Promise((resolve, reject) => {
    sessionStore.destroy(sessionId, (error) => (error ? reject(error) : resolve()));
  });
}
