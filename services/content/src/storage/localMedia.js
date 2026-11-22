const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../uploads');

function safePath(folder) {
  const target = path.resolve(root, folder);
  if (!target.startsWith(root + path.sep)) throw new Error('Đường dẫn tệp không hợp lệ');
  return target;
}

exports.upload = async (buffer, folder) => {
  const target = safePath(folder);
  await fs.mkdir(target, { recursive: true });
  const id = crypto.randomUUID();
  const filename = `${id}.webp`;
  await fs.writeFile(path.join(target, filename), buffer);
  const url = `${process.env.BACKEND_URL}/uploads/${folder.replace(/\/$/, '')}/${filename}`;
  return { url, secure_url: url, asset_id: id };
};

exports.list = async (pattern, max, sort) => {
  const folder = pattern.replace(/\*$/, '').replace(/\/$/, '');
  const resources = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch((err) => {
      if (err.code === 'ENOENT') return [];
      throw err;
    });
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.webp')) {
        const relative = path.relative(root, full).split(path.sep).join('/');
        resources.push({
          secure_url: `${process.env.BACKEND_URL}/uploads/${relative}`,
          asset_id: path.parse(entry.name).name,
          folder: path.posix.dirname(relative),
          created_at: (await fs.stat(full)).mtime.toISOString(),
        });
      }
    }
  }
  await walk(safePath(folder));
  resources.sort((a, b) =>
    sort === 'asc'
      ? a.created_at.localeCompare(b.created_at)
      : b.created_at.localeCompare(a.created_at)
  );
  return { total_count: resources.length, resources: resources.slice(0, max) };
};
