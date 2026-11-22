const AppError = require('@ptitsocial/service-kit/appError');
const catalog = require('./catalog');

function text(value, min = 1, max = 2000) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new AppError(`Nội dung phải có từ ${min} đến ${max} ký tự.`, 400);
  return value.trim();
}
function profile(value) {
  if (
    !value ||
    !['beginner', 'intermediate'].includes(value.level) ||
    !Number.isInteger(value.hoursPerWeek) ||
    value.hoursPerWeek < 1 ||
    value.hoursPerWeek > 60 ||
    !Number.isInteger(value.weeks) ||
    value.weeks < 1 ||
    value.weeks > 52
  )
    throw new AppError(
      'Vui lòng chọn trình độ, từ 1–60 giờ học mỗi tuần và thời gian từ 1–52 tuần.',
      400
    );
  return { level: value.level, hoursPerWeek: value.hoursPerWeek, weeks: value.weeks };
}
function validateReply(value, resources, learner, creating) {
  const invalid = () => {
    throw new AppError('Trợ lý trả về lộ trình chưa hợp lệ. Vui lòng thử lại.', 502);
  };
  const string = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!value || typeof value.answer !== 'string' || !value.answer.trim()) invalid();
  const plan = value.roadmap;
  if (!creating) return { answer: value.answer, roadmap: null };
  if (
    !plan ||
    !string(plan.title, 160) ||
    !string(plan.summary, 2000) ||
    !Array.isArray(plan.milestones) ||
    !plan.milestones.length ||
    plan.milestones.length > 12
  )
    invalid();
  const allowed = new Set(resources.map((item) => item.id));
  let previous = 0;
  for (const milestone of plan.milestones) {
    if (
      !string(milestone.title, 160) ||
      !string(milestone.description, 1500) ||
      !Number.isInteger(milestone.week) ||
      milestone.week < 1 ||
      milestone.week > learner.weeks ||
      milestone.week < previous ||
      !Array.isArray(milestone.tasks) ||
      !milestone.tasks.length ||
      milestone.tasks.length > 8 ||
      !milestone.tasks.every((task) => string(task, 400)) ||
      !Array.isArray(milestone.resourceIds) ||
      !milestone.resourceIds.length ||
      milestone.resourceIds.some((id) => !allowed.has(id))
    )
      invalid();
    previous = milestone.week;
  }
  return {
    answer: value.answer,
    roadmap: {
      title: plan.title,
      summary: plan.summary,
      milestones: plan.milestones.map((stage) => ({
        title: stage.title,
        description: stage.description,
        week: stage.week,
        tasks: stage.tasks.map((title) => ({ title, done: false })),
        resourceIds: [...new Set(stage.resourceIds)],
      })),
    },
  };
}
function serialize(session) {
  const value = session.toObject ? session.toObject() : session;
  delete value.user;
  delete value.busyUntil;
  const ids = new Set([
    ...(value.messages || []).flatMap((item) => item.resourceIds || []),
    ...(value.assistantMessages || []).flatMap((item) => item.resourceIds || []),
    ...(value.roadmap?.milestones || []).flatMap((item) => item.resourceIds || []),
  ]);
  value.resources = catalog.filter((item) => ids.has(item.id));
  return value;
}
module.exports = { text, profile, validateReply, serialize };
