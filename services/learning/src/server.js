require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { createApp, start } = require('@ptitsocial/service-kit/server');
const auth = require('@ptitsocial/service-kit/auth');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const { Session, Usage, RoadmapProgress } = require('./models');
const { config } = require('./config');
const { retrieve } = require('./retrieval');
const { generate } = require('./provider');
const { text, profile, validateReply, serialize } = require('./validation');
const catalog = require('./catalog');
const roadmaps = require('./roadmaps');

const app = createApp('learning');
const router = express.Router();
app.use('/api', auth.protect, auth.requireVerified);
router.param('id', (req, res, next, id) => {
  if (!/^[a-f0-9]{24}$/i.test(id)) return next(new AppError('Mã lộ trình không hợp lệ.', 400));
  next();
});
const generationLimit = rateLimit({
  windowMs: 60000,
  max: 5,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Bạn đang gửi quá nhanh. Hãy đợi một phút rồi thử lại.' },
});

async function reserve(userId, settings) {
  if (!settings.apiKey)
    throw new AppError('Trợ lý đang được thiết lập. Vui lòng thử lại sau.', 503);
  await Usage.init();
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  try {
    const usage = await Usage.findOneAndUpdate(
      { user: userId, day, count: { $lt: settings.dailyLimit } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    if (!usage)
      throw new AppError('Bạn đã dùng hết lượt hỏi hôm nay. Hãy quay lại vào ngày mai.', 429);
  } catch (error) {
    if (error.code === 11000)
      throw new AppError('Bạn đã dùng hết lượt hỏi hôm nay. Hãy quay lại vào ngày mai.', 429);
    throw error;
  }
}

function roadmapProgress(roadmap, saved = {}) {
  const ids = new Set(roadmap.stages.flatMap((stage) => stage.topics.map((topic) => topic.id)));
  return Object.fromEntries(Object.entries(saved).filter(([id]) => ids.has(id)));
}

router.get(
  '/roadmaps',
  catchAsync(async (req, res) => {
    const progress = await RoadmapProgress.find({ user: req.user.id }).lean();
    res.json({
      roadmaps: roadmaps.map(({ stages, graph, ...item }) => ({
        ...item,
        stageCount: stages.length,
        topicCount: stages.reduce((total, stage) => total + stage.topics.length, 0),
        progress: roadmapProgress(
          { stages },
          progress.find((value) => value.roadmap === item.id)?.topics || {}
        ),
      })),
    });
  })
);
router.get(
  '/roadmaps/:slug',
  catchAsync(async (req, res) => {
    const roadmap = roadmaps.find((item) => item.id === req.params.slug);
    if (!roadmap) throw new AppError('Không tìm thấy roadmap.', 404);
    const progress = await RoadmapProgress.findOne({
      user: req.user.id,
      roadmap: roadmap.id,
    }).lean();
    res.json({ roadmap, progress: roadmapProgress(roadmap, progress?.topics || {}) });
  })
);
router.patch(
  '/roadmaps/:slug/topics/:topicId',
  catchAsync(async (req, res) => {
    const roadmap = roadmaps.find((item) => item.id === req.params.slug);
    if (
      !roadmap ||
      !roadmap.stages.some((stage) => stage.topics.some((topic) => topic.id === req.params.topicId))
    )
      throw new AppError('Không tìm thấy chủ đề trong roadmap.', 404);
    if (!['not-started', 'learning', 'done', 'skipped'].includes(req.body.status))
      throw new AppError('Trạng thái học tập không hợp lệ.', 400);
    await RoadmapProgress.init();
    const progress = await RoadmapProgress.findOneAndUpdate(
      { user: req.user.id, roadmap: roadmap.id },
      { $set: { [`topics.${req.params.topicId}`]: req.body.status } },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    res.json({ progress: roadmapProgress(roadmap, progress.topics) });
  })
);

router.get('/status', (req, res) =>
  res.json({
    provider: 'gemini',
    configured: Boolean(config().apiKey),
    sourceCount: catalog.length,
  })
);
router.get(
  '/sessions',
  catchAsync(async (req, res) => {
    const items = await Session.find({ user: req.user.id })
      .sort('-updatedAt')
      .limit(50)
      .select('goal kind profile roadmap.title roadmap.milestones.tasks updatedAt createdAt')
      .lean();
    res.json({ sessions: items.map(serialize) });
  })
);
router.get(
  '/sessions/:id',
  catchAsync(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.user.id });
    if (!session) throw new AppError('Không tìm thấy lộ trình.', 404);
    res.json({ session: serialize(session) });
  })
);
router.post(
  '/sessions',
  generationLimit,
  catchAsync(async (req, res) => {
    const goal = text(req.body.goal, 3, 1500);
    const kind = req.body.kind || 'roadmap';
    if (!['roadmap', 'guide'].includes(kind))
      throw new AppError('Vui lòng chọn Roadmap hoặc Guide.', 400);
    const learner = profile(req.body.profile);
    const settings = config();
    await reserve(req.user.id, settings);
    const resources = await retrieve(goal, settings);
    const result = validateReply(
      await generate(
        { mode: kind === 'guide' ? 'guide' : 'create', goal, learner, resources },
        settings
      ),
      resources,
      learner,
      kind === 'roadmap'
    );
    const session = await Session.create({
      user: req.user.id,
      goal,
      kind,
      ...(kind === 'guide' ? { guide: result.answer } : {}),
      profile: learner,
      roadmap: result.roadmap,
      messages: [
        { role: 'user', content: goal },
        {
          role: 'assistant',
          content: result.answer,
          resourceIds: resources.map((item) => item.id),
        },
      ],
    });
    res.status(201).json({ session: serialize(session) });
  })
);
router.post(
  '/sessions/:id/messages',
  generationLimit,
  catchAsync(async (req, res) => {
    const content = text(req.body.content, 1, 2000);
    const channel = req.body.channel || 'followup';
    if (!['followup', 'khe'].includes(channel))
      throw new AppError('Kênh trò chuyện không hợp lệ.', 400);
    const messageField = channel === 'khe' ? 'assistantMessages' : 'messages';
    let session = await Session.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        $or: [{ busyUntil: null }, { busyUntil: { $lt: new Date() } }],
      },
      { $set: { busyUntil: new Date(Date.now() + 180000) } },
      { new: true }
    );
    if (!session) {
      if (await Session.exists({ _id: req.params.id, user: req.user.id }))
        throw new AppError('Trợ lý đang trả lời câu hỏi trước. Vui lòng chờ một chút.', 409);
      throw new AppError('Không tìm thấy lộ trình.', 404);
    }
    const lockTime = session.busyUntil;
    try {
      if (session[messageField].length >= 82)
        throw new AppError('Cuộc trò chuyện đã dài. Hãy tạo lộ trình mới để tiếp tục.', 400);
      const settings = config();
      await reserve(req.user.id, settings);
      const resources = await retrieve(`${session.goal}\n${content}`, settings);
      const result = validateReply(
        await generate(
          {
            mode: 'chat',
            assistantName: channel === 'khe' ? 'Khế' : 'Trợ lý học tập',
            kind: session.kind || 'roadmap',
            currentAnswer:
              session.guide ||
              session.messages.find((message) => message.role === 'assistant')?.content ||
              '',
            ...(session.kind === 'guide' ? { guide: session.guide } : {}),
            learner: session.profile,
            goal: session.goal,
            roadmap: session.roadmap,
            history: session[messageField]
              .slice(-12)
              .map(({ role, content }) => ({ role, content })),
            question: content,
            resources,
          },
          settings
        ),
        resources,
        session.profile,
        false
      );
      session = await Session.findOneAndUpdate(
        { _id: session.id, user: req.user.id, busyUntil: lockTime },
        {
          $push: {
            [messageField]: {
              $each: [
                { role: 'user', content },
                {
                  role: 'assistant',
                  content: result.answer,
                  resourceIds: resources.map((item) => item.id),
                },
              ],
            },
          },
          $set: { busyUntil: null },
        },
        { new: true }
      );
      if (!session) throw new AppError('Cuộc trò chuyện đã thay đổi. Vui lòng tải lại.', 409);
      res.json({ session: serialize(session) });
    } finally {
      await Session.updateOne(
        { _id: req.params.id, user: req.user.id, busyUntil: lockTime },
        { $set: { busyUntil: null } }
      );
    }
  })
);
router.patch(
  '/sessions/:id/tasks/:taskId',
  catchAsync(async (req, res) => {
    if (typeof req.body.done !== 'boolean' || !/^[a-f0-9]{24}$/i.test(req.params.taskId))
      throw new AppError('Trạng thái nhiệm vụ không hợp lệ.', 400);
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, 'roadmap.milestones.tasks._id': req.params.taskId },
      { $set: { 'roadmap.milestones.$[].tasks.$[task].done': req.body.done } },
      { arrayFilters: [{ 'task._id': new mongoose.Types.ObjectId(req.params.taskId) }], new: true }
    );
    if (!session) throw new AppError('Không tìm thấy nhiệm vụ.', 404);
    res.json({ session: serialize(session) });
  })
);
app.use('/api/v1/learning', router);
start(app, { name: 'learning', port: Number(process.env.PORT || 8004) }).catch((error) => {
  console.error('Không khởi động được dịch vụ learning:', error.message);
  process.exit(1);
});
