const mongoose = require('mongoose');
const task = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
});
const milestone = new mongoose.Schema({
  title: String,
  description: String,
  week: Number,
  tasks: [task],
  resourceIds: [String],
});
const message = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  resourceIds: [String],
  createdAt: { type: Date, default: Date.now },
});
const session = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    goal: String,
    kind: { type: String, enum: ['roadmap', 'guide'], default: 'roadmap' },
    guide: String,
    profile: { level: String, hoursPerWeek: Number, weeks: Number },
    roadmap: { title: String, summary: String, milestones: [milestone] },
    messages: [message],
    assistantMessages: [message],
    busyUntil: { type: Date, default: null },
  },
  { timestamps: true }
);
session.index({ user: 1, updatedAt: -1 });
const index = new mongoose.Schema({ key: { type: String, unique: true }, vectors: [[Number]] });
const usage = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  day: String,
  count: { type: Number, default: 0 },
});
usage.index({ user: 1, day: 1 }, { unique: true });
const roadmapProgress = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    roadmap: { type: String, required: true },
    topics: {
      type: Map,
      of: { type: String, enum: ['not-started', 'learning', 'done', 'skipped'] },
      default: {},
    },
  },
  { timestamps: true }
);
roadmapProgress.index({ user: 1, roadmap: 1 }, { unique: true });
module.exports = {
  RoadmapProgress: mongoose.model('RoadmapProgress', roadmapProgress),
  Session: mongoose.model('LearningSession', session),
  EmbeddingIndex: mongoose.model('LearningEmbeddingIndex', index),
  Usage: mongoose.model('LearningUsage', usage),
};
