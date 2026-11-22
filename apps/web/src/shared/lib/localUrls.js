// Keep stored media usable when switching between localhost and configured LAN origins.
export function normalizeLocalUrls(
  value,
  backend = process.env.REACT_APP_BACKEND_URL,
  frontend = window.location.origin
) {
  if (typeof value === 'string') {
    const previousOrigins = (process.env.REACT_APP_PREVIOUS_LOCAL_ORIGINS || '').split(',');
    if (previousOrigins.some((origin) => origin && value.startsWith(`${origin}/`))) {
      const url = new URL(value);
      if (backend && /^\/(uploads\/|api\/v1\/messages\/(media|files)\/)/.test(url.pathname))
        return backend.replace(/\/$/, '') + url.pathname + url.search + url.hash;
      if (url.pathname.startsWith('/images/'))
        return frontend + url.pathname + url.search + url.hash;
    }
    if (
      backend &&
      /^http:\/\/(localhost|127\.0\.0\.1):8000\/(uploads\/|api\/v1\/messages\/(media|files)\/)/.test(
        value
      )
    )
      return value.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, backend.replace(/\/$/, ''));
    if (/^http:\/\/(localhost|127\.0\.0\.1):3000\/images\//.test(value))
      return value.replace(/^http:\/\/(localhost|127\.0\.0\.1):3000/, frontend);
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => normalizeLocalUrls(item, backend, frontend));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value))
      value[key] = normalizeLocalUrls(value[key], backend, frontend);
  }
  return value;
}
