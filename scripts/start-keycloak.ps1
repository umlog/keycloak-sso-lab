# Keycloak 을 개발 모드(http://localhost:8080)로 실행하고 sso-lab realm 을 가져온다.
# 사용법: powershell -ExecutionPolicy Bypass -File scripts/start-keycloak.ps1
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path $envFile)) {
    throw ".env 파일이 없습니다. .env.example 을 복사해서 값을 채워주세요."
}

# .env 의 KEY=VALUE 를 현재 프로세스 환경 변수로 등록 (realm 파일의 ${VAR} 치환에 사용됨)
Get-Content $envFile | Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
}

$importDir = Join-Path $env:KEYCLOAK_HOME 'data\import'
New-Item -ItemType Directory -Force $importDir | Out-Null
Copy-Item (Join-Path $projectRoot 'keycloak\sso-lab-realm.json') $importDir -Force

& (Join-Path $env:KEYCLOAK_HOME 'bin\kc.bat') start-dev --http-port 8080 --import-realm
