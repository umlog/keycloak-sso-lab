import express from 'express';
import { parseEncryptedNote } from './encryptedNote.js';
import { notesPage } from './notesPage.js';

const JSON_BODY_LIMIT = '200kb';

export function createNotesRouter({ notesStore, requireAuth, requireApiAuth, render }) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    render(res, {
      title: '암호화 메모',
      body: notesPage(req.session.auth),
      scripts: ['/static/secure-notes.js'],
    });
  });

  router.get('/api/notes', requireApiAuth, async (req, res) => {
    res.json(await notesStore.list(req.session.auth.claims.sub));
  });

  router.post('/api/notes', requireApiAuth, express.json({ limit: JSON_BODY_LIMIT }), async (req, res) => {
    const note = parseEncryptedNote(req.body);
    res.status(201).json(await notesStore.add(req.session.auth.claims.sub, note));
  });

  router.delete('/api/notes/:id', requireApiAuth, async (req, res) => {
    const removed = await notesStore.remove(req.session.auth.claims.sub, req.params.id);
    res.status(removed ? 204 : 404).end();
  });

  return router;
}
