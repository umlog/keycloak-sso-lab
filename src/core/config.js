export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name} 이(가) 비어 있습니다. .env 파일을 확인하세요.`);
  }
  return value;
}
