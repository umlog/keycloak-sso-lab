import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { parseEncryptedNote } from '../src/service-a/notes/encryptedNote.js';

const randomBase64 = (bytes) => crypto.randomBytes(bytes).toString('base64');
const validBody = () => ({ title: '비밀 메모', ciphertext: randomBase64(48), iv: randomBase64(12), salt: randomBase64(16) });

test('올바른 암호문 메모는 id 와 생성 시각이 붙어 통과한다', () => {
  const note = parseEncryptedNote(validBody());

  assert.equal(note.title, '비밀 메모');
  assert.ok(note.id);
  assert.ok(note.createdAt);
});

test('IV 길이가 12바이트가 아니면 거부한다', () => {
  assert.throws(() => parseEncryptedNote({ ...validBody(), iv: randomBase64(16) }), /IV 길이/);
});

test('제목이 비어 있으면 거부한다', () => {
  assert.throws(() => parseEncryptedNote({ ...validBody(), title: '   ' }), /제목/);
});

test('base64 가 아닌 암호문은 거부한다', () => {
  assert.throws(() => parseEncryptedNote({ ...validBody(), ciphertext: '<script>' }), /암호문 형식/);
});
