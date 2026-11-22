// Keep one server-authoritative counter across feed, profiles and single-post pages.
export function prependPost(old, post) {
  if (!old?.pages?.length) return old;
  return {
    ...old,
    pages: old.pages.map((page, index) => ({
      ...page,
      data:
        index === 0
          ? [post, ...page.data.filter((item) => item._id !== post._id)]
          : page.data.filter((item) => item._id !== post._id),
    })),
  };
}
export function withShareCount(old, postId, count) {
  if (!old || !Number.isFinite(count)) return old;
  const patch = (post) => {
    if (!post) return post;
    if (post._id === postId) return { ...post, sharesCount: count };
    if (post.sharedID?._id === postId)
      return { ...post, sharedID: { ...post.sharedID, sharesCount: count } };
    return post;
  };
  if (old.pages)
    return { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map(patch) })) };
  if (old.data?.post) return { ...old, data: { ...old.data, post: patch(old.data.post) } };
  return old;
}
export function syncSharedPostCount(client, newPost) {
  const original = newPost?.type === 'share' ? newPost.sharedID : null;
  if (!original?._id || !Number.isFinite(original.sharesCount)) return;
  client.setQueriesData(
    {
      predicate: (query) => ['allPosts', 'getProfilePosts', 'getPost'].includes(query.queryKey[0]),
    },
    (old) => withShareCount(old, original._id, original.sharesCount)
  );
}
