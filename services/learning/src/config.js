const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

// Reload the private key file so local setup does not require restarting the app.
function config() {
  const file = path.resolve(__dirname, '../.env');
  const local =
    process.env.NODE_ENV !== 'test' && fs.existsSync(file)
      ? dotenv.parse(fs.readFileSync(file))
      : {};
  const raw = local.GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || '';
  const apiKeys = [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((key) => key.trim())
        .filter(Boolean)
    ),
  ];
  if (!apiKeys.length) {
    const legacy = (local.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (legacy) apiKeys.push(legacy);
  }
  return {
    apiKeys,
    apiKey: apiKeys[0] || '',
    model: local.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    embeddingModel:
      local.GEMINI_EMBEDDING_MODEL || process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    dailyLimit: Math.max(
      1,
      Math.min(100, Number(local.AI_DAILY_LIMIT || process.env.AI_DAILY_LIMIT) || 30)
    ),
  };
}
module.exports = { config };
