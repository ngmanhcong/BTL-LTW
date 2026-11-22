const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
function read(file) {
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
}
function save(file, values) {
  fs.writeFileSync(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
      .join('\n') + '\n'
  );
}
const previous = read(path.join(root, 'legacy/backbook-server/.env'));
const current = read(path.join(root, '.env'));
const shared = {
  APP_NAME: 'BACKBOOK',
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:8000',
  NODE_ENV: 'development',
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: '7d',
  JWT_COOKIE_EXPIRES_IN: '7',
  MEDIA_STORAGE: 'local',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  EMAIL_ID: 'ptitsocial@localhost.test',
  ...previous,
  ...current,
};
shared.INTERNAL_API_KEY = current.INTERNAL_API_KEY || crypto.randomBytes(48).toString('hex');
shared.ACCOUNTS_URL = 'http://127.0.0.1:8001';
shared.CONTENT_URL = 'http://127.0.0.1:8002';
shared.MESSAGING_URL = 'http://127.0.0.1:8003';
shared.LEARNING_URL = 'http://127.0.0.1:8004';
delete shared.PORT;
delete shared.DATABASE;
save(path.join(root, '.env'), shared);
for (const [name, port] of [
  ['gateway', 8000],
  ['accounts', 8001],
  ['content', 8002],
  ['messaging', 8003],
  ['learning', 8004],
]) {
  const config = { ...shared, ...read(path.join(root, 'services', name, '.env')), PORT: port };
  if (name === 'learning') {
    config.GEMINI_API_KEY ??= '';
    config.GEMINI_API_KEYS ??= '';
    config.GEMINI_MODEL ||= 'gemini-3.5-flash-lite';
    config.GEMINI_EMBEDDING_MODEL ||= 'gemini-embedding-001';
    config.AI_DAILY_LIMIT ||= '30';
  }
  if (name !== 'gateway') config.DATABASE = `mongodb://127.0.0.1:27017/ptitsocial_${name}`;
  save(path.join(root, 'services', name, '.env'), config);
}
const webEnv = path.join(root, 'apps/web/.env.local');
if (!fs.existsSync(webEnv)) {
  save(webEnv, {
    REACT_APP_BACKEND_URL: 'http://localhost:8000',
    REACT_APP_ENABLE_FIREBASE: 'false',
    HOST: 'localhost',
    PORT: '3000',
    BROWSER: 'none',
  });
}
console.log('Local service configuration ready. Existing session secret preserved.');
