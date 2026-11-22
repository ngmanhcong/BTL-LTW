const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  try {
    const source = client.db('backbook');
    const migrations = {
      accounts: ['users', 'friends', 'follows'],
      content: ['posts', 'comments', 'reactions'],
      messaging: ['chats', 'messages', 'notifications'],
    };
    const backupDir = path.resolve(__dirname, '../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = {};
    for (const [domain, collections] of Object.entries(migrations)) {
      const target = client.db('ptitsocial_' + domain);
      for (const name of collections) {
        const docs = await source.collection(name).find().toArray();
        backup[name] = docs;
        // Insert missing legacy records only; never overwrite newer service data.
        if (docs.length)
          await target.collection(name).bulkWrite(
            docs.map((doc) => ({
              updateOne: {
                filter: { _id: doc._id },
                update: { $setOnInsert: doc },
                upsert: true,
              },
            }))
          );
        console.log(
          `${domain}/${name}: ${docs.length} source records; target ${await target.collection(name).countDocuments()}`
        );
      }
    }
    const backupFile = path.join(
      backupDir,
      'legacy-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
    );
    fs.writeFileSync(backupFile, EJSON.stringify(backup));
    const users = await source.collection('users').find().toArray();
    const fields = [
      '_id',
      'first_name',
      'last_name',
      'username',
      'photo',
      'cover',
      'gender',
      'confirmed',
      'verified',
    ];
    for (const domain of ['content', 'messaging']) {
      const target = client.db('ptitsocial_' + domain);
      if (users.length)
        await target.collection('user_projections').bulkWrite(
          users.map((user) => {
            const profile = Object.fromEntries(
              fields.filter((key) => user[key] !== undefined).map((key) => [key, user[key]])
            );
            if (domain === 'messaging') {
              profile.unseenMessages = user.unseenMessages || 0;
              profile.unseenNotification = user.unseenNotification || 0;
            }
            return {
              updateOne: {
                filter: { _id: user._id },
                update: { $setOnInsert: profile },
                upsert: true,
              },
            };
          })
        );
    }
    const oldUploads = path.resolve(__dirname, '../legacy/backbook-server/uploads');
    const uploads = path.resolve(__dirname, '../services/content/uploads');
    if (fs.existsSync(oldUploads))
      fs.cpSync(oldUploads, uploads, { recursive: true, force: false, errorOnExist: false });
    console.log('Migration complete. Original database unchanged. Backup: ' + backupFile);
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
