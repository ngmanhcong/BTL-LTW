"""Refresh the six explicitly requested roadmap.sh topic/link snapshots.

Only topic names, diagram geometry and resource references are imported; article
bodies are left at their source. No Gemini calls or runtime network dependency.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import io
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ['ai-engineer', 'cyber-security', 'machine-learning', 'python', 'sql', 'cpp']
REPO = 'nilbuild/developer-roadmap'


def read_url(url):
    with urlopen(Request(url, headers={'User-Agent': 'PTITSocial-roadmap-sync/1.0'}), timeout=90) as response:
        return response.read()


def read_roadmap(html):
    match = re.search(r'streamController.enqueue\(("(?:\\.|[^"\\])*")\)', html)
    if not match:
        raise ValueError('roadmap.sh data format changed; existing snapshot was not overwritten.')
    values = json.loads(json.loads(match.group(1)))
    cache = {}

    def decode(index):
        if index < 0:
            return None
        if index in cache:
            return cache[index]
        value = values[index]
        if isinstance(value, dict):
            result = {}
            cache[index] = result
            for key, child in value.items():
                result[decode(int(key[1:])) if key.startswith('_') else key] = decode(child)
        elif isinstance(value, list):
            result = []
            cache[index] = result
            for child in value:
                result.append(decode(child) if isinstance(child, int) else child)
        else:
            result = value
        cache[index] = result
        return result

    loaders = decode(0)['loaderData']
    return next(value['roadmap'] for value in loaders.values() if isinstance(value, dict) and 'roadmap' in value)


def resource_links(markdown):
    links = []
    for match in re.finditer(r'\[([^\]]+)\]\((https?://)', markdown):
        title = match[1]
        start = match.start(2)
        cursor, depth = start, 1
        while cursor < len(markdown) and depth:
            char = markdown[cursor]
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            cursor += 1
        if depth:
            continue
        url = markdown[start:cursor - 1].split()[0]
        url = url.rstrip('.,')
        if urlparse(url).scheme not in ('http', 'https'):
            continue
        title = re.sub(r'@[^@\s]+@', '', title)
        title = re.sub(r'[*`]', '', title).strip()
        if not title or any(link['url'] == url for link in links):
            continue
        links.append({'title': title, 'url': url, 'kind': 'listed-resource'})
    return links


def build_snapshot(roadmap, markdown_files, commit, fetched_at):
    slug = roadmap['slug']
    if slug not in SLUGS:
        raise ValueError('Unexpected roadmap slug')
    reference = f'https://roadmap.sh/{slug}'
    learning_nodes = [node for node in roadmap['nodes'] if node['type'] in ('topic', 'subtopic') and str(node.get('data', {}).get('label', '')).strip()]
    learning_nodes.sort(key=lambda node: (round(node['position']['y'] / 8), node['position']['x']))
    if len(learning_nodes) < 20:
        raise ValueError(f'{slug}: incomplete source data')
    topics = []
    for node in learning_nodes:
        title = node['data']['label'].strip()
        entry = markdown_files.get(node['id']) or markdown_files.get(node['data'].get('oldId'))
        source_url = f'https://github.com/{REPO}/blob/{commit}/{entry[0]}' if entry else reference
        resources = [{'title': f'Đọc chủ đề gốc: {title}', 'url': source_url, 'kind': 'source'}]
        if entry:
            resources.extend(resource_links(entry[1]))
        topics.append({
            'id': 'rs-' + node['id'], 'sourceId': node['id'], 'title': title,
            'description': f'Chủ đề “{title}” trong {roadmap["title"]}. Đọc phần giải thích gốc và các tài liệu được liệt kê riêng cho chủ đề này ở bên dưới.',
            'sourceUrl': source_url, 'reference': reference, 'resources': resources,
            'sourceType': node['type'],
        })
    wanted = {node['id'] for node in learning_nodes}
    layout = []
    for node in roadmap['nodes']:
        if node['id'] not in wanted and node['type'] not in ('label', 'vertical', 'horizontal', 'section'):
            continue
        if node['type'] == 'label' and not str(node.get('data', {}).get('label', '')).strip():
            continue
        layout.append({
            'id': node['id'], 'type': node['type'],
            'x': round(node['position']['x'], 2), 'y': round(node['position']['y'], 2),
            'width': round(node.get('measured', {}).get('width') or node.get('width') or 200, 2),
            'height': round(node.get('measured', {}).get('height') or node.get('height') or 45, 2),
            **({'label': node.get('data', {}).get('label', '')} if node['type'] == 'label' else {}),
        })
    return {
        'id': slug, 'sourceTitle': roadmap['title'], 'reference': reference,
        'source': {'publisher': 'roadmap.sh', 'url': reference, 'contentRepository': f'https://github.com/{REPO}', 'commit': commit, 'fetchedAt': fetched_at, 'updatedAt': roadmap.get('updatedAt'), 'licenseUrl': f'https://github.com/{REPO}/blob/{commit}/license'},
        'stages': [{'id': 'roadmap-sh-topics', 'title': 'Các chủ đề theo sơ đồ gốc', 'topics': topics}],
        'graph': {'nodes': layout, 'edges': [{'source': e['source'], 'target': e['target'], 'dashed': e.get('data', {}).get('edgeStyle') == 'dashed', 'sourceHandle': e.get('sourceHandle'), 'targetHandle': e.get('targetHandle')} for e in roadmap['edges']]},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cached', action='store_true', help='Use already downloaded source files in .local-logs')
    args = parser.parse_args()
    logs = ROOT / '.local-logs'
    logs.mkdir(exist_ok=True)
    if args.cached:
        commit = (logs / 'roadmap-source-ref.txt').read_text().strip()
        archive = (logs / 'roadmap-source.zip').read_bytes()
    else:
        commit = json.loads(read_url(f'https://api.github.com/repos/{REPO}/commits/master'))['sha']
        archive = read_url(f'https://codeload.github.com/{REPO}/zip/{commit}')
    zip_source = zipfile.ZipFile(io.BytesIO(archive))
    files = {slug: {} for slug in SLUGS}
    for name in zip_source.namelist():
        match = re.search(r'/roadmaps/([^/]+)/content/([^/]+)@([^/]+)\.md$', name)
        if not match or match[1] not in files:
            continue
        relative = name.split('/', 1)[1]
        files[match[1]][match[3]] = (relative, zip_source.read(name).decode('utf-8'))
    def load(slug):
        if args.cached:
            name = 'roadmap-cyber-decoded.json' if slug == 'cyber-security' else f'roadmap-{slug}-decoded.json'
            return json.loads((logs / name).read_text(encoding='utf-8'))['roadmap']
        return read_roadmap(read_url(f'https://roadmap.sh/{slug}').decode('utf-8'))
    loaded = list(ThreadPoolExecutor(max_workers=4).map(load, SLUGS))
    fetched_at = datetime.now(timezone.utc).isoformat()
    snapshots = [build_snapshot(roadmap, files[roadmap['slug']], commit, fetched_at) for roadmap in loaded]
    target = ROOT / 'services/learning/src/roadmap-data'
    target.mkdir(exist_ok=True)
    for snapshot in snapshots:
        (target / (snapshot['id'] + '.json')).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(snapshot['id'], len(snapshot['stages'][0]['topics']), 'topics;', sum(len(t['resources']) - 1 for t in snapshot['stages'][0]['topics']), 'resource links')

if __name__ == '__main__':
    main()
