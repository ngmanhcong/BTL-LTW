// Keep legacy public URLs stable while routing each domain to its owner.
function targetFor(pathname) {
  if (pathname.startsWith('/internal')) return null;
  if (/^\/api\/v1\/learning(\/|$)/.test(pathname)) return 'learning';
  if (
    pathname.startsWith('/socket.io') ||
    /^\/api\/v1\/(chats|messages)(\/|$)/.test(pathname) ||
    /^\/api\/v1\/users\/notifications(\/|$)/.test(pathname)
  )
    return 'messaging';
  if (
    pathname.startsWith('/uploads/') ||
    /^\/api\/v1\/posts(\/|$)/.test(pathname) ||
    /^\/api\/v1\/users\/getProfile\/[^/]+\/(photos|posts)$/.test(pathname)
  )
    return 'content';
  if (/^\/api\/v1\/(users|friends)(\/|$)/.test(pathname)) return 'accounts';
  return null;
}
module.exports = { targetFor };
