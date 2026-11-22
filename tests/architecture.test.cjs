const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { targetFor } = require('../services/gateway/src/routes');

test('gateway routes each public capability to its data owner', () => {
  for (const [url, owner] of [
    ['/api/v1/users/login', 'accounts'],
    ['/api/v1/learning/sessions', 'learning'],
    ['/api/v1/users/getProfile/minhanh', 'accounts'],
    ['/api/v1/friends/all', 'accounts'],
    ['/api/v1/users/getProfile/minhanh/posts', 'content'],
    ['/api/v1/users/getProfile/minhanh/photos', 'content'],
    ['/api/v1/posts/createPost', 'content'],
    ['/uploads/BACKBOOK/example.webp', 'content'],
    ['/api/v1/users/notifications', 'messaging'],
    ['/api/v1/users/notifications/123/seen', 'messaging'],
    ['/api/v1/chats', 'messaging'],
    ['/api/v1/messages/123/send', 'messaging'],
    ['/socket.io/', 'messaging'],
  ])
    assert.equal(targetFor(url), owner, url);
  for (const url of ['/internal/projections', '/internal/auth/verify', '/api/v1/usersExtra'])
    assert.equal(targetFor(url), null, url);
});

function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : entry.name.endsWith('.js')
          ? [path.join(directory, entry.name)]
          : []
    );
}
test('services never import source code or owned models from a sibling service', () => {
  for (const domain of ['accounts', 'content', 'messaging', 'learning', 'gateway'])
    for (const file of files(`services/${domain}/src`)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
        if (specifier.startsWith('.')) {
          const target = path.resolve(path.dirname(file), specifier);
          assert(
            target.startsWith(path.resolve('services', domain) + path.sep),
            `${file} imports another domain`
          );
          assert.doesNotThrow(() => require.resolve(target), `${file}: ${specifier}`);
        }
      }
    }
});

test('public projections exclude account secrets', () => {
  const { userProjection } = require('../packages/service-kit/src/projections');
  const User = userProjection();
  for (const field of [
    'password',
    'passwordResetToken',
    'verificationEmailToken',
    'email',
    'search',
  ])
    assert.equal(User.schema.path(field), undefined);
  assert.equal(User.collection.name, 'user_projections');
});
