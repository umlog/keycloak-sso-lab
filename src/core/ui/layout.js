import { escapeHtml } from './escapeHtml.js';

/**
 * 두 서비스가 공유하는 HTML 레이아웃. 서비스마다 이름과 강조색(accent)만 다르다.
 * service = { name, badge, accent, partner: { name, url } }
 */
export function renderLayout({ service, title, user, body, scripts = [] }) {
  const scriptTags = scripts.map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(service.name)}</title>
<style>${styles(service.accent)}</style>
</head>
<body>
<header class="topbar">
  <a class="brand" href="/"><span class="badge">${escapeHtml(service.badge)}</span>${escapeHtml(service.name)}</a>
  ${user ? navigation(service) : ''}
  <div class="user">${user ? `<span class="who">👤 ${escapeHtml(user)}</span><a class="btn ghost" href="/logout">로그아웃</a>` : ''}</div>
</header>
<main>${body}</main>
<footer>${escapeHtml(service.badge)} · ${escapeHtml(service.name)} — Keycloak SSO Lab</footer>
${scriptTags}
</body>
</html>`;
}

function navigation(service) {
  return `<nav>
    <a href="/">홈</a>
    <a href="/token">토큰 검증</a>
    <a class="partner" href="${escapeHtml(service.partner.url)}">${escapeHtml(service.partner.name)} 으로 이동 →</a>
  </nav>`;
}

function styles(accent) {
  return `
:root { --accent: ${accent}; --bg: #f5f7fb; --card: #fff; --text: #1f2937; --muted: #6b7280; --ok: #15803d; --bad: #b91c1c; --line: #e5e7eb; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Pretendard", "Malgun Gothic", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
.topbar { display: flex; align-items: center; gap: 24px; padding: 14px 32px; background: var(--accent); color: #fff; flex-wrap: wrap; }
.brand { font-size: 20px; font-weight: 700; color: #fff; text-decoration: none; display: flex; align-items: center; gap: 10px; }
.badge { font-size: 12px; font-weight: 600; background: rgba(255,255,255,.22); padding: 3px 9px; border-radius: 999px; }
nav { display: flex; gap: 18px; flex: 1; }
nav a { color: #fff; text-decoration: none; opacity: .9; }
nav a:hover { opacity: 1; text-decoration: underline; }
nav a.partner { margin-left: auto; font-weight: 600; background: rgba(255,255,255,.18); padding: 4px 12px; border-radius: 8px; }
.user { display: flex; align-items: center; gap: 12px; }
main { max-width: 1040px; margin: 28px auto; padding: 0 20px; display: grid; gap: 20px; }
footer { text-align: center; color: var(--muted); font-size: 13px; padding: 24px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 22px 24px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.card h2 { margin: 0 0 12px; font-size: 18px; }
.card h3 { margin: 16px 0 8px; font-size: 15px; }
.muted { color: var(--muted); font-size: 14px; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
table.kv { width: 100%; border-collapse: collapse; font-size: 14px; }
table.kv th { text-align: left; width: 34%; color: var(--muted); font-weight: 500; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
table.kv td { padding: 6px 8px; border-bottom: 1px solid var(--line); word-break: break-all; font-family: Consolas, monospace; font-size: 13px; }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.pill.ok { background: #dcfce7; color: var(--ok); }
.pill.bad { background: #fee2e2; color: var(--bad); }
.pill.info { background: #e0e7ff; color: #3730a3; }
.btn { display: inline-block; border: 0; border-radius: 9px; padding: 9px 16px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; background: var(--accent); color: #fff; min-height: 40px; }
.btn.ghost { background: rgba(255,255,255,.18); color: #fff; }
.btn.light { background: #eef2f7; color: var(--text); }
.btn.danger { background: #fee2e2; color: var(--bad); }
label { display: block; font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
input[type=text], input[type=password], textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; font-size: 14px; }
textarea { min-height: 120px; resize: vertical; }
textarea.mono, .mono { font-family: Consolas, monospace; font-size: 12.5px; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
.jwt { font-family: Consolas, monospace; font-size: 12px; word-break: break-all; background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 10px; }
.jwt .h { color: #fb7185; } .jwt .p { color: #c084fc; } .jwt .s { color: #38bdf8; }
.hero { text-align: center; padding: 48px 24px; }
.hero h1 { margin: 0 0 8px; }
.note-item { border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-top: 12px; }
.note-item .cipher { font-family: Consolas, monospace; font-size: 12px; color: var(--muted); word-break: break-all; margin: 6px 0; }
.note-item .plain { white-space: pre-wrap; background: #f0fdf4; border-radius: 8px; padding: 10px; margin-top: 8px; }
.status { margin-top: 10px; font-size: 14px; }
`;
}
