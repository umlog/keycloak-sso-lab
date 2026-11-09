// SecureNote 클라이언트 측 암호화 (Web Crypto API)
// 평문과 패스프레이즈는 브라우저 밖으로 나가지 않는다. 서버에는 {ciphertext, iv, salt} 만 저장된다.

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const CIPHER_PREVIEW_CHARS = 120;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const form = document.getElementById('note-form');
const titleInput = document.getElementById('note-title');
const bodyInput = document.getElementById('note-body');
const passphraseInput = document.getElementById('passphrase');
const statusLine = document.getElementById('status');
const notesContainer = document.getElementById('notes');

async function deriveKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptNote(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext));
  return { ciphertext: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv), salt: toBase64(salt) };
}

async function decryptNote(note, passphrase) {
  const key = await deriveKey(passphrase, fromBase64(note.salt));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(note.iv) }, key, fromBase64(note.ciphertext));
  return textDecoder.decode(plaintext);
}

function toBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.style.color = isError ? 'var(--bad)' : 'var(--ok)';
}

function requirePassphrase() {
  const passphrase = passphraseInput.value;
  if (passphrase.length < 8) {
    setStatus('패스프레이즈를 8자 이상 입력하세요.', true);
    passphraseInput.focus();
    return null;
  }
  return passphrase;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = '/login?returnTo=/';
    throw new Error('세션이 만료되었습니다.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `요청 실패 (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function renderNotes(notes) {
  notesContainer.replaceChildren();
  if (notes.length === 0) {
    notesContainer.innerHTML = '<p class="muted">아직 저장된 메모가 없습니다.</p>';
    return;
  }
  notes.forEach((note) => notesContainer.append(createNoteElement(note)));
}

function createNoteElement(note) {
  const item = document.createElement('article');
  item.className = 'note-item';

  const title = document.createElement('strong');
  title.textContent = note.title;
  const meta = document.createElement('div');
  meta.className = 'muted';
  meta.textContent = `${new Date(note.createdAt).toLocaleString('ko-KR')} · ${note.algorithm} · IV ${note.iv} · salt ${note.salt}`;
  const cipher = document.createElement('div');
  cipher.className = 'cipher';
  cipher.textContent = `암호문: ${note.ciphertext.slice(0, CIPHER_PREVIEW_CHARS)}${note.ciphertext.length > CIPHER_PREVIEW_CHARS ? '…' : ''}`;
  const plain = document.createElement('div');

  const decryptButton = document.createElement('button');
  decryptButton.className = 'btn light';
  decryptButton.type = 'button';
  decryptButton.textContent = '복호화';
  decryptButton.setAttribute('aria-label', `${note.title} 복호화`);
  decryptButton.addEventListener('click', async () => {
    const passphrase = requirePassphrase();
    if (!passphrase) return;
    try {
      setStatus('복호화 중… (PBKDF2 키 유도)');
      const plaintext = await decryptNote(note, passphrase);
      plain.className = 'plain';
      plain.textContent = plaintext;
      setStatus(`"${note.title}" 복호화 성공 — GCM 인증 태그 검증 통과`);
    } catch {
      plain.className = '';
      plain.textContent = '';
      setStatus('복호화 실패: 패스프레이즈가 틀렸거나 암호문이 변조되었습니다 (GCM 인증 태그 불일치).', true);
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn danger';
  deleteButton.type = 'button';
  deleteButton.textContent = '삭제';
  deleteButton.setAttribute('aria-label', `${note.title} 삭제`);
  deleteButton.addEventListener('click', async () => {
    try {
      await requestJson(`/api/notes/${encodeURIComponent(note.id)}`, { method: 'DELETE' });
      await loadNotes();
      setStatus('메모를 삭제했습니다.');
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  const actions = document.createElement('div');
  actions.className = 'row';
  actions.append(decryptButton, deleteButton);
  item.append(title, meta, cipher, actions, plain);
  return item;
}

async function loadNotes() {
  try {
    renderNotes(await requestJson('/api/notes'));
  } catch (error) {
    notesContainer.innerHTML = '';
    setStatus(`메모를 불러오지 못했습니다: ${error.message}`, true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const passphrase = requirePassphrase();
  if (!passphrase) return;
  try {
    setStatus('암호화 중… (PBKDF2 키 유도)');
    const encrypted = await encryptNote(bodyInput.value, passphrase);
    await requestJson('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.value, ...encrypted }),
    });
    form.reset();
    await loadNotes();
    setStatus('암호화된 메모를 저장했습니다. 서버에는 암호문만 전송되었습니다.');
  } catch (error) {
    setStatus(`저장 실패: ${error.message}`, true);
  }
});

loadNotes();
