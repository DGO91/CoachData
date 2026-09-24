/**
 * logger.js
 * Structured Production Logger with PII Sanitization — CoachData Operational OS v2
 */

const PII_KEYS = ['email', 'password', 'token', 'authorization', 'secret', 'key', 'apiKey', 'stripeKey'];

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const isPII = PII_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()));
    if (isPII && typeof value === 'string') {
      clean[key] = value.length > 8 ? `${value.substring(0, 3)}***${value.slice(-3)}` : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(meta);

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedMeta
    });
  }

  const metaStr = Object.keys(sanitizedMeta).length ? ` ${JSON.stringify(sanitizedMeta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  debug: (message, meta) => console.log(formatLog('debug', message, meta)),
  info: (message, meta) => console.log(formatLog('info', message, meta)),
  warn: (message, meta) => console.warn(formatLog('warn', message, meta)),
  error: (message, meta) => console.error(formatLog('error', message, meta))
};

module.exports = logger;
