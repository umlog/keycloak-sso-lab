import { requireEnv } from '../core/config.js';
import { createServiceApp } from '../core/server/createServiceApp.js';
import { createJsonFileStore } from '../core/storage/jsonFileStore.js';
import { loadOrCreateSigningKey } from './signing/signingKeyStore.js';
import { createSigningRouter } from './signing/signingRouter.js';

const service = {
  name: 'SignDesk',
  badge: 'Service B',
  accent: '#059669',
  partner: { name: 'SecureNote (서비스 A)', url: requireEnv('SERVICE_A_BASE_URL') },
};

const { app, render, requireAuth, listen } = createServiceApp({
  service,
  clientId: 'service-b',
  clientSecret: requireEnv('SERVICE_B_CLIENT_SECRET'),
  issuer: requireEnv('KEYCLOAK_ISSUER'),
  baseUrl: requireEnv('SERVICE_B_BASE_URL'),
  sessionSecret: requireEnv('SERVICE_B_SESSION_SECRET'),
});

const signingKey = await loadOrCreateSigningKey('data/service-b-signing-key.pem');
const receiptStore = createJsonFileStore('data/service-b-receipts.json');
app.use(createSigningRouter({ signingKey, receiptStore, requireAuth, render }));

listen(Number(requireEnv('SERVICE_B_PORT')));
