const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const address = process.argv[2];
if (
  net.isIP(address || '') !== 4 ||
  !Object.values(os.networkInterfaces())
    .flat()
    .some((item) => item && !item.internal && item.address === address)
)
  throw new Error(
    'Provide an IPv4 address assigned to this computer: node scripts/configure-lan.cjs <IPv4>'
  );
function update(relative, values) {
  const file = path.join(root, relative);
  const existing = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  fs.writeFileSync(
    file,
    Object.entries({ ...existing, ...values })
      .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
      .join('\n') + '\n'
  );
}
const shared = {
  FRONTEND_URL: `http://${address}:3000`,
  BACKEND_URL: `http://${address}:8000`,
  CORS_ORIGINS: `http://${address}:3000`,
  GATEWAY_HOST: '0.0.0.0',
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
  HOST: '0.0.0.0',
  WDS_SOCKET_HOST: address,
  PORT: '3000',
  BROWSER: 'none',
});
console.log(`LAN configured: ${shared.FRONTEND_URL}. Restart services and frontend.`);
