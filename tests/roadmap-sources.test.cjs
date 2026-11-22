const { test } = require('node:test');
const assert = require('node:assert/strict');
const roadmaps = require('../services/learning/src/roadmaps');
const catalog = require('../services/learning/src/catalog');
const topics = (slug) =>
  roadmaps.find((roadmap) => roadmap.id === slug).stages.flatMap((stage) => stage.topics);
const topic = (slug, title) => topics(slug).find((item) => item.title === title);

test('all six roadmaps retain source topics and diagram positions, not a fixed invented curriculum', () => {
  assert.deepEqual(
    roadmaps.map((item) => item.id),
    ['ai-engineer', 'cyber-security', 'machine-learning', 'python', 'sql', 'cpp']
  );
  const counts = [];
  for (const roadmap of roadmaps) {
    const all = topics(roadmap.id);
    counts.push(all.length);
    assert.equal(roadmap.reference, `https://roadmap.sh/${roadmap.id}`);
    assert.equal(roadmap.source.url, roadmap.reference);
    assert.match(roadmap.source.commit, /^[a-f0-9]{40}$/);
    assert(all.length > 50);
    const nodes = roadmap.graph.nodes.filter((node) => ['topic', 'subtopic'].includes(node.type));
    assert.equal(nodes.length, all.length);
    assert.equal(new Set(all.map((item) => item.id)).size, all.length);
    for (const item of all) {
      assert.equal(item.id, `rs-${item.sourceId}`);
      assert(nodes.some((node) => node.id === item.sourceId));
      assert.equal(item.resources[0].kind, 'source');
      assert.equal(item.resources[0].url, item.sourceUrl);
      for (const resource of item.resources)
        assert(['https:', 'http:'].includes(new URL(resource.url).protocol));
    }
    for (const node of roadmap.graph.nodes)
      for (const key of ['x', 'y', 'width', 'height']) assert(Number.isFinite(node[key]));
  }
  assert(new Set(counts).size > 1);
});

test('cyber security foundation and OS links do not inherit OWASP from web attack topics', () => {
  const foundation = topic('cyber-security', 'Fundamental IT Skills');
  const os = topic('cyber-security', 'Operating Systems');
  const networking = topic('cyber-security', 'Networking Knowledge');
  const web = topic('cyber-security', 'Web Based Attacks and OWASP10');
  assert(foundation && os && networking && web);
  for (const item of [foundation, os, networking]) {
    assert(!item.resources.some((resource) => /owasp/i.test(resource.url)));
  }
  assert(
    os.resources.some(
      (resource) => resource.url === 'https://www.ibm.com/think/topics/operating-systems'
    )
  );
  assert(
    web.resources.some((resource) => resource.url === 'https://owasp.org/www-project-top-ten/')
  );
  assert.match(foundation.sourceUrl, /fundamental-it-skills@/);
  assert.match(os.sourceUrl, /operating-systems@/);
});

test('Python, SQL, C++, ML and AI have their own source-specific advanced topics and references', () => {
  for (const [slug, title, file] of [
    ['python', 'Decorators', 'decorators@'],
    ['sql', 'Transactions', 'transactions@'],
    ['cpp', 'Templates', 'templates@'],
    ['machine-learning', 'Linear Algebra', 'linear-algebra@'],
    ['ai-engineer', 'Model Context Protocol (MCP)', 'model-context-protocol'],
  ]) {
    const item = topic(slug, title);
    assert(item, `${slug}: ${title}`);
    assert(item.sourceUrl.includes(`/roadmaps/${slug}/content/`));
    assert(item.sourceUrl.includes(file), item.sourceUrl);
    assert(item.resources.length > 1, `${title} has topic-specific study links`);
  }
  const wiki = topic('cpp', 'Argument Dependent Lookup (ADL)');
  if (wiki)
    for (const resource of wiki.resources)
      assert.equal(
        (resource.url.match(/\(/g) || []).length,
        (resource.url.match(/\)/g) || []).length
      );
});

test('semantic catalog splits large outlines into bounded, source-attributed embedding inputs', () => {
  const sources = catalog.filter((item) => item.id.startsWith('roadmap-sh-'));
  assert(sources.length > 60);
  assert(sources.every((item) => item.description.length < 3000));
  for (const roadmap of roadmaps)
    assert(sources.some((item) => item.topic === roadmap.id && item.url === roadmap.reference));
});
