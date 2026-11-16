/**
 * @file rateLimiter.js
 * @description In-memory rate limiting middleware for sensitive authentication and OTP endpoints.
 * Protects against brute-force attacks on login, OTP verification, and password reset routes.
 */

function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes window
  max = 10,                   // max requests per window
  message = "Too many attempts from this IP, please try again later."
} = {}) {
  const requests = new Map();

  // Periodic cleanup of expired entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent timer from keeping Node process alive during tests/scripts
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Extract client IP (respecting proxy headers if behind Nginx)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket?.remoteAddress || 
               req.ip || 
               'unknown-ip';

    const now = Date.now();
    let record = requests.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      requests.set(ip, record);
    } else {
      record.count += 1;
    }

    // Set standard rate limit headers
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: resetSeconds
      });
    }

    next();
  };
}

// Pre-configured rate limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // 15 login attempts per 15 min per IP
  message: "Too many login attempts. For security, please wait 15 minutes before trying again."
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8,                   // 8 OTP verification requests per 10 min
  message: "Too many verification attempts. Please request a new OTP after 10 minutes."
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,                   // 5 password reset requests per 30 min
  message: "Too many password reset requests. Please try again after 30 minutes."
});

module.exports = {
  createRateLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter
};
