const mongoose = require('mongoose');
const { request } = require('./http');
const catchAsync = require('./catchAsync');

// Public user read model. No email, password, token or authentication methods.
function userProjection() {
  const schema = new mongoose.Schema(
    {
      first_name: String,
      last_name: String,
      username: String,
      photo: String,
      cover: String,
      gender: String,
      confirmed: Boolean,
      verified: Boolean,
      unseenMessages: { type: Number, default: 0 },
      unseenNotification: { type: Number, default: 0 },
    },
    { collection: 'user_projections' }
  );
  return mongoose.models.User || mongoose.model('User', schema);
}

function followProjection() {
  return (
    mongoose.models.Follow ||
    mongoose.model(
      'Follow',
      new mongoose.Schema(
        {
          sender: mongoose.Schema.Types.ObjectId,
          recipient: mongoose.Schema.Types.ObjectId,
        },
        { collection: 'follow_projections' }
      )
    )
  );
}

function projectionSync({ User, Follow }) {
  let inFlight;
  async function sync() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const { users, follows } = await request('accounts', '/internal/projections');
      if (users.length)
        await User.bulkWrite(
          users.map(({ _id, ...fields }) => ({
            updateOne: { filter: { _id }, update: { $set: fields }, upsert: true },
          }))
        );
      await User.deleteMany({ _id: { $nin: users.map((user) => user._id) } });
      if (Follow) {
        if (follows.length)
          await Follow.bulkWrite(
            follows.map(({ _id, ...fields }) => ({
              updateOne: { filter: { _id }, update: { $set: fields }, upsert: true },
            }))
          );
        await Follow.deleteMany({ _id: { $nin: follows.map((follow) => follow._id) } });
      }
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }
  return {
    sync,
    middleware: catchAsync(async (req, res, next) => {
      await sync();
      next();
    }),
  };
}

module.exports = { userProjection, followProjection, projectionSync };
