import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const senderEmail = process.env.SENDER_EMAIL || "noreply@link-22.com";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (params: EmailParams) => {
  try {
    const result = await resend.emails.send({
      from: senderEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      throw new Error(result.error.message);
    }

    console.log("Email sent successfully:", result.data?.id);
    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  // Password reset email
  resetPassword: (name: string, resetLink: string) => ({
    subject: "Reset Your Link Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; margin-bottom: 20px;">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy this link in your browser: <br><code style="background-color: #f4f4f4; padding: 5px 10px; border-radius: 3px;">${resetLink}</code></p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© 2026 Link. All rights reserved.</p>
      </div>
    `,
  }),

  // Email verification
  verifyEmail: (name: string, verificationLink: string) => ({
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; margin-bottom: 20px;">Welcome to Link!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for signing up. Please verify your email address to get started:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy this link: <br><code style="background-color: #f4f4f4; padding: 5px 10px; border-radius: 3px;">${verificationLink}</code></p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© 2026 Link. All rights reserved.</p>
      </div>
    `,
  }),

  // Booking confirmation
  bookingConfirmation: (
    clientName: string,
    providerName: string,
    serviceName: string,
    date: string,
    time: string,
  ) => ({
    subject: `Booking Confirmed: ${serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; margin-bottom: 20px;">Booking Confirmed!</h1>
        <p>Hi ${clientName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Provider:</strong> ${providerName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>You can view your booking details in your Link account.</p>
        <p style="color: #666; font-size: 14px;">If you need to cancel or reschedule, please do so at least 24 hours before your appointment.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© 2026 Link. All rights reserved.</p>
      </div>
    `,
  }),

  // Payment confirmation
  paymentConfirmation: (
    name: string,
    amount: number,
    transactionId: string,
    serviceName: string,
  ) => ({
    subject: "Payment Received - Link",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; margin-bottom: 20px;">Payment Received</h1>
        <p>Hi ${name},</p>
        <p>Thank you for your payment. Here are the details:</p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${amount.toFixed(2)} SAR</p>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
        </div>
        <p>You can view your payment history in your Link account.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© 2026 Link. All rights reserved.</p>
      </div>
    `,
  }),

  // Admin notification for subscription payment
  adminSubscriptionNotification: (
    providerName: string,
    providerEmail: string,
    providerId: string,
    planName: string,
    planMonths: number,
    amount: number,
    orderId: string,
    gateway: string,
  ) => ({
    subject: `🎉 New Subscription Payment: ${providerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #28a745; margin-bottom: 20px;">💰 New Subscription Payment!</h1>
        <p>A provider has just subscribed via ${gateway}!</p>
        <div style="background-color: #f0fff0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #333;">Provider Details</h3>
          <p><strong>Name:</strong> ${providerName}</p>
          <p><strong>Email:</strong> ${providerEmail}</p>
          <p><strong>ID:</strong> ${providerId}</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
          <p><strong>Plan:</strong> ${planName} (${planMonths} month${planMonths > 1 ? 's' : ''})</p>
          <p><strong>Amount:</strong> ${amount.toFixed(2)} SAR</p>
          <p><strong>Gateway:</strong> ${gateway}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (Saudi Time)</p>
        </div>
        <p style="color: #666;">The subscription has been automatically activated.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Link Admin Notification System</p>
      </div>
    `,
  }),
};
