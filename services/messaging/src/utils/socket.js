const { Server } = require('socket.io');
const { authenticate } = require('@ptitsocial/service-kit/auth');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
let io;
const online = new Map();

async function member(chatId, userId) {
  if (!/^[a-f0-9]{24}$/i.test(String(chatId))) return null;
  const chat = await Chat.findById(chatId);
  return chat?.users.some((user) => String(user._id) === userId) ? chat : null;
}

function init(server, options) {
  io = new Server(server, options);
  io.use(async (socket, next) => {
    try {
      const cookie = (socket.handshake.headers.cookie || '')
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith('jwt='));
      const account = await authenticate(
        socket.handshake.auth?.token || (cookie && decodeURIComponent(cookie.slice(4)))
      );
      if (!account.verified) return next(new Error('Vui lòng xác minh tài khoản'));
      const { id, username, first_name, last_name, photo } = account;
      socket.account = { id, username, first_name, last_name, photo };
      next();
    } catch {
      next(new Error('Xác thực thất bại'));
    }
  });
  io.on('connection', (socket) => {
    const info = socket.account;
    socket.join(`user:${info.id}`);
    socket.emit('connected');
    const on = (event, handler) =>
      socket.on(event, async (payload = {}) => {
        try {
          await handler(payload);
        } catch (error) {
          console.warn(`Socket ${event}: ${error.message}`);
        }
      });
    on('setup', () => {
      socket.emit('online_user', {
        type: 'connect',
        info: [...online.values()].map((entry) => entry.info),
      });
      const entry = online.get(info.id) || { info, sockets: new Set() };
      const wasOnline = entry.sockets.size > 0;
      entry.sockets.add(socket.id);
      online.set(info.id, entry);
      if (!wasOnline) socket.broadcast.emit('online_user', { type: 'add', info });
    });
    on('join_room', async (room) => {
      if (await member(room, info.id)) socket.join(String(room));
    });
    on('typing', async ({ room, status }) => {
      if (await member(room, info.id))
        socket.to(String(room)).emit('typing', { room, status: Boolean(status) });
    });
    on('new_message', async ({ message }) => {
      if (!message?._id || !/^[a-f0-9]{24}$/i.test(String(message._id))) return;
      const stored = await Message.findById(message._id);
      if (!stored || String(stored.sender._id) !== info.id) return;
      const chat = await member(String(stored.chat), info.id);
      if (!chat) return;
      for (const user of chat.users) {
        if (String(user._id) !== info.id) {
          const recipient = await User.findById(user._id).select('unseenMessages');
          io.to(`user:${user._id}`).emit('message_recieved', stored, {
            unseenMessages: recipient?.unseenMessages || 0,
          });
        }
      }
    });
    on('seen', async ({ message, chat }) => {
      const stored = await member(chat?._id, info.id);
      if (!stored) return;
      const saved = await Message.findOne({ _id: message?._id, chat: stored._id });
      if (!saved || !saved.seenBy.some((user) => String(user) === info.id)) return;
      for (const user of stored.users)
        if (String(user._id) !== info.id)
          io.to(`user:${user._id}`).emit('seen', { message: saved, chat: stored });
    });
    on('customize_chat', async ({ type, chat }) => {
      const stored = await member(chat?._id, info.id);
      if (!stored || !['theme', 'name'].includes(type)) return;
      const content = type === 'theme' ? stored.theme : stored.chatName;
      for (const user of stored.users)
        if (String(user._id) !== info.id)
          io.to(`user:${user._id}`).emit('customize_chat', { type, content, chat: stored._id });
    });
    socket.on('disconnect', () => {
      const entry = online.get(info.id);
      if (!entry) return;
      entry.sockets.delete(socket.id);
      if (!entry.sockets.size) {
        online.delete(info.id);
        socket.broadcast.emit('online_user', { type: 'remove', info });
      }
    });
  });
  return io;
}
module.exports = { init, getIO: () => io };
