const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  KeyPool,
  configuredKeys,
  quotaCooldown,
  nextPacificMidnight,
} = require('../services/learning/src/keyPool');
const { embed, generate } = require('../services/learning/src/provider');
const vector = () => Array(768).fill(0.1);
const embedded = () => ({ ok: true, json: async () => ({ embeddings: [{ values: vector() }] }) });
const answer = () => ({
  ok: true,
  json: async () => ({
    candidates: [
      { finishReason: 'STOP', content: { parts: [{ text: '{"answer":"OK","roadmap":null}' }] } },
    ],
  }),
});
const failed = (status, details = [], retry) => ({
  ok: false,
  status,
  headers: { get: () => retry || null },
  json: async () => ({ error: { details } }),
});

test('pool deduplicates credentials, starts in order and respects model-scoped cooldown', () => {
  assert.deepEqual(configuredKeys({ apiKeys: [' a ', 'b', 'a', '', null], apiKey: 'legacy' }), [
    'a',
    'b',
  ]);
  assert.deepEqual(configuredKeys({ apiKey: 'legacy' }), ['legacy']);
  let now = 10000;
  const pool = new KeyPool(3, () => now);
  assert.deepEqual(pool.candidates('model-a'), [0, 1, 2]);
  pool.block(0, 'model-a', 60000, 429);
  assert.deepEqual(pool.candidates('model-a'), [1, 2]);
  assert.deepEqual(pool.candidates('embedding'), [1, 2, 0]);
  pool.accept(2, 'model-a');
  assert.deepEqual(pool.candidates('model-a'), [2, 1]);
  now += 60001;
  assert.deepEqual(pool.candidates('model-a'), [2, 0, 1]);
});
test('invalid credentials are skipped across models and all-unavailable pools stop', () => {
  const pool = new KeyPool(2, () => 1000);
  pool.block(0, '*', 300000, 503);
  pool.block(1, 'model', 60000, 429);
  assert.deepEqual(pool.candidates('model'), []);
  assert.equal(pool.errorCode('model'), 429);
  assert.deepEqual(pool.candidates('other'), [1]);
});
test('daily quotas cool down until Pacific midnight and honor Retry-After', () => {
  for (const [now, next] of [
    ['2026-11-18T16:00:00Z', '2026-11-19T08:00:00Z'],
    ['2026-07-18T15:00:00Z', '2026-07-19T07:00:00Z'],
    ['2026-11-01T08:00:00Z', '2026-11-02T08:00:00Z'],
  ])
    assert.equal(
      new Date(nextPacificMidnight(Date.parse(now))).toISOString(),
      new Date(next).toISOString()
    );
  const now = Date.parse('2026-11-18T16:00:00Z');
  const details = {
    error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] }] },
  };
  assert.equal(quotaCooldown({ headers: { get: () => null } }, details, now), 16 * 3600000);
  assert.equal(quotaCooldown({ headers: { get: () => '120' } }, {}, now), 120000);
});
test('quota on key 1 immediately switches embedding to key 2 and subsequent generation stays there', async () => {
  const settings = {
    apiKeys: ['test-rotate-a', 'test-rotate-b', 'test-rotate-c'],
    model: 'model',
    embeddingModel: 'embed',
  };
  const calls = [];
  const stub = mock.method(global, 'fetch', async (url, options) => {
    const key = options.headers['x-goog-api-key'];
    calls.push(key);
    if (key === 'test-rotate-a') return failed(429);
    return url.endsWith(':batchEmbedContents') ? embedded() : answer();
  });
  try {
    await embed(['test'], settings);
    assert.deepEqual(calls, ['test-rotate-a', 'test-rotate-b']);
    assert.equal((await generate({ mode: 'chat' }, settings)).answer, 'OK');
    assert.deepEqual(calls, ['test-rotate-a', 'test-rotate-b', 'test-rotate-b']);
  } finally {
    stub.mock.restore();
  }
});
test('generation switches past an unauthorized key without leaking upstream messages', async () => {
  const settings = { apiKeys: ['test-denied-a', 'test-denied-b'], model: 'model' };
  const calls = [];
  const stub = mock.method(global, 'fetch', async (url, options) => {
    const key = options.headers['x-goog-api-key'];
    calls.push(key);
    return key.endsWith('-a') ? failed(403) : answer();
  });
  try {
    assert.equal((await generate({ mode: 'chat' }, settings)).answer, 'OK');
    assert.deepEqual(calls, settings.apiKeys);
  } finally {
    stub.mock.restore();
  }
});
test('all exhausted keys are tried once then cooldown prevents a request loop', async () => {
  const settings = { apiKeys: ['test-all-a', 'test-all-b', 'test-all-c'], embeddingModel: 'embed' };
  let calls = 0;
  const stub = mock.method(global, 'fetch', async () => {
    calls++;
    return failed(429);
  });
  try {
    await assert.rejects(
      () => embed(['test'], settings),
      (error) =>
        error.statusCode === 429 && !settings.apiKeys.some((key) => error.message.includes(key))
    );
    assert.equal(calls, 3);
    await assert.rejects(() => embed(['test'], settings), { statusCode: 429 });
    assert.equal(calls, 3);
  } finally {
    stub.mock.restore();
  }
});
test('bad request/schema does not consume other credentials', async () => {
  const settings = { apiKeys: ['test-schema-a', 'test-schema-b'], model: 'model' };
  let calls = 0;
  const stub = mock.method(global, 'fetch', async () => {
    calls++;
    return failed(400);
  });
  try {
    await assert.rejects(() => generate({ mode: 'chat' }, settings), { statusCode: 502 });
    assert.equal(calls, 1);
  } finally {
    stub.mock.restore();
  }
});
test('long server Retry-After switches to backup without blocking beyond request budget', async () => {
  const settings = { apiKeys: ['test-long-a', 'test-long-b'], embeddingModel: 'embed' };
  const calls = [];
  const stub = mock.method(global, 'fetch', async (url, options) => {
    const key = options.headers['x-goog-api-key'];
    calls.push(key);
    return key.endsWith('-a') ? failed(503, [], '120') : embedded();
  });
  try {
    await embed(['test'], settings);
    assert.deepEqual(calls, settings.apiKeys);
  } finally {
    stub.mock.restore();
  }
});
