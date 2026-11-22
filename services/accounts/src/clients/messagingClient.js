const { request } = require('@ptitsocial/service-kit/http');
module.exports = async (userId) => {
  try {
    return await request('messaging', `/internal/stats/${userId}`);
  } catch (error) {
    console.warn(`Messaging counters unavailable: ${error.message}`);
    return { unseenMessages: 0, unseenNotification: 0 };
  }
};
