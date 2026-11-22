const { request } = require('@ptitsocial/service-kit/http');
exports.uploadImage = async (buffer, folder) =>
  (
    await request('content', '/internal/media', {
      method: 'POST',
      body: { buffer: buffer.toString('base64'), folder },
    })
  ).media;
