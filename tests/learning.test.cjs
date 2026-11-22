const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cosine, rank } = require('../services/learning/src/retrieval');
const catalog = require('../services/learning/src/catalog');
const { profile, validateReply, serialize } = require('../services/learning/src/validation');
const { embed, generate } = require('../services/learning/src/provider');

test('semantic ranking uses vector similarity rather than substring matching', () => {
  const vectors = catalog.map((item) => (item.id === 'python-control' ? [1, 0] : [0, 1]));
  assert.equal(rank([0.95, 0.05], vectors, 1)[0].id, 'python-control');
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([0, 0], [1, 0]), 0);
});

test('roadmaps reject invented sources and out-of-range milestones', () => {
  const learner = profile({ level: 'beginner', hoursPerWeek: 4, weeks: 8 });
  const value = {
    answer: 'Lộ trình dành cho bạn.',
    roadmap: {
      title: 'Học Python',
      summary: 'Học từ cơ bản.',
      milestones: [
        {
          title: 'Nền tảng',
          description: 'Làm quen chương trình.',
          week: 1,
          tasks: ['Chạy chương trình đầu tiên'],
          resourceIds: ['python-start'],
        },
      ],
    },
  };
  const valid = validateReply(value, catalog, learner, true);
  assert.equal(valid.roadmap.milestones[0].tasks[0].done, false);
  assert.throws(
    () =>
      validateReply(
        {
          ...value,
          roadmap: {
            ...value.roadmap,
            milestones: [{ ...value.roadmap.milestones[0], resourceIds: ['invented-link'] }],
          },
        },
        catalog,
        learner,
        true
      ),
    { statusCode: 502 }
  );
  assert.throws(
    () =>
      validateReply(
        {
          ...value,
          roadmap: { ...value.roadmap, milestones: [{ ...value.roadmap.milestones[0], week: 99 }] },
        },
        catalog,
        learner,
        true
      ),
    { statusCode: 502 }
  );
  assert.throws(() => profile({ level: 'beginner', hoursPerWeek: 0, weeks: 8 }), {
    statusCode: 400,
  });
  assert.equal(validateReply(value, catalog, learner, false).roadmap, null);
});

test('serialized sessions expose canonical sources but omit ownership and locks', () => {
  const result = serialize({
    user: 'private-owner',
    busyUntil: new Date(),
    messages: [{ resourceIds: ['python-start'] }],
    assistantMessages: [{ resourceIds: ['html'] }],
    roadmap: { milestones: [] },
  });
  assert.equal(result.user, undefined);
  assert.equal(result.busyUntil, undefined);
  assert.equal(
    result.resources.find((source) => source.id === 'python-start').url,
    'https://docs.python.org/3/tutorial/'
  );
  assert(result.resources.some((source) => source.id === 'html'));
});

test('Gemini answer text is preserved without shortening or trimming', () => {
  const answer = '  # Guide\n\n' + 'Nội dung đầy đủ.\n'.repeat(4000) + '  ';
  assert.equal(validateReply({ answer, roadmap: null }, [], {}, false).answer, answer);
  assert.throws(() => validateReply({ answer: '  ', roadmap: null }, [], {}, false), {
    statusCode: 502,
  });
});

test('Gemini adapter sends retrieval embeddings and structured content without exposing credentials', async () => {
  const settings = {
    apiKey: 'fixture-key',
    model: 'fixture-model',
    embeddingModel: 'fixture-embedding',
  };
  const calls = [];
  const vector = (values) => [...values, ...Array(768 - values.length).fill(0)];
  const stub = mock.method(global, 'fetch', async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
    return {
      ok: true,
      json: async () =>
        url.endsWith(':batchEmbedContents')
          ? { embeddings: [{ values: vector([1, 0]) }, { values: vector([0, 1]) }] }
          : {
              candidates: [
                {
                  finishReason: 'STOP',
                  content: {
                    parts: [
                      { thought: true, text: 'not final JSON' },
                      { text: '{"answer":"Xin chào","roadmap":null}' },
                    ],
                  },
                },
              ],
            },
    };
  });
  try {
    const embedded = await embed(['a', 'b'], settings, 'RETRIEVAL_DOCUMENT');
    assert.deepEqual(
      embedded.map((v) => v.slice(0, 2)),
      [
        [1, 0],
        [0, 1],
      ]
    );
    assert.equal(embedded[0].length, 768);
    assert.equal(calls[0].body.requests[0].taskType, 'RETRIEVAL_DOCUMENT');
    assert.equal(calls[0].body.requests[0].outputDimensionality, 768);
    assert.equal(calls[0].headers['x-goog-api-key'], 'fixture-key');
    assert.equal(calls[0].headers.Authorization, undefined);
    assert(!calls[0].url.includes('fixture-key'));
    assert.equal(
      (await generate({ mode: 'chat', question: 'Xin chào' }, settings)).answer,
      'Xin chào'
    );
    assert.equal(calls[1].body.generationConfig.responseMimeType, 'application/json');
    assert.equal(Object.hasOwn(calls[1].body.generationConfig, 'maxOutputTokens'), false);
    assert(!calls[1].body.systemInstruction.parts[0].text.includes('8–12'));
    assert(!calls[1].body.systemInstruction.parts[0].text.includes('24000'));
    assert.equal(calls[1].body.generationConfig.responseJsonSchema.type, 'object');
    assert.equal(JSON.parse(calls[1].body.contents[0].parts[0].text).mode, 'chat');
    assert(calls[1].body.systemInstruction.parts[0].text.includes('mode=guide'));
    assert(calls[1].body.systemInstruction.parts[0].text.includes('không giới hạn kiến thức'));
    assert(calls[1].body.systemInstruction.parts[0].text.includes('giải thích 1'));
    assert.deepEqual(calls[1].body.generationConfig.responseJsonSchema.properties.roadmap, {
      type: 'null',
    });
    await generate({ mode: 'guide', goal: 'lap trinh web' }, settings);
    assert.deepEqual(calls[2].body.generationConfig.responseJsonSchema.properties.roadmap, {
      type: 'null',
    });
    assert(
      calls[2].body.systemInstruction.parts.some((part) =>
        part.text.includes('viết toàn bộ bài hướng dẫn')
      )
    );
    await generate({ mode: 'create', goal: 'lap trinh web' }, settings);
    assert(calls[3].body.generationConfig.responseJsonSchema.properties.roadmap.anyOf);

    stub.mock.mockImplementation(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'sensitive upstream details fixture-key' } }),
    }));
    await assert.rejects(
      () => embed(['a'], settings),
      (error) =>
        error.statusCode === 429 &&
        !error.message.includes('fixture-key') &&
        error.message.includes('Gemini')
    );
    settings.apiKey = 'fixture-invalid-key';
    stub.mock.mockImplementation(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }),
    }));
    await assert.rejects(() => generate({}, settings), { statusCode: 503 });
    settings.apiKey = 'fixture-max-tokens';
    stub.mock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }),
    }));
    await assert.rejects(() => generate({}, settings), { statusCode: 502 });
    stub.mock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
    }));
    await assert.rejects(() => generate({}, settings), { statusCode: 502 });
    stub.mock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ embeddings: [{ values: [1, 'bad'] }] }),
    }));
    await assert.rejects(() => embed(['a'], settings), { statusCode: 502 });
  } finally {
    stub.mock.restore();
  }
});

test('Gemini retries transient unavailability but respects long Retry-After and quota errors', async () => {
  const settings = {
    apiKey: 'fixture-retry-key',
    model: 'fixture-model',
    embeddingModel: 'fixture-embedding',
  };
  let calls = 0;
  const stub = mock.method(global, 'fetch', async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, json: async () => ({ embeddings: [{ values: Array(768).fill(0.1) }] }) };
  });
  try {
    assert.equal((await embed(['test'], settings))[0].length, 768);
    assert.equal(calls, 2);
    calls = 0;
    stub.mock.mockImplementation(async () => {
      calls++;
      return { ok: false, status: 503, headers: { get: () => '120' }, json: async () => ({}) };
    });
    await assert.rejects(() => embed(['test'], settings), { statusCode: 503 });
    assert.equal(calls, 1);
    settings.apiKey = 'fixture-quota-key';
    calls = 0;
    stub.mock.mockImplementation(async () => {
      calls++;
      return { ok: false, status: 429, json: async () => ({}) };
    });
    await assert.rejects(() => embed(['test'], settings), { statusCode: 429 });
    assert.equal(calls, 1);
  } finally {
    stub.mock.restore();
  }
});
