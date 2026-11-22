const crypto = require('node:crypto');
const catalog = require('./catalog');
const { EmbeddingIndex } = require('./models');
const provider = require('./provider');
const AppError = require('@ptitsocial/service-kit/appError');
const indexing = new Map();

function cosine(a, b) {
  if (!a?.length || a.length !== b?.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
function rank(query, vectors, count = 8) {
  return catalog
    .map((item, i) => ({ ...item, score: cosine(query, vectors[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
async function retrieve(query, settings) {
  const texts = catalog.map(
    (item) =>
      `${item.title}. ${item.topic}. ${item.level}. ${item.description} Bài tập: ${item.practice}`
  );
  const key = crypto
    .createHash('sha256')
    .update('gemini:768:RETRIEVAL_DOCUMENT:' + settings.embeddingModel + JSON.stringify(texts))
    .digest('hex');
  let stored = await EmbeddingIndex.findOne({ key }).lean();
  if (!stored) {
    if (!indexing.has(key)) {
      indexing.set(
        key,
        (async () => {
          const vectors = await provider.embed(texts, settings, 'RETRIEVAL_DOCUMENT');
          return EmbeddingIndex.findOneAndUpdate(
            { key },
            { $setOnInsert: { key, vectors } },
            { upsert: true, new: true }
          ).lean();
        })().finally(() => indexing.delete(key))
      );
    }
    stored = await indexing.get(key);
  }
  const [vector] = await provider.embed([query], settings, 'RETRIEVAL_QUERY');
  if (
    !provider.validVectors(stored.vectors, catalog.length) ||
    stored.vectors[0].length !== vector.length
  )
    throw new AppError('Chỉ mục tìm kiếm chưa phù hợp với mô hình hiện tại.', 502);
  return rank(vector, stored.vectors);
}
module.exports = { cosine, rank, retrieve };
