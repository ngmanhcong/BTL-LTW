const AppError = require('@ptitsocial/service-kit/appError');
const { request } = require('@ptitsocial/service-kit/http');

async function friendIdsFor(userId) {
  return (await request('accounts', `/internal/friends/${userId}`)).friendIds;
}

function visibilityFilter(userId, friendIds = []) {
  return {
    $or: [
      { audience: 'public' },
      { audience: { $exists: false } },
      { user: userId },
      { audience: 'friends', user: { $in: friendIds } },
      { audience: 'selected', allowedViewers: userId, user: { $in: friendIds } },
    ],
  };
}

function canView(post, userId, friendIds = []) {
  if (!post || post.deleted) return false;
  const author = String(post.user?._id || post.user);
  if (!post.audience || post.audience === 'public' || author === String(userId)) return true;
  const isFriend = friendIds.some((id) => String(id) === author);
  if (post.audience === 'friends') return isFriend;
  return (
    post.audience === 'selected' &&
    isFriend &&
    post.allowedViewers?.some((id) => String(id) === String(userId))
  );
}

function assertView(post, userId, friendIds = []) {
  if (!canView(post, userId, friendIds)) throw new AppError('Không tìm thấy bài viết', 404);
  return post;
}

function parseAudience(body, userId) {
  const audience = body.audience === undefined ? 'public' : body.audience;
  if (!['public', 'friends', 'selected'].includes(audience))
    throw new AppError('Chế độ người xem không hợp lệ', 400);
  let viewers = body.allowedViewers || [];
  if (typeof viewers === 'string') {
    try {
      viewers = JSON.parse(viewers);
    } catch {
      throw new AppError('Danh sách người xem không hợp lệ', 400);
    }
  }
  if (
    !Array.isArray(viewers) ||
    viewers.length > 100 ||
    viewers.some((id) => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id))
  )
    throw new AppError('Danh sách người xem không hợp lệ (tối đa 100 người)', 400);
  const allowedViewers = [...new Set(viewers.map((id) => id.toLowerCase()))].filter(
    (id) => id !== String(userId).toLowerCase()
  );
  if (audience === 'selected' && !allowedViewers.length)
    throw new AppError('Hãy chọn ít nhất một người xem', 400);
  return { audience, allowedViewers: audience === 'selected' ? allowedViewers : [] };
}

module.exports = { visibilityFilter, canView, assertView, parseAudience, friendIdsFor };
