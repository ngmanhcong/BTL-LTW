const Message = require('../models/messageModel');
const Chat = require('../models/chatModel');
const mongoose = require('mongoose');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const APIFeatures = require('@ptitsocial/service-kit/apiFeatures');
const User = require('../models/userModel');
const Notification = require('../utils/notification');

const ObjectId = mongoose.Types.ObjectId;
const multer = require('multer');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const mediaDirectory = path.resolve(__dirname, '../../uploads/messages');

const documentExtensions = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.rar',
  '.7z',
]);
const receiveUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);
exports.uploadAttachment = (req, res, next) =>
  receiveUpload(req, res, (error) => {
    if (error)
      return next(
        new AppError(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Tệp không được lớn hơn 25 MB'
            : 'Tệp đính kèm không hợp lệ',
          400
        )
      );
    const images = req.files?.image || [];
    const files = req.files?.file || [];
    if (images.length + files.length > 1) return next(new AppError('Mỗi lần chỉ gửi một tệp', 400));
    req.file = images[0] || files[0];
    if (
      images[0] &&
      (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(images[0].mimetype) ||
        images[0].size > 10 * 1024 * 1024)
    )
      return next(new AppError('Ảnh phải là JPG, PNG, WebP hoặc GIF và không quá 10 MB', 400));
    if (files[0] && !documentExtensions.has(path.extname(files[0].originalname).toLowerCase()))
      return next(
        new AppError('Chỉ hỗ trợ tệp Word, PDF, Excel, PowerPoint, văn bản và tệp nén', 400)
      );
    next();
  });

exports.getAttachment = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.msgId).select('+attachmentFile');
  if (!message?.attachmentFile || !/^[a-f0-9]{24}\.[a-z0-9]+$/.test(message.attachmentFile))
    return next(new AppError('Không tìm thấy tệp', 404));
  const chat = await Chat.findById(message.chat);
  if (!chat || !chat.users.some((id) => id.equals(new ObjectId(req.user.id))))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 403));
  res.set({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': 'application/octet-stream',
  });
  res.download(path.join(mediaDirectory, message.attachmentFile), message.attachment.name);
});

exports.getImage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.msgId).select('+imageFile +attachmentFile');
  if (!message?.imageFile || !/^[a-f0-9]{24}\.webp$/.test(message.imageFile))
    return next(new AppError('Không tìm thấy ảnh', 404));
  const chat = await Chat.findById(message.chat);
  if (!chat || !chat.users.some((id) => id.equals(new ObjectId(req.user.id))))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 403));
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(path.join(mediaDirectory, message.imageFile));
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  let { content, type } = req.body;
  let caption = req.body.caption;
  const { replyMessageId, forwardMessageId } = req.body;
  const userId = req.user.id;
  const { chatId } = req.params;

  const existingChat = await Chat.findById(chatId);

  if (!existingChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  const targetId = new ObjectId(userId);
  if (!existingChat.users.some((id) => id.equals(targetId)))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 400));

  if (replyMessageId && forwardMessageId)
    return next(new AppError('Không thể vừa trả lời vừa chuyển tiếp một tin nhắn', 400));
  let replyTo;
  let imageFile;
  let attachmentFile;
  let attachment;
  const messageId = new ObjectId();
  if (replyMessageId || forwardMessageId) {
    const sourceId = replyMessageId || forwardMessageId;
    if (typeof sourceId !== 'string' || !/^[a-f0-9]{24}$/i.test(sourceId))
      return next(new AppError('Tin nhắn không hợp lệ', 400));
    const source = await Message.findById(sourceId).select('+imageFile +attachmentFile');
    if (!source || !['text', 'image', 'file', 'like'].includes(source.type))
      return next(new AppError('Không tìm thấy tin nhắn', 404));
    if (replyMessageId) {
      if (String(source.chat) !== String(existingChat._id))
        return next(new AppError('Chỉ có thể trả lời tin nhắn trong cuộc trò chuyện này', 400));
      replyTo = {
        messageId: source._id,
        sender: {
          id: source.sender?._id,
          first_name: source.sender?.first_name || 'Người dùng',
          last_name: source.sender?.last_name || '',
        },
        type: source.type,
        content: source.content,
        attachmentName: source.attachment?.name,
      };
    } else {
      const sourceChat = await Chat.findById(source.chat);
      if (!sourceChat || !sourceChat.users.some((id) => id.equals(targetId)))
        return next(new AppError('Bạn không có quyền chuyển tiếp tin nhắn này', 403));
      // Copy only the message itself, never the source conversation or reply history.
      content = source.content;
      type = source.type;
      imageFile = source.imageFile;
      attachmentFile = source.attachmentFile;
      attachment = source.attachment;
      caption = source.caption;
    }
  }
  // Theme changes and group renames send an informational message to the chat.
  if (!['text', 'image', 'file', 'like', 'info'].includes(type))
    return next(new AppError('Loại tin nhắn không hợp lệ', 400));
  if (type === 'like') content = 'like';
  if (caption !== undefined && (typeof caption !== 'string' || caption.length > 400))
    return next(new AppError('Chú thích không được quá 400 ký tự', 400));
  if (req.file) {
    if (
      !['image', 'file'].includes(type) ||
      forwardMessageId ||
      (type === 'image' && req.file.fieldname !== 'image') ||
      (type === 'file' && req.file.fieldname !== 'file')
    )
      return next(new AppError('Yêu cầu gửi tệp không hợp lệ', 400));
    let buffer;
    if (type === 'file') {
      const extension = path.extname(req.file.originalname).toLowerCase();
      const bytes = req.file.buffer;
      const zip = bytes.subarray(0, 2).toString() === 'PK';
      const ole = bytes.subarray(0, 4).toString('hex') === 'd0cf11e0';
      if (
        (extension === '.pdf' && !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) ||
        (['.docx', '.xlsx', '.pptx'].includes(extension) && !zip) ||
        (['.doc', '.xls', '.ppt'].includes(extension) && !ole)
      )
        return next(new AppError('Nội dung tệp không đúng định dạng đã chọn', 400));
      attachmentFile = `${messageId}${extension}`;
      const decodedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const originalName = decodedName.includes('\uFFFD') ? req.file.originalname : decodedName;
      attachment = {
        name: path
          .basename(originalName)
          .replace(/[\x00-\x1f]/g, '')
          .slice(0, 200),
        size: req.file.size,
        mimeType: req.file.mimetype,
      };
      await fs.mkdir(mediaDirectory, { recursive: true });
      await fs.writeFile(path.join(mediaDirectory, attachmentFile), bytes);
    } else {
      try {
        buffer = await sharp(req.file.buffer, { limitInputPixels: 25000000 })
          .rotate()
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        return next(new AppError('Ảnh không hợp lệ hoặc kích thước quá lớn', 400));
      }
      imageFile = `${messageId}.webp`;
      await fs.mkdir(mediaDirectory, { recursive: true });
      await fs.writeFile(path.join(mediaDirectory, imageFile), buffer);
    }
  }
  if (type === 'file') {
    if (!attachmentFile) return next(new AppError('Hãy chọn tệp để gửi', 400));
    content = `${process.env.BACKEND_URL}/api/v1/messages/files/${messageId}`;
  }
  if (type === 'image') {
    if (!imageFile && !forwardMessageId) return next(new AppError('Hãy chọn ảnh để gửi', 400));
    if (imageFile) content = `${process.env.BACKEND_URL}/api/v1/messages/media/${messageId}`;
  }
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 400)
    return next(new AppError('Tin nhắn phải có từ 1 đến 400 ký tự', 400));

  const newMessage = await Message.create({
    _id: messageId,
    type,
    sender: userId,
    content: content,
    chat: chatId,
    imageFile,
    attachmentFile,
    attachment,
    caption: ['image', 'file'].includes(type) ? caption : undefined,
    replyTo,
    forwarded: Boolean(forwardMessageId),
  });

  await newMessage.populate({
    path: 'sender',
    select: 'first_name last_name photo username confirmed',
  });
  newMessage.imageFile = undefined;
  newMessage.attachmentFile = undefined;

  const filteredChat = existingChat;
  filteredChat.users = filteredChat.users.filter((user) => {
    return user._id.toString() !== userId;
  });

  await Promise.all(
    filteredChat.users.map(async (user) => {
      const recipient = await User.findById(user._id.toString()).select('fcmToken username');
      await new Notification({
        recipient: recipient,
        sender: req.user,
        postId: existingChat._id,
        postReact:
          newMessage.type === 'file'
            ? 'Đã gửi một tệp'
            : newMessage.type === 'image'
              ? 'Đã gửi một ảnh'
              : newMessage.content.slice(0, 10),
      }).sendMessage();
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      message: newMessage,
      unseenMessages: (await User.findById(userId)).unseenMessages,
    },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { page } = req.query;
  const existingChat = await Chat.findById(chatId);

  if (!existingChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  const targetId = new ObjectId(userId);
  if (!existingChat.users.some((id) => id.equals(targetId)))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 400));

  let filter = {
    chat: chatId,
  };
  const features = new APIFeatures(
    Message.find(filter).populate({
      path: 'sender seenBy',
      select: 'first_name last_name photo username gender confirmed',
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  features.query.and([{ chat: chatId }]);
  const messages = await features.query;

  const filteredChat = existingChat;
  filteredChat.users = filteredChat.users.filter((user) => {
    return user._id.toString() !== userId;
  });
  if (filteredChat.type === 'private') {
    filteredChat.photo = filteredChat.users[0].photo;
    filteredChat.chatName = `${filteredChat.users[0].first_name} ${filteredChat.users[0].last_name}`;
  } else if (!filteredChat.photo) {
    filteredChat.photo =
      'https://res.cloudinary.com/dcu2kxr5x/image/upload/v1675105115/BACKBOOK/assets/group_fu7eoo.png';
  }

  res.status(200).json({
    status: 'success',
    length: messages.length,
    data: {
      chat: page == 1 ? existingChat : null,
      messages,
    },
  });
});

exports.seenMessage = catchAsync(async (req, res, next) => {
  const { msgId } = req.params;
  const userId = req.user.id;

  if (!/^[a-f0-9]{24}$/i.test(msgId)) return next(new AppError('Mã tin nhắn không hợp lệ', 400));

  const existingMessage = await Message.findById(msgId);

  if (!existingMessage) return next(new AppError('Không tìm thấy tin nhắn', 404));

  const chat = await Chat.findById(existingMessage.chat);
  if (!chat || !chat.users.some((user) => String(user._id) === userId))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 403));

  // Atomic additions preserve receipts from simultaneous readers in a group.
  await Message.updateOne({ _id: msgId }, { $addToSet: { seenBy: userId } }, { timestamps: false });
  const recipients = chat.users
    .filter((user) => !user._id.equals(existingMessage.sender._id))
    .map((user) => user._id);
  await Message.updateOne(
    { _id: msgId, seenBy: { $all: recipients } },
    { $set: { seen: 'seen' } },
    { timestamps: false }
  );
  const message = await Message.findById(msgId);
  const [unseenMessages] = await Message.recalculateUnread([userId]);

  res.status(200).json({
    status: 'success',
    data: {
      message,
      unseenMessages,
    },
  });
});
