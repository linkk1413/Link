// Minimal in-memory fixed-window rate limiter (per IP). Good enough for a
// single Cloud Run instance guarding low-volume transactional email routes —
// not a substitute for a distributed limiter if traffic grows a lot.
const buckets = new Map();

const rateLimit = ({ windowMs, max }) => (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (bucket.count >= max) {
    return res.status(429).json({ error: "Too many requests, try again later" });
  }

  bucket.count += 1;
  next();
};

module.exports = { rateLimit };
