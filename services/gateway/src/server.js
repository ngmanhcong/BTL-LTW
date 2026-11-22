require('dotenv').config();
const http = require('node:http');
const { targetFor } = require('./routes');
const targets = {
  accounts: process.env.ACCOUNTS_URL,
  content: process.env.CONTENT_URL,
  messaging: process.env.MESSAGING_URL,
  learning: process.env.LEARNING_URL || 'http://127.0.0.1:8004',
};
function fail(res, status, message) {
  if (!res.headersSent) res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ status: 'fail', message }));
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/health') {
    const statuses = await Promise.all(
      Object.entries(targets).map(async ([name, url]) => {
        try {
          const response = await fetch(url + '/health', { signal: AbortSignal.timeout(2000) });
          return [name, response.ok ? 'ok' : 'unavailable'];
        } catch {
          return [name, 'unavailable'];
        }
      })
    );
    const ready = statuses.every(([, status]) => status === 'ok');
    res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
    return res.end(
      JSON.stringify({
        service: 'gateway',
        status: ready ? 'ok' : 'degraded',
        services: Object.fromEntries(statuses),
      })
    );
  }
  const target = targetFor(pathname);
  if (!target) return fail(res, 404, 'Không tìm thấy chức năng này');
  const upstream = http.request(
    new URL(req.url, targets[target]),
    { method: req.method, headers: { ...req.headers, host: new URL(targets[target]).host } },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    }
  );
  upstream.setTimeout(target === 'learning' ? 240000 : 30000, () => upstream.destroy());
  upstream.on('error', () =>
    fail(res, 503, 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.')
  );
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});

server.on('upgrade', (req, socket, head) => {
  if (targetFor(new URL(req.url, 'http://localhost').pathname) !== 'messaging')
    return socket.destroy();
  const upstream = http.request(new URL(req.url, targets.messaging), {
    headers: { ...req.headers, host: new URL(targets.messaging).host },
  });
  upstream.on('upgrade', (response, peer, peerHead) => {
    socket.write(
      `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n` +
        Object.entries(response.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (peerHead.length) socket.write(peerHead);
    if (head.length) peer.write(head);
    peer.pipe(socket);
    socket.pipe(peer);
    socket.on('error', () => peer.destroy());
    peer.on('error', () => socket.destroy());
    socket.on('close', () => peer.destroy());
  });
  upstream.on('response', () => socket.destroy());
  upstream.on('error', () => socket.destroy());
  upstream.end();
});
server.listen(Number(process.env.PORT || 8000), process.env.GATEWAY_HOST || '127.0.0.1', () =>
  console.log(
    `API Gateway ready on ${process.env.GATEWAY_HOST || '127.0.0.1'}:${process.env.PORT || 8000}`
  )
);
