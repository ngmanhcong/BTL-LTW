const crypto = require('node:crypto');

function configuredKeys(settings) {
  const keys =
    Array.isArray(settings.apiKeys) && settings.apiKeys.length
      ? settings.apiKeys
      : [settings.apiKey];
  return [
    ...new Set(
      keys
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
}
function retryDelay(response, result, now = Date.now()) {
  const raw = response.headers?.get?.('retry-after');
  let ms = 0;
  if (raw) ms = Number.isFinite(Number(raw)) ? Number(raw) * 1000 : Date.parse(raw) - now;
  for (const item of result?.error?.details || []) {
    if (typeof item.retryDelay === 'string' && /^\d+(?:\.\d+)?s$/.test(item.retryDelay))
      ms = Math.max(ms || 0, Number(item.retryDelay.slice(0, -1)) * 1000);
  }
  return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}
function nextPacificMidnight(now) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const parts = (at) =>
    Object.fromEntries(
      formatter
        .formatToParts(new Date(at))
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, Number(p.value)])
    );
  const offset = (at) => {
    const p = parts(at);
    return (
      Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
      Math.floor(at / 1000) * 1000
    );
  };
  const p = parts(now),
    wall = Date.UTC(p.year, p.month - 1, p.day + 1);
  const guess = wall - offset(now);
  return wall - offset(guess);
}
function quotaCooldown(response, result, now = Date.now()) {
  const daily = (result?.error?.details || []).some((item) =>
    (item.violations || []).some((v) =>
      /perday|per_day|\/day/i.test(`${v.quotaId || ''} ${v.quotaMetric || ''}`)
    )
  );
  return Math.max(
    retryDelay(response, result, now),
    daily ? nextPacificMidnight(now) - now : 60000
  );
}
class KeyPool {
  constructor(size, now = Date.now) {
    this.size = size;
    this.active = 0;
    this.blocks = new Map();
    this.now = now;
  }
  block(index, scope, duration, code) {
    this.blocks.set(`${index}:${scope}`, { until: this.now() + Math.max(1000, duration), code });
    this.active = (index + 1) % this.size;
  }
  unavailable(index, scope) {
    for (const key of [`${index}:*`, `${index}:${scope}`]) {
      const value = this.blocks.get(key);
      if (value?.until > this.now()) return value;
      if (value) this.blocks.delete(key);
    }
    return null;
  }
  candidates(scope) {
    return Array.from({ length: this.size }, (_, n) => (this.active + n) % this.size).filter(
      (index) => !this.unavailable(index, scope)
    );
  }
  accept(index, scope) {
    if (!this.unavailable(index, scope)) this.active = index;
  }
  errorCode(scope) {
    const blocked = Array.from({ length: this.size }, (_, i) => this.unavailable(i, scope));
    return blocked.some((item) => item?.code === 429) ? 429 : 503;
  }
}
const pools = new Map();
function poolFor(keys) {
  // Pool identifiers contain only hashes. Credentials never appear in logs,
  // errors, responses, or persistent cooldown state.
  const id = crypto.createHash('sha256').update(JSON.stringify(keys)).digest('hex');
  if (!pools.has(id)) {
    if (pools.size >= 10) pools.delete(pools.keys().next().value);
    pools.set(id, new KeyPool(keys.length));
  }
  return pools.get(id);
}
module.exports = {
  configuredKeys,
  retryDelay,
  nextPacificMidnight,
  quotaCooldown,
  KeyPool,
  poolFor,
};
