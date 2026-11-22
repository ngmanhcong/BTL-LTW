const AppError = require('./appError');

const serviceUrls = {
  accounts: () => process.env.ACCOUNTS_URL,
  content: () => process.env.CONTENT_URL,
  messaging: () => process.env.MESSAGING_URL,
};

async function request(service, pathname, options = {}) {
  const base = serviceUrls[service]?.();
  if (!base) throw new Error(`Missing URL for service: ${service}`);
  let response;
  try {
    response = await fetch(new URL(pathname, base), {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        'x-service-key': process.env.INTERNAL_API_KEY,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (cause) {
    throw new AppError('Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.', 503);
  }
  const body = await response.json();
  if (!response.ok)
    throw new AppError(body.message || 'Yêu cầu thất bại. Vui lòng thử lại.', response.status);
  return body;
}

function internalOnly(req, res, next) {
  if (!process.env.INTERNAL_API_KEY || req.get('x-service-key') !== process.env.INTERNAL_API_KEY) {
    return res
      .status(403)
      .json({ status: 'fail', message: 'Yêu cầu quyền truy cập dịch vụ nội bộ' });
  }
  next();
}

module.exports = { request, internalOnly };
