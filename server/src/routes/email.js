const express = require("express");
const admin = require("../firebaseAdmin");
const { sendEmail, emailTemplates } = require("../services/email");

const router = express.Router();
const db = admin.firestore();

// Never trust a redirect URL supplied by the request body for these emails —
// that would let anyone route "official" password-reset / verification mail
// to any address with a link of their own choosing (phishing). The origin is
// always this trusted domain; only a small, non-URL fragment (a code) is
// ever taken from the caller.
const CLIENT_APP_URL = (
  process.env.CLIENT_APP_URL || "https://www.link-22.com"
).replace(/\/$/, "");

// Send password reset email
router.post("/send-reset-email", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const resetLink = `${CLIENT_APP_URL}/auth/reset-password`;
    const template = emailTemplates.resetPassword(name || "User", resetLink);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

// Send email verification
router.post("/send-verification-email", async (req, res) => {
  try {
    const { email, name, code } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const verificationLink = code
      ? `${CLIENT_APP_URL}/auth/verify-email?code=${encodeURIComponent(code)}`
      : `${CLIENT_APP_URL}/auth/verify-email`;
    const template = emailTemplates.verifyEmail(name || "User", verificationLink);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// Send booking confirmation email. Content is looked up from the real
// booking record server-side (Admin SDK) rather than trusted from the
// request body, so this endpoint can't be used to blast arbitrary
// "confirmation" text to arbitrary addresses — only a real bookingId works,
// and the recipient is always that booking's actual client.
router.post("/send-booking-confirmation", async (req, res) => {
  try {
    const { bookingId, lang } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }

    const bookingSnap = await db.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingSnap.data();

    const [clientSnap, serviceSnap, providerSnap] = await Promise.all([
      db.collection("users").doc(booking.clientId).get(),
      db.collection("services").doc(booking.serviceId).get(),
      db.collection("users").doc(booking.providerId).get(),
    ]);

    const clientEmail = clientSnap.exists ? clientSnap.data().email : null;
    if (!clientEmail) {
      return res.status(404).json({ error: "Client email not found" });
    }

    const clientName = clientSnap.data().name || clientEmail.split("@")[0];
    const serviceName = serviceSnap.exists
      ? serviceSnap.data().title
      : "Service";
    const providerName = providerSnap.exists
      ? providerSnap.data().name
      : "Provider";

    const locale = lang === "ar" ? "ar-SA" : "en-US";
    const startAt = booking.startAt?.toDate
      ? booking.startAt.toDate()
      : new Date(booking.startAt);
    const dateStr = Number.isNaN(startAt.getTime())
      ? booking.bookingDate || ""
      : startAt.toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
    const timeStr = Number.isNaN(startAt.getTime())
      ? ""
      : startAt.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });

    const template = emailTemplates.bookingConfirmation(
      clientName,
      providerName,
      serviceName,
      dateStr,
      timeStr,
    );

    await sendEmail({
      to: clientEmail,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, message: "Booking confirmation sent" });
  } catch (error) {
    console.error("Error sending booking confirmation:", error);
    res.status(500).json({ error: "Failed to send booking confirmation" });
  }
});

// Send payment confirmation email. Same treatment as booking confirmation —
// derives recipient/content from the real payment record, never from the
// request body.
router.post("/send-payment-confirmation", async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: "paymentId is required" });
    }

    const paymentSnap = await db.collection("payments").doc(paymentId).get();
    if (!paymentSnap.exists) {
      return res.status(404).json({ error: "Payment not found" });
    }
    const payment = paymentSnap.data();

    const [clientSnap, bookingSnap] = await Promise.all([
      db.collection("users").doc(payment.clientId).get(),
      payment.bookingId
        ? db.collection("bookings").doc(payment.bookingId).get()
        : Promise.resolve(null),
    ]);

    const clientEmail = clientSnap.exists ? clientSnap.data().email : null;
    if (!clientEmail) {
      return res.status(404).json({ error: "Client email not found" });
    }
    const clientName = clientSnap.data().name || clientEmail.split("@")[0];

    let serviceName = "Service";
    if (bookingSnap?.exists) {
      const serviceSnap = await db
        .collection("services")
        .doc(bookingSnap.data().serviceId)
        .get();
      if (serviceSnap.exists) serviceName = serviceSnap.data().title;
    }

    const template = emailTemplates.paymentConfirmation(
      clientName,
      Number(payment.amountSar || payment.amount || 0),
      payment.orderId || paymentId,
      serviceName,
    );

    await sendEmail({
      to: clientEmail,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, message: "Payment confirmation sent" });
  } catch (error) {
    console.error("Error sending payment confirmation:", error);
    res.status(500).json({ error: "Failed to send payment confirmation" });
  }
});

// Internal admin notification when a provider pays for/renews a
// subscription. Recipient is always the fixed ADMIN_EMAIL — never
// client-supplied — so this can't be used to relay mail elsewhere.
router.post("/notify-admin-subscription", async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn("ADMIN_EMAIL not configured. Skipping admin notification.");
      return res.json({ success: true, message: "Admin email not configured" });
    }

    const { providerId, planName, planMonths, amount, orderId, gateway } =
      req.body;
    if (!providerId) {
      return res.status(400).json({ error: "providerId is required" });
    }

    const providerSnap = await db.collection("users").doc(providerId).get();
    const providerName = providerSnap.exists
      ? providerSnap.data().name
      : "Unknown";
    const providerEmail = providerSnap.exists
      ? providerSnap.data().email
      : "Unknown";

    const template = emailTemplates.adminSubscriptionNotification(
      providerName,
      providerEmail,
      providerId,
      planName || "Unknown",
      planMonths || 1,
      amount || 0,
      orderId || "Unknown",
      gateway || "Unknown",
    );

    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, message: "Admin notification sent" });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    res.status(500).json({ error: "Failed to send admin notification" });
  }
});

module.exports = router;
