const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const read = (relative) => {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
};
function update(relative, values) {
  fs.writeFileSync(
    path.join(root, relative),
    Object.entries({ ...read(relative), ...values })
      .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
      .join('\n') + '\n'
  );
}
const current = read('.env');
const web = read('apps/web/.env.local');
const previousOrigins = [
  ...new Set(
    [
      ...(web.REACT_APP_PREVIOUS_LOCAL_ORIGINS || '').split(','),
      current.FRONTEND_URL,
      current.BACKEND_URL,
      web.REACT_APP_BACKEND_URL,
    ].filter(Boolean)
  ),
].join(',');
const shared = {
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:8000',
  CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  GATEWAY_HOST: '127.0.0.1',
};
for (const file of [
  '.env',
  ...['gateway', 'accounts', 'content', 'messaging', 'learning'].map(
    (name) => `services/${name}/.env`
  ),
])
  update(file, shared);
update('apps/web/.env.local', {
  REACT_APP_BACKEND_URL: shared.BACKEND_URL,
  REACT_APP_PREVIOUS_LOCAL_ORIGINS: previousOrigins,
  HOST: 'localhost',
  WDS_SOCKET_HOST: 'localhost',
  PORT: '3000',
  BROWSER: 'none',
});
console.log('Configured http://localhost:3000. Existing secrets and data are preserved.');
