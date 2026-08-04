const express = require("express");
const crypto = require("crypto");
const admin = require("../firebaseAdmin");
const { sendEmail, emailTemplates } = require("../services/email");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const db = admin.firestore();

const CLIENT_APP_URL = (
  process.env.CLIENT_APP_URL || "https://www.link-22.com"
).replace(/\/$/, "");
const LOGO_URL = `${CLIENT_APP_URL}/favicon.png`;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const generateAndSendOtp = async (userRecord) => {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const now = Date.now();

  await db
    .collection("otpCodes")
    .doc(userRecord.uid)
    .set({
      codeHash: hashCode(code),
      email: userRecord.email || null,
      attempts: 0,
      createdAt: admin.firestore.Timestamp.fromMillis(now),
      expiresAt: admin.firestore.Timestamp.fromMillis(now + OTP_TTL_MS),
    });

  const template = emailTemplates.loginOtp(
    userRecord.displayName || (userRecord.email || "").split("@")[0] || "there",
    code,
    LOGO_URL,
  );

  await sendEmail({
    to: userRecord.email,
    subject: template.subject,
    html: template.html,
  });
};

// Step 1 of login: the client has already verified the password via
// signInWithEmailAndPassword (that's what the bearer token proves) but is
// signed out again immediately after this call — no usable session exists
// until the OTP below is verified. Generates a 6-digit code, stores only
// its hash, and emails it.
router.post("/send-otp", requireAuth, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.uid);
    if (!userRecord.email) {
      return res.status(400).json({ error: "Account has no email on file" });
    }
    await generateAndSendOtp(userRecord);
    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Error sending login OTP:", error);
    res.status(500).json({ error: error.message || "Failed to send code" });
  }
});

// Resend — deliberately does not require a bearer token (the client signed
// out after step 1), so identity here is just "knows the uid returned by
// the earlier sign-in", the same trust level as a password-reset request.
// A fixed cooldown plus the router's shared rate limit keep this from being
// an email-bombing vector.
router.post("/resend-otp", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    const existing = await db.collection("otpCodes").doc(uid).get();
    if (existing.exists) {
      const createdAtMs = existing.data().createdAt?.toMillis?.() || 0;
      const waitMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - createdAtMs);
      if (waitMs > 0) {
        return res.status(429).json({
          error: "Please wait before requesting another code",
          retryAfterMs: waitMs,
        });
      }
    }

    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord.email) {
      return res.status(400).json({ error: "Account has no email on file" });
    }
    await generateAndSendOtp(userRecord);
    res.json({ success: true, message: "Verification code resent" });
  } catch (error) {
    console.error("Error resending login OTP:", error);
    res.status(500).json({ error: error.message || "Failed to resend code" });
  }
});

// Step 2 of login: verify the code and, if correct, mint a fresh custom
// token so the client can actually establish a session (signInWithCustomToken)
// without ever holding the password past step 1.
router.post("/verify-otp", async (req, res) => {
  try {
    const { uid, code } = req.body;
    if (!uid || !code) {
      return res.status(400).json({ error: "uid and code are required" });
    }

    const otpRef = db.collection("otpCodes").doc(uid);
    const otpSnap = await otpRef.get();
    if (!otpSnap.exists) {
      return res.status(400).json({ error: "No pending code — request a new one" });
    }
    const otp = otpSnap.data();

    if (otp.expiresAt?.toMillis?.() < Date.now()) {
      await otpRef.delete();
      return res.status(400).json({ error: "Code expired — request a new one" });
    }

    if ((otp.attempts || 0) >= MAX_ATTEMPTS) {
      await otpRef.delete();
      return res.status(429).json({ error: "Too many attempts — request a new code" });
    }

    if (hashCode(String(code)) !== otp.codeHash) {
      await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      return res.status(400).json({ error: "Incorrect code" });
    }

    // Correct — single-use, delete immediately so it can't be replayed.
    await otpRef.delete();

    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ success: true, customToken });
  } catch (error) {
    console.error("Error verifying login OTP:", error);
    res.status(500).json({ error: error.message || "Failed to verify code" });
  }
});

module.exports = router;
