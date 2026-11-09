import { requireEnv } from '../core/config.js';
import { createServiceApp } from '../core/server/createServiceApp.js';
import { createJsonFileStore } from '../core/storage/jsonFileStore.js';
import { createNotesRouter } from './notes/notesRouter.js';

const service = {
  name: 'SecureNote',
  badge: 'Service A',
  accent: '#2563eb',
  partner: { name: 'SignDesk (서비스 B)', url: requireEnv('SERVICE_B_BASE_URL') },
};

const { app, render, requireAuth, requireApiAuth, listen } = createServiceApp({
  service,
  clientId: 'service-a',
  clientSecret: requireEnv('SERVICE_A_CLIENT_SECRET'),
  issuer: requireEnv('KEYCLOAK_ISSUER'),
  baseUrl: requireEnv('SERVICE_A_BASE_URL'),
  sessionSecret: requireEnv('SERVICE_A_SESSION_SECRET'),
  publicDir: 'public/service-a',
});

const notesStore = createJsonFileStore('data/service-a-notes.json');
app.use(createNotesRouter({ notesStore, requireAuth, requireApiAuth, render }));

listen(Number(requireEnv('SERVICE_A_PORT')));
