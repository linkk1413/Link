import express, { Router, Request, Response } from "express";
import { sendPasswordResetEmail } from "firebase/auth";
import { sendEmail, emailTemplates } from "../services/email";
import { auth } from "../lib/firebase";

const router = Router();

// Send password reset email
router.post("/send-reset-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Send Firebase password reset email
    await sendPasswordResetEmail(auth, email);

    // Also send a custom branded email through Resend
    const resetLink = await auth.generatePasswordResetLink(email);
    const template = emailTemplates.resetPassword("User", resetLink);

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

// Send booking confirmation email
router.post(
  "/send-booking-confirmation",
  async (req: Request, res: Response) => {
    try {
      const { clientEmail, clientName, providerName, serviceName, date, time } =
        req.body;

      if (!clientEmail) {
        res.status(400).json({ error: "Client email is required" });
        return;
      }

      const template = emailTemplates.bookingConfirmation(
        clientName,
        providerName,
        serviceName,
        date,
        time,
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
  },
);

// Send payment confirmation email
router.post(
  "/send-payment-confirmation",
  async (req: Request, res: Response) => {
    try {
      const { email, name, amount, transactionId, serviceName } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const template = emailTemplates.paymentConfirmation(
        name,
        amount,
        transactionId,
        serviceName,
      );

      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      res.json({ success: true, message: "Payment confirmation sent" });
    } catch (error) {
      console.error("Error sending payment confirmation:", error);
      res.status(500).json({ error: "Failed to send payment confirmation" });
    }
  },
);

// Send email verification
router.post("/send-verification-email", async (req: Request, res: Response) => {
  try {
    const { email, name, verificationLink } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const template = emailTemplates.verifyEmail(name, verificationLink);

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

// Admin notification for subscription payment
router.post("/notify-admin-subscription", async (req: Request, res: Response) => {
  try {
    const {
      providerName,
      providerEmail,
      providerId,
      planName,
      planMonths,
      amount,
      orderId,
      gateway,
    } = req.body;

    // Admin email - same as ADMIN_CONTACT in SubscriptionPaymentPage
    const adminEmail = process.env.ADMIN_EMAIL || "60azsazs@gmail.com";

    const template = emailTemplates.adminSubscriptionNotification(
      providerName || "Unknown",
      providerEmail || "Unknown",
      providerId || "Unknown",
      planName || "Unknown",
      planMonths || 1,
      amount || 0,
      orderId || "Unknown",
      gateway || "PayPal",
    );

    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Admin notification sent for subscription: ${providerId}`);
    res.json({ success: true, message: "Admin notification sent" });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    // Don't fail the whole flow if admin notification fails
    res.status(500).json({ error: "Failed to send admin notification" });
  }
});

export default router;
