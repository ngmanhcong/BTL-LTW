require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const Friend = require('../models/friendsModel');
const Follow = require('../models/followModel');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
require('../models/commentModel');
require('../models/reactionModel');

async function main() {
  await mongoose.connect(process.env.DATABASE);
  const accounts = [
    { email: 'an@example.com', first_name: 'Minh', last_name: 'Anh', username: 'minhanh', gender: 'male' },
    { email: 'binh@example.com', first_name: 'Thanh', last_name: 'Binh', username: 'thanhbinh', gender: 'female' },
  ];
  const users = [];
  for (const account of accounts) {
    let user = await User.findOne({ email: account.email });
    if (!user) user = await User.create({
      ...account, password: 'Backbook@123', passwordConfirm: 'Backbook@123',
      birth_Year: 2003, birth_Month: 1, birth_Day: 15, verified: true,
    });
    await User.updateOne({ _id: user.id }, { username: account.username });
    user.username = account.username;
    users.push(user);
  }
  const [an, binh] = users;
  if (!await Friend.exists({ sender: an.id, recipient: binh.id })) {
    await Friend.create({ sender: an.id, recipient: binh.id, status: 'accepted' });
  }
  for (const [sender, recipient] of [[an, binh], [binh, an]]) {
    if (!await Follow.exists({ sender: sender.id, recipient: recipient.id })) {
      await Follow.create({ sender: sender.id, recipient: recipient.id });
    }
  }
  for (const [i, user] of users.entries()) {
    const text = i === 0
      ? 'Chao moi nguoi! Day la Backbook chay tren localhost. Thu dang bai, tha cam xuc va binh luan nhe.'
      : 'Xin chao! Ban co the tim Thanh Binh va thu tinh nang nhan tin.';
    if (!await Post.exists({ user: user.id, text })) await Post.create({ user: user.id, type: 'normal', text });
  }
  if (!await Chat.exists({ type: 'private', users: { $all: [an.id, binh.id] } })) {
    const chat = await Chat.create({ type: 'private', users: [an.id, binh.id] });
    const message = await Message.create({ sender: binh.id, chat: chat.id, content: 'Chao ban! Cung thu Backbook nhe.', type: 'text' });
    await Chat.updateOne({ _id: chat.id }, { latestMessage: message.id });
  }
  console.log('Local demo ready: an@example.com / binh@example.com - password: Backbook@123');
}
main().catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
