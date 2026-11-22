import { QueryClient } from '@tanstack/react-query';
import { prependPost, withShareCount, syncSharedPostCount } from './postCache';

test('server share count updates feed, both profiles and single post without changing the share wrapper count', () => {
  const client = new QueryClient();
  const original = { _id: 'original', sharesCount: 0 },
    share = {
      _id: 'share',
      type: 'share',
      sharesCount: 0,
      sharedID: { ...original, sharesCount: 1 },
    };
  const page = { pages: [{ data: [original, share] }], pageParams: [1] };
  client.setQueryData(['allPosts'], page);
  client.setQueryData(['getProfilePosts', 'author'], page);
  client.setQueryData(['getProfilePosts', 'viewer'], page);
  client.setQueryData(['getPost', 'original'], { data: { post: original } });
  syncSharedPostCount(client, share);
  for (const key of [['allPosts'], ['getProfilePosts', 'author'], ['getProfilePosts', 'viewer']]) {
    const posts = client.getQueryData(key).pages[0].data;
    expect(posts[0].sharesCount).toBe(1);
    expect(posts[1].sharesCount).toBe(0);
    expect(posts[1].sharedID.sharesCount).toBe(1);
  }
  expect(client.getQueryData(['getPost', 'original']).data.post.sharesCount).toBe(1);
  expect(original.sharesCount).toBe(0);
});

test('creating a post preserves pagination and prepends exactly one immutable record', () => {
  const old = {
    pages: [{ data: [{ _id: 'a' }] }, { data: [{ _id: 'share' }, { _id: 'b' }] }],
    pageParams: [1, 2],
  };
  const next = prependPost(old, { _id: 'share' });
  expect(next.pages.map((page) => page.data.map((post) => post._id))).toEqual([
    ['share', 'a'],
    ['b'],
  ]);
  expect(old.pages[1].data).toHaveLength(2);
  expect(next.pageParams).toEqual([1, 2]);
  expect(prependPost(undefined, { _id: 'share' })).toBeUndefined();
});

test('invalid or missing counter cannot replace a saved counter; server zero is accepted', () => {
  const old = { data: { post: { _id: 'a', sharesCount: 4 } } };
  expect(withShareCount(old, 'a', undefined)).toBe(old);
  expect(withShareCount(old, 'a', 0).data.post.sharesCount).toBe(0);
});
