const assert = require('node:assert/strict');
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  try {
    const owners = {
      accounts: ['users', 'friends', 'follows'],
      content: ['posts', 'comments', 'reactions'],
      messaging: ['chats', 'messages', 'notifications'],
    };
    for (const [domain, names] of Object.entries(owners)) {
      for (const name of names) {
        const original = await client
          .db('backbook')
          .collection(name)
          .find({}, { projection: { _id: 1 } })
          .toArray();
        const preserved = await client
          .db('ptitsocial_' + domain)
          .collection(name)
          .countDocuments({ _id: { $in: original.map((doc) => doc._id) } });
        assert.equal(preserved, original.length, `${domain}/${name}: missing migrated records`);
        console.log(`PASS ${domain}/${name}: ${preserved} legacy IDs preserved`);
      }
    }
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
