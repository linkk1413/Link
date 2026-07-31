const admin = require("../firebaseAdmin");

// Verifies the Firebase ID token sent as `Authorization: Bearer <token>` and
// attaches the caller's uid to the request. Money-moving routes (capture,
// void, refund) must never be reachable without this.
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch (error) {
    console.warn("Auth token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = { requireAuth };
